import {
  createUserClient,
  AwsAccountRepository,
  MembershipRepository,
  OrganizationRepository,
  ScheduleRepository,
  type ScanSchedule,
  type ScheduleFrequency,
  type Db,
} from "@cloudleak/db";
import {
  ForbiddenError,
  ValidationError,
  PlanLimitError,
  planLimits,
  PLAN_LABEL,
} from "@cloudleak/core";

export interface ScheduleWithAccount extends ScanSchedule {
  awsAccountIdentifier: string | null;
}

export class ScheduleService {
  constructor(private readonly accessToken: string) {}

  private db(): Db {
    return createUserClient(this.accessToken);
  }

  private async assertAdmin(userId: string, organizationId: string): Promise<void> {
    const m = await new MembershipRepository(this.db()).findForUserInOrg(userId, organizationId);
    if (!m || (m.role !== "owner" && m.role !== "admin")) {
      throw new ForbiddenError("Only owners/admins can manage schedules");
    }
  }

  async list(userId: string, organizationId: string): Promise<ScheduleWithAccount[]> {
    const db = this.db();
    const m = await new MembershipRepository(db).findForUserInOrg(userId, organizationId);
    if (!m) throw new ForbiddenError("Not a member of this organization");

    const [accounts, schedules] = await Promise.all([
      new AwsAccountRepository(db).listForOrg(organizationId),
      new ScheduleRepository(db).listByOrg(organizationId),
    ]);

    const connected = accounts.filter((a) => a.status === "connected");
    const scheduleMap = new Map(schedules.map((s) => [s.awsAccountId, s]));

    return connected.map((acct) => {
      const existing = scheduleMap.get(acct.id);
      return existing
        ? { ...existing, awsAccountIdentifier: acct.accountId }
        : {
            id: `virtual-${acct.id}`,
            organizationId,
            awsAccountId: acct.id,
            frequency: "off" as ScheduleFrequency,
            enabled: false,
            nextScanAt: null,
            lastScanAt: null,
            createdAt: acct.lastValidatedAt ?? new Date().toISOString(),
            awsAccountIdentifier: acct.accountId,
          };
    });
  }

  async upsert(
    userId: string,
    organizationId: string,
    awsAccountId: string,
    frequency: ScheduleFrequency,
    enabled: boolean,
  ): Promise<ScanSchedule> {
    await this.assertAdmin(userId, organizationId);

    const valid: ScheduleFrequency[] = ["off", "daily", "weekly"];
    if (!valid.includes(frequency)) throw new ValidationError("Invalid frequency");

    // Gate cadences the plan doesn't include (e.g. daily scans on Starter).
    const org = await new OrganizationRepository(this.db()).getById(organizationId);
    const allowed = planLimits(org.plan).allowedScanFrequencies;
    if (!allowed.includes(frequency)) {
      throw new PlanLimitError(
        `${frequency[0]!.toUpperCase()}${frequency.slice(1)} scans aren't available on the ${PLAN_LABEL[org.plan]} plan. Upgrade to enable them.`,
      );
    }

    const acct = await new AwsAccountRepository(this.db()).getById(awsAccountId, organizationId);
    if (acct.status !== "connected") throw new ValidationError("Account not connected");

    return new ScheduleRepository(this.db()).upsert({
      organizationId,
      awsAccountId,
      frequency,
      enabled,
    });
  }
}
