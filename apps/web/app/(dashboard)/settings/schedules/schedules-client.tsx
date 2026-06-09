"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { EASE_OUT } from "../../../../components/motion";

interface Schedule {
  id: string;
  awsAccountId: string;
  awsAccountIdentifier: string | null;
  frequency: "daily" | "weekly" | "off";
  enabled: boolean;
  nextScanAt: string | null;
  lastScanAt: string | null;
}

type Frequency = "off" | "daily" | "weekly";

interface CardState {
  frequency: Frequency;
  enabled: boolean;
  saving: boolean;
  saved: boolean;
  error: string | null;
}

const FREQ_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, delay: i * 0.06, ease: EASE_OUT },
  }),
};

function timeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "overdue";
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `in ${h}h`;
  const d = Math.floor(h / 24);
  return `in ${d}d`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function FrequencyToggle({
  id,
  value,
  onChange,
}: {
  id: string;
  value: Frequency;
  onChange: (v: Frequency) => void;
}) {
  const idx = FREQ_OPTIONS.findIndex((o) => o.value === value);
  return (
    <div className="relative flex rounded-lg bg-ink/[0.04] p-0.5 border border-ink/10">
      <motion.span
        layoutId={`freq-pill-${id}`}
        className="pointer-events-none absolute top-0.5 bottom-0.5 rounded-md bg-white shadow-sm border border-ink/10"
        style={{ width: `calc(${100 / 3}% - 2px)`, left: `calc(${(idx * 100) / 3}% + 2px)` }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />
      {FREQ_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`relative z-10 flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors duration-150 ${
            value === opt.value ? "text-ink" : "text-ink/40 hover:text-ink/60"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 ${
        on ? "bg-brand" : "bg-ink/15"
      }`}
      role="switch"
      aria-checked={on}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow"
        style={{ x: on ? 16 : 2 }}
      />
    </button>
  );
}

function ScheduleCard({
  schedule,
  organizationId,
  index,
}: {
  schedule: Schedule;
  organizationId: string;
  index: number;
}) {
  const [state, setState] = useState<CardState>({
    frequency: schedule.frequency,
    enabled: schedule.enabled,
    saving: false,
    saved: false,
    error: null,
  });

  const dirty =
    state.frequency !== schedule.frequency || state.enabled !== schedule.enabled;

  async function save() {
    setState((s) => ({ ...s, saving: true, error: null }));
    try {
      const res = await fetch("/api/schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          awsAccountId: schedule.awsAccountId,
          frequency: state.frequency,
          enabled: state.enabled,
        }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: { message?: string } };
        setState((s) => ({ ...s, saving: false, error: d.error?.message ?? "Save failed" }));
        return;
      }
      setState((s) => ({ ...s, saving: false, saved: true }));
      setTimeout(() => setState((s) => ({ ...s, saved: false })), 2000);
    } catch {
      setState((s) => ({ ...s, saving: false, error: "Network error" }));
    }
  }

  const isActive = state.enabled && state.frequency !== "off";

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="group rounded-xl border border-ink/10 bg-white overflow-hidden hover:shadow-sm transition-shadow duration-200"
    >
      <motion.div
        className="h-0.5"
        animate={{ backgroundColor: isActive ? "var(--brand)" : "rgba(0,0,0,0.07)" }}
        transition={{ duration: 0.3 }}
      />

      <div className="p-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink/35 mb-1">
              AWS Account
            </p>
            <p className="font-mono text-sm font-medium text-ink">
              {schedule.awsAccountIdentifier ?? (
                <span className="text-ink/40 italic">pending</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink/40 font-medium">
              {state.enabled ? "Enabled" : "Disabled"}
            </span>
            <Toggle on={state.enabled} onChange={(v) => setState((s) => ({ ...s, enabled: v }))} />
          </div>
        </div>

        <div className="mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ink/35 mb-2">
            Frequency
          </p>
          <FrequencyToggle
            id={schedule.awsAccountId}
            value={state.frequency}
            onChange={(v) => setState((s) => ({ ...s, frequency: v }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="rounded-lg bg-ink/[0.025] border border-ink/5 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink/30 mb-1">
              Next scan
            </p>
            <p className="text-xs font-medium text-ink/70 font-mono">
              {!isActive
                ? "—"
                : schedule.nextScanAt
                  ? timeUntil(schedule.nextScanAt)
                  : "scheduling…"}
            </p>
          </div>
          <div className="rounded-lg bg-ink/[0.025] border border-ink/5 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink/30 mb-1">
              Last scan
            </p>
            <p className="text-xs font-medium text-ink/70 font-mono">
              {schedule.lastScanAt ? timeAgo(schedule.lastScanAt) : "never"}
            </p>
          </div>
        </div>

        <AnimatePresence>
          {state.error && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="text-xs text-red-500 mb-3 overflow-hidden"
            >
              {state.error}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <motion.span
              animate={{ backgroundColor: isActive ? "var(--brand)" : "rgba(0,0,0,0.1)" }}
              transition={{ duration: 0.3 }}
              className={`inline-block h-1.5 w-1.5 rounded-full ${isActive ? "animate-pulse" : ""}`}
            />
            <span className="text-[11px] text-ink/40">
              {isActive
                ? state.frequency === "daily"
                  ? "Scans every 24 hours"
                  : "Scans every 7 days"
                : "Automatic scanning off"}
            </span>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => void save()}
            disabled={state.saving || !dirty}
            className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-all duration-150 ${
              state.saved
                ? "bg-brand/10 text-brand-dark"
                : dirty
                  ? "bg-brand text-white hover:bg-brand-dark"
                  : "bg-ink/5 text-ink/30 cursor-default"
            } disabled:cursor-not-allowed`}
          >
            {state.saving ? "Saving…" : state.saved ? "Saved ✓" : "Save"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function SkeletonCard({ index }: { index: number }) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="rounded-xl border border-ink/10 overflow-hidden"
    >
      <div className="h-0.5 bg-ink/5" />
      <div className="p-5 space-y-4">
        <div className="flex justify-between">
          <div className="space-y-1.5">
            <div className="h-2 w-20 rounded bg-ink/8 animate-pulse" />
            <div className="h-4 w-32 rounded bg-ink/8 animate-pulse" />
          </div>
          <div className="h-5 w-9 rounded-full bg-ink/8 animate-pulse" />
        </div>
        <div className="h-8 rounded-lg bg-ink/5 animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-14 rounded-lg bg-ink/5 animate-pulse" />
          <div className="h-14 rounded-lg bg-ink/5 animate-pulse" />
        </div>
        <div className="flex justify-end">
          <div className="h-7 w-16 rounded-lg bg-ink/5 animate-pulse" />
        </div>
      </div>
    </motion.div>
  );
}

export function SchedulesClient({ organizationId }: { organizationId: string }) {
  const [schedules, setSchedules] = useState<Schedule[] | null>(null);

  useEffect(() => {
    void fetch(`/api/schedules?organizationId=${organizationId}`)
      .then((r) => r.json())
      .then((d: { schedules: Schedule[] }) => setSchedules(d.schedules));
  }, [organizationId]);

  return (
    <div className="max-w-2xl space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-end justify-between"
      >
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Scan schedules</h1>
          <p className="mt-1 text-sm text-ink/50">
            Automatically scan connected accounts on a recurring basis.
          </p>
        </div>
        <div className="rounded-lg border border-ink/10 bg-ink/[0.02] px-3 py-2 text-right">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ink/30">
            Timezone
          </p>
          <p className="text-xs font-mono font-medium text-ink/60">UTC</p>
        </div>
      </motion.div>

      {schedules === null ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="rounded-xl border border-ink/10 p-10 text-center"
        >
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-ink/5">
            <svg className="h-5 w-5 text-ink/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-ink/60 mb-1">No connected accounts</p>
          <p className="text-xs text-ink/40">
            Connect an AWS account first, then configure its scan schedule here.
          </p>
          <Link
            href="/settings/aws"
            className="mt-4 inline-block rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-dark"
          >
            Connect AWS account
          </Link>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {schedules.map((s, i) => (
            <ScheduleCard
              key={s.id}
              schedule={s}
              organizationId={organizationId}
              index={i}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {schedules !== null && schedules.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="rounded-lg border border-ink/10 bg-ink/[0.015] px-4 py-3 flex gap-3"
          >
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-ink/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
            <p className="text-xs text-ink/50 leading-relaxed">
              Scheduled scans run via the CloudLeak worker process. Ensure the worker is running
              in production. Daily scans trigger at midnight UTC; weekly scans trigger on Mondays.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
