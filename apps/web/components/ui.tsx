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
      className={`rounded-2xl border border-line/10 bg-surface-raised panel-hairline ${className}`}
    >
      {children}
    </div>
  );
}

/** Tracked micro-label for data sections (used inside panels, not as a page eyebrow). */
export function Eyebrow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`font-sans text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted ${className}`}
    >
      {children}
    </span>
  );
}

/* ── Page heading ──────────────────────────────────────────────────────── */

/** Pixel-display page title + optional subtitle and right-aligned actions. */
export function PageHeading({
  title,
  children,
  actions,
}: {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="font-display text-[1.6rem] uppercase leading-[0.95] tracking-[0.01em] text-ink sm:text-[2rem]">
          {title}
        </h1>
        {children && (
          <p className="mt-2.5 max-w-xl text-pretty text-sm text-ink-muted">{children}</p>
        )}
      </div>
      {actions}
    </div>
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
          ? "border-brand/30 bg-brand/[0.06]"
          : "border-line/10 bg-surface-raised hover:bg-surface"
      } panel-hairline ${className}`}
    >
      {hero && (
        <div className="pointer-events-none absolute -right-10 -top-12 h-32 w-32 rounded-full bg-brand/15 blur-3xl" />
      )}
      <div className="relative flex items-start justify-between gap-2">
        <Eyebrow className={hero ? "text-brand-deep" : ""}>{label}</Eyebrow>
        {icon && (
          <span
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
              hero ? "bg-brand/15 text-brand" : "bg-line/5 text-ink-muted"
            }`}
          >
            {icon}
          </span>
        )}
      </div>
      <div
        className={`relative mt-2 font-display text-[2rem] leading-none tabular-nums ${
          hero ? "text-brand" : "text-ink"
        }`}
      >
        {value}
      </div>
      {hint && <div className="relative mt-2 text-xs text-ink-muted">{hint}</div>}
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
          <stop offset="0" stopColor="rgb(var(--brand) / 0.22)" />
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

/* ── Shared severity vocabulary (light theme) ──────────────────────────── */

export const SEVERITY: Record<
  string,
  { dot: string; text: string; chip: string; bar: string }
> = {
  critical: {
    dot: "bg-rose-500",
    text: "text-rose-600",
    chip: "bg-rose-500/10 text-rose-700 ring-rose-500/25",
    bar: "bg-rose-500",
  },
  high: {
    dot: "bg-orange-500",
    text: "text-orange-600",
    chip: "bg-orange-500/10 text-orange-700 ring-orange-500/25",
    bar: "bg-orange-500",
  },
  medium: {
    dot: "bg-amber-500",
    text: "text-amber-600",
    chip: "bg-amber-500/10 text-amber-700 ring-amber-500/25",
    bar: "bg-amber-500",
  },
  low: {
    dot: "bg-sky-500",
    text: "text-sky-600",
    chip: "bg-sky-500/10 text-sky-700 ring-sky-500/25",
    bar: "bg-sky-500",
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

const btnFocus =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

export const btnPrimary =
  "group btn-sheen inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-canvas shadow-glow-sm transition-all hover:bg-brand hover:shadow-glow active:scale-[0.98] disabled:opacity-50 disabled:shadow-none " +
  btnFocus;

export const btnGhost =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-line/15 bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-brand/40 hover:bg-surface-raised active:scale-[0.98] disabled:opacity-50 " +
  btnFocus;
