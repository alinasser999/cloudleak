"use client";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedNumber, fadeUp, staggerParent } from "../../../components/motion";
import { Panel, StatTile, Eyebrow, sev } from "../../../components/ui";
import {
  IconAlert,
  IconDollar,
  IconCopy,
  IconCheck,
  IconArrowRight,
} from "../../../components/icons";

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

function SeverityBadge({ severity }: { severity: string }) {
  const s = sev(severity);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${s.chip}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
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
        <p className="text-sm text-ink-muted">No remediation available.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="mb-3 flex gap-1.5">
        {(["terraform", "manual"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
              tab === t
                ? "bg-brand text-canvas"
                : "bg-line/8 text-ink-muted hover:bg-line/15 hover:text-ink"
            }`}
          >
            {t === "terraform" ? "Terraform" : "Manual steps"}
          </button>
        ))}
      </div>

      {tab === "terraform" ? (
        <div className="relative">
          <pre className="max-h-64 overflow-auto whitespace-pre rounded-xl border border-line/10 bg-canvas/80 p-4 font-mono text-xs leading-relaxed text-brand-bright">
            {finding.terraformFix}
          </pre>
          <button
            onClick={copy}
            className="absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-lg border border-line/15 bg-surface/80 px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:text-ink"
          >
            {copied ? <IconCheck className="h-3.5 w-3.5 text-brand-bright" /> : <IconCopy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : (
        <div className="space-y-1.5 pl-1">
          {(finding.manualFix ?? "")
            .split("\n")
            .filter(Boolean)
            .map((step, i) => (
              <p key={i} className="text-sm text-ink-muted">
                {step}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative rounded-full px-3 py-1 capitalize transition-colors duration-150 ${
        active ? "text-canvas" : "bg-line/[0.04] text-ink-muted hover:bg-line/10 hover:text-ink"
      }`}
    >
      {active && (
        <motion.span
          layoutId="findings-filter-pill"
          className="absolute inset-0 rounded-full bg-brand"
          transition={{ type: "spring", stiffness: 500, damping: 38 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
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
    <div className="max-w-5xl space-y-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Findings</h1>
        <p className="mt-1.5 text-sm text-ink-muted">
          Waste detected from your most recent scan. Dismiss findings you&apos;ve intentionally
          accepted.
        </p>
      </div>

      {/* Summary cards */}
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
            value={<AnimatedNumber value={openFindings.length} />}
          />
        </motion.div>
        <motion.div variants={fadeUp}>
          <StatTile
            hero
            label="Est. monthly savings"
            icon={<IconDollar className="h-4 w-4" />}
            value={<AnimatedNumber value={totalSavings} format={usd} />}
          />
        </motion.div>
        <motion.div variants={fadeUp} className="rounded-2xl border border-line/10 bg-surface/60 p-4 panel-hairline">
          <Eyebrow>By severity</Eyebrow>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {SEVERITY_ORDER.filter((s) => countBySeverity[s]).map((s) => (
              <span
                key={s}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${sev(s).chip}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${sev(s).dot}`} />
                {countBySeverity[s]} {s}
              </span>
            ))}
            {openFindings.length === 0 && <span className="text-sm text-ink-muted">—</span>}
          </div>
        </motion.div>
      </motion.div>

      {/* Filters */}
      {findings.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <div className="flex flex-wrap gap-2">
            <FilterPill active={severityFilter === "all"} onClick={() => setSeverityFilter("all")}>
              All ({openFindings.length})
            </FilterPill>
            {activeSeverities.map((s) => (
              <FilterPill key={s} active={severityFilter === s} onClick={() => setSeverityFilter(s)}>
                {s} ({countBySeverity[s] ?? 0})
              </FilterPill>
            ))}
          </div>
          {dismissedFindings.length > 0 && (
            <button
              onClick={() => setShowDismissed((v) => !v)}
              className={`ml-auto rounded-full px-3 py-1 text-xs transition ${
                showDismissed ? "bg-line/10 text-ink" : "text-ink-muted hover:text-ink"
              }`}
            >
              {showDismissed ? "Hide dismissed" : `Show dismissed (${dismissedFindings.length})`}
            </button>
          )}
        </div>
      )}

      {/* Content */}
      {!loaded ? (
        <p className="text-sm text-ink-muted">Loading…</p>
      ) : openFindings.length === 0 && !showDismissed ? (
        <Panel className="px-4 py-3.5 text-sm text-ink-muted">
          No findings.{" "}
          <a className="font-medium text-brand-bright hover:underline" href="/scans">
            Run a scan
          </a>{" "}
          on the Scans page to detect waste.
        </Panel>
      ) : shown.length === 0 ? (
        <p className="text-sm text-ink-muted">No findings match the current filter.</p>
      ) : (
        <Panel className="overflow-hidden">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line/10 bg-surface-raised/40 text-left">
                <th className="px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted/70">Severity</th>
                <th className="px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted/70">Finding</th>
                <th className="px-4 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted/70">Resource</th>
                <th className="px-4 py-3 text-right font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-muted/70">Savings/mo</th>
                <th className="px-4 py-3" />
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
                      className={`border-b border-line/5 transition-colors last:border-b-0 hover:bg-line/[0.03] ${
                        isDismissed ? "opacity-40" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <SeverityBadge severity={f.severity} />
                      </td>
                      <td className="max-w-xs px-4 py-3">
                        <div className="font-medium text-ink">{f.title}</div>
                        {f.description && (
                          <div className="mt-0.5 line-clamp-1 text-xs text-ink-muted">{f.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">
                        {f.resourceId ? f.resourceId.slice(0, 8) + "…" : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-brand-bright">
                        {f.estimatedMonthlySavings != null ? usd(f.estimatedMonthlySavings) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {!isDismissed && (
                            <button
                              onClick={() => toggleFix(f.id)}
                              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ring-1 transition ${
                                isExpanded
                                  ? "bg-brand text-canvas ring-brand"
                                  : "text-ink-muted ring-line/20 hover:text-ink hover:ring-line/40"
                              }`}
                            >
                              {isExpanded ? "Close" : "Fix"}
                              {!isExpanded && <IconArrowRight className="h-3 w-3" />}
                            </button>
                          )}
                          <button
                            onClick={() => void setStatus(f.id, isDismissed ? "open" : "dismissed")}
                            disabled={isBusy}
                            className="rounded-lg px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:bg-line/8 hover:text-ink disabled:opacity-40"
                          >
                            {isBusy ? "…" : isDismissed ? "Reopen" : "Dismiss"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <tr className="bg-canvas/30">
                          <td colSpan={5} className="p-0">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                              className="overflow-hidden border-b border-line/5"
                            >
                              <RemediationPanel finding={f} />
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </Panel>
      )}
    </div>
  );
}
