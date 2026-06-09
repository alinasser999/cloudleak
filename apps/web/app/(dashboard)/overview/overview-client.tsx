"use client";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AnimatedNumber, EASE_OUT, fadeUp, staggerParent } from "../../../components/motion";
import { Panel, StatTile, Sparkline, Eyebrow, sev } from "../../../components/ui";
import {
  IconAlert,
  IconServer,
  IconCloud,
  IconTrendDown,
  IconArrowRight,
  IconDollar,
  IconSparkles,
} from "../../../components/icons";

interface Scan {
  id: string;
  awsAccountId: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  stats: { resourceCounts: Record<string, number>; totalMonthlyCost: number; errors: string[] };
  createdAt: string;
}

interface DashboardSummary {
  totalMonthlySavings: number;
  openFindingsCount: number;
  dismissedFindingsCount: number;
  findingsBySeverity: Record<string, number>;
  findingsByType: Record<string, number>;
  resourceCount: number;
  resourcesByType: Record<string, number>;
  totalResourceCost: number;
  lastScanAt: string | null;
  recentScans: Scan[];
  connectedAccountCount: number;
}

const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const SEVERITY_ORDER = ["critical", "high", "medium", "low"] as const;

const TYPE_LABELS: Record<string, string> = {
  stopped_ec2: "Stopped EC2",
  unattached_ebs: "Unattached EBS",
  old_snapshot: "Old Snapshot",
  unattached_eip: "Unattached EIP",
  stopped_rds: "Stopped RDS",
};

function formatType(t: string): string {
  return (
    TYPE_LABELS[t] ??
    t
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ")
  );
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function scanResourceTotal(scan: Scan): number {
  return Object.values(scan.stats.resourceCounts).reduce((a, b) => a + b, 0);
}

export function OverviewClient({ organizationId }: { organizationId: string }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/dashboard/summary?organizationId=${organizationId}`);
    if (res.ok) setSummary((await res.json()).summary);
    setLoaded(true);
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!loaded)
    return (
      <div className="flex items-center gap-2 text-sm text-ink-muted">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-bright" />
        Loading your workspace…
      </div>
    );

  if (!summary) return null;

  const isNew = summary.connectedAccountCount === 0 && summary.resourceCount === 0;

  if (isNew) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-2xl space-y-6"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Overview</h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Your workspace is ready. Connect an AWS account to start scanning.
          </p>
        </div>
        <Panel className="overflow-hidden p-10 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand/15 text-brand-bright">
            <IconCloud className="h-6 w-6" />
          </span>
          <p className="mt-4 text-base font-medium text-ink">No data yet</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-muted">
            Connect an AWS account in Settings, then run a scan to see your waste findings here.
          </p>
          <a
            href="/settings/aws"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-canvas shadow-glow-sm transition-colors hover:bg-brand-bright"
          >
            Connect an AWS account
            <IconArrowRight className="h-4 w-4" />
          </a>
        </Panel>
      </motion.div>
    );
  }

  const total = summary.openFindingsCount;
  const topTypes = Object.entries(summary.findingsByType)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const costSeries = [...summary.recentScans]
    .reverse()
    .map((s) => s.stats.totalMonthlyCost)
    .filter((n) => Number.isFinite(n));
  const spark = costSeries.length >= 3 ? costSeries : [4, 6, 5, 9, 8, 13, 12, 18];

  return (
    <div className="max-w-5xl space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Overview</h1>
          <p className="mt-1.5 text-sm text-ink-muted">Your AWS cost waste at a glance.</p>
        </div>
        {summary.lastScanAt && (
          <span className="inline-flex items-center gap-2 rounded-full border border-line/10 bg-surface/60 px-3 py-1.5 text-xs text-ink-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-bright" />
            Last scan {timeAgo(summary.lastScanAt)}
          </span>
        )}
      </motion.div>

      {/* Hero savings */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE_OUT }}
        className="ring-glow relative overflow-hidden rounded-2xl border border-brand/25 bg-brand/[0.06] p-6"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand/25 blur-3xl" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Eyebrow className="text-brand-bright/80">
              <span className="inline-flex items-center gap-1.5">
                <IconDollar className="h-3.5 w-3.5" /> Savings opportunity
              </span>
            </Eyebrow>
            <div className="mt-2 font-mono text-5xl font-semibold tabular-nums text-brand-bright text-glow sm:text-6xl">
              <AnimatedNumber value={summary.totalMonthlySavings} format={usd} />
              <span className="ml-2 text-xl font-normal text-brand-bright/60">/mo</span>
            </div>
            <p className="mt-2 text-sm text-ink-muted">
              Across{" "}
              <span className="font-medium text-ink">{summary.openFindingsCount}</span> open{" "}
              {summary.openFindingsCount === 1 ? "finding" : "findings"} in{" "}
              <span className="font-medium text-ink">{summary.connectedAccountCount}</span>{" "}
              {summary.connectedAccountCount === 1 ? "account" : "accounts"}.
            </p>
          </div>
          <div className="w-full max-w-[15rem]">
            <Sparkline data={spark} className="h-16 w-full" />
            <a
              href="/findings"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-bright hover:underline"
            >
              Review findings
              <IconArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </motion.div>

      {/* Stat tiles */}
      <motion.div
        variants={staggerParent}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4 sm:grid-cols-3"
      >
        <motion.div variants={fadeUp}>
          <StatTile
            label="Open findings"
            icon={<IconAlert className="h-4 w-4" />}
            value={<AnimatedNumber value={summary.openFindingsCount} />}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatTile
            label="Resources tracked"
            icon={<IconServer className="h-4 w-4" />}
            value={<AnimatedNumber value={summary.resourceCount} />}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatTile
            label="Accounts connected"
            icon={<IconCloud className="h-4 w-4" />}
            value={<AnimatedNumber value={summary.connectedAccountCount} />}
          />
        </motion.div>
      </motion.div>

      {/* Breakdown + scans */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
        >
          <Panel className="h-full p-5">
            <Eyebrow>Findings breakdown</Eyebrow>
            {total === 0 ? (
              <p className="mt-4 text-sm text-ink-muted">
                No findings yet.{" "}
                <a href="/scans" className="font-medium text-brand-bright hover:underline">
                  Run a scan
                </a>{" "}
                to detect waste.
              </p>
            ) : (
              <div className="mt-4 space-y-5">
                <div className="space-y-3">
                  {SEVERITY_ORDER.filter((s) => (summary.findingsBySeverity[s] ?? 0) > 0).map((s, i) => {
                    const count = summary.findingsBySeverity[s] ?? 0;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={s}>
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-2 text-sm font-medium capitalize text-ink">
                            <span className={`h-1.5 w-1.5 rounded-full ${sev(s).dot}`} />
                            {s}
                          </span>
                          <span className="font-mono text-xs text-ink-muted">{count}</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-line/[0.06]">
                          <motion.div
                            className={`h-full rounded-full ${sev(s).bar}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.7, delay: 0.2 + i * 0.08, ease: "easeOut" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {Object.keys(summary.findingsByType).length > 0 && (
                  <div className="border-t border-line/8 pt-4">
                    <Eyebrow>By type</Eyebrow>
                    <div className="mt-2">
                      {Object.entries(summary.findingsByType)
                        .sort(([, a], [, b]) => b - a)
                        .map(([type, count]) => (
                          <div
                            key={type}
                            className="flex justify-between border-b border-line/5 py-2 text-sm last:border-0"
                          >
                            <span className="text-ink-muted">{formatType(type)}</span>
                            <span className="font-mono font-medium tabular-nums text-ink">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Panel>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.22 }}
        >
          <Panel className="h-full p-5">
            <Eyebrow>Recent scans</Eyebrow>
            {summary.recentScans.length === 0 ? (
              <p className="mt-4 text-sm text-ink-muted">
                No scans yet.{" "}
                <a href="/scans" className="font-medium text-brand-bright hover:underline">
                  Run your first scan
                </a>
                .
              </p>
            ) : (
              <>
                <div className="mt-4 space-y-3">
                  {summary.recentScans.map((scan) => {
                    const totalRes = scanResourceTotal(scan);
                    return (
                      <div key={scan.id} className="flex items-start gap-3">
                        <span
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                            scan.status === "success"
                              ? "bg-brand"
                              : scan.status === "error"
                                ? "bg-rose-400"
                                : "animate-pulse bg-amber-300"
                          }`}
                        />
                        <div className="min-w-0 flex-1 border-b border-line/5 pb-3">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-sm font-medium text-ink">{timeAgo(scan.createdAt)}</span>
                            <span className="font-mono text-xs text-ink-muted">
                              {scan.status === "success"
                                ? "Completed"
                                : scan.status === "error"
                                  ? "Failed"
                                  : "Running"}
                            </span>
                          </div>
                          <div className="mt-0.5 text-xs text-ink-muted">
                            {totalRes > 0 ? `${totalRes} resources` : "0 resources"}
                            {scan.stats.errors.length > 0 && (
                              <span className="ml-2 text-rose-300">
                                {scan.stats.errors.length} error
                                {scan.stats.errors.length !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <a
                  href="/scans"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-bright hover:underline"
                >
                  View all scans
                  <IconArrowRight className="h-3.5 w-3.5" />
                </a>
              </>
            )}
          </Panel>
        </motion.div>
      </div>

      {/* Top opportunities */}
      {total > 0 && topTypes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.3 }}
        >
          <Panel className="p-5">
            <Eyebrow>
              <span className="inline-flex items-center gap-1.5">
                <IconSparkles className="h-3.5 w-3.5 text-brand-bright" /> Top opportunities
              </span>
            </Eyebrow>
            <div className="mt-3 divide-y divide-line/5">
              {topTypes.map(([type, count]) => (
                <div key={type} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-ink">{formatType(type)}</span>
                    <span className="rounded-full bg-line/8 px-2 py-0.5 font-mono text-xs font-medium text-ink-muted">
                      {count} {count === 1 ? "finding" : "findings"}
                    </span>
                  </div>
                  <a
                    href="/findings"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-bright hover:underline"
                  >
                    View
                    <IconArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </Panel>
        </motion.div>
      )}
    </div>
  );
}
