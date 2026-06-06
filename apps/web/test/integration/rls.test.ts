import { describe, it, expect, afterAll } from "vitest";
import {
  createServiceClient,
  createUserClient,
  OrganizationRepository,
  AwsAccountRepository,
} from "@cloudleak/db";
import { generateExternalId } from "@cloudleak/core";

// Needs a real service-role key AND a signed-in user's access token.
const hasEnv = !!(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.TEST_USER_JWT);

describe.skipIf(!hasEnv)("RLS isolation (integration)", () => {
  let foreignOrgId: string;

  afterAll(async () => {
    if (foreignOrgId)
      await createServiceClient().from("organizations").delete().eq("id", foreignOrgId);
  });

  it("a user cannot read aws_accounts of an org they don't belong to", async () => {
    const admin = createServiceClient();
    const otherOrg = await new OrganizationRepository(admin).create("rls-foreign-org");
    foreignOrgId = otherOrg.id;
    await new AwsAccountRepository(admin).createPending(otherOrg.id, generateExternalId());

    const asUser = createUserClient(process.env.TEST_USER_JWT!);
    const { data } = await asUser
      .from("aws_accounts")
      .select()
      .eq("organization_id", otherOrg.id);
    expect(data ?? []).toHaveLength(0); // RLS hides foreign-org rows
  });
});
