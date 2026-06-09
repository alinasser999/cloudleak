import type { Db } from "../client.js";

export interface Subscription {
  id: string;
  organizationId: string;
  plan: string | null;
  status: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
}

type SubRow = {
  id: string;
  organization_id: string;
  plan: string | null;
  status: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  created_at: string;
};

const map = (r: SubRow): Subscription => ({
  id: r.id,
  organizationId: r.organization_id,
  plan: r.plan,
  status: r.status,
  stripeCustomerId: r.stripe_customer_id,
  stripeSubscriptionId: r.stripe_subscription_id,
  currentPeriodEnd: r.current_period_end,
  createdAt: r.created_at,
});

export class SubscriptionRepository {
  constructor(private readonly db: Db) {}

  async getByOrg(organizationId: string): Promise<Subscription | null> {
    const { data } = await this.db
      .from("subscriptions")
      .select()
      .eq("organization_id", organizationId)
      .maybeSingle();
    return data ? map(data as SubRow) : null;
  }

  async upsert(patch: {
    organizationId: string;
    plan?: string;
    status?: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodEnd?: string | null;
  }): Promise<Subscription> {
    const { data, error } = await this.db
      .from("subscriptions")
      .upsert(
        {
          organization_id: patch.organizationId,
          ...(patch.plan !== undefined && { plan: patch.plan }),
          ...(patch.status !== undefined && { status: patch.status }),
          ...(patch.stripeCustomerId !== undefined && {
            stripe_customer_id: patch.stripeCustomerId,
          }),
          ...(patch.stripeSubscriptionId !== undefined && {
            stripe_subscription_id: patch.stripeSubscriptionId,
          }),
          ...(patch.currentPeriodEnd !== undefined && {
            current_period_end: patch.currentPeriodEnd,
          }),
        },
        { onConflict: "organization_id" },
      )
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? "upsert failed");
    return map(data as SubRow);
  }
}
