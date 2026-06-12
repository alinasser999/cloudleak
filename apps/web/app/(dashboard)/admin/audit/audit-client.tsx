"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Panel, Eyebrow, PageHeading } from "@/components/ui";
import { timeAgo, fmtDateTime, GodModeBadge, ErrorPanel } from "../admin-shared";

interface AuditEvent {
  id: number;
  at: string;
  action: string;
  tableName: string;
  recordId: string | null;
  actorId: string | null;
  actorEmail: string | null;
  organizationId: string | null;
  organizationName: string | null;
  metadata: Record<string, unknown>;
}

const VERB_CHIP: Record<string, string> = {
  insert: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25",
  update: "bg-amber-500/10 text-amber-700 ring-amber-500/25",
  delete: "bg-rose-500/10 text-rose-700 ring-rose-500/25",
};

/** "memberships.insert" → { subject: "memberships", verb: "insert" }. */
function parseAction(action: string): { subject: string; verb: string } {
  const dot = action.lastIndexOf(".");
  if (dot === -1) return { subject: action, verb: "" };
  return { subject: action.slice(0, dot), verb: action.slice(dot + 1) };
}

function VerbChip({ verb }: { verb: string }) {
  const chip = VERB_CHIP[verb] ?? "bg-line/[0.04] text-ink-muted ring-line/10";
  return (
    <span
      className={`inline-flex w-14 justify-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] ring-1 ring-inset ${chip}`}
    >
      {verb || "event"}
    </span>
  );
}

function EventRow({ event, index }: { event: AuditEvent; index: number }) {
  const { subject, verb } = parseAction(event.action);
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.3) }}
      className="flex items-center gap-3 px-4 py-3"
    >
      <VerbChip verb={verb} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-ink">
          <span className="font-medium">{subject}</span>
          {event.recordId && (
            <span className="ml-1.5 font-mono text-[11px] text-ink-faint">
              {event.recordId.slice(0, 8)}
            </span>
          )}
        </p>
        <p className="truncate text-[11px] text-ink-muted">
          {event.actorId ? (
            <Link href={`/admin/users/${event.actorId}`} className="hover:text-ink hover:underline">
              {event.actorEmail ?? "Unknown actor"}
            </Link>
          ) : (
            <span className="text-ink-faint">System</span>
          )}
          {event.organizationId && (
            <>
              <span className="mx-1 text-ink-faint">·</span>
              <Link
                href={`/admin/organizations/${event.organizationId}`}
                className="hover:text-ink hover:underline"
              >
                {event.organizationName ?? "Unknown org"}
              </Link>
            </>
          )}
        </p>
      </div>
      <span
        className="shrink-0 font-mono text-[11px] tabular-nums text-ink-faint"
        title={fmtDateTime(event.at)}
      >
        {timeAgo(event.at)}
      </span>
    </motion.li>
  );
}

export function AdminAuditClient() {
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/audit")
      .then(async (r) => {
        if (!r.ok) {
          const d = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
          throw new Error(d?.error?.message ?? "Could not load audit log");
        }
        return r.json() as Promise<{ events: AuditEvent[] }>;
      })
      .then((d) => !cancelled && setEvents(d.events))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!events) return [];
    const term = q.trim().toLowerCase();
    if (!term) return events;
    return events.filter(
      (e) =>
        e.action.toLowerCase().includes(term) ||
        (e.actorEmail ?? "").toLowerCase().includes(term) ||
        (e.organizationName ?? "").toLowerCase().includes(term),
    );
  }, [events, q]);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <PageHeading
          title="Audit Log"
          actions={
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-line/10 bg-surface/60 px-3 py-2 text-right">
                <Eyebrow>Events</Eyebrow>
                <p className="mt-0.5 font-display text-lg leading-none tabular-nums text-ink">
                  {events === null ? "—" : events.length}
                </p>
              </div>
              <GodModeBadge />
            </div>
          }
        >
          A platform-wide trail of writes across every tenant — who changed what, and when.
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
            placeholder="Search by action, actor, or organization…"
            className="w-full rounded-xl border border-line/15 bg-canvas/50 px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/25"
          />

          <Panel className="overflow-hidden">
            {events === null ? (
              <div className="divide-y divide-line/8">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="h-5 w-14 animate-pulse rounded-md bg-line/8" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-40 animate-pulse rounded bg-line/8" />
                      <div className="h-2.5 w-56 animate-pulse rounded bg-line/8" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-muted">No events match.</p>
            ) : (
              <ul className="divide-y divide-line/8">
                {filtered.map((e, i) => (
                  <EventRow key={e.id} event={e} index={i} />
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
