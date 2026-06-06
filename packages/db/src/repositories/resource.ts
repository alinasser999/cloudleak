import type { Db } from "../client.js";
import type { NewResourceRow, Resource, ResourceType } from "@cloudleak/core";

type ResourceRow = {
  id: string;
  organization_id: string;
  aws_account_id: string;
  resource_id: string;
  resource_type: string;
  region: string;
  metadata: unknown;
  estimated_monthly_cost: number | null;
  created_at: string;
};

const map = (d: ResourceRow): Resource => ({
  id: d.id,
  organizationId: d.organization_id,
  awsAccountId: d.aws_account_id,
  resourceId: d.resource_id,
  resourceType: d.resource_type as ResourceType,
  region: d.region,
  metadata: (d.metadata ?? {}) as Record<string, unknown>,
  estimatedMonthlyCost: d.estimated_monthly_cost,
  createdAt: d.created_at,
});

export class ResourceRepository {
  constructor(private readonly db: Db) {}

  async bulkInsert(rows: NewResourceRow[]): Promise<void> {
    if (rows.length === 0) return;
    const payload = rows.map((r) => ({
      organization_id: r.organizationId,
      aws_account_id: r.awsAccountId,
      resource_id: r.resourceId,
      resource_type: r.resourceType,
      region: r.region,
      metadata: r.metadata as never,
      estimated_monthly_cost: r.estimatedMonthlyCost,
    }));
    const { error } = await this.db.from("resources").insert(payload);
    if (error) throw new Error(error.message);
  }

  async deleteByAwsAccount(organizationId: string, awsAccountId: string): Promise<void> {
    const { error } = await this.db
      .from("resources")
      .delete()
      .eq("organization_id", organizationId)
      .eq("aws_account_id", awsAccountId);
    if (error) throw new Error(error.message);
  }

  async listByOrg(
    organizationId: string,
    opts: { awsAccountId?: string } = {},
  ): Promise<Resource[]> {
    let q = this.db
      .from("resources")
      .select()
      .eq("organization_id", organizationId)
      .order("estimated_monthly_cost", { ascending: false, nullsFirst: false });
    if (opts.awsAccountId) q = q.eq("aws_account_id", opts.awsAccountId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []).map((d) => map(d as ResourceRow));
  }
}
