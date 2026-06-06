import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServiceClient, OrganizationRepository, MembershipRepository } from "@cloudleak/db";
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
});
