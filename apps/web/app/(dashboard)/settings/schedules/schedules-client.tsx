"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
  value,
  onChange,
}: {
  value: Frequency;
  onChange: (v: Frequency) => void;
}) {
  const idx = FREQ_OPTIONS.findIndex((o) => o.value === value);
  return (
    <div className="relative flex rounded-lg bg-ink/[0.04] p-0.5 border border-ink/10">
      {/* sliding pill */}
      <span
        className="pointer-events-none absolute top-0.5 bottom-0.5 rounded-md bg-white shadow-sm border border-ink/10 transition-all duration-200 ease-out"
        style={{
          width: `calc(${100 / 3}% - 2px)`,
          left: `calc(${(idx * 100) / 3}% + 2px)`,
        }}
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
      <span
        className={`pointer-events-none inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200 ${
          on ? "translate-x-4" : "translate-x-0.5"
        }`}
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
    <div
      className="group rounded-xl border border-ink/10 bg-white overflow-hidden transition-shadow duration-200 hover:shadow-sm"
      style={{
        animationDelay: `${index * 60}ms`,
        animation: "fadeSlideIn 0.3s ease-out both",
      }}
    >
      {/* accent strip */}
      <div
        className={`h-0.5 transition-colors duration-300 ${
          isActive ? "bg-brand" : "bg-ink/10"
        }`}
      />

      <div className="p-5">
        {/* header row */}
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

        {/* frequency selector */}
        <div className="mb-5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ink/35 mb-2">
            Frequency
          </p>
          <FrequencyToggle
            value={state.frequency}
            onChange={(v) => setState((s) => ({ ...s, frequency: v }))}
          />
        </div>

        {/* meta row */}
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

        {/* footer */}
        {state.error && (
          <p className="text-xs text-red-500 mb-3">{state.error}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
                isActive ? "bg-brand animate-pulse" : "bg-ink/20"
              }`}
            />
            <span className="text-[11px] text-ink/40">
              {isActive
                ? state.frequency === "daily"
                  ? "Scans every 24 hours"
                  : "Scans every 7 days"
                : "Automatic scanning off"}
            </span>
          </div>
          <button
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
          </button>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard({ index }: { index: number }) {
  return (
    <div
      className="rounded-xl border border-ink/10 overflow-hidden"
      style={{ animationDelay: `${index * 60}ms`, animation: "fadeSlideIn 0.3s ease-out both" }}
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
    </div>
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
    <>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="max-w-2xl space-y-8">
        {/* header */}
        <div className="flex items-end justify-between">
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
        </div>

        {/* cards */}
        {schedules === null ? (
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <SkeletonCard key={i} index={i} />
            ))}
          </div>
        ) : schedules.length === 0 ? (
          <div className="rounded-xl border border-ink/10 p-10 text-center">
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
          </div>
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

        {/* info callout */}
        {schedules !== null && schedules.length > 0 && (
          <div className="rounded-lg border border-ink/10 bg-ink/[0.015] px-4 py-3 flex gap-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-ink/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
            <p className="text-xs text-ink/50 leading-relaxed">
              Scheduled scans run via the CloudLeak worker process. Ensure the worker is running
              in production. Daily scans trigger at midnight UTC; weekly scans trigger on Mondays.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
