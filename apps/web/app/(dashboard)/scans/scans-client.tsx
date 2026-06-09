"use client";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useToast } from "../../../components/toast";

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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    queued: "bg-ink/5 text-ink/60 ring-ink/15",
    running: "bg-amber-50 text-amber-700 ring-amber-200",
    success: "bg-brand/10 text-brand-dark ring-brand/20",
    error: "bg-red-50 text-red-600 ring-red-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
        styles[status] ?? "bg-ink/5 text-ink/60 ring-ink/10"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
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

  // Auto-refresh every 3s while any scan is queued or running
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
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Scans</h1>
        <p className="mt-1 text-sm text-ink/60">
          Run a scan to inventory waste across your connected AWS accounts.
        </p>
      </div>

      {connected.length === 0 ? (
        <p className="rounded-lg border border-dashed border-ink/15 bg-ink/[0.02] px-4 py-3 text-sm text-ink/60">
          No connected accounts.{" "}
          <a className="font-medium text-brand-dark hover:underline" href="/settings/aws">
            Connect an AWS account
          </a>{" "}
          to run your first scan.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {connected.map((a) => (
            <motion.button
              key={a.id}
              onClick={() => runScan(a.id)}
              disabled={busy}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-50"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full bg-white ${busy ? "animate-pulse" : ""}`}
              />
              {busy ? "Queuing…" : `Run scan · ${a.accountId ?? a.id.slice(0, 8)}`}
            </motion.button>
          ))}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink/40">History</h2>
        {scans.length === 0 ? (
          <p className="text-sm text-ink/50">No scans yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-ink/10">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink/10 bg-ink/[0.02] text-left text-xs uppercase tracking-wider text-ink/40">
                  <th className="px-4 py-2.5 font-medium">Started</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Resources</th>
                  <th className="px-4 py-2.5 text-right font-medium">Monthly cost</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((s, i) => (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(i * 0.03, 0.4), ease: [0.16, 1, 0.3, 1] }}
                    className="border-b border-ink/5 last:border-0 hover:bg-ink/[0.015]"
                  >
                    <td className="px-4 py-3 text-ink/70">
                      {s.startedAt ? new Date(s.startedAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{totalCount(s.stats)}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {usd(s.stats?.totalMonthlyCost ?? 0)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
