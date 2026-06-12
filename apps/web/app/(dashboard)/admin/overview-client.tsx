"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Panel, Eyebrow, PageHeading, StatTile, Sparkline } from "@/components/ui";
import {
  IconUsers,
  IconServer,
  IconCloud,
  IconAlert,
  IconDollar,
  IconScan,
  IconPlus,
  IconClock,
} from "@/components/icons";
import { timeAgo, usd, PlanChip, GodModeBadge, ErrorPanel } from "./admin-shared";

type ActivityType =
  | "signup"
  | "org_created"
  | "member_joined"
  | "invite_sent"
  | "aws_connected"
  | "scan"
  | "finding";

interface ActivityEvent {
  id: string;
  type: ActivityType;
  at: string;
  title: string;
  subtitle: string;
}

interface Overview {
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

const ACTIVITY_META: Record<ActivityType, { icon: typeof IconUsers; tint: string }> = {
  signup: { icon: IconUsers, tint: "bg-brand/12 text-brand-deep" },
  org_created: { icon: IconServer, tint: "bg-violet-500/10 text-violet-600" },
  member_joined: { icon: IconUsers, tint: "bg-line/8 text-ink-muted" },
  invite_sent: { icon: IconPlus, tint: "bg-amber-500/10 text-amber-600" },
  aws_connected: { icon: IconCloud, tint: "bg-sky-500/10 text-sky-600" },
  scan: { icon: IconScan, tint: "bg-line/8 text-ink-muted" },
  finding: { icon: IconAlert, tint: "bg-rose-500/10 text-rose-600" },
};

function ActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return <p className="px-4 py-6 text-center text-xs text-ink-muted">No activity yet.</p>;
  }
  return (
    <ul className="divide-y divide-line/8">
      {events.map((e, i) => {
        const meta = ACTIVITY_META[e.type];
        const Icon = meta.icon;
        return (
          <motion.li
            key={e.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: Math.min(i * 0.03, 0.3) }}
            className="flex items-center gap-3 px-4 py-3"
          >
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${meta.tint}`}>
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{e.title}</p>
              <p className="truncate text-xs text-ink-muted">{e.subtitle}</p>
            </div>
            <span className="shrink-0 font-mono text-[11px] tabular-nums text-ink-faint">
              {timeAgo(e.at)}
            </span>
          </motion.li>
        );
      })}
    </ul>
  );
}

export function AdminOverviewClient() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/overview")
      .then(async (r) => {
        if (!r.ok) {
          const d = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
          throw new Error(d?.error?.message ?? "Could not load platform data");
        }
        return r.json() as Promise<Overview>;
      })
      .then((d) => !cancelled && setData(d))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const t = data?.totals;

  return (
    <div className="space-y-7">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <PageHeading title="Platform" actions={<GodModeBadge />}>
          A god&rsquo;s-eye view across every organization, user, and scan on CloudLeak.
        </PageHeading>
      </motion.div>

      {error ? (
        <ErrorPanel message={error} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatTile
              hero
              label="Total users"
              value={t ? t.users : "—"}
              icon={<IconUsers className="h-4 w-4" />}
              hint="Everyone who has signed up"
            />
            <StatTile
              label="Organizations"
              value={t ? t.organizations : "—"}
              icon={<IconServer className="h-4 w-4" />}
              hint={t ? `${t.memberships} memberships` : undefined}
            />
            <StatTile
              label="Monthly savings"
              value={t ? usd.format(t.estimatedMonthlySavings) : "—"}
              icon={<IconDollar className="h-4 w-4" />}
              hint="Open findings, all tenants"
            />
            <StatTile
              label="AWS connected"
              value={t ? t.awsConnected : "—"}
              icon={<IconCloud className="h-4 w-4" />}
              hint={t ? `${t.awsAccounts} total accounts` : undefined}
            />
            <StatTile
              label="Open findings"
              value={t ? t.findingsOpen : "—"}
              icon={<IconAlert className="h-4 w-4" />}
              hint={t ? `${t.scans} scans run` : undefined}
            />
            <StatTile
              label="Pending invites"
              value={t ? t.pendingInvites : "—"}
              icon={<IconPlus className="h-4 w-4" />}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <section className="space-y-2.5">
              <Eyebrow className="px-1">Recent activity</Eyebrow>
              <Panel className="overflow-hidden">
                {data ? (
                  <ActivityFeed events={data.activity} />
                ) : (
                  <div className="space-y-px p-4">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center gap-3 py-2">
                        <div className="h-8 w-8 animate-pulse rounded-lg bg-line/8" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 w-40 animate-pulse rounded bg-line/8" />
                          <div className="h-2.5 w-24 animate-pulse rounded bg-line/8" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </section>

            <div className="space-y-5">
              <section className="space-y-2.5">
                <Eyebrow className="px-1">Signups · last {data?.signupsWindowDays ?? 14} days</Eyebrow>
                <Panel className="p-4">
                  <div className="flex items-end justify-between">
                    <div className="font-display text-3xl leading-none tabular-nums text-ink">
                      {data ? data.signups.reduce((a, b) => a + b, 0) : "—"}
                    </div>
                    <IconClock className="h-4 w-4 text-ink-faint" />
                  </div>
                  {data && data.signups.some((n) => n > 0) ? (
                    <Sparkline data={data.signups} className="mt-3 h-12 w-full" />
                  ) : (
                    <div className="mt-3 h-12 rounded-lg bg-line/[0.03]" />
                  )}
                </Panel>
              </section>

              <section className="space-y-2.5">
                <Eyebrow className="px-1">Plans</Eyebrow>
                <Panel className="divide-y divide-line/8">
                  {data ? (
                    data.planBreakdown.length === 0 ? (
                      <p className="px-4 py-5 text-center text-xs text-ink-muted">No orgs yet.</p>
                    ) : (
                      data.planBreakdown.map((p) => (
                        <div key={p.plan} className="flex items-center justify-between px-4 py-3">
                          <PlanChip plan={p.plan} />
                          <span className="font-display text-lg tabular-nums text-ink">
                            {p.count}
                          </span>
                        </div>
                      ))
                    )
                  ) : (
                    <div className="space-y-2 p-4">
                      {[0, 1].map((i) => (
                        <div key={i} className="h-6 animate-pulse rounded bg-line/8" />
                      ))}
                    </div>
                  )}
                </Panel>
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
