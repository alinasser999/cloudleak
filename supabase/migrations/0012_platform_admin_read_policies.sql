-- Make the god view read under the platform admin's own JWT (RLS-enforced) instead
-- of the service role — removing the SUPABASE_SERVICE_ROLE_KEY dependency from the
-- /api/admin request path and keeping all reads inside row-level security.
--
-- These are additive SELECT policies (OR'd with the existing org-scoped ones), so a
-- platform admin sees every row while regular users are unaffected.

-- Private mirror of is_platform_admin() for use inside RLS policies (definer so it
-- can read the locked platform_admins table; private schema so PostgREST never
-- exposes it via /rpc).
create or replace function private.is_platform_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid())
$$;
revoke all on function private.is_platform_admin() from public, anon;
grant execute on function private.is_platform_admin() to authenticated;

create policy "platform read all profiles" on public.profiles
  for select using (private.is_platform_admin());
create policy "platform read all organizations" on public.organizations
  for select using (private.is_platform_admin());
create policy "platform read all memberships" on public.memberships
  for select using (private.is_platform_admin());
create policy "platform read all invitations" on public.invitations
  for select using (private.is_platform_admin());
create policy "platform read all aws_accounts" on public.aws_accounts
  for select using (private.is_platform_admin());
create policy "platform read all scans" on public.scans
  for select using (private.is_platform_admin());
create policy "platform read all findings" on public.findings
  for select using (private.is_platform_admin());
