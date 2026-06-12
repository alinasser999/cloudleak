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

/**
 * Email the weekly digest to every org's owners and admins. Idempotency is
 * coarse: the cron calls this once on its weekly day, and orgs with no connected
 * AWS account are skipped. Per-org/per-recipient failures are logged, not fatal.
 */
export async function dispatchWeeklyDigests(): Promise<number> {
  const db = createServiceClient();
  const { data, error } = await db.from("organizations").select("id");
  if (error) throw new Error(`organizations: ${error.message}`);
  const orgs = (data ?? []) as { id: string }[];

  let sent = 0;
  for (const { id: orgId } of orgs) {
    try {
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
