"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Panel, Eyebrow, PageHeading } from "@/components/ui";
import { IconArrowUpRight } from "@/components/icons";
import { timeAgo, fmtDate, GodModeBadge, ErrorPanel } from "../admin-shared";

interface PlatformUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  orgs: { id: string; name: string; role: string }[];
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

function UserRow({ user, index }: { user: PlatformUser; index: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.025, 0.3) }}
    >
      <Link
        href={`/admin/users/${user.id}`}
        className="group flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-line/[0.03]"
      >
      <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-line/10 bg-brand/10 text-xs font-semibold text-brand-deep">
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initials(user.fullName, user.email)
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">
          {user.fullName ?? user.email.split("@")[0]}
        </p>
        <p className="truncate font-mono text-xs text-ink-muted">{user.email}</p>
      </div>
      <div className="hidden min-w-0 max-w-[40%] flex-wrap justify-end gap-1.5 sm:flex">
        {user.orgs.length === 0 ? (
          <span className="text-[11px] text-ink-faint">No org</span>
        ) : (
          user.orgs.map((o) => (
            <span
              key={o.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-line/[0.04] px-2 py-0.5 text-[11px] text-ink-muted ring-1 ring-inset ring-line/10"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${ROLE_DOT[o.role] ?? "bg-ink-faint"}`} />
              <span className="max-w-[8rem] truncate">{o.name}</span>
            </span>
          ))
        )}
      </div>
      <span
        className="shrink-0 font-mono text-[11px] tabular-nums text-ink-faint"
        title={fmtDate(user.createdAt)}
      >
        {timeAgo(user.createdAt)}
      </span>
      <IconArrowUpRight className="h-4 w-4 shrink-0 text-ink-faint transition-colors group-hover:text-ink" />
      </Link>
    </motion.li>
  );
}

export function AdminUsersClient() {
  const [users, setUsers] = useState<PlatformUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/users")
      .then(async (r) => {
        if (!r.ok) {
          const d = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
          throw new Error(d?.error?.message ?? "Could not load users");
        }
        return r.json() as Promise<{ users: PlatformUser[] }>;
      })
      .then((d) => !cancelled && setUsers(d.users))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!users) return [];
    const term = q.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(term) ||
        (u.fullName ?? "").toLowerCase().includes(term) ||
        u.orgs.some((o) => o.name.toLowerCase().includes(term)),
    );
  }, [users, q]);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <PageHeading
          title="All Users"
          actions={
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-line/10 bg-surface/60 px-3 py-2 text-right">
                <Eyebrow>Signups</Eyebrow>
                <p className="mt-0.5 font-display text-lg leading-none tabular-nums text-ink">
                  {users === null ? "—" : users.length}
                </p>
              </div>
              <GodModeBadge />
            </div>
          }
        >
          Every person who has signed up to CloudLeak, across all organizations.
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
            placeholder="Search by name, email, or organization…"
            className="w-full rounded-xl border border-line/15 bg-canvas/50 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/25"
          />

          <Panel className="overflow-hidden">
            {users === null ? (
              <div className="divide-y divide-line/8">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3.5 px-4 py-3.5">
                    <div className="h-9 w-9 animate-pulse rounded-full bg-line/8" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-32 animate-pulse rounded bg-line/8" />
                      <div className="h-2.5 w-44 animate-pulse rounded bg-line/8" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-muted">No users match.</p>
            ) : (
              <ul className="divide-y divide-line/8">
                {filtered.map((u, i) => (
                  <UserRow key={u.id} user={u} index={i} />
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
