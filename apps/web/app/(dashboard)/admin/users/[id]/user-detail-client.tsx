"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Panel, Eyebrow, PageHeading } from "@/components/ui";
import { IconArrowUpRight } from "@/components/icons";
import {
  fmtDate,
  fmtDateTime,
  timeAgo,
  PlanChip,
  GodModeBadge,
  ErrorPanel,
  BackLink,
} from "../../admin-shared";

interface AuditEvent {
  id: number;
  at: string;
  action: string;
  organizationName: string | null;
}

interface UserDetail {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  orgs: { id: string; name: string; plan: string; role: string; joinedAt: string }[];
  recentEvents: AuditEvent[];
}

function initials(name: string | null, email: string): string {
  const src = (name ?? email).trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

const ROLE_DOT: Record<string, string> = {
  owner: "bg-brand",
  admin: "bg-sky-500",
  member: "bg-ink-faint",
};

export function AdminUserDetailClient({ id }: { id: string }) {
  const [user, setUser] = useState<UserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/users/${id}`)
      .then(async (r) => {
        if (!r.ok) {
          const d = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
          throw new Error(d?.error?.message ?? "Could not load user");
        }
        return r.json() as Promise<{ user: UserDetail }>;
      })
      .then((d) => !cancelled && setUser(d.user))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="space-y-6">
        <BackLink href="/admin/users" label="All Users" />
        <ErrorPanel message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink href="/admin/users" label="All Users" />

      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <PageHeading
          title={user?.fullName ?? user?.email.split("@")[0] ?? "User"}
          actions={<GodModeBadge />}
        >
          {user ? user.email : "Loading profile…"}
        </PageHeading>
      </motion.div>

      {user === null ? (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="h-48 animate-pulse rounded-2xl bg-line/8" />
          <div className="h-48 animate-pulse rounded-2xl bg-line/8" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-6">
            <Panel className="flex items-center gap-4 p-5">
              <span className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border border-line/10 bg-brand/10 text-base font-semibold text-brand-deep">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials(user.fullName, user.email)
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-ink">
                  {user.fullName ?? user.email.split("@")[0]}
                </p>
                <p className="truncate font-mono text-xs text-ink-muted">{user.email}</p>
                <p className="mt-1 text-[11px] text-ink-faint" title={fmtDate(user.createdAt)}>
                  Joined CloudLeak {timeAgo(user.createdAt)} ago
                </p>
              </div>
            </Panel>

            <div>
              <Eyebrow>Organizations · {user.orgs.length}</Eyebrow>
              <Panel className="mt-2 overflow-hidden">
                {user.orgs.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-ink-muted">
                    Not a member of any organization.
                  </p>
                ) : (
                  <ul className="divide-y divide-line/8">
                    {user.orgs.map((o) => (
                      <li key={o.id}>
                        <Link
                          href={`/admin/organizations/${o.id}`}
                          className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-line/[0.03]"
                        >
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${ROLE_DOT[o.role] ?? "bg-ink-faint"}`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-ink">{o.name}</p>
                            <p className="text-[11px] capitalize text-ink-muted">
                              {o.role} · joined {timeAgo(o.joinedAt)} ago
                            </p>
                          </div>
                          <PlanChip plan={o.plan} />
                          <IconArrowUpRight className="h-4 w-4 text-ink-faint transition-colors group-hover:text-ink" />
                        </Link>
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
              {user.recentEvents.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-ink-muted">No recorded activity.</p>
              ) : (
                <ul className="divide-y divide-line/8">
                  {user.recentEvents.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink">
                        {e.action}
                        {e.organizationName && (
                          <span className="ml-1.5 font-sans text-[11px] text-ink-muted">
                            · {e.organizationName}
                          </span>
                        )}
                      </span>
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
      )}
    </div>
  );
}
