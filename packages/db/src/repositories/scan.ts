import type { Db } from "../client.js";
import { NotFoundError, type Scan, type ScanStats, type ScanStatus } from "@cloudleak/core";

type ScanRow = {
  id: string;
  organization_id: string;
  aws_account_id: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  stats: unknown;
  created_at: string;
};

const EMPTY_STATS: ScanStats = { resourceCounts: {}, totalMonthlyCost: 0, errors: [] };

const map = (d: ScanRow): Scan => ({
  id: d.id,
  organizationId: d.organization_id,
  awsAccountId: d.aws_account_id,
  status: d.status as ScanStatus,
  startedAt: d.started_at,
  finishedAt: d.finished_at,
  stats: d.stats && typeof d.stats === "object" ? (d.stats as ScanStats) : EMPTY_STATS,
  createdAt: d.created_at,
});

export class ScanRepository {
  constructor(private readonly db: Db) {}

  async create(organizationId: string, awsAccountId: string): Promise<Scan> {
    const { data, error } = await this.db
      .from("scans")
      .insert({
        organization_id: organizationId,
        aws_account_id: awsAccountId,
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? "insert failed");
    return map(data as ScanRow);
  }

  async createQueued(organizationId: string, awsAccountId: string): Promise<Scan> {
    const { data, error } = await this.db
      .from("scans")
      .insert({ organization_id: organizationId, aws_account_id: awsAccountId, status: "queued" })
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? "insert failed");
    return map(data as ScanRow);
  }

  async claimScan(id: string): Promise<Scan | null> {
    const { data } = await this.db
      .from("scans")
      .update({ status: "running", started_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "queued")
      .select()
      .single();
    return data ? map(data as ScanRow) : null;
  }

  async listQueued(): Promise<Scan[]> {
    const { data, error } = await this.db
      .from("scans")
      .select()
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(10);
    if (error) throw new Error(error.message);
    return (data ?? []).map((d) => map(d as ScanRow));
  }

  async update(
    id: string,
    patch: { status: ScanStatus; finishedAt: string; stats: ScanStats },
  ): Promise<Scan> {
    const { data, error } = await this.db
      .from("scans")
      .update({
        status: patch.status,
        finished_at: patch.finishedAt,
        stats: patch.stats as never,
      })
      .eq("id", id)
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? "update failed");
    return map(data as ScanRow);
  }

  async listByOrg(organizationId: string): Promise<Scan[]> {
    const { data, error } = await this.db
      .from("scans")
      .select()
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((d) => map(d as ScanRow));
  }

  async getById(id: string, organizationId: string): Promise<Scan> {
    const { data } = await this.db
      .from("scans")
      .select()
      .eq("id", id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (!data) throw new NotFoundError("Scan not found");
    return map(data as ScanRow);
  }
}
