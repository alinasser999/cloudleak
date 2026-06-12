import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServiceClient, OrganizationRepository, MembershipRepository } from "@cloudleak/db";
import { PlanLimitError, planLimits } from "@cloudleak/core";
import { InviteService } from "@/server/services/invite-service";

const hasEnv = !!(
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.TEST_USER_ID &&
  process.env.TEST_USER_JWT
);

describe.skipIf(!hasEnv)("InviteService (integration)", () => {
  const ownerId = process.env.TEST_USER_ID!;
  const token = process.env.TEST_USER_JWT!;
  let orgId: string;

  beforeAll(async () => {
    const db = createServiceClient();
    const org = await new OrganizationRepository(db).create("itest-invite");
    await new MembershipRepository(db).create(org.id, ownerId, "owner");
    // Roomy plan so these cases aren't gated by the seat quota (covered below).
    await db.from("organizations").update({ plan: "agency" }).eq("id", org.id);
    orgId = org.id;
  });

  afterAll(async () => {
    if (orgId) await createServiceClient().from("organizations").delete().eq("id", orgId);
  });

  it("owner can create an invite", async () => {
    const invite = await InviteService.create(token, ownerId, orgId, "teammate@example.com", "member");
    expect(invite.token.length).toBeGreaterThan(10);
    expect(invite.status).toBe("pending");
  });

  it("rejects accept when the email does not match the invite", async () => {
    // The owner's email won't match this invite, so accept must fail.
    const invite = await InviteService.create(token, ownerId, orgId, "alice@example.com", "member");
    await expect(InviteService.accept(token, invite.token)).rejects.toThrow();
  });

  it("owner can resend a pending invite", async () => {
    const invite = await InviteService.create(token, ownerId, orgId, "resend@example.com", "member");
    const res = await InviteService.resend(token, ownerId, invite.id);
    expect(typeof res.sent).toBe("boolean");
  });

  it("blocks invites once the plan's seat quota is exhausted", async () => {
    const db = createServiceClient();
    const org = await new OrganizationRepository(db).create("itest-seats");
    try {
      await new MembershipRepository(db).create(org.id, ownerId, "owner");
      await db.from("organizations").update({ plan: "starter" }).eq("id", org.id);

      // Starter = 2 seats; owner is seat 1, so exactly one invite fits.
      const limit = planLimits("starter").maxSeats;
      expect(limit).toBe(2);
      await InviteService.create(token, ownerId, org.id, "first@example.com", "member");
      await expect(
        InviteService.create(token, ownerId, org.id, "second@example.com", "member"),
      ).rejects.toBeInstanceOf(PlanLimitError);
    } finally {
      await db.from("organizations").delete().eq("id", org.id);
    }
  });
});
