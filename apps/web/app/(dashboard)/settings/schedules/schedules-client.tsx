"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { EASE_OUT } from "../../../../components/motion";
import { Panel, Eyebrow, PageHeading } from "../../../../components/ui";
import { IconClock, IconInfo, IconArrowRight } from "../../../../components/icons";

// Concrete colors for framer color interpolation (CSS vars can't be tweened).
const BRAND = "#008D96";
const OFF = "rgba(0,141,150,0.14)";

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
    <div className="relative flex rounded-xl border border-line/10 bg-line/[0.04] p-0.5">
      <motion.span
        layoutId={`freq-pill-${id}`}
        className="pointer-events-none absolute bottom-0.5 top-0.5 rounded-lg border border-line/15 bg-surface-raised shadow-sm"
        style={{ width: `calc(${100 / 3}% - 2px)`, left: `calc(${(idx * 100) / 3}% + 2px)` }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />
      {FREQ_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`relative z-10 flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors duration-150 ${
            value === opt.value ? "text-ink" : "text-ink-muted hover:text-ink"
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
        on ? "bg-brand" : "bg-line/15"
      }`}
      role="switch"
      aria-checked={on}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-ink shadow"
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

  const dirty = state.frequency !== schedule.frequency || state.enabled !== schedule.enabled;

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
      className="overflow-hidden rounded-2xl border border-line/10 bg-surface/60 panel-hairline"
    >
      <motion.div className="h-0.5" animate={{ backgroundColor: isActive ? BRAND : OFF }} transition={{ duration: 0.3 }} />

      <div className="p-5">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <Eyebrow>AWS Account</Eyebrow>
            <p className="mt-1 font-mono text-sm font-medium text-ink">
              {schedule.awsAccountIdentifier ?? <span className="italic text-ink-muted">pending</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-ink-muted">
              {state.enabled ? "Enabled" : "Disabled"}
            </span>
            <Toggle on={state.enabled} onChange={(v) => setState((s) => ({ ...s, enabled: v }))} />
          </div>
        </div>

        <div className="mb-5">
          <Eyebrow>Frequency</Eyebrow>
          <div className="mt-2">
            <FrequencyToggle
              id={schedule.awsAccountId}
              value={state.frequency}
              onChange={(v) => setState((s) => ({ ...s, frequency: v }))}
            />
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-line/8 bg-canvas/40 px-3 py-2.5">
            <Eyebrow>Next scan</Eyebrow>
            <p className="mt-1 font-mono text-xs font-medium text-ink-muted">
              {!isActive ? "—" : schedule.nextScanAt ? timeUntil(schedule.nextScanAt) : "scheduling…"}
            </p>
          </div>
          <div className="rounded-xl border border-line/8 bg-canvas/40 px-3 py-2.5">
            <Eyebrow>Last scan</Eyebrow>
            <p className="mt-1 font-mono text-xs font-medium text-ink-muted">
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
              className="mb-3 overflow-hidden text-xs text-rose-600"
            >
              {state.error}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <motion.span
              animate={{ backgroundColor: isActive ? BRAND : OFF }}
              transition={{ duration: 0.3 }}
              className={`inline-block h-1.5 w-1.5 rounded-full ${isActive ? "animate-pulse" : ""}`}
            />
            <span className="text-[11px] text-ink-muted">
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
            className={`rounded-xl px-4 py-1.5 text-xs font-semibold transition-all duration-150 ${
              state.saved
                ? "bg-brand/15 text-brand-bright"
                : dirty
                  ? "bg-brand text-canvas shadow-glow-sm hover:bg-brand-bright"
                  : "cursor-default bg-line/8 text-ink-faint"
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
      className="overflow-hidden rounded-2xl border border-line/10 bg-surface/40"
    >
      <div className="h-0.5 bg-line/8" />
      <div className="space-y-4 p-5">
        <div className="flex justify-between">
          <div className="space-y-1.5">
            <div className="h-2 w-20 animate-pulse rounded bg-line/8" />
            <div className="h-4 w-32 animate-pulse rounded bg-line/8" />
          </div>
          <div className="h-5 w-9 animate-pulse rounded-full bg-line/8" />
        </div>
        <div className="h-8 animate-pulse rounded-lg bg-line/5" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-14 animate-pulse rounded-lg bg-line/5" />
          <div className="h-14 animate-pulse rounded-lg bg-line/5" />
        </div>
        <div className="flex justify-end">
          <div className="h-7 w-16 animate-pulse rounded-lg bg-line/5" />
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
    <div className="max-w-2xl space-y-7">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <PageHeading
          title="Scan schedules"
          actions={
            <div className="rounded-xl border border-line/10 bg-surface/60 px-3 py-2 text-right">
              <Eyebrow>Timezone</Eyebrow>
              <p className="mt-0.5 font-mono text-xs font-medium text-ink-muted">UTC</p>
            </div>
          }
        >
          Automatically scan connected accounts on a recurring basis.
        </PageHeading>
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
        >
          <Panel className="p-10 text-center">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-brand/15 text-brand-bright">
              <IconClock className="h-5 w-5" />
            </span>
            <p className="mt-4 text-sm font-medium text-ink">No connected accounts</p>
            <p className="mt-1 text-xs text-ink-muted">
              Connect an AWS account first, then configure its scan schedule here.
            </p>
            <Link
              href="/settings/aws"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-canvas shadow-glow-sm hover:bg-brand-bright"
            >
              Connect AWS account
              <IconArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Panel>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {schedules.map((s, i) => (
            <ScheduleCard key={s.id} schedule={s} organizationId={organizationId} index={i} />
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
            className="flex gap-3 rounded-xl border border-line/10 bg-surface/40 px-4 py-3"
          >
            <IconInfo className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted/60" />
            <p className="text-xs leading-relaxed text-ink-muted">
              Scheduled scans run via the CloudLeak worker process. Ensure the worker is running in
              production. Daily scans trigger at midnight UTC; weekly scans trigger on Mondays.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
