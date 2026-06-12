"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Panel, Eyebrow, PageHeading, StatTile } from "@/components/ui";
import { IconUsers, IconCloud, IconScan, IconAlert, IconArrowUpRight } from "@/components/icons";
import {
  fmtDate,
  fmtDateTime,
  timeAgo,
  usd,
  PlanChip,
  GodModeBadge,
  ErrorPanel,
  BackLink,
} from "../../admin-shared";

interface AuditEvent {
  id: number;
  at: string;
  action: string;
  actorEmail: string | null;
}

interface OrgDetail {
  id: string;
  name: string;
  plan: string;
  createdAt: string;
  members: { id: string; email: string; fullName: string | null; role: string; joinedAt: string }[];
  awsAccounts: { accountId: string | null; status: string; createdAt: string }[];
  scans: number;
  findingsOpen: number;
  estimatedMonthlySavings: number;
  recentEvents: AuditEvent[];
}

const ROLE_DOT: Record<string, string> = {
  owner: "bg-brand",
  admin: "bg-sky-500",
  member: "bg-ink-faint",
};

const AWS_STATUS: Record<string, string> = {
  connected: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25",
  pending: "bg-amber-500/10 text-amber-700 ring-amber-500/25",
  error: "bg-rose-500/10 text-rose-700 ring-rose-500/25",
};

export function AdminOrgDetailClient({ id }: { id: string }) {
  const [org, setOrg] = useState<OrgDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/organizations/${id}`)
      .then(async (r) => {
        if (!r.ok) {
          const d = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
          throw new Error(d?.error?.message ?? "Could not load organization");
        }
        return r.json() as Promise<{ organization: OrgDetail }>;
      })
      .then((d) => !cancelled && setOrg(d.organization))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="space-y-6">
        <BackLink href="/admin/organizations" label="Organizations" />
        <ErrorPanel message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink href="/admin/organizations" label="Organizations" />

      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <PageHeading
          title={org?.name ?? "Organization"}
          actions={
            <div className="flex items-center gap-3">
              {org && <PlanChip plan={org.plan} />}
              <GodModeBadge />
            </div>
          }
        >
          {org ? `Created ${fmtDate(org.createdAt)}` : "Loading organization…"}
        </PageHeading>
      </motion.div>

      {org === null ? (
        <div className="grid gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-line/8" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Members"
              value={org.members.length}
              icon={<IconUsers className="h-4 w-4" />}
            />
            <StatTile
              label="AWS accounts"
              value={org.awsAccounts.length}
              icon={<IconCloud className="h-4 w-4" />}
            />
            <StatTile label="Scans" value={org.scans} icon={<IconScan className="h-4 w-4" />} />
            <StatTile
              label="Open findings"
              value={org.findingsOpen}
              icon={<IconAlert className="h-4 w-4" />}
              hint={`${usd.format(org.estimatedMonthlySavings)}/mo potential savings`}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-6">
              <div>
                <Eyebrow>Members · {org.members.length}</Eyebrow>
                <Panel className="mt-2 overflow-hidden">
                  {org.members.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-ink-muted">No members.</p>
                  ) : (
                    <ul className="divide-y divide-line/8">
                      {org.members.map((m) => (
                        <li key={m.id}>
                          <Link
                            href={`/admin/users/${m.id}`}
                            className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-line/[0.03]"
                          >
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${ROLE_DOT[m.role] ?? "bg-ink-faint"}`}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-ink">
                                {m.fullName ?? m.email.split("@")[0]}
                              </p>
                              <p className="truncate font-mono text-[11px] text-ink-muted">
                                {m.email}
                              </p>
                            </div>
                            <span className="shrink-0 text-[11px] capitalize text-ink-muted">
                              {m.role}
                            </span>
                            <IconArrowUpRight className="h-4 w-4 text-ink-faint transition-colors group-hover:text-ink" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>

              <div>
                <Eyebrow>AWS accounts · {org.awsAccounts.length}</Eyebrow>
                <Panel className="mt-2 overflow-hidden">
                  {org.awsAccounts.length === 0 ? (
                    <p className="px-4 py-6 text-center text-sm text-ink-muted">
                      No AWS accounts connected.
                    </p>
                  ) : (
                    <ul className="divide-y divide-line/8">
                      {org.awsAccounts.map((a, i) => (
                        <li key={i} className="flex items-center gap-3 px-4 py-3">
                          <IconCloud className="h-4 w-4 shrink-0 text-ink-faint" />
                          <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink">
                            {a.accountId ?? "—"}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] ring-1 ring-inset ${
                              AWS_STATUS[a.status] ?? "bg-line/[0.04] text-ink-muted ring-line/10"
                            }`}
                          >
                            {a.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </div>
            </div>

            <div>
              <Eyebrow>Recent activity</Eyebrow>
              <Panel className="mt-2 overflow-hidden">
                {org.recentEvents.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-ink-muted">
                    No recorded activity.
                  </p>
                ) : (
                  <ul className="divide-y divide-line/8">
                    {org.recentEvents.map((e) => (
                      <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-mono text-xs text-ink">{e.action}</p>
                          {e.actorEmail && (
                            <p className="truncate text-[11px] text-ink-muted">{e.actorEmail}</p>
                          )}
                        </div>
                        <span
                          className="shrink-0 font-mono text-[11px] tabular-nums text-ink-faint"
                          title={fmtDateTime(e.at)}
                        >
                          {timeAgo(e.at)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
