-- Team visibility: let members of an org read each other's profiles.
--
-- The base "own profile" policy only exposes a user's own row, which is enough
-- for auth but not for a Members/Team page. Scope the additional visibility to
-- profiles belonging to users who share at least one organization with the
-- caller (via the private helper, so the FROM clause itself stays RLS-safe).
create policy "read co-member profiles" on public.profiles
  for select using (
    id in (
      select m.user_id
      from public.memberships m
      where m.organization_id in (select private.current_user_org_ids())
    )
  );
