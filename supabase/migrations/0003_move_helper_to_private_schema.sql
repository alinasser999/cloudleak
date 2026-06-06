-- Fully remove the SECURITY DEFINER helpers from the public REST/RPC surface.

-- 1. handle_new_user(): invoked only by the trigger. Explicitly revoke from the
--    PostgREST roles so it is not callable via /rpc.
revoke execute on function public.handle_new_user() from anon, authenticated;

-- 2. Move current_user_org_ids() into a private schema that PostgREST does not
--    expose. RLS policies can still call it; the authenticated role keeps EXECUTE.
create schema if not exists private;

create or replace function private.current_user_org_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.memberships where user_id = auth.uid()
$$;
revoke all on function private.current_user_org_ids() from public;
grant usage on schema private to authenticated;
grant execute on function private.current_user_org_ids() to authenticated;

-- 3. Re-point every org-scoped policy at the private helper.
drop policy "member can read org" on public.organizations;
create policy "member can read org" on public.organizations
  for select using (id in (select private.current_user_org_ids()));

drop policy "read own memberships" on public.memberships;
create policy "read own memberships" on public.memberships
  for select using (organization_id in (select private.current_user_org_ids()));

drop policy "read org invitations" on public.invitations;
create policy "read org invitations" on public.invitations
  for select using (organization_id in (select private.current_user_org_ids()));

drop policy "org read aws_accounts" on public.aws_accounts;
create policy "org read aws_accounts" on public.aws_accounts
  for select using (organization_id in (select private.current_user_org_ids()));

drop policy "org read resources" on public.resources;
create policy "org read resources" on public.resources
  for select using (organization_id in (select private.current_user_org_ids()));

drop policy "org read findings" on public.findings;
create policy "org read findings" on public.findings
  for select using (organization_id in (select private.current_user_org_ids()));

drop policy "org read scans" on public.scans;
create policy "org read scans" on public.scans
  for select using (organization_id in (select private.current_user_org_ids()));

drop policy "org read reports" on public.reports;
create policy "org read reports" on public.reports
  for select using (organization_id in (select private.current_user_org_ids()));

drop policy "org read subscriptions" on public.subscriptions;
create policy "org read subscriptions" on public.subscriptions
  for select using (organization_id in (select private.current_user_org_ids()));

-- 4. Drop the now-unused public helper.
drop function public.current_user_org_ids();
