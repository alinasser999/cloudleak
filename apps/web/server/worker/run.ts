/**
 * Core scan-processing logic shared by both the standalone worker process and
 * the Vercel cron route. Imported by apps/worker (via relative path would be
 * wrong across apps, so the worker duplicates the thin index.ts logic) and by
 * the cron API route in this app.
 */
import {
  createServiceClient,
  AwsAccountRepository,
  FindingRepository,
  MembershipRepository,
  ResourceRepository,
  ScanRepository,
  ScheduleRepository,
} from "@cloudleak/db";
import { buildOrgDigest } from "../services/report-service.js";
import { sendEmail } from "../email.js";
import { runScan } from "@cloudleak/collectors";
import { runDetection } from "@cloudleak/rules";
import {
  FakeAwsInventoryClient,
  RealAwsInventoryClient,
  RealAwsClientFactory,
} from "@cloudleak/aws";
import type { Scan } from "@cloudleak/core";
import type { Db } from "@cloudleak/db";
import type { ScanStats, ScanStatus } from "@cloudleak/core";

function regions(): string[] {
  return (process.env.CLOUDLEAK_SCAN_REGIONS ?? "us-east-1")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Adapter that claims an existing queued scan instead of inserting a new one. */
class LinkedScanRepo {
  private readonly scanRepo: ScanRepository;
  constructor(private readonly db: Db, private readonly scanId: string) {
    this.scanRepo = new ScanRepository(db);
  }
  async create(_orgId: string, _acctId: string): Promise<Scan> {
    const claimed = await this.scanRepo.claimScan(this.scanId);
    if (!claimed) throw new Error(`Cannot claim scan ${this.scanId}`);
    return claimed;
  }
  async update(id: string, patch: { status: ScanStatus; finishedAt: string; stats: ScanStats }) {
    return this.scanRepo.update(id, patch);
  }
}

export async function processScan(scan: Scan): Promise<void> {
  const db = createServiceClient();
  const acct = await new AwsAccountRepository(db).getById(scan.awsAccountId, scan.organizationId);

  let client;
  if (process.env.CLOUDLEAK_FAKE_AWS === "1") {
    client = FakeAwsInventoryClient.demo();
  } else {
    if (!acct.roleArn) throw new Error(`Account ${acct.id} has no roleArn`);
    const r = regions()[0] ?? "us-east-1";
    const creds = await new RealAwsClientFactory().assumeRole({
      roleArn: acct.roleArn,
      externalId: acct.externalId,
      region: r,
    });
    client = new RealAwsInventoryClient(creds);
  }

  await runScan({
    awsAccount: { id: acct.id, organizationId: scan.organizationId },
    regions: regions(),
    client,
    resourceRepo: new ResourceRepository(db),
    scanRepo: new LinkedScanRepo(db, scan.id),
  });

  try {
    await runDetection({
      awsAccount: { id: acct.id, organizationId: scan.organizationId },
      resourceRepo: new ResourceRepository(db),
      findingRepo: new FindingRepository(db),
    });
  } catch (e) {
    console.error("Detection failed (non-fatal):", e);
  }
}

export async function dispatchDueSchedules(): Promise<number> {
  const db = createServiceClient();
  const scheduleRepo = new ScheduleRepository(db);
  const scanRepo = new ScanRepository(db);
  const due = await scheduleRepo.listDue();
  let dispatched = 0;
  for (const schedule of due) {
    try {
      await scanRepo.createQueued(schedule.organizationId, schedule.awsAccountId);
      await scheduleRepo.markDispatched(schedule.id, schedule.frequency);
      dispatched++;
    } catch (e) {
      console.error(`[worker] schedule dispatch failed for ${schedule.id}:`, e);
    }
  }
  return dispatched;
}

/** The current ISO-ish week in UTC (Monday→Sunday), as `date` strings. */
function currentWeekUtc(): { start: string; end: string } {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun..6=Sat
  const daysSinceMonday = (day + 6) % 7;
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday),
  );
  const end = new Date(start.getTime() + 6 * 864e5);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

/**
 * Email the weekly digest to every org's owners and admins, exactly once per
 * calendar week. Idempotency is backed by the `reports` table: a row keyed by
 * (organization_id, period_start) records that an org's digest went out this
 * week, so this is safe to call repeatedly — from the daily cron route or the
 * worker's poll loop — without re-sending. Orgs with no connected AWS account
 * are skipped; per-org/per-recipient failures are logged, not fatal.
 */
export async function dispatchWeeklyDigests(): Promise<number> {
  const db = createServiceClient();
  const week = currentWeekUtc();

  const { data, error } = await db.from("organizations").select("id");
  if (error) throw new Error(`organizations: ${error.message}`);
  const orgs = (data ?? []) as { id: string }[];

  let sent = 0;
  for (const { id: orgId } of orgs) {
    try {
      // Skip if this week's digest was already recorded for the org.
      const { data: existing } = await db
        .from("reports")
        .select("id")
        .eq("organization_id", orgId)
        .eq("period_start", week.start)
        .limit(1)
        .maybeSingle();
      if (existing) continue;

      const digest = await buildOrgDigest(db, orgId);
      if (!digest) continue;

      const members = await new MembershipRepository(db).listForOrg(orgId);
      const recipients = members
        .filter((m) => m.role === "owner" || m.role === "admin")
        .map((m) => m.email);
      for (const to of recipients) {
        await sendEmail({ to, subject: digest.subject, html: digest.html });
        sent++;
      }

      // Record the send so no other invocation repeats it this week.
      await db.from("reports").insert({
        organization_id: orgId,
        period_start: week.start,
        period_end: week.end,
        payload: { savings: digest.savings, recipients: recipients.length },
      });
    } catch (e) {
      console.error(`[cron] weekly digest failed for org ${orgId}:`, e);
    }
  }
  return sent;
}

export async function processQueuedScans(limit = 3): Promise<number> {
  const db = createServiceClient();
  const queued = await new ScanRepository(db).listQueued();
  const batch = queued.slice(0, limit);
  let processed = 0;
  for (const scan of batch) {
    try {
      await processScan(scan);
      processed++;
    } catch (e) {
      console.error(`[worker] scan ${scan.id} failed:`, e);
    }
  }
  return processed;
}
