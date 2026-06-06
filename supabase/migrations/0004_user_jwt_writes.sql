-- Enable user-initiated writes under the caller's own JWT + RLS (the spec anticipated
-- adding these once direct client writes were introduced). This removes the service-role
-- dependency for org creation, invites, and AWS connect.

-- ---- bootstrap functions (need definer to break membership chicken-and-egg) ----

-- Create an org and make the caller its owner, returning the org.
create or replace function public.create_organization(p_name text)
returns public.organizations
language plpgsql security definer set search_path = public as $$
declare org public.organizations;
begin
  if coalesce(length(btrim(p_name)), 0) < 2 then
    raise exception 'Organization name is too short' using errcode = '22023';
  end if;
  insert into public.organizations(name) values (btrim(p_name)) returning * into org;
  insert into public.memberships(organization_id, user_id, role)
    values (org.id, auth.uid(), 'owner');
  return org;
end $$;
revoke all on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated;

-- Accept an invite: validate, add the caller as a member, mark accepted; returns org id.
create or replace function public.accept_invite(p_token text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare inv public.invitations; uemail text;
begin
  select * into inv from public.invitations where token = p_token;
  if inv.id is null then raise exception 'Invite not found' using errcode = 'P0002'; end if;
  if inv.status <> 'pending' then raise exception 'Invite is no longer valid' using errcode = '22023'; end if;
  if inv.expires_at < now() then raise exception 'Invite has expired' using errcode = '22023'; end if;
  select email into uemail from auth.users where id = auth.uid();
  if lower(uemail) <> lower(inv.email) then
    raise exception 'This invite is for a different email' using errcode = '42501';
  end if;
  insert into public.memberships(organization_id, user_id, role)
    values (inv.organization_id, auth.uid(), inv.role)
    on conflict (organization_id, user_id) do nothing;
  update public.invitations set status = 'accepted' where id = inv.id;
  return inv.organization_id;
end $$;
revoke all on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;

-- ---- direct write policies for tables the caller is already a member of ----

create policy "member insert aws_accounts" on public.aws_accounts
  for insert to authenticated
  with check (organization_id in (select private.current_user_org_ids()));

create policy "member update aws_accounts" on public.aws_accounts
  for update to authenticated
  using (organization_id in (select private.current_user_org_ids()))
  with check (organization_id in (select private.current_user_org_ids()));

create policy "member insert invitations" on public.invitations
  for insert to authenticated
  with check (organization_id in (select private.current_user_org_ids()));
