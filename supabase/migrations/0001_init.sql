-- ---------- tables ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'starter',
  created_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null default 'member',
  token text not null unique,
  status text not null default 'pending',
  invited_by uuid references public.profiles(id),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.aws_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  account_id text,
  role_arn text,
  external_id text not null,
  status text not null default 'pending',
  last_validated_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- future-phase tables (schema stability; not used in Phase 1) ----------
create table public.resources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  aws_account_id uuid not null references public.aws_accounts(id) on delete cascade,
  resource_id text not null, resource_type text not null, region text not null,
  metadata jsonb not null default '{}', estimated_monthly_cost numeric,
  created_at timestamptz not null default now()
);
create table public.findings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  aws_account_id uuid not null references public.aws_accounts(id) on delete cascade,
  resource_id uuid references public.resources(id) on delete set null,
  finding_type text not null, severity text not null, confidence_score int,
  estimated_monthly_savings numeric, risk_score int, title text not null,
  description text, terraform_fix text, manual_fix text,
  status text not null default 'open', created_at timestamptz not null default now()
);
create table public.scans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  aws_account_id uuid not null references public.aws_accounts(id) on delete cascade,
  status text not null default 'queued', started_at timestamptz, finished_at timestamptz,
  stats jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period_start date not null, period_end date not null,
  payload jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  stripe_customer_id text, stripe_subscription_id text,
  plan text, status text, current_period_end timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- profile auto-creation trigger ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email,
          new.raw_user_meta_data->>'full_name',
          new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- helper: org ids for current user (defined after memberships exists) ----------
create or replace function public.current_user_org_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.memberships where user_id = auth.uid()
$$;

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.invitations enable row level security;
alter table public.aws_accounts enable row level security;
alter table public.resources enable row level security;
alter table public.findings enable row level security;
alter table public.scans enable row level security;
alter table public.reports enable row level security;
alter table public.subscriptions enable row level security;

create policy "own profile" on public.profiles
  for select using (id = auth.uid());
create policy "update own profile" on public.profiles
  for update using (id = auth.uid());

create policy "member can read org" on public.organizations
  for select using (id in (select public.current_user_org_ids()));

create policy "read own memberships" on public.memberships
  for select using (organization_id in (select public.current_user_org_ids()));

create policy "read org invitations" on public.invitations
  for select using (organization_id in (select public.current_user_org_ids()));

-- generic org-scoped read policy for the rest
create policy "org read aws_accounts" on public.aws_accounts
  for select using (organization_id in (select public.current_user_org_ids()));
create policy "org read resources" on public.resources
  for select using (organization_id in (select public.current_user_org_ids()));
create policy "org read findings" on public.findings
  for select using (organization_id in (select public.current_user_org_ids()));
create policy "org read scans" on public.scans
  for select using (organization_id in (select public.current_user_org_ids()));
create policy "org read reports" on public.reports
  for select using (organization_id in (select public.current_user_org_ids()));
create policy "org read subscriptions" on public.subscriptions
  for select using (organization_id in (select public.current_user_org_ids()));
