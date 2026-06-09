import {
  createUserClient,
  AwsAccountRepository,
  MembershipRepository,
  ResourceRepository,
  ScanRepository,
  type Db,
} from "@cloudleak/db";
import { ForbiddenError, ValidationError, type Scan } from "@cloudleak/core";
import { runScan } from "@cloudleak/collectors";
import {
  FakeAwsInventoryClient,
  RealAwsInventoryClient,
  RealAwsClientFactory,
  type AwsInventoryClient,
} from "@cloudleak/aws";

export class ScanService {
  constructor(
    private readonly accessToken: string,
    private readonly clientOverride?: AwsInventoryClient,
  ) {}

  private db(): Db {
    return createUserClient(this.accessToken);
  }

  private regions(): string[] {
    const raw = process.env.CLOUDLEAK_SCAN_REGIONS ?? "us-east-1";
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }

  private async assertAdmin(userId: string, organizationId: string): Promise<void> {
    const m = await new MembershipRepository(this.db()).findForUserInOrg(userId, organizationId);
    if (!m || (m.role !== "owner" && m.role !== "admin")) {
      throw new ForbiddenError("Only owners/admins can run scans");
    }
  }

  private async assertMember(userId: string, organizationId: string): Promise<void> {
    const m = await new MembershipRepository(this.db()).findForUserInOrg(userId, organizationId);
    if (!m) throw new ForbiddenError("Not a member of this organization");
  }

  private async buildClient(roleArn: string, externalId: string): Promise<AwsInventoryClient> {
    if (this.clientOverride) return this.clientOverride;
    if (process.env.CLOUDLEAK_FAKE_AWS === "1") return FakeAwsInventoryClient.demo();
    const creds = await new RealAwsClientFactory().assumeRole({
      roleArn,
      externalId,
      region: this.regions()[0] ?? "us-east-1",
    });
    return new RealAwsInventoryClient(creds);
  }

  async run(userId: string, organizationId: string, awsAccountId: string): Promise<Scan> {
    await this.assertAdmin(userId, organizationId);
    const db = this.db();
    const acct = await new AwsAccountRepository(db).getById(awsAccountId, organizationId);
    if (acct.status !== "connected" || !acct.roleArn) {
      throw new ValidationError("AWS account is not connected");
    }
    const client = await this.buildClient(acct.roleArn, acct.externalId);
    return runScan({
      awsAccount: { id: acct.id, organizationId },
      regions: this.regions(),
      client,
      resourceRepo: new ResourceRepository(db),
      scanRepo: new ScanRepository(db),
    });
  }

  async list(userId: string, organizationId: string): Promise<Scan[]> {
    await this.assertMember(userId, organizationId);
    return new ScanRepository(this.db()).listByOrg(organizationId);
  }
}
