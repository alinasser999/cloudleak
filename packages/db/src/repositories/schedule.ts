import type { Db } from "../client.js";

export type ScheduleFrequency = "daily" | "weekly" | "off";

export interface ScanSchedule {
  id: string;
  organizationId: string;
  awsAccountId: string;
  frequency: ScheduleFrequency;
  enabled: boolean;
  nextScanAt: string | null;
  lastScanAt: string | null;
  createdAt: string;
}

type Row = {
  id: string;
  organization_id: string;
  aws_account_id: string;
  frequency: string;
  enabled: boolean;
  next_scan_at: string | null;
  last_scan_at: string | null;
  created_at: string;
};

const map = (r: Row): ScanSchedule => ({
  id: r.id,
  organizationId: r.organization_id,
  awsAccountId: r.aws_account_id,
  frequency: r.frequency as ScheduleFrequency,
  enabled: r.enabled,
  nextScanAt: r.next_scan_at,
  lastScanAt: r.last_scan_at,
  createdAt: r.created_at,
});

function nextScanAt(frequency: ScheduleFrequency): string | null {
  if (frequency === "off") return null;
  const now = new Date();
  if (frequency === "daily") {
    const next = new Date(now);
    next.setUTCHours(0, 0, 0, 0);
    next.setUTCDate(next.getUTCDate() + 1);
    return next.toISOString();
  }
  // weekly → next Monday midnight UTC
  const next = new Date(now);
  next.setUTCHours(0, 0, 0, 0);
  const daysUntilMonday = (8 - next.getUTCDay()) % 7 || 7;
  next.setUTCDate(next.getUTCDate() + daysUntilMonday);
  return next.toISOString();
}

export class ScheduleRepository {
  constructor(private readonly db: Db) {}

  async listByOrg(organizationId: string): Promise<ScanSchedule[]> {
    const { data, error } = await this.db
      .from("scan_schedules")
      .select()
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => map(r as Row));
  }

  async upsert(patch: {
    organizationId: string;
    awsAccountId: string;
    frequency: ScheduleFrequency;
    enabled: boolean;
  }): Promise<ScanSchedule> {
    const next = patch.enabled && patch.frequency !== "off"
      ? nextScanAt(patch.frequency)
      : null;

    const { data, error } = await this.db
      .from("scan_schedules")
      .upsert(
        {
          organization_id: patch.organizationId,
          aws_account_id: patch.awsAccountId,
          frequency: patch.frequency,
          enabled: patch.enabled,
          next_scan_at: next,
        },
        { onConflict: "organization_id,aws_account_id" },
      )
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? "upsert failed");
    return map(data as Row);
  }

  async listDue(): Promise<ScanSchedule[]> {
    const now = new Date().toISOString();
    const { data, error } = await this.db
      .from("scan_schedules")
      .select()
      .eq("enabled", true)
      .neq("frequency", "off")
      .lte("next_scan_at", now)
      .order("next_scan_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => map(r as Row));
  }

  async markDispatched(id: string, frequency: ScheduleFrequency): Promise<void> {
    const next = nextScanAt(frequency);
    await this.db
      .from("scan_schedules")
      .update({ last_scan_at: new Date().toISOString(), next_scan_at: next })
      .eq("id", id);
  }
}
