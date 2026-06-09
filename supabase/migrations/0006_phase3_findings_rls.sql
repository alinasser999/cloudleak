-- Phase 3: RLS write policies for findings table.
-- SELECT policy already exists from 0001_init.sql ("org read findings").
-- Detection runner inserts/replaces findings; members can dismiss (update status).

create policy "member insert findings" on public.findings
  for insert
  with check (organization_id in (select private.current_user_org_ids()));

create policy "member update findings" on public.findings
  for update
  using (organization_id in (select private.current_user_org_ids()));

create policy "member delete findings" on public.findings
  for delete
  using (organization_id in (select private.current_user_org_ids()));
