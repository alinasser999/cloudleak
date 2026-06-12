"use client";

import Link from "next/link";
import { IconShield, IconArrowRight } from "@/components/icons";
import { Panel } from "@/components/ui";

/** Relative "time ago" label, e.g. "just now", "5m", "3h", "2d". */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 6e4) return "just now";
  const m = Math.floor(diff / 6e4);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return `${Math.floor(d / 30)}mo`;
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Back-navigation link for drill-down detail pages. */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-ink"
    >
      <IconArrowRight className="h-3.5 w-3.5 rotate-180" />
      {label}
    </Link>
  );
}

export const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const PLAN_CHIP: Record<string, string> = {
  starter: "bg-line/[0.04] text-ink-muted ring-line/10",
  growth: "bg-brand/12 text-brand-deep ring-brand/25",
  agency: "bg-violet-500/10 text-violet-700 ring-violet-500/25",
};

export function PlanChip({ plan }: { plan: string }) {
  const chip = PLAN_CHIP[plan] ?? "bg-line/[0.04] text-ink-muted ring-line/10";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] ring-1 ring-inset ${chip}`}
    >
      {plan}
    </span>
  );
}

export function GodModeBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/[0.06] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-brand-deep ring-1 ring-inset ring-brand/25">
      <IconShield className="h-3 w-3" />
      Platform · all tenants
    </span>
  );
}

export function ErrorPanel({ message }: { message: string }) {
  return (
    <Panel className="p-8 text-center">
      <p className="text-sm font-medium text-rose-600">{message}</p>
      <p className="mt-1 text-xs text-ink-muted">
        This area is restricted to platform operators.
      </p>
    </Panel>
  );
}
