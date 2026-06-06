# CloudLeak Foundation (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the CloudLeak foundation — Turborepo monorepo, Supabase schema with RLS, OAuth auth, organizations with invites, and an AWS cross-account connect flow with a mockable STS validator.

**Architecture:** Next.js App Router app (`apps/web`) with thin REST route handlers delegating to a service layer, which calls repositories that own all Supabase access; pure domain types/logic in `packages/core`; AWS STS behind an interface in `packages/aws`. Multi-tenancy enforced by Postgres RLS plus repository-level org scoping.

**Tech Stack:** TypeScript (strict), pnpm workspaces + Turborepo, Next.js (App Router), Supabase (Postgres + Auth, OAuth Google/GitHub), Zod, Vitest, @aws-sdk/client-sts, Tailwind + shadcn/ui.

---

## File Structure

```
cloudleak/
  pnpm-workspace.yaml          # workspace globs
  package.json                 # root scripts + devDeps (turbo, vitest)
  turbo.json                   # pipeline
  tsconfig.base.json           # strict TS base
  .env.example
  packages/
    config/                    # shared eslint/tsconfig/tailwind preset
    core/
      src/types.ts             # domain types
      src/errors.ts            # typed domain errors
      src/ids.ts               # external_id generator
      src/terraform.ts         # role module renderer
      src/index.ts
      test/ids.test.ts
      test/terraform.test.ts
    db/
      src/client.ts            # 3 Supabase client factories
      src/types.generated.ts   # supabase gen types
      src/repositories/*.ts    # Org/Membership/Invite/AwsAccount/Profile repos
      src/index.ts
    aws/
      src/sts-service.ts       # interface + Real + Fake
      src/index.ts
      test/sts-service.test.ts
  apps/web/
    package.json
    next.config.ts
    middleware.ts              # session refresh + route guards
    app/(marketing)/page.tsx   # landing
    app/(auth)/login/page.tsx
    app/auth/callback/route.ts # OAuth callback
    app/(dashboard)/layout.tsx
    app/(dashboard)/onboarding/page.tsx
    app/(dashboard)/settings/aws/page.tsx
    app/invite/[token]/page.tsx
    app/api/orgs/route.ts
    app/api/invites/route.ts
    app/api/invites/accept/route.ts
    app/api/aws/connect/init/route.ts
    app/api/aws/connect/validate/route.ts
    app/api/aws/accounts/route.ts
    server/services/*.ts       # OrganizationService, InviteService, AwsConnectService
    server/api-error-handler.ts
    lib/supabase/*.ts          # server/browser client helpers, auth guard
    test/integration/*.test.ts
  supabase/migrations/*.sql
```

---

## Task 1: Monorepo scaffold

**Files:**
- Create: `pnpm-workspace.yaml`, `package.json`, `turbo.json`, `tsconfig.base.json`, `.env.example`, `packages/config/package.json`, `packages/config/tsconfig.base.json`

- [ ] **Step 1: pnpm-workspace.yaml**
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 2: root package.json**
```json
{
  "name": "cloudleak",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "typecheck": "turbo run typecheck"
  },
  "devDependencies": {
    "turbo": "^2.1.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 3: turbo.json**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": {},
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"] }
  }
}
```

- [ ] **Step 4: tsconfig.base.json**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "composite": false,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 5: .env.example**
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PROJECT_REF=
CLOUDLEAK_AWS_ACCOUNT_ID=000000000000
AWS_REGION=us-east-1
```

- [ ] **Step 6: packages/config/package.json**
```json
{ "name": "@cloudleak/config", "version": "0.0.0", "private": true, "main": "index.js", "files": ["*.json"] }
```

- [ ] **Step 7: packages/config/tsconfig.base.json** — copy of root `tsconfig.base.json` (so packages can `extends: "@cloudleak/config/tsconfig.base.json"`).

- [ ] **Step 8: Install and commit**
```bash
cd cloudleak && pnpm install
git add -A && git commit -m "chore: scaffold turborepo monorepo"
```
Expected: `pnpm install` completes, lockfile created.

---

## Task 2: packages/core — domain types & errors

**Files:**
- Create: `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/src/types.ts`, `packages/core/src/errors.ts`, `packages/core/src/index.ts`

- [ ] **Step 1: package.json**
```json
{
  "name": "@cloudleak/core",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "echo ok"
  },
  "devDependencies": { "typescript": "^5.6.0", "vitest": "^2.1.0" }
}
```

- [ ] **Step 2: tsconfig.json**
```json
{ "extends": "@cloudleak/config/tsconfig.base.json", "include": ["src", "test"] }
```

- [ ] **Step 3: src/types.ts**
```ts
export type Role = "owner" | "admin" | "member";
export type AwsAccountStatus = "pending" | "connected" | "error";
export type InviteStatus = "pending" | "accepted" | "revoked" | "expired";
export type Plan = "starter" | "growth" | "agency";

export interface Profile { id: string; email: string; fullName: string | null; avatarUrl: string | null; }
export interface Organization { id: string; name: string; plan: Plan; createdAt: string; }
export interface Membership { id: string; organizationId: string; userId: string; role: Role; }
export interface Invitation {
  id: string; organizationId: string; email: string; role: Role;
  token: string; status: InviteStatus; expiresAt: string; invitedBy: string | null;
}
export interface AwsAccount {
  id: string; organizationId: string; accountId: string | null; roleArn: string | null;
  externalId: string; status: AwsAccountStatus; lastValidatedAt: string | null;
}
```

- [ ] **Step 4: src/errors.ts**
```ts
export class DomainError extends Error {
  constructor(message: string, readonly code: string, readonly httpStatus: number) {
    super(message);
    this.name = new.target.name;
  }
}
export class ValidationError extends DomainError { constructor(m: string) { super(m, "validation_error", 400); } }
export class NotFoundError extends DomainError { constructor(m = "Not found") { super(m, "not_found", 404); } }
export class ForbiddenError extends DomainError { constructor(m = "Forbidden") { super(m, "forbidden", 403); } }
export class AwsValidationError extends DomainError { constructor(m: string) { super(m, "aws_validation_error", 422); } }
```

- [ ] **Step 5: src/index.ts**
```ts
export * from "./types.js";
export * from "./errors.js";
export * from "./ids.js";
export * from "./terraform.js";
```
(Note: `ids.ts` and `terraform.ts` are added in Tasks 3–4; create empty placeholder exports there before running typecheck, or reorder so this file is finalized after Task 4.)

- [ ] **Step 6: Commit**
```bash
git add -A && git commit -m "feat(core): domain types and typed errors"
```

---

## Task 3: packages/core — external_id generator (TDD)

**Files:**
- Create: `packages/core/src/ids.ts`, `packages/core/test/ids.test.ts`

- [ ] **Step 1: Write failing test — `test/ids.test.ts`**
```ts
import { describe, it, expect } from "vitest";
import { generateExternalId } from "../src/ids.js";

describe("generateExternalId", () => {
  it("has the clk_ prefix", () => {
    expect(generateExternalId().startsWith("clk_")).toBe(true);
  });
  it("uses only url-safe chars after the prefix", () => {
    const body = generateExternalId().slice(4);
    expect(body).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it("is long enough to be unguessable (>= 32 body chars)", () => {
    expect(generateExternalId().slice(4).length).toBeGreaterThanOrEqual(32);
  });
  it("produces unique values", () => {
    const set = new Set(Array.from({ length: 1000 }, () => generateExternalId()));
    expect(set.size).toBe(1000);
  });
});
```

- [ ] **Step 2: Run, verify fail**
Run: `pnpm --filter @cloudleak/core test`
Expected: FAIL — `generateExternalId` not exported.

- [ ] **Step 3: Implement — `src/ids.ts`**
```ts
import { randomBytes } from "node:crypto";

/** Cryptographically-random external id used in AWS role trust policies. */
export function generateExternalId(): string {
  return "clk_" + randomBytes(24).toString("base64url");
}
```

- [ ] **Step 4: Run, verify pass**
Run: `pnpm --filter @cloudleak/core test`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat(core): external id generator"
```

---

## Task 4: packages/core — Terraform role renderer (TDD)

**Files:**
- Create: `packages/core/src/terraform.ts`, `packages/core/test/terraform.test.ts`

- [ ] **Step 1: Write failing test — `test/terraform.test.ts`**
```ts
import { describe, it, expect } from "vitest";
import { renderRoleTerraform } from "../src/terraform.js";

const opts = { externalId: "clk_abc123", cloudleakAccountId: "123456789012", roleName: "CloudLeakReadOnly" };

describe("renderRoleTerraform", () => {
  it("injects the external id", () => {
    expect(renderRoleTerraform(opts)).toContain("clk_abc123");
  });
  it("locks the trust policy to the cloudleak account", () => {
    expect(renderRoleTerraform(opts)).toContain("arn:aws:iam::123456789012:root");
  });
  it("uses the given role name", () => {
    expect(renderRoleTerraform(opts)).toContain("CloudLeakReadOnly");
  });
  it("attaches a read-only managed policy", () => {
    expect(renderRoleTerraform(opts)).toContain("ReadOnlyAccess");
  });
  it("leaves no unreplaced placeholders", () => {
    expect(renderRoleTerraform(opts)).not.toMatch(/\{\{.*?\}\}/);
  });
});
```

- [ ] **Step 2: Run, verify fail**
Run: `pnpm --filter @cloudleak/core test`
Expected: FAIL — `renderRoleTerraform` not exported.

- [ ] **Step 3: Implement — `src/terraform.ts`**
```ts
export interface RoleTerraformOptions {
  externalId: string;
  cloudleakAccountId: string;
  roleName: string;
}

export function renderRoleTerraform(o: RoleTerraformOptions): string {
  return `# CloudLeak read-only cross-account role.
# Apply this, then paste the output role_arn back into CloudLeak.

resource "aws_iam_role" "cloudleak" {
  name = "${o.roleName}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { AWS = "arn:aws:iam::${o.cloudleakAccountId}:root" }
      Action    = "sts:AssumeRole"
      Condition = { StringEquals = { "sts:ExternalId" = "${o.externalId}" } }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "cloudleak_readonly" {
  role       = aws_iam_role.cloudleak.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}

output "role_arn" {
  value = aws_iam_role.cloudleak.arn
}
`;
}
```

- [ ] **Step 4: Run, verify pass**
Run: `pnpm --filter @cloudleak/core test`
Expected: PASS. Then run `pnpm --filter @cloudleak/core typecheck` → no errors.

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "feat(core): terraform role module renderer"
```

---

## Task 5: Supabase migrations — schema, trigger, RLS

**Files:**
- Create: `supabase/migrations/0001_init.sql`

This migration is applied via the Supabase MCP `apply_migration` tool (name: `init`). The SQL is also kept in the repo as the source of truth.

- [ ] **Step 1: Write `supabase/migrations/0001_init.sql`**
```sql
-- ---------- helper: org ids for current user ----------
create or replace function public.current_user_org_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.memberships where user_id = auth.uid()
$$;

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
```
(Writes/inserts from the app go through the **service-role** client in server code, which bypasses RLS; RLS here protects against the user-JWT client reading across tenants. This keeps Phase 1 simple while still proving isolation. Write policies for the user-JWT client can be added in a later phase if direct client writes are introduced.)

- [ ] **Step 2: Apply migration via Supabase MCP**
Use MCP `apply_migration` with name `init` and the SQL above. Then `list_tables` to confirm all 11 tables exist.
Expected: tables present, no errors.

- [ ] **Step 3: Run advisors**
Use MCP `get_advisors` (type `security`) and confirm RLS is enabled on all public tables (no "RLS disabled" findings for our tables).

- [ ] **Step 4: Commit**
```bash
git add -A && git commit -m "feat(db): initial schema, profile trigger, and RLS policies"
```

---

## Task 6: packages/db — types & client factories

**Files:**
- Create: `packages/db/package.json`, `packages/db/tsconfig.json`, `packages/db/src/types.generated.ts`, `packages/db/src/client.ts`, `packages/db/src/index.ts`

- [ ] **Step 1: package.json**
```json
{
  "name": "@cloudleak/db",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "typecheck": "tsc --noEmit", "test": "vitest run", "lint": "echo ok" },
  "dependencies": { "@supabase/supabase-js": "^2.45.0", "@supabase/ssr": "^0.5.0", "@cloudleak/core": "workspace:*" },
  "devDependencies": { "typescript": "^5.6.0", "vitest": "^2.1.0" }
}
```

- [ ] **Step 2: tsconfig.json**
```json
{ "extends": "@cloudleak/config/tsconfig.base.json", "include": ["src"] }
```

- [ ] **Step 3: Generate DB types via Supabase MCP**
Use MCP `generate_typescript_types` and write the output to `packages/db/src/types.generated.ts` (export name `Database`).

- [ ] **Step 4: src/client.ts**
```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types.generated.js";

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = () => process.env.SUPABASE_SERVICE_ROLE_KEY!;

export type Db = SupabaseClient<Database>;

/** Service-role client — bypasses RLS. Server-only. Never import in client components. */
export function createServiceClient(): Db {
  return createClient<Database>(url(), service(), { auth: { persistSession: false } });
}

/** Anon client bound to a user access token — RLS enforced. */
export function createUserClient(accessToken: string): Db {
  return createClient<Database>(url(), anon(), {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
  });
}
```

- [ ] **Step 5: src/index.ts**
```ts
export * from "./client.js";
export * from "./repositories/index.js";
export type { Database } from "./types.generated.js";
```
(Create `repositories/index.js` export barrel in Task 7; until then comment out that line to typecheck.)

- [ ] **Step 6: Commit**
```bash
git add -A && git commit -m "feat(db): generated types and supabase client factories"
```

---

## Task 7: packages/db — repositories

**Files:**
- Create: `packages/db/src/repositories/organization.ts`, `membership.ts`, `invitation.ts`, `aws-account.ts`, `index.ts`

Repositories take a `Db` client in the constructor and map rows to `@cloudleak/core` domain types. All multi-row reads are scoped by `organizationId`.

- [ ] **Step 1: src/repositories/organization.ts**
```ts
import type { Db } from "../client.js";
import type { Organization, Plan } from "@cloudleak/core";
import { NotFoundError } from "@cloudleak/core";

export class OrganizationRepository {
  constructor(private readonly db: Db) {}

  async create(name: string): Promise<Organization> {
    const { data, error } = await this.db
      .from("organizations").insert({ name }).select().single();
    if (error || !data) throw new Error(error?.message ?? "insert failed");
    return { id: data.id, name: data.name, plan: data.plan as Plan, createdAt: data.created_at };
  }

  async getById(id: string): Promise<Organization> {
    const { data, error } = await this.db
      .from("organizations").select().eq("id", id).single();
    if (error || !data) throw new NotFoundError("Organization not found");
    return { id: data.id, name: data.name, plan: data.plan as Plan, createdAt: data.created_at };
  }
}
```

- [ ] **Step 2: src/repositories/membership.ts**
```ts
import type { Db } from "../client.js";
import type { Membership, Role } from "@cloudleak/core";

export class MembershipRepository {
  constructor(private readonly db: Db) {}

  async create(organizationId: string, userId: string, role: Role): Promise<Membership> {
    const { data, error } = await this.db
      .from("memberships").insert({ organization_id: organizationId, user_id: userId, role })
      .select().single();
    if (error || !data) throw new Error(error?.message ?? "insert failed");
    return { id: data.id, organizationId: data.organization_id, userId: data.user_id, role: data.role as Role };
  }

  async listForUser(userId: string): Promise<Membership[]> {
    const { data, error } = await this.db
      .from("memberships").select().eq("user_id", userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((d) => ({ id: d.id, organizationId: d.organization_id, userId: d.user_id, role: d.role as Role }));
  }

  async findForUserInOrg(userId: string, organizationId: string): Promise<Membership | null> {
    const { data } = await this.db
      .from("memberships").select().eq("user_id", userId).eq("organization_id", organizationId).maybeSingle();
    return data ? { id: data.id, organizationId: data.organization_id, userId: data.user_id, role: data.role as Role } : null;
  }
}
```

- [ ] **Step 3: src/repositories/invitation.ts**
```ts
import type { Db } from "../client.js";
import type { Invitation, InviteStatus, Role } from "@cloudleak/core";

const map = (d: any): Invitation => ({
  id: d.id, organizationId: d.organization_id, email: d.email, role: d.role as Role,
  token: d.token, status: d.status as InviteStatus, expiresAt: d.expires_at, invitedBy: d.invited_by,
});

export class InvitationRepository {
  constructor(private readonly db: Db) {}

  async create(input: { organizationId: string; email: string; role: Role; token: string; expiresAt: string; invitedBy: string; }): Promise<Invitation> {
    const { data, error } = await this.db.from("invitations").insert({
      organization_id: input.organizationId, email: input.email, role: input.role,
      token: input.token, expires_at: input.expiresAt, invited_by: input.invitedBy,
    }).select().single();
    if (error || !data) throw new Error(error?.message ?? "insert failed");
    return map(data);
  }

  async findByToken(token: string): Promise<Invitation | null> {
    const { data } = await this.db.from("invitations").select().eq("token", token).maybeSingle();
    return data ? map(data) : null;
  }

  async markAccepted(id: string): Promise<void> {
    const { error } = await this.db.from("invitations").update({ status: "accepted" }).eq("id", id);
    if (error) throw new Error(error.message);
  }
}
```

- [ ] **Step 4: src/repositories/aws-account.ts**
```ts
import type { Db } from "../client.js";
import type { AwsAccount, AwsAccountStatus } from "@cloudleak/core";
import { NotFoundError } from "@cloudleak/core";

const map = (d: any): AwsAccount => ({
  id: d.id, organizationId: d.organization_id, accountId: d.account_id, roleArn: d.role_arn,
  externalId: d.external_id, status: d.status as AwsAccountStatus, lastValidatedAt: d.last_validated_at,
});

export class AwsAccountRepository {
  constructor(private readonly db: Db) {}

  async createPending(organizationId: string, externalId: string): Promise<AwsAccount> {
    const { data, error } = await this.db.from("aws_accounts")
      .insert({ organization_id: organizationId, external_id: externalId, status: "pending" })
      .select().single();
    if (error || !data) throw new Error(error?.message ?? "insert failed");
    return map(data);
  }

  async getById(id: string, organizationId: string): Promise<AwsAccount> {
    const { data } = await this.db.from("aws_accounts")
      .select().eq("id", id).eq("organization_id", organizationId).maybeSingle();
    if (!data) throw new NotFoundError("AWS account not found");
    return map(data);
  }

  async listForOrg(organizationId: string): Promise<AwsAccount[]> {
    const { data, error } = await this.db.from("aws_accounts")
      .select().eq("organization_id", organizationId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(map);
  }

  async markConnected(id: string, accountId: string, roleArn: string): Promise<AwsAccount> {
    const { data, error } = await this.db.from("aws_accounts")
      .update({ account_id: accountId, role_arn: roleArn, status: "connected", last_validated_at: new Date().toISOString() })
      .eq("id", id).select().single();
    if (error || !data) throw new Error(error?.message ?? "update failed");
    return map(data);
  }

  async markError(id: string): Promise<void> {
    await this.db.from("aws_accounts").update({ status: "error" }).eq("id", id);
  }
}
```

- [ ] **Step 5: src/repositories/index.ts**
```ts
export * from "./organization.js";
export * from "./membership.js";
export * from "./invitation.js";
export * from "./aws-account.js";
```
Re-enable the repositories export line in `src/index.ts` (Task 6, Step 5). Run `pnpm --filter @cloudleak/db typecheck`.

- [ ] **Step 6: Commit**
```bash
git add -A && git commit -m "feat(db): organization, membership, invitation, aws-account repositories"
```

---

## Task 8: packages/aws — StsService (TDD)

**Files:**
- Create: `packages/aws/package.json`, `packages/aws/tsconfig.json`, `packages/aws/src/sts-service.ts`, `packages/aws/src/index.ts`, `packages/aws/test/sts-service.test.ts`

- [ ] **Step 1: package.json**
```json
{
  "name": "@cloudleak/aws",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": { "test": "vitest run", "typecheck": "tsc --noEmit", "lint": "echo ok" },
  "dependencies": { "@aws-sdk/client-sts": "^3.650.0", "@cloudleak/core": "workspace:*" },
  "devDependencies": { "typescript": "^5.6.0", "vitest": "^2.1.0" }
}
```

- [ ] **Step 2: tsconfig.json**
```json
{ "extends": "@cloudleak/config/tsconfig.base.json", "include": ["src", "test"] }
```

- [ ] **Step 3: Write failing test — `test/sts-service.test.ts`**
```ts
import { describe, it, expect } from "vitest";
import { FakeStsService } from "../src/sts-service.js";
import { AwsValidationError } from "@cloudleak/core";

describe("FakeStsService", () => {
  it("returns the configured account id on success", async () => {
    const sts = new FakeStsService({ mode: "success", accountId: "123456789012" });
    await expect(sts.assumeRole("arn:aws:iam::123456789012:role/X", "clk_x"))
      .resolves.toEqual({ accountId: "123456789012" });
  });
  it("throws AwsValidationError on failure", async () => {
    const sts = new FakeStsService({ mode: "fail" });
    await expect(sts.assumeRole("arn:aws:iam::1:role/X", "clk_x"))
      .rejects.toBeInstanceOf(AwsValidationError);
  });
});
```

- [ ] **Step 4: Run, verify fail**
Run: `pnpm --filter @cloudleak/aws test`
Expected: FAIL — module not found.

- [ ] **Step 5: Implement — `src/sts-service.ts`**
```ts
import { STSClient, AssumeRoleCommand, GetCallerIdentityCommand } from "@aws-sdk/client-sts";
import { AwsValidationError } from "@cloudleak/core";

export interface StsService {
  assumeRole(roleArn: string, externalId: string): Promise<{ accountId: string }>;
}

export class RealStsService implements StsService {
  constructor(private readonly region = process.env.AWS_REGION ?? "us-east-1") {}

  async assumeRole(roleArn: string, externalId: string): Promise<{ accountId: string }> {
    const base = new STSClient({ region: this.region });
    let creds;
    try {
      const res = await base.send(new AssumeRoleCommand({
        RoleArn: roleArn, RoleSessionName: "cloudleak-validate", ExternalId: externalId, DurationSeconds: 900,
      }));
      creds = res.Credentials;
    } catch (e) {
      throw new AwsValidationError(`AssumeRole failed: ${(e as Error).message}`);
    }
    if (!creds) throw new AwsValidationError("AssumeRole returned no credentials");
    const scoped = new STSClient({
      region: this.region,
      credentials: { accessKeyId: creds.AccessKeyId!, secretAccessKey: creds.SecretAccessKey!, sessionToken: creds.SessionToken! },
    });
    const id = await scoped.send(new GetCallerIdentityCommand({}));
    if (!id.Account) throw new AwsValidationError("Could not resolve account id");
    return { accountId: id.Account };
  }
}

export interface FakeOptions { mode: "success" | "fail"; accountId?: string; }
export class FakeStsService implements StsService {
  constructor(private readonly opts: FakeOptions) {}
  async assumeRole(): Promise<{ accountId: string }> {
    if (this.opts.mode === "fail") throw new AwsValidationError("fake failure");
    return { accountId: this.opts.accountId ?? "000000000000" };
  }
}
```

- [ ] **Step 6: src/index.ts**
```ts
export * from "./sts-service.js";
```

- [ ] **Step 7: Run, verify pass**
Run: `pnpm --filter @cloudleak/aws test` → PASS. Then `pnpm --filter @cloudleak/aws typecheck`.

- [ ] **Step 8: Commit**
```bash
git add -A && git commit -m "feat(aws): StsService interface with real and fake implementations"
```

---

## Task 9: apps/web — scaffold, Supabase auth (OAuth), middleware

**Files:**
- Create: `apps/web/package.json`, `next.config.ts`, `tsconfig.json`, `middleware.ts`, `lib/supabase/server.ts`, `lib/supabase/browser.ts`, `lib/auth.ts`, `app/(auth)/login/page.tsx`, `app/auth/callback/route.ts`, `app/(marketing)/page.tsx`, `app/(dashboard)/layout.tsx`, `app/globals.css`, `app/layout.tsx`

- [ ] **Step 1: package.json**
```json
{
  "name": "@cloudleak/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "next dev", "build": "next build", "start": "next start",
    "lint": "next lint", "typecheck": "tsc --noEmit", "test": "vitest run"
  },
  "dependencies": {
    "next": "^15.0.0", "react": "^18.3.0", "react-dom": "^18.3.0",
    "@supabase/ssr": "^0.5.0", "@supabase/supabase-js": "^2.45.0",
    "zod": "^3.23.0",
    "@cloudleak/core": "workspace:*", "@cloudleak/db": "workspace:*", "@cloudleak/aws": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.6.0", "vitest": "^2.1.0",
    "@types/react": "^18.3.0", "@types/node": "^22.0.0",
    "tailwindcss": "^3.4.0", "postcss": "^8.4.0", "autoprefixer": "^10.4.0"
  }
}
```

- [ ] **Step 2: tsconfig.json / next.config.ts / tailwind**
`tsconfig.json`:
```json
{
  "extends": "@cloudleak/config/tsconfig.base.json",
  "compilerOptions": { "jsx": "preserve", "plugins": [{ "name": "next" }], "paths": { "@/*": ["./*"] } },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]
}
```
`next.config.ts`:
```ts
import type { NextConfig } from "next";
const config: NextConfig = { transpilePackages: ["@cloudleak/core", "@cloudleak/db", "@cloudleak/aws"] };
export default config;
```
Create `tailwind.config.ts`, `postcss.config.js`, and `app/globals.css` with the standard Tailwind directives. Add shadcn/ui later as needed.

- [ ] **Step 3: lib/supabase/server.ts** (SSR client bound to cookies)
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@cloudleak/db";

export async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    },
  );
}
```

- [ ] **Step 4: lib/supabase/browser.ts**
```ts
"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@cloudleak/db";
export const browserSupabase = () =>
  createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
```

- [ ] **Step 5: lib/auth.ts** (auth guard helper used by routes/pages)
```ts
import { getServerSupabase } from "./supabase/server.js";
import { ForbiddenError } from "@cloudleak/core";

export async function requireUser() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ForbiddenError("Not authenticated");
  const token = (await supabase.auth.getSession()).data.session?.access_token ?? "";
  return { user, accessToken: token };
}
```

- [ ] **Step 6: app/auth/callback/route.ts** (OAuth code exchange)
```ts
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supabase = await getServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}/onboarding`);
}
```

- [ ] **Step 7: app/(auth)/login/page.tsx** (client component with OAuth buttons)
```tsx
"use client";
import { browserSupabase } from "@/lib/supabase/browser";

export default function LoginPage() {
  const signIn = (provider: "google" | "github") =>
    browserSupabase().auth.signInWithOAuth({
      provider, options: { redirectTo: `${location.origin}/auth/callback` },
    });
  return (
    <main className="mx-auto max-w-sm py-24 space-y-4">
      <h1 className="text-2xl font-semibold">Sign in to CloudLeak</h1>
      <button onClick={() => signIn("google")} className="w-full rounded border p-2">Continue with Google</button>
      <button onClick={() => signIn("github")} className="w-full rounded border p-2">Continue with GitHub</button>
    </main>
  );
}
```

- [ ] **Step 8: middleware.ts** (refresh session + guard dashboard routes)
```ts
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
    } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  const isApp = req.nextUrl.pathname.startsWith("/onboarding")
    || req.nextUrl.pathname.startsWith("/settings");
  if (isApp && !user) return NextResponse.redirect(new URL("/login", req.url));
  return res;
}
export const config = { matcher: ["/onboarding/:path*", "/settings/:path*"] };
```

- [ ] **Step 9: root layout + marketing + dashboard layout**
Create `app/layout.tsx` (imports `globals.css`, renders `{children}`), `app/(marketing)/page.tsx` (landing hero: "Stop Wasting Money on AWS" + "Run Free Audit" → `/login`), and `app/(dashboard)/layout.tsx` (sidebar shell). Keep them minimal but styled with Tailwind.

- [ ] **Step 10: Configure OAuth providers**
In the Supabase dashboard, enable Google and GitHub providers and set the callback URL to `<app-url>/auth/callback`. Document this in `apps/web/README.md`.

- [ ] **Step 11: Verify build & commit**
Run: `pnpm --filter @cloudleak/web typecheck` and `pnpm --filter @cloudleak/web build`.
Expected: build succeeds.
```bash
git add -A && git commit -m "feat(web): scaffold next app with supabase oauth and route guards"
```

---

## Task 10: Organization onboarding — service + API

**Files:**
- Create: `apps/web/server/services/organization-service.ts`, `apps/web/server/api-error-handler.ts`, `apps/web/app/api/orgs/route.ts`, `apps/web/app/(dashboard)/onboarding/page.tsx`

- [ ] **Step 1: server/api-error-handler.ts**
```ts
import { NextResponse } from "next/server";
import { DomainError } from "@cloudleak/core";

export function handleApiError(e: unknown): NextResponse {
  if (e instanceof DomainError) {
    return NextResponse.json({ error: { code: e.code, message: e.message } }, { status: e.httpStatus });
  }
  console.error("Unhandled API error", e);
  return NextResponse.json({ error: { code: "internal_error", message: "Something went wrong" } }, { status: 500 });
}
```

- [ ] **Step 2: server/services/organization-service.ts**
```ts
import { createServiceClient, OrganizationRepository, MembershipRepository } from "@cloudleak/db";
import { ValidationError, type Organization } from "@cloudleak/core";

export class OrganizationService {
  /** Creates an org and makes the given user its owner. Uses service-role (RLS bypass). */
  static async createWithOwner(userId: string, name: string): Promise<Organization> {
    const trimmed = name.trim();
    if (trimmed.length < 2) throw new ValidationError("Organization name is too short");
    const db = createServiceClient();
    const org = await new OrganizationRepository(db).create(trimmed);
    await new MembershipRepository(db).create(org.id, userId, "owner");
    return org;
  }
}
```

- [ ] **Step 3: app/api/orgs/route.ts**
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { OrganizationService } from "@/server/services/organization-service";
import { handleApiError } from "@/server/api-error-handler";
import { ValidationError } from "@cloudleak/core";

const Body = z.object({ name: z.string() });

export async function POST(req: Request) {
  try {
    const { user } = await requireUser();
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("name is required");
    const org = await OrganizationService.createWithOwner(user.id, parsed.data.name);
    return NextResponse.json({ organization: org }, { status: 201 });
  } catch (e) { return handleApiError(e); }
}
```

- [ ] **Step 4: app/(dashboard)/onboarding/page.tsx** (client form POSTing to `/api/orgs`, then routing to `/settings/aws`). Minimal Tailwind form with a single name input.

- [ ] **Step 5: Verify & commit**
Run: `pnpm --filter @cloudleak/web typecheck`.
```bash
git add -A && git commit -m "feat(web): organization onboarding service and API"
```

---

## Task 11: Invites — service + API + accept

**Files:**
- Create: `apps/web/server/services/invite-service.ts`, `apps/web/app/api/invites/route.ts`, `apps/web/app/api/invites/accept/route.ts`, `apps/web/app/invite/[token]/page.tsx`

- [ ] **Step 1: server/services/invite-service.ts**
```ts
import { randomBytes } from "node:crypto";
import {
  createServiceClient, MembershipRepository, InvitationRepository,
} from "@cloudleak/db";
import { ForbiddenError, NotFoundError, ValidationError, type Invitation, type Role } from "@cloudleak/core";

const INVITE_TTL_DAYS = 7;

export class InviteService {
  static async create(actorUserId: string, organizationId: string, email: string, role: Role): Promise<Invitation> {
    const db = createServiceClient();
    const actor = await new MembershipRepository(db).findForUserInOrg(actorUserId, organizationId);
    if (!actor || (actor.role !== "owner" && actor.role !== "admin"))
      throw new ForbiddenError("Only owners/admins can invite");
    if (!email.includes("@")) throw new ValidationError("Invalid email");
    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 864e5).toISOString();
    return new InvitationRepository(db).create({ organizationId, email, role, token, expiresAt, invitedBy: actorUserId });
  }

  static async accept(userId: string, userEmail: string, token: string): Promise<{ organizationId: string }> {
    const db = createServiceClient();
    const invites = new InvitationRepository(db);
    const invite = await invites.findByToken(token);
    if (!invite) throw new NotFoundError("Invite not found");
    if (invite.status !== "pending") throw new ValidationError("Invite is no longer valid");
    if (new Date(invite.expiresAt).getTime() < Date.now()) throw new ValidationError("Invite has expired");
    if (invite.email.toLowerCase() !== userEmail.toLowerCase())
      throw new ForbiddenError("This invite is for a different email");
    const memberships = new MembershipRepository(db);
    const existing = await memberships.findForUserInOrg(userId, invite.organizationId);
    if (!existing) await memberships.create(invite.organizationId, userId, invite.role);
    await invites.markAccepted(invite.id);
    return { organizationId: invite.organizationId };
  }
}
```

- [ ] **Step 2: app/api/invites/route.ts**
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { InviteService } from "@/server/services/invite-service";
import { handleApiError } from "@/server/api-error-handler";
import { ValidationError } from "@cloudleak/core";

const Body = z.object({ organizationId: z.string().uuid(), email: z.string().email(), role: z.enum(["admin", "member"]) });

export async function POST(req: Request) {
  try {
    const { user } = await requireUser();
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("organizationId, email, role required");
    const invite = await InviteService.create(user.id, parsed.data.organizationId, parsed.data.email, parsed.data.role);
    return NextResponse.json({ invite: { id: invite.id, email: invite.email, token: invite.token } }, { status: 201 });
  } catch (e) { return handleApiError(e); }
}
```

- [ ] **Step 3: app/api/invites/accept/route.ts**
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { InviteService } from "@/server/services/invite-service";
import { handleApiError } from "@/server/api-error-handler";
import { ValidationError } from "@cloudleak/core";

const Body = z.object({ token: z.string().min(10) });

export async function POST(req: Request) {
  try {
    const { user } = await requireUser();
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("token required");
    const result = await InviteService.accept(user.id, user.email ?? "", parsed.data.token);
    return NextResponse.json(result);
  } catch (e) { return handleApiError(e); }
}
```

- [ ] **Step 4: app/invite/[token]/page.tsx** — server page that shows the org name and an "Accept invite" button (POSTs token to `/api/invites/accept`, then routes to `/settings/aws`). If not signed in, link to `/login`.

- [ ] **Step 5: Verify & commit**
Run: `pnpm --filter @cloudleak/web typecheck`.
```bash
git add -A && git commit -m "feat(web): organization invites with token accept flow"
```

---

## Task 12: AWS connect — service + API + UI

**Files:**
- Create: `apps/web/server/services/aws-connect-service.ts`, `apps/web/app/api/aws/connect/init/route.ts`, `apps/web/app/api/aws/connect/validate/route.ts`, `apps/web/app/api/aws/accounts/route.ts`, `apps/web/app/(dashboard)/settings/aws/page.tsx`

- [ ] **Step 1: server/services/aws-connect-service.ts**
```ts
import { createServiceClient, AwsAccountRepository, MembershipRepository } from "@cloudleak/db";
import { generateExternalId, renderRoleTerraform, ForbiddenError, type AwsAccount } from "@cloudleak/core";
import { RealStsService, type StsService } from "@cloudleak/aws";

const ROLE_NAME = "CloudLeakReadOnly";

export class AwsConnectService {
  constructor(private readonly sts: StsService = new RealStsService()) {}

  private async assertAdmin(userId: string, organizationId: string) {
    const db = createServiceClient();
    const m = await new MembershipRepository(db).findForUserInOrg(userId, organizationId);
    if (!m || (m.role !== "owner" && m.role !== "admin"))
      throw new ForbiddenError("Only owners/admins can connect AWS");
  }

  async init(userId: string, organizationId: string): Promise<{ account: AwsAccount; terraform: string; roleName: string; cloudleakAccountId: string; }> {
    await this.assertAdmin(userId, organizationId);
    const db = createServiceClient();
    const externalId = generateExternalId();
    const account = await new AwsAccountRepository(db).createPending(organizationId, externalId);
    const cloudleakAccountId = process.env.CLOUDLEAK_AWS_ACCOUNT_ID!;
    const terraform = renderRoleTerraform({ externalId, cloudleakAccountId, roleName: ROLE_NAME });
    return { account, terraform, roleName: ROLE_NAME, cloudleakAccountId };
  }

  async validate(userId: string, organizationId: string, awsAccountDbId: string, expectedAccountId: string, roleArn: string): Promise<AwsAccount> {
    await this.assertAdmin(userId, organizationId);
    const db = createServiceClient();
    const repo = new AwsAccountRepository(db);
    const acct = await repo.getById(awsAccountDbId, organizationId);
    try {
      const { accountId } = await this.sts.assumeRole(roleArn, acct.externalId);
      return await repo.markConnected(acct.id, accountId, roleArn);
    } catch (e) {
      await repo.markError(acct.id);
      throw e;
    }
  }

  async list(userId: string, organizationId: string): Promise<AwsAccount[]> {
    await this.assertAdmin(userId, organizationId);
    return new AwsAccountRepository(createServiceClient()).listForOrg(organizationId);
  }
}
```

- [ ] **Step 2: app/api/aws/connect/init/route.ts**
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { AwsConnectService } from "@/server/services/aws-connect-service";
import { handleApiError } from "@/server/api-error-handler";
import { ValidationError } from "@cloudleak/core";

const Body = z.object({ organizationId: z.string().uuid() });

export async function POST(req: Request) {
  try {
    const { user } = await requireUser();
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("organizationId required");
    const result = await new AwsConnectService().init(user.id, parsed.data.organizationId);
    return NextResponse.json(result, { status: 201 });
  } catch (e) { return handleApiError(e); }
}
```

- [ ] **Step 3: app/api/aws/connect/validate/route.ts**
```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { AwsConnectService } from "@/server/services/aws-connect-service";
import { handleApiError } from "@/server/api-error-handler";
import { ValidationError } from "@cloudleak/core";

const Body = z.object({
  organizationId: z.string().uuid(),
  id: z.string().uuid(),
  accountId: z.string().regex(/^\d{12}$/),
  roleArn: z.string().startsWith("arn:aws:iam::"),
});

export async function POST(req: Request) {
  try {
    const { user } = await requireUser();
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("organizationId, id, accountId, roleArn required");
    const { organizationId, id, accountId, roleArn } = parsed.data;
    const account = await new AwsConnectService().validate(user.id, organizationId, id, accountId, roleArn);
    return NextResponse.json({ account });
  } catch (e) { return handleApiError(e); }
}
```

- [ ] **Step 4: app/api/aws/accounts/route.ts**
```ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { AwsConnectService } from "@/server/services/aws-connect-service";
import { handleApiError } from "@/server/api-error-handler";
import { ValidationError } from "@cloudleak/core";

export async function GET(req: Request) {
  try {
    const { user } = await requireUser();
    const orgId = new URL(req.url).searchParams.get("organizationId");
    if (!orgId) throw new ValidationError("organizationId query param required");
    const accounts = await new AwsConnectService().list(user.id, orgId);
    return NextResponse.json({ accounts });
  } catch (e) { return handleApiError(e); }
}
```

- [ ] **Step 5: app/(dashboard)/settings/aws/page.tsx** — client page: "Connect AWS" button → POST init → show the rendered Terraform in a copy box + external id; inputs for account id + role arn → POST validate → show connected status. List existing accounts via GET.

- [ ] **Step 6: Verify & commit**
Run: `pnpm --filter @cloudleak/web typecheck` and `pnpm --filter @cloudleak/web build`.
```bash
git add -A && git commit -m "feat(web): aws cross-account connect flow (init/validate/list)"
```

---

## Task 13: Integration tests (services + RLS isolation)

**Files:**
- Create: `apps/web/vitest.config.ts`, `apps/web/test/integration/aws-connect.test.ts`, `apps/web/test/integration/invite.test.ts`, `apps/web/test/integration/rls.test.ts`

These run against the real Supabase project using env vars. They use the service-role client to set up fixtures and a user-JWT client to assert RLS.

- [ ] **Step 1: vitest.config.ts**
```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { environment: "node", include: ["test/**/*.test.ts"], testTimeout: 20000 } });
```

- [ ] **Step 2: AWS connect integration test — `test/integration/aws-connect.test.ts`**
```ts
import { describe, it, expect, beforeAll } from "vitest";
import { createServiceClient, OrganizationRepository, MembershipRepository, AwsAccountRepository } from "@cloudleak/db";
import { FakeStsService } from "@cloudleak/aws";
import { AwsConnectService } from "@/server/services/aws-connect-service";

// Requires a seeded auth user id in env: TEST_USER_ID
describe("AwsConnectService", () => {
  let orgId: string; const userId = process.env.TEST_USER_ID!;
  beforeAll(async () => {
    const db = createServiceClient();
    const org = await new OrganizationRepository(db).create("itest-aws");
    await new MembershipRepository(db).create(org.id, userId, "owner");
    orgId = org.id;
  });

  it("init creates a pending account with terraform", async () => {
    const svc = new AwsConnectService(new FakeStsService({ mode: "success", accountId: "111122223333" }));
    const { account, terraform } = await svc.init(userId, orgId);
    expect(account.status).toBe("pending");
    expect(terraform).toContain(account.externalId);
  });

  it("validate marks the account connected on STS success", async () => {
    const svc = new AwsConnectService(new FakeStsService({ mode: "success", accountId: "111122223333" }));
    const { account } = await svc.init(userId, orgId);
    const connected = await svc.validate(userId, orgId, account.id, "111122223333", "arn:aws:iam::111122223333:role/CloudLeakReadOnly");
    expect(connected.status).toBe("connected");
    expect(connected.accountId).toBe("111122223333");
  });

  it("validate marks error on STS failure", async () => {
    const svc = new AwsConnectService(new FakeStsService({ mode: "fail" }));
    const { account } = await svc.init(userId, orgId);
    await expect(svc.validate(userId, orgId, account.id, "111122223333", "arn:aws:iam::111122223333:role/X")).rejects.toThrow();
    const reread = await new AwsAccountRepository(createServiceClient()).getById(account.id, orgId);
    expect(reread.status).toBe("error");
  });
});
```

- [ ] **Step 3: RLS isolation test — `test/integration/rls.test.ts`**
```ts
import { describe, it, expect } from "vitest";
import { createServiceClient, createUserClient, OrganizationRepository, AwsAccountRepository } from "@cloudleak/db";
import { generateExternalId } from "@cloudleak/core";

// Requires TEST_USER_ID (a real auth user) and TEST_USER_JWT (that user's access token).
describe("RLS isolation", () => {
  it("a user cannot read aws_accounts of an org they don't belong to", async () => {
    const admin = createServiceClient();
    const otherOrg = await new OrganizationRepository(admin).create("rls-foreign-org");
    await new AwsAccountRepository(admin).createPending(otherOrg.id, generateExternalId());

    const asUser = createUserClient(process.env.TEST_USER_JWT!);
    const { data } = await asUser.from("aws_accounts").select().eq("organization_id", otherOrg.id);
    expect(data ?? []).toHaveLength(0); // RLS hides foreign-org rows
  });
});
```

- [ ] **Step 4: Run integration tests**
Run: `pnpm --filter @cloudleak/web test` with env loaded (`NEXT_PUBLIC_SUPABASE_URL`, keys, `TEST_USER_ID`, `TEST_USER_JWT`, `CLOUDLEAK_AWS_ACCOUNT_ID`).
Expected: all pass. (Document how to obtain `TEST_USER_JWT` in `apps/web/README.md`.)

- [ ] **Step 5: Commit**
```bash
git add -A && git commit -m "test(web): integration tests for aws connect and rls isolation"
```

---

## Task 14: Landing page + dashboard shell polish

**Files:**
- Modify: `apps/web/app/(marketing)/page.tsx`, `apps/web/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Landing page** — hero "Stop Wasting Money on AWS", subcopy ("Find cloud waste in minutes. Get Terraform-ready fixes. Track savings over time."), CTA "Run Free Audit" → `/login`. Use the frontend-design skill for quality.

- [ ] **Step 2: Dashboard shell** — sidebar nav (Overview, Findings, Resources, Reports, Settings) with only Settings → AWS active in Phase 1; others render "Coming soon".

- [ ] **Step 3: Verify build & commit**
Run: `pnpm --filter @cloudleak/web build`.
```bash
git add -A && git commit -m "feat(web): landing page and dashboard shell"
```

---

## Self-Review Notes

- **Spec coverage:** monorepo (T1), core types/errors (T2), external_id (T3), terraform (T4), schema+trigger+RLS (T5), db client+types (T6), repositories (T7), StsService (T8), auth/OAuth (T9), orgs (T10), invites (T11), AWS connect (T12), tests incl. RLS (T13), landing/shell (T14). All Phase 1 spec sections (§2–§10) are covered.
- **Deferred-by-design:** `resources/findings/scans/reports/subscriptions` tables created but not code-wired (per spec §3.3); Stripe deferred (§1). User-JWT write policies deferred since all writes go via service-role in Phase 1.
- **Type consistency:** repository method names referenced by services (`createPending`, `getById`, `markConnected`, `markError`, `listForOrg`, `findForUserInOrg`, `create`, `findByToken`, `markAccepted`) all match Task 7 definitions. `StsService.assumeRole` signature matches T8 and T12.
- **Known runtime caveat:** integration tests (T13) need a seeded auth user + JWT; documented in steps. Live AWS validation deferred (no account this cycle) — covered by `FakeStsService`.
