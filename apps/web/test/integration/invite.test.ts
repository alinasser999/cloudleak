import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServiceClient, OrganizationRepository, MembershipRepository } from "@cloudleak/db";
import { InviteService } from "@/server/services/invite-service";

const hasEnv = !!(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.TEST_USER_ID);

describe.skipIf(!hasEnv)("InviteService (integration)", () => {
  const ownerId = process.env.TEST_USER_ID!;
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
    const invite = await InviteService.create(ownerId, orgId, "teammate@example.com", "member");
    expect(invite.token.length).toBeGreaterThan(10);
    expect(invite.status).toBe("pending");
  });

  it("rejects accept when the email does not match the invite", async () => {
    const invite = await InviteService.create(ownerId, orgId, "alice@example.com", "member");
    await expect(
      InviteService.accept(ownerId, "bob@example.com", invite.token),
    ).rejects.toThrow();
  });
});
