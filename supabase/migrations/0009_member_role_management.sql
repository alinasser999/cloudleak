-- Member role management: let owners/admins change roles and remove teammates,
-- with the guardrails enforced server-side.
--
-- Memberships carry no UPDATE/DELETE RLS policies, so direct writes are blocked
-- by default. These mutations therefore go through SECURITY DEFINER RPCs that
-- validate the caller's authority and protect the org from losing its last
-- owner — mirroring accept_invite / create_organization. The functions live in
-- the public schema (callable via PostgREST /rpc by authenticated users only);
-- anon and the broad public role are revoked.
--
-- Authority model:
--   * owner  — may set any member's role (including granting or revoking owner)
--              and remove anyone, provided the org always keeps >= 1 owner.
--   * admin  — may manage plain members only: change a member's role between
--              member and admin (never owner) and remove members.
--   * member — no people-management rights.

create or replace function public.update_member_role(p_membership_id uuid, p_role text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  target public.memberships;
  actor_role text;
  owner_count int;
begin
  if p_role not in ('owner', 'admin', 'member') then
    raise exception 'Invalid role' using errcode = '22023';
  end if;

  select * into target from public.memberships where id = p_membership_id;
  if target.id is null then
    raise exception 'Member not found' using errcode = 'P0002';
  end if;

  select role into actor_role
  from public.memberships
  where organization_id = target.organization_id and user_id = auth.uid();

  if actor_role is null or actor_role not in ('owner', 'admin') then
    raise exception 'Only owners and admins can manage members' using errcode = '42501';
  end if;

  -- Admins may only retouch plain members, and may never grant owner.
  if actor_role = 'admin' and (target.role <> 'member' or p_role = 'owner') then
    raise exception 'Admins can only manage members' using errcode = '42501';
  end if;

  -- Nothing to do.
  if target.role = p_role then
    return;
  end if;

  -- Never demote the org's last owner.
  if target.role = 'owner' and p_role <> 'owner' then
    select count(*) into owner_count
    from public.memberships
    where organization_id = target.organization_id and role = 'owner';
    if owner_count <= 1 then
      raise exception 'An organization must keep at least one owner' using errcode = '22023';
    end if;
  end if;

  update public.memberships set role = p_role where id = p_membership_id;
end $$;
revoke all on function public.update_member_role(uuid, text) from public, anon;
grant execute on function public.update_member_role(uuid, text) to authenticated;

create or replace function public.remove_member(p_membership_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  target public.memberships;
  actor_role text;
  owner_count int;
begin
  select * into target from public.memberships where id = p_membership_id;
  if target.id is null then
    raise exception 'Member not found' using errcode = 'P0002';
  end if;

  select role into actor_role
  from public.memberships
  where organization_id = target.organization_id and user_id = auth.uid();

  if actor_role is null or actor_role not in ('owner', 'admin') then
    raise exception 'Only owners and admins can remove members' using errcode = '42501';
  end if;

  -- Admins may only remove plain members.
  if actor_role = 'admin' and target.role <> 'member' then
    raise exception 'Admins can only remove members' using errcode = '42501';
  end if;

  -- Never remove the org's last owner.
  if target.role = 'owner' then
    select count(*) into owner_count
    from public.memberships
    where organization_id = target.organization_id and role = 'owner';
    if owner_count <= 1 then
      raise exception 'An organization must keep at least one owner' using errcode = '22023';
    end if;
  end if;

  delete from public.memberships where id = p_membership_id;
end $$;
revoke all on function public.remove_member(uuid) from public, anon;
grant execute on function public.remove_member(uuid) to authenticated;
