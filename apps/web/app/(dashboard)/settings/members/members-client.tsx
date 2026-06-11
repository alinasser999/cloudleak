"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { EASE_OUT } from "../../../../components/motion";
import { Panel, Eyebrow, PageHeading } from "../../../../components/ui";
import { IconUsers, IconShield, IconSliders, IconInfo, IconX } from "../../../../components/icons";

type Role = "owner" | "admin" | "member";

interface Member {
  membershipId: string;
  userId: string;
  role: Role;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  joinedAt: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: Role;
  expiresAt: string;
}

interface TeamView {
  members: Member[];
  pendingInvites: PendingInvite[];
}

const ROLE_META: Record<Role, { label: string; chip: string; icon: typeof IconShield }> = {
  owner: {
    label: "Owner",
    chip: "bg-brand/12 text-brand-deep ring-brand/25",
    icon: IconShield,
  },
  admin: {
    label: "Admin",
    chip: "bg-line/8 text-ink ring-line/15",
    icon: IconSliders,
  },
  member: {
    label: "Member",
    chip: "bg-line/[0.04] text-ink-muted ring-line/10",
    icon: IconUsers,
  },
};

/**
 * Who the signed-in user may manage in the UI — a mirror of the server rules
 * (owner manages everyone, admin manages plain members only). The RPC is the
 * real gate; this just decides which controls to render. We never expose
 * controls on your own row to avoid self-demotion/removal foot-guns.
 */
function canManage(actorRole: Role, target: Member, isYou: boolean): boolean {
  if (isYou) return false;
  if (actorRole === "owner") return true;
  if (actorRole === "admin") return target.role === "member";
  return false;
}

/** Roles the actor may assign — admins can't grant owner. */
function roleOptions(actorRole: Role): Role[] {
  return actorRole === "owner" ? ["owner", "admin", "member"] : ["admin", "member"];
}

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, delay: i * 0.05, ease: EASE_OUT },
  }),
};

function initials(name: string | null, email: string): string {
  const src = (name ?? email).trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function expiresIn(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return "expired";
  const d = Math.floor(diff / 864e5);
  if (d >= 1) return `expires in ${d}d`;
  const h = Math.max(1, Math.floor(diff / 36e5));
  return `expires in ${h}h`;
}

function RoleChip({ role }: { role: Role }) {
  const meta = ROLE_META[role];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] ring-1 ring-inset ${meta.chip}`}
    >
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function Avatar({ member }: { member: Member }) {
  return (
    <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border border-line/10 bg-brand/10 text-xs font-semibold text-brand-deep">
      {member.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={member.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(member.fullName, member.email)
      )}
    </span>
  );
}

function ManageControls({
  member,
  actorRole,
  pending,
  confirming,
  onRoleChange,
  onRemoveClick,
  onRemoveConfirm,
  onRemoveCancel,
}: {
  member: Member;
  actorRole: Role;
  pending: boolean;
  confirming: boolean;
  onRoleChange: (role: Role) => void;
  onRemoveClick: () => void;
  onRemoveConfirm: () => void;
  onRemoveCancel: () => void;
}) {
  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-medium text-ink-muted">Remove?</span>
        <button
          type="button"
          onClick={onRemoveConfirm}
          disabled={pending}
          className="rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-600 ring-1 ring-inset ring-rose-500/25 transition hover:bg-rose-500/15 disabled:opacity-50"
        >
          {pending ? "Removing…" : "Confirm"}
        </button>
        <button
          type="button"
          onClick={onRemoveCancel}
          disabled={pending}
          className="rounded-full px-2 py-1 text-[11px] font-medium text-ink-muted transition hover:text-ink disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={`role-${member.membershipId}`} className="sr-only">
        Role for {member.email}
      </label>
      <select
        id={`role-${member.membershipId}`}
        value={member.role}
        disabled={pending}
        onChange={(e) => onRoleChange(e.target.value as Role)}
        className="rounded-full border border-line/15 bg-surface/60 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink outline-none transition hover:border-line/25 focus:border-brand/40 disabled:opacity-50"
      >
        {roleOptions(actorRole).map((r) => (
          <option key={r} value={r}>
            {ROLE_META[r].label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onRemoveClick}
        disabled={pending}
        aria-label={`Remove ${member.email}`}
        className="grid h-7 w-7 place-items-center rounded-full text-ink-muted/70 transition hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50"
      >
        <IconX className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function MemberRow({
  member,
  index,
  isYou,
  actorRole,
  pending,
  confirming,
  onRoleChange,
  onRemoveClick,
  onRemoveConfirm,
  onRemoveCancel,
}: {
  member: Member;
  index: number;
  isYou: boolean;
  actorRole: Role;
  pending: boolean;
  confirming: boolean;
  onRoleChange: (role: Role) => void;
  onRemoveClick: () => void;
  onRemoveConfirm: () => void;
  onRemoveCancel: () => void;
}) {
  return (
    <motion.li
      custom={index}
      variants={rowVariants}
      initial="hidden"
      animate="visible"
      className="flex items-center gap-3.5 px-4 py-3.5"
    >
      <Avatar member={member} />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-sm font-medium text-ink">
          {member.fullName ?? member.email.split("@")[0]}
          {isYou && (
            <span className="rounded-md bg-line/8 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
              You
            </span>
          )}
        </p>
        <p className="truncate font-mono text-xs text-ink-muted">{member.email}</p>
      </div>
      {canManage(actorRole, member, isYou) ? (
        <ManageControls
          member={member}
          actorRole={actorRole}
          pending={pending}
          confirming={confirming}
          onRoleChange={onRoleChange}
          onRemoveClick={onRemoveClick}
          onRemoveConfirm={onRemoveConfirm}
          onRemoveCancel={onRemoveCancel}
        />
      ) : (
        <RoleChip role={member.role} />
      )}
    </motion.li>
  );
}

function InviteRow({ invite, index }: { invite: PendingInvite; index: number }) {
  return (
    <motion.li
      custom={index}
      variants={rowVariants}
      initial="hidden"
      animate="visible"
      className="flex items-center gap-3.5 px-4 py-3.5"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-dashed border-line/20 bg-line/[0.03] text-ink-faint">
        <IconUsers className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-sm text-ink">{invite.email}</p>
        <p className="text-[11px] text-ink-muted">{expiresIn(invite.expiresAt)}</p>
      </div>
      <RoleChip role={invite.role} />
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-amber-700 ring-1 ring-inset ring-amber-500/25">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
        Pending
      </span>
    </motion.li>
  );
}

function SkeletonRow({ index }: { index: number }) {
  return (
    <motion.div
      custom={index}
      variants={rowVariants}
      initial="hidden"
      animate="visible"
      className="flex items-center gap-3.5 px-4 py-3.5"
    >
      <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-line/8" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-32 animate-pulse rounded bg-line/8" />
        <div className="h-2.5 w-44 animate-pulse rounded bg-line/8" />
      </div>
      <div className="h-6 w-20 animate-pulse rounded-full bg-line/8" />
    </motion.div>
  );
}

export function MembersClient({
  organizationId,
  currentUserId,
  currentUserRole,
}: {
  organizationId: string;
  currentUserId: string;
  currentUserRole: Role;
}) {
  const [team, setTeam] = useState<TeamView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  async function changeRole(membershipId: string, role: Role) {
    setActionError(null);
    setPendingId(membershipId);
    try {
      const r = await fetch(`/api/members/${membershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(d?.error?.message ?? "Could not update role");
      }
      setTeam((t) =>
        t
          ? {
              ...t,
              members: t.members.map((m) =>
                m.membershipId === membershipId ? { ...m, role } : m,
              ),
            }
          : t,
      );
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setPendingId(null);
    }
  }

  async function removeMember(membershipId: string) {
    setActionError(null);
    setPendingId(membershipId);
    try {
      const r = await fetch(`/api/members/${membershipId}`, { method: "DELETE" });
      if (!r.ok) {
        const d = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(d?.error?.message ?? "Could not remove member");
      }
      setTeam((t) =>
        t ? { ...t, members: t.members.filter((m) => m.membershipId !== membershipId) } : t,
      );
      setConfirmingId(null);
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setPendingId(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/members?organizationId=${organizationId}`)
      .then(async (r) => {
        if (!r.ok) {
          const d = (await r.json().catch(() => null)) as { error?: { message?: string } } | null;
          throw new Error(d?.error?.message ?? "Could not load members");
        }
        return r.json() as Promise<TeamView>;
      })
      .then((d) => !cancelled && setTeam(d))
      .catch((e: Error) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  const memberCount = team?.members.length ?? 0;

  return (
    <div className="max-w-2xl space-y-7">
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <PageHeading
          title="Team"
          actions={
            <div className="rounded-xl border border-line/10 bg-surface/60 px-3 py-2 text-right">
              <Eyebrow>Members</Eyebrow>
              <p className="mt-0.5 font-display text-lg leading-none tabular-nums text-ink">
                {team === null ? "—" : memberCount}
              </p>
            </div>
          }
        >
          Everyone with access to this organization, and any invites still awaiting acceptance.
        </PageHeading>
      </motion.div>

      {error ? (
        <Panel className="p-8 text-center">
          <p className="text-sm font-medium text-rose-600">{error}</p>
          <p className="mt-1 text-xs text-ink-muted">
            Make sure you are signed in and a member of this organization.
          </p>
        </Panel>
      ) : team === null ? (
        <Panel className="divide-y divide-line/8">
          {[0, 1, 2].map((i) => (
            <SkeletonRow key={i} index={i} />
          ))}
        </Panel>
      ) : (
        <>
          <AnimatePresence>
            {actionError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-2.5 text-xs font-medium text-rose-600"
              >
                {actionError}
              </motion.div>
            )}
          </AnimatePresence>

          <section className="space-y-2.5">
            <Eyebrow className="px-1">Active members</Eyebrow>
            <Panel className="overflow-hidden">
              <ul className="divide-y divide-line/8">
                {team.members.map((m, i) => (
                  <MemberRow
                    key={m.membershipId}
                    member={m}
                    index={i}
                    isYou={m.userId === currentUserId}
                    actorRole={currentUserRole}
                    pending={pendingId === m.membershipId}
                    confirming={confirmingId === m.membershipId}
                    onRoleChange={(role) => changeRole(m.membershipId, role)}
                    onRemoveClick={() => {
                      setActionError(null);
                      setConfirmingId(m.membershipId);
                    }}
                    onRemoveConfirm={() => removeMember(m.membershipId)}
                    onRemoveCancel={() => setConfirmingId(null)}
                  />
                ))}
              </ul>
            </Panel>
          </section>

          <AnimatePresence>
            {team.pendingInvites.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-2.5"
              >
                <Eyebrow className="px-1">Pending invites</Eyebrow>
                <Panel className="overflow-hidden">
                  <ul className="divide-y divide-line/8">
                    {team.pendingInvites.map((inv, i) => (
                      <InviteRow key={inv.id} invite={inv} index={i} />
                    ))}
                  </ul>
                </Panel>
              </motion.section>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="flex gap-3 rounded-xl border border-line/10 bg-surface/40 px-4 py-3"
          >
            <IconInfo className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted/60" />
            <p className="text-xs leading-relaxed text-ink-muted">
              Owners can change any teammate&rsquo;s role or remove them; admins can manage members.
              Roles control who can connect AWS accounts, manage scan schedules, and send invites.
            </p>
          </motion.div>
        </>
      )}
    </div>
  );
}
