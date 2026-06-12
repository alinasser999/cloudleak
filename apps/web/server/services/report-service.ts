import {
  createUserClient,
  OrganizationRepository,
  MembershipRepository,
  FindingRepository,
  ScanRepository,
  ResourceRepository,
  AwsAccountRepository,
  type Db,
} from "@cloudleak/db";
import { ForbiddenError, ValidationError } from "@cloudleak/core";
import { sendEmail } from "../email.js";

function usd(n: number): string {
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatType(t: string): string {
  return t
    .split("_")
    .map((w) => {
      const up = w.toUpperCase();
      if (up === "EC2" || up === "EBS" || up === "EIP" || up === "RDS") return up;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

function digestHtml(opts: {
  orgName: string;
  savings: number;
  openFindings: number;
  resourceCount: number;
  findingsByType: Record<string, number>;
  lastScanAt: string | null;
}): string {
  const topFindings = Object.entries(opts.findingsByType)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([t, n]) => `<li style="margin:4px 0;">${formatType(t)}: <strong>${n}</strong> instance${n !== 1 ? "s" : ""}</li>`)
    .join("");

  const lastScan = opts.lastScanAt
    ? new Date(opts.lastScanAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "No scans yet";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;background:#f9f9f7;margin:0;padding:24px;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e5e0;overflow:hidden;">
  <div style="background:#1a6b3a;padding:24px 32px;">
    <p style="color:#a7f3c0;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin:0 0 4px;">CloudLeak</p>
    <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0;">Weekly Digest</h1>
    <p style="color:#bbf7d0;font-size:13px;margin:6px 0 0;">${opts.orgName}</p>
  </div>
  <div style="padding:32px;">
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
      <p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:#166534;margin:0 0 4px;">Potential monthly savings</p>
      <p style="font-size:36px;font-weight:700;color:#15803d;margin:0;">${usd(opts.savings)}<span style="font-size:14px;color:#4ade80;font-weight:400;"> /mo</span></p>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0ed;">
          <span style="color:#888;font-size:13px;">Open findings</span>
        </td>
        <td style="text-align:right;padding:10px 0;border-bottom:1px solid #f0f0ed;">
          <strong>${opts.openFindings}</strong>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f0f0ed;">
          <span style="color:#888;font-size:13px;">Resources tracked</span>
        </td>
        <td style="text-align:right;padding:10px 0;border-bottom:1px solid #f0f0ed;">
          <strong>${opts.resourceCount}</strong>
        </td>
      </tr>
      <tr>
        <td style="padding:10px 0;">
          <span style="color:#888;font-size:13px;">Last scan</span>
        </td>
        <td style="text-align:right;padding:10px 0;">
          <strong>${lastScan}</strong>
        </td>
      </tr>
    </table>

    ${topFindings ? `
    <div style="margin-bottom:24px;">
      <p style="font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:#888;margin:0 0 10px;">Top waste categories</p>
      <ul style="margin:0;padding-left:20px;color:#222;font-size:14px;">
        ${topFindings}
      </ul>
    </div>` : ""}

    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.cloudleak.io"}/findings"
       style="display:inline-block;background:#1a6b3a;color:#fff;text-decoration:none;border-radius:8px;padding:12px 24px;font-size:14px;font-weight:600;">
      View all findings →
    </a>

    <p style="font-size:12px;color:#aaa;margin-top:24px;">
      You received this because you're an admin of ${opts.orgName} on CloudLeak.
    </p>
  </div>
</div>
</body>
</html>`;
}

/**
 * Build an org's weekly-digest email from whatever Db client is passed (a user
 * client for the manual "send me a digest" flow, or the service client for the
 * automated cron). Returns null when the org has no connected AWS account, so
 * the caller can skip orgs with nothing to report.
 */
export async function buildOrgDigest(
  db: Db,
  organizationId: string,
): Promise<{ subject: string; html: string; savings: number } | null> {
  const org = await new OrganizationRepository(db).getById(organizationId);

  const [findings, resources, scans, accounts] = await Promise.all([
    new FindingRepository(db).listByOrg(organizationId),
    new ResourceRepository(db).listByOrg(organizationId),
    new ScanRepository(db).listByOrg(organizationId),
    new AwsAccountRepository(db).listForOrg(organizationId),
  ]);

  if (accounts.filter((a) => a.status === "connected").length === 0) return null;

  const open = findings.filter((f) => f.status === "open");
  const savings = open.reduce((a, f) => a + (f.estimatedMonthlySavings ?? 0), 0);

  const findingsByType: Record<string, number> = {};
  for (const f of open) {
    findingsByType[f.findingType] = (findingsByType[f.findingType] ?? 0) + 1;
  }

  const html = digestHtml({
    orgName: org.name,
    savings,
    openFindings: open.length,
    resourceCount: resources.length,
    findingsByType,
    lastScanAt: scans[0]?.createdAt ?? null,
  });

  return {
    subject: `CloudLeak Weekly Digest — ${usd(savings)} in savings identified`,
    html,
    savings,
  };
}

export class ReportService {
  constructor(private readonly accessToken: string) {}

  private db(): Db {
    return createUserClient(this.accessToken);
  }

  async sendDigest(userId: string, organizationId: string, userEmail: string): Promise<void> {
    const db = this.db();

    const m = await new MembershipRepository(db).findForUserInOrg(userId, organizationId);
    if (!m || (m.role !== "owner" && m.role !== "admin")) {
      throw new ForbiddenError("Only owners/admins can send digest");
    }

    const digest = await buildOrgDigest(db, organizationId);
    if (!digest) throw new ValidationError("No connected AWS accounts — nothing to report");

    await sendEmail({ to: userEmail, subject: digest.subject, html: digest.html });
  }
}
