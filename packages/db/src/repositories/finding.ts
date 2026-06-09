import type { Db } from "../client.js";
import {
  NotFoundError,
  type Finding,
  type FindingSeverity,
  type FindingStatus,
  type FindingType,
  type NewFindingRow,
} from "@cloudleak/core";

type FindingRow = {
  id: string;
  organization_id: string;
  aws_account_id: string;
  resource_id: string | null;
  finding_type: string;
  severity: string;
  estimated_monthly_savings: number | null;
  title: string;
  description: string | null;
  status: string;
  terraform_fix: string | null;
  manual_fix: string | null;
  created_at: string;
};

const map = (d: FindingRow): Finding => ({
  id: d.id,
  organizationId: d.organization_id,
  awsAccountId: d.aws_account_id,
  resourceId: d.resource_id,
  findingType: d.finding_type as FindingType,
  severity: d.severity as FindingSeverity,
  estimatedMonthlySavings: d.estimated_monthly_savings,
  title: d.title,
  description: d.description,
  status: d.status as FindingStatus,
  terraformFix: d.terraform_fix,
  manualFix: d.manual_fix,
  createdAt: d.created_at,
});

export class FindingRepository {
  constructor(private readonly db: Db) {}

  async bulkInsert(rows: NewFindingRow[]): Promise<void> {
    if (rows.length === 0) return;
    const payload = rows.map((r) => ({
      organization_id: r.organizationId,
      aws_account_id: r.awsAccountId,
      resource_id: r.resourceId,
      finding_type: r.findingType,
      severity: r.severity,
      estimated_monthly_savings: r.estimatedMonthlySavings,
      title: r.title,
      description: r.description,
      status: r.status,
      terraform_fix: r.terraformFix ?? null,
      manual_fix: r.manualFix ?? null,
    }));
    const { error } = await this.db.from("findings").insert(payload);
    if (error) throw new Error(error.message);
  }

  async deleteOpenByAwsAccount(organizationId: string, awsAccountId: string): Promise<void> {
    const { error } = await this.db
      .from("findings")
      .delete()
      .eq("organization_id", organizationId)
      .eq("aws_account_id", awsAccountId)
      .eq("status", "open");
    if (error) throw new Error(error.message);
  }

  async listByOrg(
    organizationId: string,
    opts: { awsAccountId?: string; status?: FindingStatus } = {},
  ): Promise<Finding[]> {
    let q = this.db
      .from("findings")
      .select()
      .eq("organization_id", organizationId)
      .order("estimated_monthly_savings", { ascending: false, nullsFirst: false });
    if (opts.awsAccountId) q = q.eq("aws_account_id", opts.awsAccountId);
    if (opts.status) q = q.eq("status", opts.status);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []).map((d) => map(d as FindingRow));
  }

  async updateStatus(id: string, organizationId: string, status: FindingStatus): Promise<Finding> {
    const { data, error } = await this.db
      .from("findings")
      .update({ status })
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select()
      .single();
    if (error || !data) throw new NotFoundError("Finding not found");
    return map(data as FindingRow);
  }
}
