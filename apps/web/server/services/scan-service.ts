import {
  createUserClient,
  AwsAccountRepository,
  MembershipRepository,
  ScanRepository,
  type Db,
} from "@cloudleak/db";
import { ForbiddenError, ValidationError, type Scan } from "@cloudleak/core";

export class ScanService {
  constructor(private readonly accessToken: string) {}

  private db(): Db {
    return createUserClient(this.accessToken);
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

  async run(userId: string, organizationId: string, awsAccountId: string): Promise<Scan> {
    await this.assertAdmin(userId, organizationId);
    const db = this.db();
    const acct = await new AwsAccountRepository(db).getById(awsAccountId, organizationId);
    if (acct.status !== "connected" || !acct.roleArn) {
      throw new ValidationError("AWS account is not connected");
    }
    return new ScanRepository(db).createQueued(organizationId, awsAccountId);
  }

  async list(userId: string, organizationId: string): Promise<Scan[]> {
    await this.assertMember(userId, organizationId);
    return new ScanRepository(this.db()).listByOrg(organizationId);
  }
}
