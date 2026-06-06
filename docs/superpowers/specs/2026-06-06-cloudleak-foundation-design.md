# CloudLeak — Phase 1 (Foundation) Design Spec

**Date:** 2026-06-06
**Status:** Approved
**Scope:** Phase 1 of the CloudLeak SaaS — the foundation that every later phase builds on.

---

## 1. Context & Scope

CloudLeak is a SaaS that connects to a customer's AWS account(s), continuously scans
infrastructure for waste, and produces actionable findings with estimated savings,
confidence/risk scores, Terraform remediation, and manual remediation steps. Its
differentiation is **actionable, Terraform-aware remediation** — not another Cost
Explorer/dashboard clone.

The full product decomposes into ~8 independent subsystems (foundation, inventory
collectors, detection rule engine, Terraform remediation engine, dashboard UI, scan
worker service, reporting/email, billing+infra+CICD). Each gets its own
spec → plan → build cycle. **This spec covers only Phase 1: the Foundation.**

### In scope for Phase 1
- Monorepo project structure (Turborepo + pnpm).
- Supabase database schema + migrations + Row-Level Security.
- Authentication via Supabase Auth (Google/GitHub OAuth).
- Organizations: creation, membership, roles, email invites.
- AWS connection flow: external ID generation, Terraform template delivery,
  cross-account STS AssumeRole validation (designed to be testable without a live
  AWS account this cycle).

### Explicitly out of scope for Phase 1 (later phases)
- Resource inventory collection (Phase 2).
- Detection rule engine + savings calculator (Phase 3).
- Terraform remediation generation (Phase 4).
- Dashboard data pages beyond what's needed to connect AWS (Phase 5).
- Scan worker service / SQS / EventBridge / Fargate (Phase 6).
- Reporting + email (Phase 7).
- Stripe billing + production Terraform infra + CI/CD + Docker + deploy guide (Phase 8).

### Known constraints this cycle
- **Supabase project is already provisioned** and reachable via the Supabase MCP;
  migrations can be applied directly.
- **No AWS test account is available** this cycle. The AWS connect flow is designed
  fully, but the STS validation step sits behind an interface with a fake
  implementation so it is testable now. Live validation will be exercised when an
  AWS account is available.
- **OAuth providers (Google/GitHub)** are the only auth methods in Phase 1.
- **Stripe / billing is deferred.** The `subscriptions` table is created for schema
  stability but is not wired to any code in Phase 1.

---

## 2. Architecture

### 2.1 Approach
REST Route Handlers + service layer + repository layer (chosen over Server-Actions-first
and a standalone API service). Route handlers under `apps/web/app/api/*` stay thin and
delegate to **services** (business logic), which call **repositories** (all Supabase
access), which return **domain types** from `packages/core`. Server Actions are used only
for trivial UI form mutations where a REST endpoint would be ceremony.

Rationale: matches the explicit REST endpoint list in the product brief, keeps the
service + repository layers reusable by the Phase 2 worker, and yields independently
testable layers.

### 2.2 Repo structure
```
cloudleak/
  apps/
    web/                          # Next.js App Router (UI + /api route handlers)
      app/
        (marketing)/              # landing page
        (auth)/                   # login, oauth callback
        (dashboard)/              # authenticated app shell
          onboarding/
          settings/aws/
        invite/[token]/
        api/
          orgs/route.ts
          invites/route.ts
          invites/accept/route.ts
          aws/connect/init/route.ts
          aws/connect/validate/route.ts
          aws/accounts/route.ts
      server/
        services/                 # OrganizationService, InviteService, AwsConnectService
        api-error-handler.ts      # maps domain errors -> HTTP responses
      lib/                        # supabase server/browser client helpers, auth guards
  packages/
    core/                         # pure domain types + logic, ZERO I/O
      types/                      # Organization, Membership, Profile, Invitation, AwsAccount
      errors.ts                   # NotFoundError, ForbiddenError, ValidationError, AwsValidationError
      ids.ts                      # external_id generator
      terraform/role-template.ts  # renders the customer IAM-role Terraform module
    db/                           # Supabase client factories + repositories + generated types
      client.ts                   # server (user JWT), browser, service-role factories
      repositories/               # OrganizationRepo, MembershipRepo, InviteRepo, AwsAccountRepo, ProfileRepo
      types.generated.ts          # `supabase gen types`
    aws/                          # AWS integration
      sts-service.ts              # StsService interface + RealStsService + FakeStsService
      client-factory.ts           # cached AWS SDK client factory (used by worker later)
    config/                       # shared tsconfig / eslint / tailwind preset
  supabase/
    migrations/                   # SQL migrations = source of truth
  docs/superpowers/specs/
  turbo.json
  pnpm-workspace.yaml
  .env.example
```

Notes:
- `apps/worker` is **not** created this cycle.
- The service layer lives in `apps/web/server/services` for now; it will be extracted
  into `packages/services` when the Phase 2 worker needs to share it.

### 2.3 Layer responsibilities
- **`packages/core`** — framework-free domain types, typed errors, pure functions
  (id generation, Terraform rendering). No Supabase, no AWS SDK, no Next.js imports.
- **`packages/db`** — owns ALL Supabase access. Exposes repositories with methods that
  always scope by `organization_id`. Three client factories: user-JWT server client
  (RLS enforced), browser client, and service-role client (RLS bypass, server-only).
- **`packages/aws`** — `StsService` interface (`assumeRole(roleArn, externalId)` →
  caller identity / throws `AwsValidationError`), a real `@aws-sdk/client-sts`
  implementation, and a `FakeStsService` for tests/dev.
- **`apps/web/server/services`** — business logic; orchestrates repositories + AWS;
  enforces authorization (role checks); the only place that knows "how" a use case works.
- **`apps/web/app/api/*`** — thin controllers: parse+validate (Zod), call a service,
  return JSON or hand errors to the central error handler.

---

## 3. Data Model

Stored in Supabase Postgres. Migrations under `supabase/migrations/` are the source of
truth (also applied via Supabase MCP).

### 3.1 Schema-change decision (vs. original brief)
The original brief used `users.organization_id` (one org per user). This spec instead uses:
- a **`profiles`** table mirroring `auth.users` (Supabase owns identity in `auth.users`;
  app data lives in `public.profiles`), and
- a **`memberships`** join table (`organization_id`, `user_id`, `role`).

Rationale: this is the standard correct Supabase multi-tenant pattern. It makes OAuth
onboarding, email invites, role-based authorization, and RLS clean, and avoids a painful
migration if a user ever needs to belong to more than one org. **Approved by user.**

### 3.2 Tables
```sql
-- profiles: 1:1 with auth.users, created by a trigger on auth.users insert
profiles
  id            uuid PK references auth.users(id) on delete cascade
  email         text not null
  full_name     text
  avatar_url    text
  created_at    timestamptz not null default now()

organizations
  id            uuid PK default gen_random_uuid()
  name          text not null
  plan          text not null default 'starter'      -- starter|growth|agency
  created_at    timestamptz not null default now()

memberships
  id              uuid PK default gen_random_uuid()
  organization_id uuid not null references organizations(id) on delete cascade
  user_id         uuid not null references profiles(id) on delete cascade
  role            text not null default 'member'      -- owner|admin|member
  created_at      timestamptz not null default now()
  unique (organization_id, user_id)

invitations
  id              uuid PK default gen_random_uuid()
  organization_id uuid not null references organizations(id) on delete cascade
  email           text not null
  role            text not null default 'member'
  token           text not null unique                -- url-safe random
  status          text not null default 'pending'     -- pending|accepted|revoked|expired
  invited_by      uuid references profiles(id)
  expires_at      timestamptz not null
  created_at      timestamptz not null default now()

aws_accounts
  id               uuid PK default gen_random_uuid()
  organization_id  uuid not null references organizations(id) on delete cascade
  account_id       text                                -- 12-digit AWS id, set on validate
  role_arn         text                                -- set on validate
  external_id      text not null                       -- generated at init, secret
  status           text not null default 'pending'     -- pending|connected|error
  last_validated_at timestamptz
  created_at       timestamptz not null default now()

-- Created now for a stable foundation; NOT wired to code in Phase 1.
-- All carry organization_id (denormalized) so RLS needs no joins.
resources       (id, organization_id, aws_account_id, resource_id, resource_type,
                 region, metadata jsonb, estimated_monthly_cost numeric, created_at)
findings        (id, organization_id, aws_account_id, resource_id, finding_type,
                 severity, confidence_score int, estimated_monthly_savings numeric,
                 risk_score int, title, description, terraform_fix, manual_fix,
                 status, created_at)
scans           (id, organization_id, aws_account_id, status, started_at,
                 finished_at, stats jsonb, created_at)
reports         (id, organization_id, period_start, period_end, payload jsonb, created_at)
subscriptions   (id, organization_id, stripe_customer_id, stripe_subscription_id,
                 plan, status, current_period_end, created_at)
```

### 3.3 Full-schema-now decision
The inventory/findings/scans/reports/subscriptions tables are created in Phase 1
migrations even though no Phase 1 code uses them. Rationale: they are well-specified and
stable, it gives later phases a fixed foundation, and it satisfies the "database
migrations" deliverable. **Approved by user.**

---

## 4. Multi-Tenancy & Security (RLS)

- **RLS enabled on every tenant table.** Standard policy:
  `organization_id IN (SELECT organization_id FROM memberships WHERE user_id = auth.uid())`.
- `organization_id` is **denormalized** onto `resources`/`findings`/`scans` so RLS
  policies need no joins (performance + simplicity).
- `profiles`: a user may read/update only their own row (`id = auth.uid()`).
- `memberships`: a user may read memberships of orgs they belong to.
- **Web app uses the user JWT** → RLS enforced on every query.
- **Service-role key** (bypasses RLS) is server-only, used by the future worker and by
  trusted server ops (invite acceptance, where the invitee is not yet a member). Never
  shipped to the browser.
- **Repository layer also scopes by `organization_id`** on every call → defense in depth;
  a missed app-layer filter is still caught by RLS, and vice versa.
- `external_id` is a secret: returned to the client only at init time (so the customer can
  paste it into Terraform) and never logged.

---

## 5. Auth & Onboarding Flow

1. User logs in via Supabase Auth using **Google or GitHub OAuth**. OAuth callback route
   establishes the session.
2. A Postgres trigger on `auth.users` insert creates the matching `public.profiles` row.
3. Post-login routing:
   - If the user has **no membership** and **no pending invite matching their email** →
     `/onboarding`: they **create an organization** (name) and become its `owner`.
   - If the user has a **pending invite** matching their email → they are offered to
     accept it (join that org with the invite's role).
   - If the user already has membership → `/(dashboard)`.
4. **Invites:** an `owner`/`admin` POSTs an invite (email + role) → creates an
   `invitations` row with a url-safe random `token` and `expires_at`. The invitee opens
   `/invite/[token]`, signs in via OAuth, and the server (service-role) validates that the
   token is pending, unexpired, and the signed-in email matches → creates the membership
   and marks the invite `accepted`.

Authorization rules (enforced in services):
- Only `owner`/`admin` may create invites and connect/disconnect AWS accounts.
- Only `owner` may delete the organization (later) / change another member's role.

---

## 6. AWS Connection Flow

1. **Init** — `POST /api/aws/connect/init`
   - Caller must be `owner`/`admin` of the org.
   - Generate `external_id` = `clk_` + 24 cryptographically-random bytes (base62/url-safe).
   - Create an `aws_accounts` row: `organization_id`, `external_id`, `status='pending'`.
   - Return: `{ id, external_id, cloudleak_account_id, role_name, terraform }` where
     `terraform` is the rendered module (see 6.1).
2. **Customer applies Terraform** — provisions a read-only IAM role whose trust policy
   allows `sts:AssumeRole` **only** from CloudLeak's AWS account principal **and** requires
   the matching `sts:ExternalId`. Customer obtains the Role ARN and their 12-digit account id.
3. **Validate** — `POST /api/aws/connect/validate { id, account_id, role_arn }`
   - `AwsConnectService` calls `StsService.assumeRole(role_arn, external_id)`.
   - On success: update row `account_id`, `role_arn`, `status='connected'`,
     `last_validated_at=now()`.
   - On failure: `status='error'`, return `AwsValidationError` → HTTP 422 with a clear message.
4. **List** — `GET /api/aws/accounts` → connected/pending accounts for the org.

### 6.1 Terraform module (rendered to the customer)
Read-only managed policies (e.g. `ReadOnlyAccess` / `ViewOnlyAccess` plus the specific
read scopes the scanner needs) on a role whose trust policy is locked to CloudLeak's
account principal and the per-account `external_id`. Rendered as a copy-paste module:
```hcl
module "cloudleak" {
  source      = "cloudleak/role/aws"   # or inlined resource block
  external_id = "clk_xxxxxxxxxxxxxxxxxxxxxxxx"
  # trust: arn:aws:iam::<CLOUDLEAK_ACCOUNT_ID>:root
}
# -> output: role_arn, to paste back into CloudLeak
```

### 6.2 Testability without a live AWS account
`StsService` is an interface:
```ts
interface StsService {
  assumeRole(roleArn: string, externalId: string): Promise<{ accountId: string }>;
}
```
- `RealStsService` uses `@aws-sdk/client-sts` (`AssumeRole` then `GetCallerIdentity`).
- `FakeStsService` is injected in tests/dev to simulate success/failure deterministically.
This lets the full init→validate flow be tested now; live validation is exercised once an
AWS account is available.

---

## 7. API Endpoints (Phase 1 subset)

| Method | Path | Purpose | Authz |
|--------|------|---------|-------|
| POST | `/api/orgs` | Create org during onboarding (caller becomes owner) | authenticated |
| POST | `/api/invites` | Create an email invite | owner/admin |
| POST | `/api/invites/accept` | Accept invite by token | authenticated (email match) |
| POST | `/api/aws/connect/init` | Start AWS connect, get external_id + Terraform | owner/admin |
| POST | `/api/aws/connect/validate` | Validate role via STS AssumeRole | owner/admin |
| GET  | `/api/aws/accounts` | List org's AWS accounts | member |

All inputs validated with Zod. All handlers delegate to a service and route errors
through `apps/web/server/api-error-handler.ts`.

---

## 8. Error Handling

Typed domain errors live in `packages/core/errors.ts`:
- `ValidationError` → 400
- `NotFoundError` → 404
- `ForbiddenError` → 403
- `AwsValidationError` → 422
- unknown → 500 (logged, generic message to client)

A single API error handler wraps route handlers and maps thrown domain errors to HTTP
responses with a consistent `{ error: { code, message } }` body. `external_id` and other
secrets are never included in error output or logs.

---

## 9. Testing Strategy (TDD)

Tests are written before implementation (per the project's TDD discipline).

### Unit
- `external_id` generator: prefix, length, charset, uniqueness/randomness.
- Terraform template renderer: external_id injected, CloudLeak account principal present,
  no leftover placeholders.
- `StsService` consumers via `FakeStsService`: success path and failure path.
- Invite token lifecycle: generation, expiry, status transitions.
- Repository org-scoping: queries always include the org filter.

### Integration (against the real Supabase project)
- Create-org onboarding: new user → create org → becomes owner with a membership.
- Invite → accept: invite created, accepted by matching email, membership created,
  invite marked accepted; wrong email / expired token rejected.
- AWS connect init → validate with `FakeStsService`: row transitions
  pending → connected; failure → error.
- **RLS isolation:** a user in org A cannot read org B's `aws_accounts` (and the same for
  `organizations`/`memberships`). This is the most important security test in Phase 1.

---

## 10. Environment & Config

`.env.example` documents required variables:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server-only
SUPABASE_PROJECT_REF=
CLOUDLEAK_AWS_ACCOUNT_ID=         # the account customers trust in their role
AWS_REGION=us-east-1              # region for the STS client
# OAuth provider config is set in the Supabase dashboard (Google/GitHub)
```
Service-role key is never referenced in client components or `NEXT_PUBLIC_*`.

---

## 11. Build Sequence (preview — detailed in the implementation plan)

1. Monorepo scaffold: pnpm workspace, turbo, tsconfig/eslint/tailwind in `packages/config`.
2. `packages/core`: types, errors, `external_id` generator, Terraform renderer (+ unit tests).
3. Supabase migrations: tables, trigger, RLS policies; apply via MCP; generate types.
4. `packages/db`: client factories + repositories.
5. `packages/aws`: `StsService` interface + real + fake.
6. `apps/web`: Supabase auth (OAuth), onboarding, invites, AWS connect pages + API routes,
   error handler.
7. Integration tests incl. RLS isolation.

Each step lands with its tests green before the next begins.
