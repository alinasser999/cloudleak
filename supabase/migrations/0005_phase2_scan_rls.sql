-- Phase 2: allow members to write their org's inventory + scan rows under their own JWT.
-- Mirrors the Phase 1 user-JWT write decision (migration 0004). Read policies already exist.

-- resources: members may insert and delete their org's rows (scan = delete-then-insert).
create policy "member insert resources" on public.resources
  for insert to authenticated
  with check (organization_id in (select private.current_user_org_ids()));

create policy "member delete resources" on public.resources
  for delete to authenticated
  using (organization_id in (select private.current_user_org_ids()));

-- scans: members may insert (create a run) and update (mark finished) their org's rows.
create policy "member insert scans" on public.scans
  for insert to authenticated
  with check (organization_id in (select private.current_user_org_ids()));

create policy "member update scans" on public.scans
  for update to authenticated
  using (organization_id in (select private.current_user_org_ids()))
  with check (organization_id in (select private.current_user_org_ids()));
