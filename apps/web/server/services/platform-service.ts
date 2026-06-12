import { createServiceClient, type Db, type Database } from "@cloudleak/db";

type TableName = keyof Database["public"]["Tables"];

/**
 * Platform-wide ("god view") read model. Every query here runs under the SERVICE
 * ROLE and deliberately bypasses tenant isolation, so callers MUST be gated with
 * requirePlatformAdmin() before constructing this service.
 *
 * Aggregation is done in TypeScript over full-table reads — fine at current scale;
 * revisit with SQL aggregates / pagination if the tenant count grows large.
 */

export type ActivityType =
  | "signup"
  | "org_created"
  | "member_joined"
  | "invite_sent"
  | "aws_connected"
  | "scan"
  | "finding";

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  at: string;
  title: string;
  subtitle: string;
}

export interface PlatformOverview {
  totals: {
    users: number;
    organizations: number;
    memberships: number;
    awsAccounts: number;
    awsConnected: number;
    scans: number;
    findingsOpen: number;
    estimatedMonthlySavings: number;
    pendingInvites: number;
  };
  planBreakdown: { plan: string; count: number }[];
  signups: number[];
  signupsWindowDays: number;
  activity: ActivityEvent[];
}

export interface PlatformUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  orgs: { id: string; name: string; role: string }[];
}

export interface PlatformOrg {
  id: string;
  name: string;
  plan: string;
  createdAt: string;
  memberCount: number;
  awsAccounts: number;
  scans: number;
  findingsOpen: number;
  estimatedMonthlySavings: number;
}

const num = (v: number | string | null): number => (v == null ? 0 : Number(v) || 0);

export class PlatformService {
  private readonly db: Db;

  constructor() {
    this.db = createServiceClient();
  }

  private async rows<T>(
    table: TableName,
    columns: string,
    order?: { column: string; ascending: boolean },
  ): Promise<T[]> {
    let q = this.db.from(table).select(columns);
    if (order) q = q.order(order.column, { ascending: order.ascending });
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    return (data ?? []) as unknown as T[];
  }

  async getOverview(): Promise<PlatformOverview> {
    type Profile = { id: string; email: string; full_name: string | null; created_at: string };
    type Org = { id: string; name: string; plan: string; created_at: string };
    type Membership = { user_id: string; organization_id: string; role: string; created_at: string };
    type Aws = { organization_id: string; account_id: string | null; status: string; created_at: string };
    type Scan = { organization_id: string; status: string; created_at: string };
    type Finding = {
      id: string;
      organization_id: string;
      status: string;
      estimated_monthly_savings: number | null;
      severity: string;
      title: string;
      created_at: string;
    };
    type Invite = { id: string; organization_id: string; email: string; status: string; created_at: string };

    const [profiles, orgs, memberships, aws, scans, findings, invites] = await Promise.all([
      this.rows<Profile>("profiles", "id, email, full_name, created_at"),
      this.rows<Org>("organizations", "id, name, plan, created_at"),
      this.rows<Membership>("memberships", "user_id, organization_id, role, created_at"),
      this.rows<Aws>("aws_accounts", "organization_id, account_id, status, created_at"),
      this.rows<Scan>("scans", "organization_id, status, created_at"),
      this.rows<Finding>(
        "findings",
        "id, organization_id, status, estimated_monthly_savings, severity, title, created_at",
      ),
      this.rows<Invite>("invitations", "id, organization_id, email, status, created_at"),
    ]);

    const orgName = new Map(orgs.map((o) => [o.id, o.name]));
    const userEmail = new Map(profiles.map((p) => [p.id, p.email]));

    // Plan breakdown.
    const planCounts = new Map<string, number>();
    for (const o of orgs) planCounts.set(o.plan, (planCounts.get(o.plan) ?? 0) + 1);
    const planBreakdown = [...planCounts.entries()]
      .map(([plan, count]) => ({ plan, count }))
      .sort((a, b) => b.count - a.count);

    // Signups per day for the last N days (sparkline).
    const windowDays = 14;
    const signups = new Array<number>(windowDays).fill(0);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    for (const p of profiles) {
      const day = new Date(p.created_at);
      day.setHours(0, 0, 0, 0);
      const idx = windowDays - 1 - Math.round((startOfToday.getTime() - day.getTime()) / 864e5);
      if (idx >= 0 && idx < windowDays) signups[idx] = (signups[idx] ?? 0) + 1;
    }

    // Activity feed: merge timestamped rows across tables.
    const activity: ActivityEvent[] = [
      ...profiles.map((p) => ({
        id: `signup-${p.id}`,
        type: "signup" as const,
        at: p.created_at,
        title: p.full_name ?? p.email,
        subtitle: "Signed up",
      })),
      ...orgs.map((o) => ({
        id: `org-${o.id}`,
        type: "org_created" as const,
        at: o.created_at,
        title: o.name,
        subtitle: "Organization created",
      })),
      ...memberships.map((m) => ({
        id: `mem-${m.user_id}-${m.organization_id}`,
        type: "member_joined" as const,
        at: m.created_at,
        title: userEmail.get(m.user_id) ?? "A user",
        subtitle: `Joined ${orgName.get(m.organization_id) ?? "an org"} as ${m.role}`,
      })),
      ...invites.map((i) => ({
        id: `inv-${i.id}`,
        type: "invite_sent" as const,
        at: i.created_at,
        title: i.email,
        subtitle: `Invited to ${orgName.get(i.organization_id) ?? "an org"}`,
      })),
      ...aws.map((a, idx) => ({
        id: `aws-${a.organization_id}-${idx}`,
        type: "aws_connected" as const,
        at: a.created_at,
        title: a.account_id ?? "AWS account",
        subtitle: `${a.status === "connected" ? "Connected" : a.status} · ${orgName.get(a.organization_id) ?? "an org"}`,
      })),
      ...scans.map((s, idx) => ({
        id: `scan-${s.organization_id}-${idx}-${s.created_at}`,
        type: "scan" as const,
        at: s.created_at,
        title: `Scan ${s.status}`,
        subtitle: orgName.get(s.organization_id) ?? "an org",
      })),
      ...findings.map((f) => ({
        id: `find-${f.id}`,
        type: "finding" as const,
        at: f.created_at,
        title: f.title,
        subtitle: `${f.severity} · ${orgName.get(f.organization_id) ?? "an org"}`,
      })),
    ]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 25);

    return {
      totals: {
        users: profiles.length,
        organizations: orgs.length,
        memberships: memberships.length,
        awsAccounts: aws.length,
        awsConnected: aws.filter((a) => a.status === "connected").length,
        scans: scans.length,
        findingsOpen: findings.filter((f) => f.status === "open").length,
        estimatedMonthlySavings: findings
          .filter((f) => f.status === "open")
          .reduce((sum, f) => sum + num(f.estimated_monthly_savings), 0),
        pendingInvites: invites.filter((i) => i.status === "pending").length,
      },
      planBreakdown,
      signups,
      signupsWindowDays: windowDays,
      activity,
    };
  }

  async listUsers(): Promise<PlatformUser[]> {
    type Profile = {
      id: string;
      email: string;
      full_name: string | null;
      avatar_url: string | null;
      created_at: string;
    };
    type Membership = { user_id: string; organization_id: string; role: string };
    type Org = { id: string; name: string };

    const [profiles, memberships, orgs] = await Promise.all([
      this.rows<Profile>("profiles", "id, email, full_name, avatar_url, created_at", {
        column: "created_at",
        ascending: false,
      }),
      this.rows<Membership>("memberships", "user_id, organization_id, role"),
      this.rows<Org>("organizations", "id, name"),
    ]);

    const orgName = new Map(orgs.map((o) => [o.id, o.name]));
    const byUser = new Map<string, { id: string; name: string; role: string }[]>();
    for (const m of memberships) {
      const list = byUser.get(m.user_id) ?? [];
      list.push({ id: m.organization_id, name: orgName.get(m.organization_id) ?? "—", role: m.role });
      byUser.set(m.user_id, list);
    }

    return profiles.map((p) => ({
      id: p.id,
      email: p.email,
      fullName: p.full_name,
      avatarUrl: p.avatar_url,
      createdAt: p.created_at,
      orgs: byUser.get(p.id) ?? [],
    }));
  }

  async listOrganizations(): Promise<PlatformOrg[]> {
    type Org = { id: string; name: string; plan: string; created_at: string };
    type Membership = { organization_id: string };
    type Aws = { organization_id: string };
    type Scan = { organization_id: string };
    type Finding = { organization_id: string; status: string; estimated_monthly_savings: number | null };

    const [orgs, memberships, aws, scans, findings] = await Promise.all([
      this.rows<Org>("organizations", "id, name, plan, created_at", {
        column: "created_at",
        ascending: false,
      }),
      this.rows<Membership>("memberships", "organization_id"),
      this.rows<Aws>("aws_accounts", "organization_id"),
      this.rows<Scan>("scans", "organization_id"),
      this.rows<Finding>("findings", "organization_id, status, estimated_monthly_savings"),
    ]);

    const tally = (rows: { organization_id: string }[]) => {
      const m = new Map<string, number>();
      for (const r of rows) m.set(r.organization_id, (m.get(r.organization_id) ?? 0) + 1);
      return m;
    };
    const memberCounts = tally(memberships);
    const awsCounts = tally(aws);
    const scanCounts = tally(scans);

    const openFindings = new Map<string, number>();
    const savings = new Map<string, number>();
    for (const f of findings.filter((x) => x.status === "open")) {
      openFindings.set(f.organization_id, (openFindings.get(f.organization_id) ?? 0) + 1);
      savings.set(f.organization_id, (savings.get(f.organization_id) ?? 0) + num(f.estimated_monthly_savings));
    }

    return orgs.map((o) => ({
      id: o.id,
      name: o.name,
      plan: o.plan,
      createdAt: o.created_at,
      memberCount: memberCounts.get(o.id) ?? 0,
      awsAccounts: awsCounts.get(o.id) ?? 0,
      scans: scanCounts.get(o.id) ?? 0,
      findingsOpen: openFindings.get(o.id) ?? 0,
      estimatedMonthlySavings: savings.get(o.id) ?? 0,
    }));
  }
}
