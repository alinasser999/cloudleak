"use client";
import { useCallback, useEffect, useState } from "react";

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

const SEVERITY_BAR: Record<string, string> = {
  critical: "bg-red-400",
  high: "bg-amber-400",
  medium: "bg-yellow-400",
  low: "bg-sky-400",
};

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
  const [barsReady, setBarsReady] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/dashboard/summary?organizationId=${organizationId}`);
    if (res.ok) setSummary((await res.json()).summary);
    setLoaded(true);
    // slight delay so bar widths animate in after paint
    setTimeout(() => setBarsReady(true), 60);
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!loaded) return <p className="text-sm text-ink/40">Loading…</p>;

  if (!summary) return null;

  const isNew = summary.connectedAccountCount === 0 && summary.resourceCount === 0;

  if (isNew) {
    return (
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="mt-1 text-sm text-ink/60">
            Your workspace is ready. Connect an AWS account to start scanning.
          </p>
        </div>
        <div className="rounded-xl border border-dashed border-ink/20 bg-ink/[0.015] px-6 py-8 text-center">
          <p className="text-sm font-medium text-ink/60">No data yet</p>
          <p className="mt-1 text-sm text-ink/40">
            Connect an AWS account in{" "}
            <a href="/settings/aws" className="font-medium text-brand-dark hover:underline">
              Settings
            </a>
            , then run a scan to see your waste findings here.
          </p>
        </div>
      </div>
    );
  }

  const total = summary.openFindingsCount;
  const topTypes = Object.entries(summary.findingsByType)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-ink/60">
          Your AWS cost waste at a glance.
        </p>
      </div>

      {/* Hero stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-ink/10 bg-brand/[0.04] p-4">
          <div className="text-xs uppercase tracking-wider text-brand-dark/70">
            Savings opportunity
          </div>
          <div className="mt-1 text-3xl font-semibold tabular-nums text-brand-dark">
            {usd(summary.totalMonthlySavings)}
            <span className="ml-1 text-sm font-normal text-brand-dark/50">/mo</span>
          </div>
        </div>
        <div className="rounded-xl border border-ink/10 p-4">
          <div className="text-xs uppercase tracking-wider text-ink/40">Open findings</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums">{summary.openFindingsCount}</div>
        </div>
        <div className="rounded-xl border border-ink/10 p-4">
          <div className="text-xs uppercase tracking-wider text-ink/40">Resources tracked</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums">{summary.resourceCount}</div>
        </div>
        <div className="rounded-xl border border-ink/10 p-4">
          <div className="text-xs uppercase tracking-wider text-ink/40">Accounts connected</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums">
            {summary.connectedAccountCount}
          </div>
        </div>
      </div>

      {/* Middle: breakdown + scans */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Findings breakdown */}
        <div className="rounded-xl border border-ink/10 p-5">
          <div className="text-sm font-semibold uppercase tracking-wider text-ink/50 mb-4">
            Findings breakdown
          </div>
          {total === 0 ? (
            <p className="text-sm text-ink/40">
              No findings yet.{" "}
              <a href="/scans" className="font-medium text-brand-dark hover:underline">
                Run a scan
              </a>{" "}
              to detect waste.
            </p>
          ) : (
            <div className="space-y-4">
              {/* Severity bars */}
              <div className="space-y-3">
                {SEVERITY_ORDER.filter((s) => (summary.findingsBySeverity[s] ?? 0) > 0).map((s) => {
                  const count = summary.findingsBySeverity[s] ?? 0;
                  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={s}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">{s}</span>
                        <span className="text-xs text-ink/50">{count}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-ink/5">
                        <div
                          className={`h-2 rounded-full transition-all duration-700 ${SEVERITY_BAR[s]}`}
                          style={{ width: barsReady ? `${pct}%` : "0%" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* By type */}
              {Object.keys(summary.findingsByType).length > 0 && (
                <div className="border-t border-ink/5 pt-4">
                  <div className="text-xs uppercase tracking-wider text-ink/40 mb-2">By type</div>
                  <div>
                    {Object.entries(summary.findingsByType)
                      .sort(([, a], [, b]) => b - a)
                      .map(([type, count]) => (
                        <div
                          key={type}
                          className="flex justify-between border-b border-ink/5 py-1 text-sm last:border-0"
                        >
                          <span className="text-ink/80">{formatType(type)}</span>
                          <span className="font-medium tabular-nums">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent scans */}
        <div className="rounded-xl border border-ink/10 p-5">
          <div className="text-sm font-semibold uppercase tracking-wider text-ink/50 mb-4">
            Recent scans
          </div>
          {summary.recentScans.length === 0 ? (
            <p className="text-sm text-ink/40">
              No scans yet.{" "}
              <a href="/scans" className="font-medium text-brand-dark hover:underline">
                Run your first scan
              </a>
              .
            </p>
          ) : (
            <>
              <div className="space-y-3">
                {summary.recentScans.map((scan) => {
                  const total = scanResourceTotal(scan);
                  return (
                    <div key={scan.id} className="flex items-start gap-3">
                      <span
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                          scan.status === "success"
                            ? "bg-green-400"
                            : scan.status === "error"
                              ? "bg-red-400"
                              : "animate-pulse bg-amber-400"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium text-ink/80">
                            {timeAgo(scan.createdAt)}
                          </span>
                          <span className="text-xs text-ink/40">
                            {scan.status === "success"
                              ? "Completed"
                              : scan.status === "error"
                                ? "Failed"
                                : "Running"}
                          </span>
                        </div>
                        <div className="text-xs text-ink/50">
                          {total > 0 ? `${total} resources` : "0 resources"}
                          {scan.stats.errors.length > 0 && (
                            <span className="ml-2 text-red-400">
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
              <div className="mt-4 border-t border-ink/5 pt-4">
                <a href="/scans" className="text-sm text-brand-dark hover:underline">
                  View all scans →
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top opportunities */}
      {total > 0 && topTypes.length > 0 && (
        <div className="rounded-xl border border-ink/10 p-5">
          <div className="text-sm font-semibold uppercase tracking-wider text-ink/50 mb-4">
            Top opportunities
          </div>
          <div className="divide-y divide-ink/5">
            {topTypes.map(([type, count]) => (
              <div key={type} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-ink/90">{formatType(type)}</span>
                  <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs font-medium text-ink/60">
                    {count} {count === 1 ? "finding" : "findings"}
                  </span>
                </div>
                <a
                  href="/findings"
                  className="text-sm font-medium text-brand-dark hover:underline"
                >
                  View findings →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
