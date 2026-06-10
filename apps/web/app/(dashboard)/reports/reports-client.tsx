"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { EASE_OUT } from "../../../components/motion";
import { useToast } from "../../../components/toast";
import { Panel, StatTile, Eyebrow, PageHeading, sev } from "../../../components/ui";
import { IconDollar, IconAlert, IconScan, IconServer, IconReport } from "../../../components/icons";

interface ScanStats {
  resourceCounts: Record<string, number>;
  totalMonthlyCost: number;
  errors: string[];
}

interface Scan {
  id: string;
  awsAccountId: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  stats: ScanStats;
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

const usd = (n: number) =>
  `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function duration(scan: Scan): string {
  if (!scan.startedAt || !scan.finishedAt) return "—";
  const ms = new Date(scan.finishedAt).getTime() - new Date(scan.startedAt).getTime();
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function resourceTotal(stats: ScanStats): number {
  return Object.values(stats.resourceCounts).reduce((a, b) => a + b, 0);
}

function formatType(t: string): string {
  return t
    .split("_")
    .map((w) =>
      w === "ec2" || w === "ebs" || w === "eip" || w === "rds"
        ? w.toUpperCase()
        : w.charAt(0).toUpperCase() + w.slice(1)
    )
    .join(" ");
}

const STATUS_DOT: Record<string, string> = {
  success: "bg-brand",
  error: "bg-rose-500",
  running: "bg-amber-500 animate-pulse",
  queued: "bg-ink-faint animate-pulse",
};

const STATUS_LABEL: Record<string, string> = {
  success: "Completed",
  error: "Failed",
  running: "Running",
  queued: "Queued",
};

const cardContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const cardItem = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } },
};

export function ReportsClient({ organizationId }: { organizationId: string }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [allScans, setAllScans] = useState<Scan[]>([]);
  const [sending, setSending] = useState(false);
  const toast = useToast();

  useEffect(() => {
    void Promise.all([
      fetch(`/api/dashboard/summary?organizationId=${organizationId}`)
        .then((r) => r.json())
        .then((d: { summary: DashboardSummary }) => setSummary(d.summary)),
      fetch(`/api/scans?organizationId=${organizationId}`)
        .then((r) => r.json())
        .then((d: { scans: Scan[] }) => setAllScans(d.scans)),
    ]);
  }, [organizationId]);

  async function sendDigest() {
    setSending(true);
    try {
      const res = await fetch("/api/reports/digest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: { message?: string } };
        toast.error(d.error?.message ?? "Failed to send digest");
      } else {
        toast.success("Digest sent to your email");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSending(false);
    }
  }

  if (!summary) {
    return <p className="text-sm text-ink-muted">Loading…</p>;
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <PageHeading
          title="Reports"
          actions={
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => void sendDigest()}
              disabled={sending}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-canvas shadow-glow-sm transition-colors hover:bg-brand-bright disabled:opacity-60"
            >
              <IconReport className="h-4 w-4" />
              {sending ? "Sending…" : "Send weekly digest"}
            </motion.button>
          }
        >
          Scan history and savings analysis for your organization.
        </PageHeading>
      </motion.div>

      {/* Summary cards */}
      <motion.div
        variants={cardContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <motion.div variants={cardItem}>
          <StatTile
            hero
            label="Savings identified"
            icon={<IconDollar className="h-4 w-4" />}
            value={
              <>
                {usd(summary.totalMonthlySavings)}
                <span className="ml-1 text-sm font-normal text-brand-bright/60">/mo</span>
              </>
            }
          />
        </motion.div>
        <motion.div variants={cardItem}>
          <StatTile label="Open findings" icon={<IconAlert className="h-4 w-4" />} value={summary.openFindingsCount} />
        </motion.div>
        <motion.div variants={cardItem}>
          <StatTile label="Total scans" icon={<IconScan className="h-4 w-4" />} value={allScans.length} />
        </motion.div>
        <motion.div variants={cardItem}>
          <StatTile label="Resources tracked" icon={<IconServer className="h-4 w-4" />} value={summary.resourceCount} />
        </motion.div>
      </motion.div>

      {/* Two-column: findings breakdown + scan history */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Findings by type */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.18 }}
          className="lg:col-span-2"
        >
          <Panel className="h-full p-5">
            <Eyebrow>Findings by type</Eyebrow>
            {Object.keys(summary.findingsByType).length === 0 ? (
              <p className="mt-4 text-sm text-ink-muted">No open findings.</p>
            ) : (
              <ul className="mt-4 space-y-1">
                {Object.entries(summary.findingsByType)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, count]) => (
                    <li
                      key={type}
                      className="flex items-center justify-between border-b border-line/5 py-2 last:border-0"
                    >
                      <span className="text-sm text-ink-muted">{formatType(type)}</span>
                      <span className="rounded-full bg-line/8 px-2 py-0.5 font-mono text-xs font-medium tabular-nums text-ink">
                        {count}
                      </span>
                    </li>
                  ))}
              </ul>
            )}

            {Object.keys(summary.findingsBySeverity).length > 0 && (
              <div className="mt-6">
                <Eyebrow>By severity</Eyebrow>
                <ul className="mt-3 space-y-2.5">
                  {(["critical", "high", "medium", "low"] as const).map((s, i) => {
                    const count = summary.findingsBySeverity[s] ?? 0;
                    if (!count) return null;
                    const pct = Math.round((count / summary.openFindingsCount) * 100);
                    return (
                      <li key={s}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 font-medium capitalize text-ink">
                            <span className={`h-1.5 w-1.5 rounded-full ${sev(s).dot}`} />
                            {s}
                          </span>
                          <span className="font-mono text-xs text-ink-muted">{count}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-line/[0.06]">
                          <motion.div
                            className={`h-full rounded-full ${sev(s).bar}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.7, delay: 0.3 + i * 0.08, ease: "easeOut" }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Panel>
        </motion.div>

        {/* Scan history */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.24 }}
          className="lg:col-span-3"
        >
          <Panel className="h-full p-5">
            <Eyebrow>Scan history</Eyebrow>
            {allScans.length === 0 ? (
              <p className="mt-4 text-sm text-ink-muted">No scans yet.</p>
            ) : (
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="border-b border-line/10 text-left">
                    <th className="pb-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted/70">Date</th>
                    <th className="pb-2 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted/70">Status</th>
                    <th className="pb-2 text-right font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted/70">Resources</th>
                    <th className="pb-2 text-right font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted/70">Cost tracked</th>
                    <th className="pb-2 text-right font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted/70">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {allScans.map((scan) => (
                    <tr key={scan.id} className="border-b border-line/5 last:border-0">
                      <td className="py-2.5 text-ink-muted">{timeAgo(scan.createdAt)}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT[scan.status] ?? "bg-ink-faint"}`} />
                          <span className="text-xs text-ink-muted">{STATUS_LABEL[scan.status] ?? scan.status}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums text-ink-muted">{resourceTotal(scan.stats)}</td>
                      <td className="py-2.5 text-right font-mono tabular-nums text-ink">{usd(scan.stats.totalMonthlyCost)}</td>
                      <td className="py-2.5 text-right text-ink-muted">{duration(scan)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </motion.div>
      </div>

      {/* Digest info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        <Panel className="bg-surface/40 p-5">
          <Eyebrow>Weekly digest</Eyebrow>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">
            The weekly digest email summarizes your top savings opportunities and recent scan
            activity. Click{" "}
            <span className="font-medium text-ink">&ldquo;Send weekly digest&rdquo;</span> above to
            send it to your account email immediately. To automate it, schedule the{" "}
            <code className="rounded bg-line/10 px-1.5 py-0.5 font-mono text-xs text-brand-bright">
              POST /api/reports/digest
            </code>{" "}
            endpoint via a cron job or Supabase Edge Function.
          </p>
        </Panel>
      </motion.div>
    </div>
  );
}
