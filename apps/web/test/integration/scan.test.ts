import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createServiceClient,
  createUserClient,
  OrganizationRepository,
  MembershipRepository,
  AwsAccountRepository,
  ResourceRepository,
  ScanRepository,
} from "@cloudleak/db";

const hasEnv = !!(
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.TEST_USER_ID &&
  process.env.TEST_USER_JWT
);

describe.skipIf(!hasEnv)("Phase 2 inventory (integration)", () => {
  const userId = process.env.TEST_USER_ID!;
  const token = process.env.TEST_USER_JWT!;
  let myOrgId: string;
  let otherOrgId: string;
  let myAccountId: string;
  let otherAccountId: string;

  beforeAll(async () => {
    const svc = createServiceClient();
    const myOrg = await new OrganizationRepository(svc).create("itest-inv-mine");
    await new MembershipRepository(svc).create(myOrg.id, userId, "owner");
    myOrgId = myOrg.id;
    const myAcct = await new AwsAccountRepository(svc).createPending(myOrgId, "clk_itest_mine");
    myAccountId = myAcct.id;

    // A second org the test user is NOT a member of.
    const otherOrg = await new OrganizationRepository(svc).create("itest-inv-other");
    otherOrgId = otherOrg.id;
    const otherAcct = await new AwsAccountRepository(svc).createPending(otherOrgId, "clk_itest_other");
    otherAccountId = otherAcct.id;
    // Seed a resource into the other org via service role (bypasses RLS).
    await svc.from("resources").insert({
      organization_id: otherOrgId,
      aws_account_id: otherAccountId,
      resource_id: "i-secret",
      resource_type: "ec2_instance",
      region: "us-east-1",
      metadata: {},
      estimated_monthly_cost: 100,
    });
  });

  afterAll(async () => {
    const svc = createServiceClient();
    if (myOrgId) await svc.from("organizations").delete().eq("id", myOrgId);
    if (otherOrgId) await svc.from("organizations").delete().eq("id", otherOrgId);
  });

  it("bulk-inserts and lists resources for my org under my JWT", async () => {
    const repo = new ResourceRepository(createUserClient(token));
    await repo.bulkInsert([
      {
        organizationId: myOrgId,
        awsAccountId: myAccountId,
        resourceId: "vol-1",
        resourceType: "ebs_volume",
        region: "us-east-1",
        metadata: { sizeGb: 100, volumeType: "gp3" },
        estimatedMonthlyCost: 8,
      },
    ]);
    const rows = await repo.listByOrg(myOrgId);
    expect(rows.map((r) => r.resourceId)).toContain("vol-1");
  });

  it("records a scan lifecycle under my JWT", async () => {
    const repo = new ScanRepository(createUserClient(token));
    const scan = await repo.create(myOrgId, myAccountId);
    expect(scan.status).toBe("running");
    const done = await repo.update(scan.id, {
      status: "success",
      finishedAt: new Date().toISOString(),
      stats: { resourceCounts: { ebs_volume: 1 }, totalMonthlyCost: 8, errors: [] },
    });
    expect(done.status).toBe("success");
    expect(done.stats.totalMonthlyCost).toBe(8);
  });

  it("does NOT expose another org's resources via RLS", async () => {
    const repo = new ResourceRepository(createUserClient(token));
    const rows = await repo.listByOrg(otherOrgId);
    expect(rows).toHaveLength(0); // RLS hides org B's rows even when its id is supplied
  });

  it("deleteByAwsAccount removes only the target account's resources", async () => {
    const repo = new ResourceRepository(createUserClient(token));
    await repo.deleteByAwsAccount(myOrgId, myAccountId);
    const rows = await repo.listByOrg(myOrgId, { awsAccountId: myAccountId });
    expect(rows).toHaveLength(0);
  });
});
