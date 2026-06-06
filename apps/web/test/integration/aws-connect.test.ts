import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createServiceClient,
  OrganizationRepository,
  MembershipRepository,
  AwsAccountRepository,
} from "@cloudleak/db";
import { FakeStsService } from "@cloudleak/aws";
import { AwsConnectService } from "@/server/services/aws-connect-service";

// Needs a real Supabase service-role key and a seeded auth user id.
const hasEnv = !!(
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.TEST_USER_ID &&
  process.env.TEST_USER_JWT
);

describe.skipIf(!hasEnv)("AwsConnectService (integration)", () => {
  const userId = process.env.TEST_USER_ID!;
  const token = process.env.TEST_USER_JWT!;
  let orgId: string;

  beforeAll(async () => {
    const db = createServiceClient();
    const org = await new OrganizationRepository(db).create("itest-aws");
    await new MembershipRepository(db).create(org.id, userId, "owner");
    orgId = org.id;
  });

  afterAll(async () => {
    if (orgId) await createServiceClient().from("organizations").delete().eq("id", orgId);
  });

  it("init creates a pending account with rendered terraform", async () => {
    const svc = new AwsConnectService(token, new FakeStsService({ mode: "success", accountId: "111122223333" }));
    const { account, terraform } = await svc.init(userId, orgId);
    expect(account.status).toBe("pending");
    expect(terraform).toContain(account.externalId);
  });

  it("validate marks the account connected on STS success", async () => {
    const svc = new AwsConnectService(token, new FakeStsService({ mode: "success", accountId: "111122223333" }));
    const { account } = await svc.init(userId, orgId);
    const connected = await svc.validate(
      userId,
      orgId,
      account.id,
      "111122223333",
      "arn:aws:iam::111122223333:role/CloudLeakReadOnly",
    );
    expect(connected.status).toBe("connected");
    expect(connected.accountId).toBe("111122223333");
  });

  it("validate marks the account errored on STS failure", async () => {
    const svc = new AwsConnectService(token, new FakeStsService({ mode: "fail" }));
    const { account } = await svc.init(userId, orgId);
    await expect(
      svc.validate(userId, orgId, account.id, "111122223333", "arn:aws:iam::111122223333:role/X"),
    ).rejects.toThrow();
    const reread = await new AwsAccountRepository(createServiceClient()).getById(account.id, orgId);
    expect(reread.status).toBe("error");
  });
});
