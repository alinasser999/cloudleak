"use client";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

interface Finding {
  id: string;
  awsAccountId: string;
  resourceId: string | null;
  findingType: string;
  severity: string;
  estimatedMonthlySavings: number | null;
  title: string;
  description: string | null;
  status: string;
  terraformFix: string | null;
  manualFix: string | null;
}

const usd = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const SEVERITY_ORDER = ["critical", "high", "medium", "low"] as const;

const SEVERITY_BADGE: Record<string, string> = {
  critical: "bg-red-50 text-red-700 ring-red-200",
  high: "bg-amber-50 text-amber-700 ring-amber-200",
  medium: "bg-yellow-50 text-yellow-700 ring-yellow-200",
  low: "bg-sky-50 text-sky-700 ring-sky-200",
};

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-yellow-500",
  low: "bg-sky-500",
};

const SEVERITY_BORDER: Record<string, string> = {
  critical: "border-l-red-400",
  high: "border-l-amber-400",
  medium: "border-l-yellow-400",
  low: "border-l-sky-300",
};

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${
        SEVERITY_BADGE[severity] ?? "bg-ink/5 text-ink/60 ring-ink/10"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_DOT[severity] ?? "bg-ink/40"}`} />
      {severity}
    </span>
  );
}

function RemediationPanel({ finding }: { finding: Finding }) {
  const [tab, setTab] = useState<"terraform" | "manual">("terraform");
  const [copied, setCopied] = useState(false);

  function copy() {
    if (!finding.terraformFix) return;
    void navigator.clipboard.writeText(finding.terraformFix).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  if (!finding.terraformFix) {
    return (
      <div className="px-4 py-4">
        <p className="text-sm text-ink/40">No remediation available.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="mb-3 flex gap-1">
        {(["terraform", "manual"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
              tab === t ? "bg-ink text-white" : "bg-ink/10 text-ink/60 hover:bg-ink/15"
            }`}
          >
            {t === "terraform" ? "Terraform" : "Manual steps"}
          </button>
        ))}
      </div>

      {tab === "terraform" ? (
        <div className="relative">
          <pre className="max-h-64 overflow-y-auto overflow-x-auto whitespace-pre rounded-lg bg-[#0d1117] p-4 font-mono text-xs leading-relaxed text-emerald-300">
            {finding.terraformFix}
          </pre>
          <button
            onClick={copy}
            className="absolute right-2 top-2 rounded bg-white/10 px-2 py-0.5 text-xs font-medium text-ink/50 transition hover:bg-white/20"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      ) : (
        <div className="space-y-1.5 pl-1">
          {(finding.manualFix ?? "")
            .split("\n")
            .filter(Boolean)
            .map((step, i) => (
              <p key={i} className="text-sm text-ink/80">
                {step}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}

export function FindingsClient({ organizationId }: { organizationId: string }) {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [showDismissed, setShowDismissed] = useState(false);
  const [dismissing, setDismissing] = useState<Set<string>>(new Set());
  const [expandedFixId, setExpandedFixId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/findings?organizationId=${organizationId}`);
    if (res.ok) setFindings((await res.json()).findings);
    setLoaded(true);
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  function toggleFix(id: string) {
    setExpandedFixId((prev) => (prev === id ? null : id));
  }

  const openFindings = useMemo(() => findings.filter((f) => f.status === "open"), [findings]);
  const dismissedFindings = useMemo(
    () => findings.filter((f) => f.status === "dismissed"),
    [findings],
  );

  const totalSavings = useMemo(
    () => openFindings.reduce((a, f) => a + (f.estimatedMonthlySavings ?? 0), 0),
    [openFindings],
  );

  const countBySeverity = useMemo(() => {
    const m: Record<string, number> = {};
    for (const f of openFindings) m[f.severity] = (m[f.severity] ?? 0) + 1;
    return m;
  }, [openFindings]);

  const activeSeverities = SEVERITY_ORDER.filter((s) => openFindings.some((f) => f.severity === s));

  const shown = useMemo(() => {
    const base = showDismissed ? findings : openFindings;
    return severityFilter === "all" ? base : base.filter((f) => f.severity === severityFilter);
  }, [findings, openFindings, severityFilter, showDismissed]);

  async function setStatus(id: string, status: "dismissed" | "open") {
    setDismissing((prev) => new Set(prev).add(id));
    if (expandedFixId === id) setExpandedFixId(null);
    const res = await fetch(`/api/findings/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ organizationId, status }),
    });
    if (res.ok) {
      setFindings((prev) => prev.map((f) => (f.id === id ? { ...f, status } : f)));
    }
    setDismissing((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Findings</h1>
        <p className="mt-1 text-sm text-ink/60">
          Waste detected from your most recent scan. Dismiss findings you&apos;ve intentionally
          accepted.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-ink/10 p-4">
          <div className="text-xs uppercase tracking-wider text-ink/40">Open findings</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums">{openFindings.length}</div>
        </div>
        <div className="rounded-xl border border-ink/10 bg-brand/[0.04] p-4">
          <div className="text-xs uppercase tracking-wider text-brand-dark/70">
            Est. monthly savings
          </div>
          <div className="mt-1 text-3xl font-semibold tabular-nums text-brand-dark">
            {usd(totalSavings)}
          </div>
        </div>
        <div className="rounded-xl border border-ink/10 p-4">
          <div className="text-xs uppercase tracking-wider text-ink/40">By severity</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SEVERITY_ORDER.filter((s) => countBySeverity[s]).map((s) => (
              <span
                key={s}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${SEVERITY_BADGE[s]}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_DOT[s]}`} />
                {countBySeverity[s]} {s}
              </span>
            ))}
            {openFindings.length === 0 && <span className="text-sm text-ink/40">—</span>}
          </div>
        </div>
      </div>

      {/* Filters */}
      {findings.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSeverityFilter("all")}
              className={`rounded-full px-3 py-1 transition ${
                severityFilter === "all"
                  ? "bg-ink text-white"
                  : "bg-ink/5 text-ink/70 hover:bg-ink/10"
              }`}
            >
              All ({openFindings.length})
            </button>
            {activeSeverities.map((s) => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={`rounded-full px-3 py-1 capitalize transition ${
                  severityFilter === s
                    ? "bg-ink text-white"
                    : "bg-ink/5 text-ink/70 hover:bg-ink/10"
                }`}
              >
                {s} ({countBySeverity[s] ?? 0})
              </button>
            ))}
          </div>
          {dismissedFindings.length > 0 && (
            <button
              onClick={() => setShowDismissed((v) => !v)}
              className={`ml-auto rounded-full px-3 py-1 text-xs transition ${
                showDismissed ? "bg-ink/10 text-ink/70" : "text-ink/40 hover:text-ink/60"
              }`}
            >
              {showDismissed
                ? "Hide dismissed"
                : `Show dismissed (${dismissedFindings.length})`}
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {!loaded ? (
        <p className="text-sm text-ink/40">Loading…</p>
      ) : openFindings.length === 0 && !showDismissed ? (
        <p className="rounded-lg border border-dashed border-ink/15 bg-ink/[0.02] px-4 py-3 text-sm text-ink/60">
          No findings.{" "}
          <a className="font-medium text-brand-dark hover:underline" href="/scans">
            Run a scan
          </a>{" "}
          on the Scans page to detect waste.
        </p>
      ) : shown.length === 0 ? (
        <p className="text-sm text-ink/50">No findings match the current filter.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-ink/10">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink/10 bg-ink/[0.02] text-left text-xs uppercase tracking-wider text-ink/40">
                <th className="px-4 py-2.5 font-medium">Severity</th>
                <th className="px-4 py-2.5 font-medium">Finding</th>
                <th className="px-4 py-2.5 font-medium">Resource</th>
                <th className="px-4 py-2.5 text-right font-medium">Savings/mo</th>
                <th className="px-4 py-2.5 font-medium" />
              </tr>
            </thead>
            <tbody>
              {shown.map((f) => {
                const isDismissed = f.status === "dismissed";
                const isBusy = dismissing.has(f.id);
                const isExpanded = expandedFixId === f.id;
                return (
                  <Fragment key={f.id}>
                    <tr
                      className={`border-b border-l-2 border-ink/5 transition last:border-b-0 hover:bg-ink/[0.015] ${
                        SEVERITY_BORDER[f.severity] ?? "border-l-ink/10"
                      } ${isDismissed ? "opacity-40" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <SeverityBadge severity={f.severity} />
                      </td>
                      <td className="max-w-xs px-4 py-3">
                        <div className="font-medium text-ink/90">{f.title}</div>
                        {f.description && (
                          <div className="mt-0.5 line-clamp-1 text-xs text-ink/50">
                            {f.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink/60">
                        {f.resourceId ? f.resourceId.slice(0, 8) + "…" : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-brand-dark">
                        {f.estimatedMonthlySavings != null ? usd(f.estimatedMonthlySavings) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {!isDismissed && (
                            <button
                              onClick={() => toggleFix(f.id)}
                              className={`rounded px-2.5 py-1 text-xs font-medium ring-1 transition ${
                                isExpanded
                                  ? "bg-ink text-white ring-ink"
                                  : "text-ink/60 ring-ink/20 hover:text-ink/80 hover:ring-ink/40"
                              }`}
                            >
                              {isExpanded ? "Close" : "Fix →"}
                            </button>
                          )}
                          <button
                            onClick={() => void setStatus(f.id, isDismissed ? "open" : "dismissed")}
                            disabled={isBusy}
                            className="rounded px-2.5 py-1 text-xs font-medium text-ink/50 transition hover:bg-ink/5 hover:text-ink/80 disabled:opacity-40"
                          >
                            {isBusy ? "…" : isDismissed ? "Reopen" : "Dismiss"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-ink/5 bg-ink/[0.02]">
                        <td colSpan={5}>
                          <RemediationPanel finding={f} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
