# CloudLeak

Find AWS waste and get **Terraform-ready** fixes — not another Cost Explorer clone.
For every finding: estimated savings, confidence score, risk score, explanation, Terraform
remediation, and manual steps.

This repo currently contains **Phase 1 (Foundation)**. See the roadmap below.

## Monorepo layout

```
apps/web            Next.js App Router app (UI + REST API routes)
packages/core       Pure domain types, errors, id + terraform helpers (no I/O)
packages/db         Supabase client factories + repositories + generated types
packages/aws        StsService (interface + real @aws-sdk impl + fake)
packages/config     Shared tsconfig/eslint/tailwind presets
supabase/migrations SQL migrations (source of truth)
docs/superpowers    Design spec + implementation plan
```

Tooling: pnpm workspaces + Turborepo, TypeScript (strict), Vitest.

## Architecture

Thin REST route handlers → **service layer** (business logic + authorization) →
**repository layer** (all Supabase access) → **domain types**. Multi-tenancy is enforced by
Postgres **Row-Level Security** keyed on `organization_id` *and* repository-level org
scoping (defense in depth). The browser uses the user JWT (RLS enforced); the service-role
key is server-only.

## Setup

1. `pnpm install`
2. Configure `apps/web/.env.local` (see `apps/web/README.md`). The public Supabase URL +
   anon key are pre-filled; add the secret `SUPABASE_SERVICE_ROLE_KEY`.
3. Enable Google/GitHub OAuth in the Supabase dashboard (redirect → `/auth/callback`).
4. `pnpm --filter @cloudleak/web dev` → http://localhost:3000

## Verify

```bash
pnpm -r typecheck     # all packages
pnpm -r test          # unit tests (integration tests skip without credentials)
pnpm --filter @cloudleak/web build
```

## Phase 1 (this repo) — done

Monorepo · Supabase schema + RLS (0 security advisor findings) · Google/GitHub OAuth ·
organizations + memberships + email invites · AWS cross-account connect flow (external id,
Terraform module, STS validation behind a mockable interface).

## Roadmap (later phases, each its own spec → plan → build)

2. AWS resource inventory collectors (EC2/EBS/RDS/ALB/NAT/…)
3. Detection rule engine (8 rules) + savings calculator
4. Terraform remediation engine
5. Dashboard data pages (overview, findings, resources, reports)
6. Scan worker service (Fargate/Lambda/SQS/EventBridge)
7. Reporting + email
8. Stripe billing · production Terraform infra · CI/CD · Docker · deploy guide
