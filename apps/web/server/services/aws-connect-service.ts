import {
  createUserClient,
  AwsAccountRepository,
  MembershipRepository,
  OrganizationRepository,
  type Db,
} from "@cloudleak/db";
import {
  generateExternalId,
  renderRoleTerraform,
  planLimits,
  PLAN_LABEL,
  ForbiddenError,
  PlanLimitError,
  type AwsAccount,
} from "@cloudleak/core";
import { RealStsService, type StsService } from "@cloudleak/aws";

const ROLE_NAME = "CloudLeakReadOnly";

export class AwsConnectService {
  constructor(
    private readonly accessToken: string,
    private readonly sts: StsService = new RealStsService(),
  ) {}

  private db(): Db {
    return createUserClient(this.accessToken);
  }

  private async assertAdmin(userId: string, organizationId: string): Promise<void> {
    const m = await new MembershipRepository(this.db()).findForUserInOrg(userId, organizationId);
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

    // Enforce the plan's connected-account quota before starting a new connection.
    const db = this.db();
    const [org, accounts] = await Promise.all([
      new OrganizationRepository(db).getById(organizationId),
      new AwsAccountRepository(db).listForOrg(organizationId),
    ]);
    const limit = planLimits(org.plan).maxAwsAccounts;
    const connected = accounts.filter((a) => a.status === "connected").length;
    if (connected >= limit) {
      throw new PlanLimitError(
        `Your ${PLAN_LABEL[org.plan]} plan allows ${limit} connected AWS account${limit === 1 ? "" : "s"}. Upgrade to connect more.`,
      );
    }

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
    const repo = new AwsAccountRepository(this.db());
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
    return new AwsAccountRepository(this.db()).listForOrg(organizationId);
  }
}
