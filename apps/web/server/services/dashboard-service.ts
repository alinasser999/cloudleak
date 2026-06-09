import {
  createUserClient,
  AwsAccountRepository,
  FindingRepository,
  MembershipRepository,
  ResourceRepository,
  ScanRepository,
  type Db,
} from "@cloudleak/db";
import { ForbiddenError, type DashboardSummary } from "@cloudleak/core";

export class DashboardService {
  constructor(private readonly accessToken: string) {}

  private db(): Db {
    return createUserClient(this.accessToken);
  }

  private async assertMember(userId: string, organizationId: string): Promise<void> {
    const m = await new MembershipRepository(this.db()).findForUserInOrg(userId, organizationId);
    if (!m) throw new ForbiddenError("Not a member of this organization");
  }

  async getSummary(userId: string, organizationId: string): Promise<DashboardSummary> {
    await this.assertMember(userId, organizationId);
    const db = this.db();

    const [findings, resources, scans, accounts] = await Promise.all([
      new FindingRepository(db).listByOrg(organizationId),
      new ResourceRepository(db).listByOrg(organizationId),
      new ScanRepository(db).listByOrg(organizationId),
      new AwsAccountRepository(db).listForOrg(organizationId),
    ]);

    const open = findings.filter((f) => f.status === "open");
    const dismissed = findings.filter((f) => f.status === "dismissed");

    const findingsBySeverity: Record<string, number> = {};
    const findingsByType: Record<string, number> = {};
    for (const f of open) {
      findingsBySeverity[f.severity] = (findingsBySeverity[f.severity] ?? 0) + 1;
      findingsByType[f.findingType] = (findingsByType[f.findingType] ?? 0) + 1;
    }

    const resourcesByType: Record<string, number> = {};
    let totalResourceCost = 0;
    for (const r of resources) {
      resourcesByType[r.resourceType] = (resourcesByType[r.resourceType] ?? 0) + 1;
      totalResourceCost += r.estimatedMonthlyCost ?? 0;
    }

    return {
      totalMonthlySavings: open.reduce((a, f) => a + (f.estimatedMonthlySavings ?? 0), 0),
      openFindingsCount: open.length,
      dismissedFindingsCount: dismissed.length,
      findingsBySeverity,
      findingsByType,
      resourceCount: resources.length,
      resourcesByType,
      totalResourceCost,
      lastScanAt: scans[0]?.createdAt ?? null,
      recentScans: scans.slice(0, 5),
      connectedAccountCount: accounts.filter((a) => a.status === "connected").length,
    };
  }
}
