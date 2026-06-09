import Stripe from "stripe";
import {
  createUserClient,
  createServiceClient,
  MembershipRepository,
  OrganizationRepository,
  SubscriptionRepository,
  type Db,
} from "@cloudleak/db";
import { ForbiddenError, ValidationError } from "@cloudleak/core";

function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2026-05-27.dahlia" });
}

// Map Stripe price IDs → plan names. Set via env vars.
function priceToplan(): Record<string, string> {
  return {
    [process.env.STRIPE_PRICE_GROWTH ?? ""]: "growth",
    [process.env.STRIPE_PRICE_AGENCY ?? ""]: "agency",
  };
}

export class BillingService {
  constructor(private readonly accessToken: string) {}

  private db(): Db {
    return createUserClient(this.accessToken);
  }

  private async assertAdmin(userId: string, organizationId: string): Promise<void> {
    const m = await new MembershipRepository(this.db()).findForUserInOrg(userId, organizationId);
    if (!m || (m.role !== "owner" && m.role !== "admin")) {
      throw new ForbiddenError("Only owners/admins can manage billing");
    }
  }

  async getSubscription(userId: string, organizationId: string) {
    const db = this.db();
    const m = await new MembershipRepository(db).findForUserInOrg(userId, organizationId);
    if (!m) throw new ForbiddenError("Not a member of this organization");
    const org = await new OrganizationRepository(db).getById(organizationId);
    const sub = await new SubscriptionRepository(db).getByOrg(organizationId);
    return { org, sub };
  }

  async createCheckout(
    userId: string,
    organizationId: string,
    priceId: string,
    returnUrl: string,
  ): Promise<string> {
    await this.assertAdmin(userId, organizationId);
    const db = this.db();

    const org = await new OrganizationRepository(db).getById(organizationId);
    const sub = await new SubscriptionRepository(db).getByOrg(organizationId);

    const s = stripe();
    let customerId = sub?.stripeCustomerId ?? undefined;

    if (!customerId) {
      const customer = await s.customers.create({
        metadata: { organizationId, orgName: org.name },
      });
      customerId = customer.id;
    }

    const session = await s.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${returnUrl}?billing=success`,
      cancel_url: `${returnUrl}?billing=cancelled`,
      metadata: { organizationId },
      subscription_data: { metadata: { organizationId } },
    });

    if (!session.url) throw new ValidationError("Could not create checkout session");
    return session.url;
  }

  async createPortal(userId: string, organizationId: string, returnUrl: string): Promise<string> {
    await this.assertAdmin(userId, organizationId);

    const sub = await new SubscriptionRepository(this.db()).getByOrg(organizationId);
    if (!sub?.stripeCustomerId) {
      throw new ValidationError("No billing subscription found. Upgrade to a paid plan first.");
    }

    const session = await stripe().billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: returnUrl,
    });

    return session.url;
  }

  static async handleWebhook(rawBody: string, signature: string): Promise<void> {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET not configured");

    const s = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-05-27.dahlia" });
    let event: Stripe.Event;
    try {
      event = s.webhooks.constructEvent(rawBody, signature, secret);
    } catch {
      throw new ValidationError("Invalid webhook signature");
    }

    const db = createServiceClient();
    const subRepo = new SubscriptionRepository(db);
    const orgRepo = new OrganizationRepository(db);
    const ptp = priceToplan();

    async function updateFromSubscription(sub: Stripe.Subscription) {
      const orgId = sub.metadata.organizationId;
      if (!orgId) return;

      const priceId = sub.items.data[0]?.price.id ?? "";
      const plan = ptp[priceId] ?? "starter";

      await subRepo.upsert({
        organizationId: orgId,
        stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
        stripeSubscriptionId: sub.id,
        plan,
        status: sub.status,
        currentPeriodEnd: new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000).toISOString(),
      });

      await db
        .from("organizations")
        .update({ plan })
        .eq("id", orgId);
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.organizationId;
        if (!orgId) break;
        const customerId =
          typeof session.customer === "string" ? session.customer : session.customer?.id;
        if (customerId) {
          await subRepo.upsert({
            organizationId: orgId,
            stripeCustomerId: customerId,
            status: "active",
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await updateFromSubscription(event.data.object as Stripe.Subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const orgId = sub.metadata.organizationId;
        if (!orgId) break;
        await subRepo.upsert({ organizationId: orgId, plan: "starter", status: "cancelled" });
        await db.from("organizations").update({ plan: "starter" }).eq("id", orgId);
        break;
      }
    }
  }
}
