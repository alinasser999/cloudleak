"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { EASE_OUT } from "../../../components/motion";
import { useToast } from "../../../components/toast";

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
  success: "bg-emerald-400",
  error: "bg-red-400",
  running: "bg-amber-400 animate-pulse",
  queued: "bg-ink/30 animate-pulse",
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
    return <p className="text-sm text-ink/40">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="mt-1 text-sm text-ink/50">
            Scan history and savings analysis for your organization.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => void sendDigest()}
            disabled={sending}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {sending ? "Sending…" : "Send weekly digest"}
          </motion.button>
        </div>
      </motion.div>

      {/* Summary cards */}
      <motion.div
        variants={cardContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-4 gap-4"
      >
        <motion.div variants={cardItem} className="rounded-xl border border-ink/10 bg-brand/[0.04] p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-ink/40">
            Savings identified
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-brand">
            {usd(summary.totalMonthlySavings)}
            <span className="ml-1 text-sm font-normal text-ink/40">/mo</span>
          </p>
        </motion.div>
        <motion.div variants={cardItem} className="rounded-xl border border-ink/10 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-ink/40">Open findings</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{summary.openFindingsCount}</p>
        </motion.div>
        <motion.div variants={cardItem} className="rounded-xl border border-ink/10 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-ink/40">Total scans</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{allScans.length}</p>
        </motion.div>
        <motion.div variants={cardItem} className="rounded-xl border border-ink/10 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-ink/40">
            Resources tracked
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{summary.resourceCount}</p>
        </motion.div>
      </motion.div>

      {/* Two-column: findings breakdown + scan history */}
      <div className="grid grid-cols-5 gap-6">
        {/* Findings by type */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.18 }}
          className="col-span-2 rounded-xl border border-ink/10 p-5"
        >
          <p className="text-sm font-semibold uppercase tracking-wider text-ink/50 mb-4">
            Findings by type
          </p>
          {Object.keys(summary.findingsByType).length === 0 ? (
            <p className="text-sm text-ink/40">No open findings.</p>
          ) : (
            <ul className="space-y-2">
              {Object.entries(summary.findingsByType)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => (
                  <li
                    key={type}
                    className="flex items-center justify-between py-1 border-b border-ink/5 last:border-0"
                  >
                    <span className="text-sm">{formatType(type)}</span>
                    <span className="rounded-full bg-ink/10 px-2 py-0.5 text-xs font-medium tabular-nums">
                      {count}
                    </span>
                  </li>
                ))}
            </ul>
          )}

          {Object.keys(summary.findingsBySeverity).length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-semibold uppercase tracking-wider text-ink/50 mb-3">
                By severity
              </p>
              <ul className="space-y-2">
                {(["critical", "high", "medium", "low"] as const).map((sev, i) => {
                  const count = summary.findingsBySeverity[sev] ?? 0;
                  if (!count) return null;
                  const pct = Math.round((count / summary.openFindingsCount) * 100);
                  const fillColor =
                    sev === "critical"
                      ? "bg-red-500"
                      : sev === "high"
                        ? "bg-amber-400"
                        : sev === "medium"
                          ? "bg-yellow-400"
                          : "bg-sky-400";
                  return (
                    <li key={sev}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium capitalize">{sev}</span>
                        <span className="text-ink/50 text-xs">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-ink/5">
                        <motion.div
                          className={`h-1.5 rounded-full ${fillColor}`}
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
        </motion.div>

        {/* Scan history */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.24 }}
          className="col-span-3 rounded-xl border border-ink/10 p-5"
        >
          <p className="text-sm font-semibold uppercase tracking-wider text-ink/50 mb-4">
            Scan history
          </p>
          {allScans.length === 0 ? (
            <p className="text-sm text-ink/40">No scans yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left">
                  <th className="pb-2 text-xs font-medium text-ink/40">Date</th>
                  <th className="pb-2 text-xs font-medium text-ink/40">Status</th>
                  <th className="pb-2 text-xs font-medium text-ink/40 text-right">Resources</th>
                  <th className="pb-2 text-xs font-medium text-ink/40 text-right">Cost tracked</th>
                  <th className="pb-2 text-xs font-medium text-ink/40 text-right">Duration</th>
                </tr>
              </thead>
              <tbody>
                {allScans.map((scan) => (
                  <tr key={scan.id} className="border-b border-ink/5 last:border-0">
                    <td className="py-2 text-ink/70">{timeAgo(scan.createdAt)}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT[scan.status] ?? "bg-ink/20"}`}
                        />
                        <span className="text-xs text-ink/60">
                          {STATUS_LABEL[scan.status] ?? scan.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 text-right tabular-nums text-ink/70">
                      {resourceTotal(scan.stats)}
                    </td>
                    <td className="py-2 text-right tabular-nums text-ink/70">
                      {usd(scan.stats.totalMonthlyCost)}
                    </td>
                    <td className="py-2 text-right text-ink/50">{duration(scan)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>
      </div>

      {/* Digest info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.35 }}
        className="rounded-xl border border-ink/10 bg-ink/[0.02] p-5"
      >
        <p className="text-sm font-semibold uppercase tracking-wider text-ink/50 mb-2">
          Weekly digest
        </p>
        <p className="text-sm text-ink/60">
          The weekly digest email summarizes your top savings opportunities and recent scan activity.
          Click <span className="font-medium text-ink">"Send weekly digest"</span> above to send it
          to your account email immediately. To automate it, schedule the{" "}
          <code className="rounded bg-ink/10 px-1 text-xs">POST /api/reports/digest</code> endpoint
          via a cron job or Supabase Edge Function.
        </p>
      </motion.div>
    </div>
  );
}
