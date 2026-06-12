"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Panel, Eyebrow, PageHeading } from "@/components/ui";
import { IconUsers, IconCloud, IconScan, IconAlert, IconArrowUpRight } from "@/components/icons";
import { timeAgo, fmtDate, usd, PlanChip, GodModeBadge, ErrorPanel } from "../admin-shared";

interface PlatformOrg {
  id: string;
  name: string;
  plan: string;
  createdAt: string;
  memberCount: number;
  awsAccounts: number;
  scans: number;
  findingsOpen: number;
  estimatedMonthlySavings: number;
}

function Metric({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs tabular-nums text-ink-muted"
      title={label}
    >
      <span className="text-ink-faint">{icon}</span>
      {value}
    </span>
  );
}

function OrgRow({ org, index }: { org: PlatformOrg; index: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
    >
      <Link
        href={`/admin/organizations/${org.id}`}
        className="group flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-line/[0.03]"
      >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-ink">{org.name}</p>
          <PlanChip plan={org.plan} />
        </div>
        <p className="mt-0.5 text-[11px] text-ink-muted" title={fmtDate(org.createdAt)}>
          Created {timeAgo(org.createdAt)} ago
        </p>
      </div>
      <div className="hidden items-center gap-3.5 sm:flex">
        <Metric icon={<IconUsers className="h-3.5 w-3.5" />} value={org.memberCount} label="Members" />
        <Metric icon={<IconCloud className="h-3.5 w-3.5" />} value={org.awsAccounts} label="AWS accounts" />
        <Metric icon={<IconScan className="h-3.5 w-3.5" />} value={org.scans} label="Scans" />
        <Metric icon={<IconAlert className="h-3.5 w-3.5" />} value={org.findingsOpen} label="Open findings" />
      </div>
      <span className="w-20 shrink-0 text-right font-mono text-xs tabular-nums text-ink">
        {usd.format(org.estimatedMonthlySavings)}
        <span className="block text-[10px] font-sans text-ink-faint">/mo saved</span>
      </span>
      <IconArrowUpRight className="h-4 w-4 shrink-0 text-ink-faint transition-colors group-hover:text-ink" />
      </Link>
    </motion.li>
  );
}

export function AdminOrgsClient() {
  const [orgs, setOrgs] = useState<PlatformOrg[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/organizations")
      .then(async (r) => {
        if (!r.ok) {
          const d = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
          throw new Error(d?.error?.message ?? "Could not load organizations");
        }
        return r.json() as Promise<{ organizations: PlatformOrg[] }>;
      })
      .then((d) => !cancelled && setOrgs(d.organizations))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!orgs) return [];
    const term = q.trim().toLowerCase();
    if (!term) return orgs;
    return orgs.filter((o) => o.name.toLowerCase().includes(term) || o.plan.includes(term));
  }, [orgs, q]);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <PageHeading
          title="Organizations"
          actions={
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-line/10 bg-surface/60 px-3 py-2 text-right">
                <Eyebrow>Tenants</Eyebrow>
                <p className="mt-0.5 font-display text-lg leading-none tabular-nums text-ink">
                  {orgs === null ? "—" : orgs.length}
                </p>
              </div>
              <GodModeBadge />
            </div>
          }
        >
          Every tenant on CloudLeak, with members, connected accounts, and savings surfaced.
        </PageHeading>
      </motion.div>

      {error ? (
        <ErrorPanel message={error} />
      ) : (
        <>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by organization or plan…"
            className="w-full rounded-xl border border-line/15 bg-canvas/50 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/25"
          />

          <Panel className="overflow-hidden">
            {orgs === null ? (
              <div className="divide-y divide-line/8">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3.5 px-4 py-4">
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-40 animate-pulse rounded bg-line/8" />
                      <div className="h-2.5 w-24 animate-pulse rounded bg-line/8" />
                    </div>
                    <div className="h-3.5 w-24 animate-pulse rounded bg-line/8" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-muted">No organizations match.</p>
            ) : (
              <ul className="divide-y divide-line/8">
                {filtered.map((o, i) => (
                  <OrgRow key={o.id} org={o} index={i} />
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
