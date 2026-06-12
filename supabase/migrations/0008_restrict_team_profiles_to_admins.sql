-- Tighten team visibility: only owners/admins may read co-member profiles.
--
-- The Members/Team page is now admin-only at the app layer; mirror that at the
-- database layer (defense in depth) so a plain member can no longer enumerate
-- co-member emails via direct REST. The base "own profile" policy still lets
-- every user read their own row.

-- Private helper: org ids where the caller is an owner or admin. SECURITY DEFINER
-- so the body bypasses RLS on memberships (recursion-safe); lives in the private
-- schema so PostgREST never exposes it via /rpc.
create or replace function private.current_user_admin_org_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select organization_id
  from public.memberships
  where user_id = auth.uid() and role in ('owner', 'admin')
$$;
revoke all on function private.current_user_admin_org_ids() from public;
grant execute on function private.current_user_admin_org_ids() to authenticated;

-- Re-scope the co-member profile read to admin-held orgs only.
drop policy "read co-member profiles" on public.profiles;
create policy "read co-member profiles" on public.profiles
  for select using (
    id in (
      select m.user_id
      from public.memberships m
      where m.organization_id in (select private.current_user_admin_org_ids())
    )
  );
