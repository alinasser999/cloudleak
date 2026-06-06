import { createServiceClient, AwsAccountRepository, MembershipRepository } from "@cloudleak/db";
import {
  generateExternalId,
  renderRoleTerraform,
  ForbiddenError,
  type AwsAccount,
} from "@cloudleak/core";
import { RealStsService, type StsService } from "@cloudleak/aws";

const ROLE_NAME = "CloudLeakReadOnly";

export class AwsConnectService {
  constructor(private readonly sts: StsService = new RealStsService()) {}

  private async assertAdmin(userId: string, organizationId: string): Promise<void> {
    const db = createServiceClient();
    const m = await new MembershipRepository(db).findForUserInOrg(userId, organizationId);
    if (!m || (m.role !== "owner" && m.role !== "admin")) {
      throw new ForbiddenError("Only owners/admins can connect AWS");
    }
  }

  async init(
    userId: string,
    organizationId: string,
  ): Promise<{
    account: AwsAccount;
    terraform: string;
    roleName: string;
    cloudleakAccountId: string;
  }> {
    await this.assertAdmin(userId, organizationId);
    const db = createServiceClient();
    const externalId = generateExternalId();
    const account = await new AwsAccountRepository(db).createPending(organizationId, externalId);
    const cloudleakAccountId = process.env.CLOUDLEAK_AWS_ACCOUNT_ID!;
    const terraform = renderRoleTerraform({ externalId, cloudleakAccountId, roleName: ROLE_NAME });
    return { account, terraform, roleName: ROLE_NAME, cloudleakAccountId };
  }

  async validate(
    userId: string,
    organizationId: string,
    awsAccountDbId: string,
    _expectedAccountId: string,
    roleArn: string,
  ): Promise<AwsAccount> {
    await this.assertAdmin(userId, organizationId);
    const db = createServiceClient();
    const repo = new AwsAccountRepository(db);
    const acct = await repo.getById(awsAccountDbId, organizationId);
    try {
      const { accountId } = await this.sts.assumeRole(roleArn, acct.externalId);
      return await repo.markConnected(acct.id, accountId, roleArn);
    } catch (e) {
      await repo.markError(acct.id);
      throw e;
    }
  }

  async list(userId: string, organizationId: string): Promise<AwsAccount[]> {
    await this.assertAdmin(userId, organizationId);
    return new AwsAccountRepository(createServiceClient()).listForOrg(organizationId);
  }
}
