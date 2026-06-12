-- Real audit log: an append-only record of lifecycle changes across the platform,
-- captured by triggers at the database level so every change is logged regardless
-- of the code path that made it (app service, SECURITY DEFINER RPC, or direct REST).
--
-- Readable only by platform admins (god view). Rows are written by a SECURITY
-- DEFINER trigger that bypasses RLS, so no INSERT policy is exposed to users.

create table public.audit_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor_id uuid,            -- auth.uid() at the time of the action (null = system/unauthenticated)
  organization_id uuid,     -- derived from the changed row when present
  action text not null,     -- e.g. membership.insert, membership.role_changed, invitation.revoked
  table_name text not null,
  record_id uuid,
  metadata jsonb not null default '{}'
);
create index audit_events_created_at_idx on public.audit_events (created_at desc);
create index audit_events_org_idx on public.audit_events (organization_id);

alter table public.audit_events enable row level security;
create policy "platform read all audit_events" on public.audit_events
  for select using (private.is_platform_admin());

-- Generic change-capture trigger. Snapshots old/new rows (minus secrets) into
-- metadata and derives a friendly action for the changes that matter most.
create or replace function public.audit_row_change()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  newj jsonb := case when TG_OP <> 'DELETE' then to_jsonb(NEW) else null end;
  oldj jsonb := case when TG_OP <> 'INSERT' then to_jsonb(OLD) else null end;
  rec jsonb;
  sensitive text[] := array['token', 'external_id', 'role_arn'];
  k text;
  v_action text;
begin
  foreach k in array sensitive loop
    if newj is not null then newj := newj - k; end if;
    if oldj is not null then oldj := oldj - k; end if;
  end loop;
  rec := coalesce(newj, oldj);

  v_action := TG_TABLE_NAME || '.' || lower(TG_OP);

  if TG_TABLE_NAME = 'memberships' and TG_OP = 'UPDATE'
     and (newj->>'role') is distinct from (oldj->>'role') then
    v_action := 'membership.role_changed';
  elsif TG_TABLE_NAME = 'invitations' and TG_OP = 'UPDATE'
     and (newj->>'status') is distinct from (oldj->>'status') then
    v_action := 'invitation.' || (newj->>'status');
  end if;

  insert into public.audit_events (actor_id, organization_id, action, table_name, record_id, metadata)
  values (
    auth.uid(),
    nullif(rec->>'organization_id', '')::uuid,
    v_action,
    TG_TABLE_NAME,
    nullif(rec->>'id', '')::uuid,
    jsonb_strip_nulls(jsonb_build_object('old', oldj, 'new', newj))
  );

  return coalesce(NEW, OLD);
end $$;

create trigger audit_profiles after insert or update or delete on public.profiles
  for each row execute function public.audit_row_change();
create trigger audit_organizations after insert or update or delete on public.organizations
  for each row execute function public.audit_row_change();
create trigger audit_memberships after insert or update or delete on public.memberships
  for each row execute function public.audit_row_change();
create trigger audit_invitations after insert or update or delete on public.invitations
  for each row execute function public.audit_row_change();
create trigger audit_aws_accounts after insert or update or delete on public.aws_accounts
  for each row execute function public.audit_row_change();

-- Backfill historical lifecycle so the log isn't empty on day one.
insert into public.audit_events (created_at, organization_id, action, table_name, record_id, metadata)
select created_at, null, 'profiles.insert', 'profiles', id,
       jsonb_build_object('backfill', true, 'new', jsonb_build_object('email', email))
from public.profiles;

insert into public.audit_events (created_at, organization_id, action, table_name, record_id, metadata)
select created_at, id, 'organizations.insert', 'organizations', id,
       jsonb_build_object('backfill', true, 'new', jsonb_build_object('name', name, 'plan', plan))
from public.organizations;

insert into public.audit_events (created_at, organization_id, action, table_name, record_id, metadata)
select created_at, organization_id, 'memberships.insert', 'memberships', id,
       jsonb_build_object('backfill', true, 'new', jsonb_build_object('user_id', user_id, 'role', role))
from public.memberships;

insert into public.audit_events (created_at, organization_id, action, table_name, record_id, metadata)
select created_at, organization_id, 'invitations.insert', 'invitations', id,
       jsonb_build_object('backfill', true, 'new', jsonb_build_object('email', email, 'role', role, 'status', status))
from public.invitations;

insert into public.audit_events (created_at, organization_id, action, table_name, record_id, metadata)
select created_at, organization_id, 'aws_accounts.insert', 'aws_accounts', id,
       jsonb_build_object('backfill', true, 'new', jsonb_build_object('account_id', account_id, 'status', status))
from public.aws_accounts;
