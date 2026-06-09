"use client";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useToast } from "../../../components/toast";
import { Panel, Eyebrow } from "../../../components/ui";
import { IconScan, IconArrowRight } from "../../../components/icons";

interface Account {
  id: string;
  accountId: string | null;
  status: string;
}
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

const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const totalCount = (s: ScanStats) =>
  Object.values(s.resourceCounts ?? {}).reduce((a, b) => a + b, 0);

const STATUS_STYLES: Record<string, string> = {
  queued: "bg-line/8 text-ink-muted ring-line/15",
  running: "bg-amber-400/15 text-amber-100 ring-amber-300/30",
  success: "bg-brand/15 text-brand-bright ring-brand/30",
  error: "bg-rose-500/15 text-rose-200 ring-rose-400/30",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${
        STATUS_STYLES[status] ?? "bg-line/8 text-ink-muted ring-line/15"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full bg-current ${status === "running" ? "animate-pulse" : ""}`} />
      {status}
    </span>
  );
}

export function ScansClient({ organizationId }: { organizationId: string }) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const refresh = useCallback(async () => {
    const [s, a] = await Promise.all([
      fetch(`/api/scans?organizationId=${organizationId}`),
      fetch(`/api/aws/accounts?organizationId=${organizationId}`),
    ]);
    if (s.ok) setScans((await s.json()).scans);
    if (a.ok) setAccounts((await a.json()).accounts);
  }, [organizationId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const active = scans.some((s) => s.status === "queued" || s.status === "running");
    if (!active) return;
    const id = setInterval(() => void refresh(), 3000);
    return () => clearInterval(id);
  }, [scans, refresh]);

  const connected = accounts.filter((a) => a.status === "connected");

  async function runScan(awsAccountId: string) {
    setBusy(true);
    const res = await fetch("/api/scans", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ organizationId, awsAccountId }),
    });
    if (res.ok) {
      await refresh();
      toast.success("Scan queued");
    } else {
      const body = await res.json().catch(() => null);
      toast.error(body?.error?.message ?? "Scan failed");
    }
    setBusy(false);
  }

  return (
    <div className="max-w-4xl space-y-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Scans</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Run a scan to inventory waste across your connected AWS accounts.
        </p>
      </div>

      {connected.length === 0 ? (
        <Panel className="px-4 py-3.5 text-sm text-ink-muted">
          No connected accounts.{" "}
          <a className="font-medium text-brand-bright hover:underline" href="/settings/aws">
            Connect an AWS account
          </a>{" "}
          to run your first scan.
        </Panel>
      ) : (
        <div className="flex flex-wrap gap-2">
          {connected.map((a) => (
            <motion.button
              key={a.id}
              onClick={() => runScan(a.id)}
              disabled={busy}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-canvas shadow-glow-sm transition-colors hover:bg-brand-bright disabled:opacity-50"
            >
              <IconScan className={`h-4 w-4 ${busy ? "animate-pulse" : ""}`} />
              {busy ? "Queuing…" : `Run scan · ${a.accountId ?? a.id.slice(0, 8)}`}
            </motion.button>
          ))}
        </div>
      )}

      <section className="space-y-3">
        <Eyebrow>History</Eyebrow>
        {scans.length === 0 ? (
          <p className="text-sm text-ink-muted">No scans yet.</p>
        ) : (
          <Panel className="overflow-hidden">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line/10 bg-surface-raised/40 text-left">
                  <th className="px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted/70">Started</th>
                  <th className="px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted/70">Status</th>
                  <th className="px-4 py-3 text-right font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted/70">Resources</th>
                  <th className="px-4 py-3 text-right font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted/70">Monthly cost</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((s, i) => (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.4), ease: [0.16, 1, 0.3, 1] }}
                    className="border-b border-line/5 last:border-0 hover:bg-line/[0.03]"
                  >
                    <td className="px-4 py-3 text-ink-muted">
                      {s.startedAt ? new Date(s.startedAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-ink">{totalCount(s.stats)}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium tabular-nums text-ink">
                      {usd(s.stats?.totalMonthlyCost ?? 0)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </Panel>
        )}
      </section>
    </div>
  );
}
