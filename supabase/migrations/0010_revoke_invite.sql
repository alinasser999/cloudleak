-- Let owners/admins revoke a pending invitation.
--
-- Invitations have no UPDATE RLS policy (only read + member-insert), so the
-- state transition goes through a SECURITY DEFINER RPC that validates the
-- caller is an owner/admin of the invite's org — mirroring the member-
-- management RPCs. Revoke is a soft transition to 'revoked' (accept_invite
-- already refuses anything that isn't 'pending'), which keeps the row for
-- audit while dropping it from the pending list.

create or replace function public.revoke_invite(p_invite_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  inv public.invitations;
  actor_role text;
begin
  select * into inv from public.invitations where id = p_invite_id;
  if inv.id is null then
    raise exception 'Invite not found' using errcode = 'P0002';
  end if;

  select role into actor_role
  from public.memberships
  where organization_id = inv.organization_id and user_id = auth.uid();

  if actor_role is null or actor_role not in ('owner', 'admin') then
    raise exception 'Only owners and admins can revoke invites' using errcode = '42501';
  end if;

  update public.invitations set status = 'revoked'
  where id = p_invite_id and status = 'pending';
end $$;
revoke all on function public.revoke_invite(uuid) from public, anon;
grant execute on function public.revoke_invite(uuid) to authenticated;
