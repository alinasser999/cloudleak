"use client";

import { useId, type ReactNode } from "react";
import { motion } from "framer-motion";
import { EASE_OUT } from "./motion";

/* ── Surfaces ──────────────────────────────────────────────────────────── */

export function Panel({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border border-line/10 bg-surface/70 panel-hairline ${className}`}
    >
      {children}
    </div>
  );
}

/** Mono micro-label for data sections (used inside panels, not as a page eyebrow). */
export function Eyebrow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-ink-muted/70 ${className}`}
    >
      {children}
    </span>
  );
}

/* ── Stat tile ─────────────────────────────────────────────────────────── */

export function StatTile({
  label,
  value,
  icon,
  hint,
  hero = false,
  className = "",
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  hero?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-4 transition-colors ${
        hero
          ? "border-brand/30 bg-brand/[0.07]"
          : "border-line/10 bg-surface/60 hover:bg-surface-raised/60"
      } panel-hairline ${className}`}
    >
      {hero && (
        <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-brand/25 blur-3xl" />
      )}
      <div className="relative flex items-start justify-between gap-2">
        <Eyebrow className={hero ? "text-brand-bright/80" : ""}>{label}</Eyebrow>
        {icon && (
          <span
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
              hero ? "bg-brand/20 text-brand-bright" : "bg-line/5 text-ink-muted"
            }`}
          >
            {icon}
          </span>
        )}
      </div>
      <div
        className={`relative mt-2 font-mono text-3xl font-semibold tabular-nums ${
          hero ? "text-brand-bright text-glow" : "text-ink"
        }`}
      >
        {value}
      </div>
      {hint && <div className="relative mt-1 text-xs text-ink-muted/70">{hint}</div>}
    </div>
  );
}

/* ── Sparkline ─────────────────────────────────────────────────────────── */

export function Sparkline({
  data,
  width = 180,
  height = 52,
  className = "",
  animate = true,
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
  animate?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const pad = 4;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`s-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgb(var(--brand))" />
          <stop offset="1" stopColor="rgb(var(--accent))" />
        </linearGradient>
        <linearGradient id={`f-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgb(var(--brand) / 0.28)" />
          <stop offset="1" stopColor="rgb(var(--brand) / 0)" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#f-${uid})`} />
      <motion.path
        d={line}
        fill="none"
        stroke={`url(#s-${uid})`}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animate ? { pathLength: 0, opacity: 0 } : false}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.1, ease: EASE_OUT }}
      />
    </svg>
  );
}

/* ── Shared severity vocabulary ────────────────────────────────────────── */

export const SEVERITY: Record<
  string,
  { dot: string; text: string; chip: string; bar: string }
> = {
  critical: {
    dot: "bg-rose-400",
    text: "text-rose-300",
    chip: "bg-rose-500/15 text-rose-200 ring-rose-400/30",
    bar: "bg-rose-400",
  },
  high: {
    dot: "bg-orange-400",
    text: "text-orange-300",
    chip: "bg-orange-500/15 text-orange-200 ring-orange-400/30",
    bar: "bg-orange-400",
  },
  medium: {
    dot: "bg-amber-300",
    text: "text-amber-200",
    chip: "bg-amber-400/15 text-amber-100 ring-amber-300/30",
    bar: "bg-amber-300",
  },
  low: {
    dot: "bg-sky-400",
    text: "text-sky-300",
    chip: "bg-sky-500/15 text-sky-200 ring-sky-400/30",
    bar: "bg-sky-400",
  },
};

export const sev = (s: string) =>
  SEVERITY[s] ?? {
    dot: "bg-ink-faint",
    text: "text-ink-muted",
    chip: "bg-line/10 text-ink-muted ring-line/20",
    bar: "bg-ink-faint",
  };

/* ── Button class presets ──────────────────────────────────────────────── */

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-canvas shadow-glow-sm transition-all hover:bg-brand-bright active:scale-[0.98] disabled:opacity-50 disabled:shadow-none";

export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-line/15 bg-line/[0.03] px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-line/10 active:scale-[0.98] disabled:opacity-50";
