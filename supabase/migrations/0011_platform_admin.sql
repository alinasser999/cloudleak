-- Platform super-admin ("god view"): a privileged operator role that sees across
-- ALL organizations, intentionally bypassing tenant isolation. This is distinct
-- from the org-scoped owner/admin roles.
--
-- Membership is stored in a locked table (RLS enabled, no policies) so it is only
-- reachable via SECURITY DEFINER helpers or the service role — a signed-in user
-- can never enumerate or grant platform-admin rights via the REST API. The actual
-- cross-tenant data reads happen server-side under the service role, gated behind
-- is_platform_admin().

create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;
-- Deliberately no policies: locked to service-role / SECURITY DEFINER access only.

-- Is the current caller a platform admin? DEFINER so it can read the locked table;
-- exposed to authenticated for nav/route gating, but reveals only a boolean.
create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid())
$$;
revoke all on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

-- Seed the operator.
insert into public.platform_admins (user_id)
select id from auth.users where email = 'alin45962@gmail.com'
on conflict do nothing;
