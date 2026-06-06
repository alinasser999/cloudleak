# CloudLeak — Phase 2 (Resource Inventory Collection) Design Spec

**Date:** 2026-06-06
**Status:** Approved
**Scope:** Phase 2 of the CloudLeak SaaS — AWS resource inventory collection. Builds on the
Phase 1 Foundation (auth, organizations, AWS connect via cross-account STS role).

---

## 1. Context & Scope

CloudLeak connects to a customer's AWS account through the Phase 1 cross-account read-only
IAM role and scans for waste. Phase 2 delivers the **inventory layer**: given a `connected`
AWS account, assume its role, enumerate the resource types that later waste-detection rules
need, normalize them, estimate a rough monthly cost, and persist them to the `resources`
table as a recorded `scan`.

### In scope for Phase 2
- A fakeable AWS inventory client (Real SDK + Fake) so the full flow runs locally with **no
  AWS account**, mirroring the Phase 1 `StsService` pattern.
- Collectors for six high-waste resource types: EC2 instances, EBS volumes, EBS snapshots,
  unattached Elastic IPs, RDS instances, load balancers (ELB/ALB/NLB).
- A static pricing map producing `estimated_monthly_cost` at collection time.
- A `ScanRunner` that records a `scans` row and persists `resources`.
- Inline scan trigger: `POST /api/scans` runs collection synchronously.
- Read endpoints: `GET /api/scans`, `GET /api/resources`.
- Dashboard pages: scan history (+ Run scan), resources view (summary + table).
- Unit + integration tests, including RLS isolation for `resources`/`scans`.

### Explicitly out of scope (later phases)
- Detection rule engine + findings (Phase 3).
- Terraform remediation generation (Phase 4).
- Scan worker service / SQS / EventBridge / Fargate (Phase 6) — Phase 2 runs collection
  inline in an API route. The collector packages are written so the future worker wraps the
  same `ScanRunner` unchanged.
- Reporting + email (Phase 7); Stripe billing + infra/CI/CD (Phase 8).

### Known constraints this cycle
- **No AWS test account.** `AwsInventoryClient` sits behind an interface with a Fake
  implementation. Setting `CLOUDLEAK_FAKE_AWS=1` runs the entire scan flow against seeded
  fixtures, so the dashboard is fully demoable locally. Live SDK collection is exercised
  when an AWS account is available.
- **User-JWT writes + RLS** (no service-role key required locally), continuing the Phase 1
  decision. New RLS policies on `resources`/`scans` allow members to write their org's rows.
- The `resources`/`scans` tables already exist (created in Phase 1 migration `0001`); Phase 2
  adds only RLS policies, not table structure.

---

## 2. Architecture

### 2.1 Approach
Same layering as Phase 1: thin API route → service (authz + orchestration) → repository
(Supabase) / collector packages (AWS + normalization). The AWS I/O boundary and the
DB boundary are both injected into a pure `ScanRunner`, so the runner is unit-testable with
fakes and reusable by the Phase 6 worker.

### 2.2 New / changed units

```
packages/
  core/
    src/
      types.ts            # + ResourceType, Resource, Scan, ScanStatus, NormalizedResource
      pricing.ts          # + estimateMonthlyCost(type, metadata) — pure static map
  aws/
    src/
      aws-client-factory.ts   # assumeRole -> temp creds -> region-scoped SDK clients
      inventory-client.ts     # AwsInventoryClient interface + Real + Fake
  collectors/                 # NEW package @cloudleak/collectors
    src/
      collector.ts            # Collector interface
      ec2-instance.ts
      ebs-volume.ts
      ebs-snapshot.ts
      elastic-ip.ts
      rds-instance.ts
      load-balancer.ts
      scan-runner.ts          # ScanRunner.run({...}) -> Scan
      index.ts
  db/
    src/
      repositories/
        resource.ts           # ResourceRepository
        scan.ts               # ScanRepository
      types.generated.ts      # regenerated after migration 0005
apps/web/
  server/services/
    scan-service.ts           # ScanService.run / list
    resource-service.ts       # ResourceService.list
  app/api/
    scans/route.ts            # POST (run), GET (list)
    resources/route.ts        # GET (list)
  app/(dashboard)/
    scans/                    # scan history + Run scan
    resources/                # summary cards + resource table
supabase/migrations/
  0005_phase2_scan_rls.sql    # RLS policies for resources + scans
```

### 2.3 Layer responsibilities
- **`packages/core`** — adds inventory domain types and a pure `pricing.ts`. Still zero I/O.
- **`packages/aws`** — `AwsClientFactory` turns `{roleArn, externalId, region}` into temp
  credentials (reusing `StsService`) and builds region-scoped SDK clients.
  `AwsInventoryClient` is the single AWS read boundary: six `list*` methods returning typed
  raw records. `RealAwsInventoryClient` uses the AWS SDK (paginated); `FakeAwsInventoryClient`
  returns deterministic seeded fixtures.
- **`packages/collectors`** — one `Collector` per resource type maps raw records →
  `NormalizedResource` (calling `estimateMonthlyCost`). `ScanRunner` orchestrates the run.
  Pure except through injected `AwsInventoryClient` + repositories.
- **`packages/db`** — `ResourceRepository` and `ScanRepository`, both org-scoped on every
  method (defense in depth alongside RLS).
- **`apps/web/server/services`** — `ScanService` enforces authz (owner/admin) and that the
  target account is `connected`, selects Real vs Fake client, runs `ScanRunner`.
  `ResourceService` lists resources. Thin API routes validate with Zod and delegate.

---

## 3. Data Model

No table structure changes — `resources`, `scans`, `findings`, `reports`, `subscriptions`
were all created in Phase 1 migration `0001`. Phase 2 reads/writes `resources` and `scans`.

Relevant columns (from Phase 1 schema):
```sql
resources (id, organization_id, aws_account_id, resource_id, resource_type,
           region, metadata jsonb, estimated_monthly_cost numeric, created_at)
scans     (id, organization_id, aws_account_id, status, started_at,
           finished_at, stats jsonb, created_at)
```

Mapping:
- `resource_type` stores a `ResourceType` value.
- `metadata` holds collector-specific fields (e.g. instance type, volume size GB, attachment
  state) used for pricing now and by detection rules in Phase 3.
- `estimated_monthly_cost` set by `estimateMonthlyCost` at collection time.
- `scans.stats` holds `{ resourceCounts: Record<ResourceType, number>, totalMonthlyCost: number, errors: string[] }`.

### 3.1 Re-scan strategy
A scan **replaces** an account's inventory: within one transaction-equivalent flow,
`ResourceRepository.deleteByAwsAccount(orgId, awsAccountId)` then `bulkInsert(rows)`. This
keeps the `resources` table a current snapshot without diffing logic (YAGNI for Phase 2).
Historical trend data, if needed, is a later concern carried by `scans.stats`.

---

## 4. AWS Inventory Client

### 4.1 Interface
```ts
interface AwsInventoryClient {
  listEc2Instances(region: string): Promise<RawEc2Instance[]>;
  listEbsVolumes(region: string): Promise<RawEbsVolume[]>;
  listEbsSnapshots(region: string): Promise<RawEbsSnapshot[]>;
  listElasticIps(region: string): Promise<RawElasticIp[]>;
  listRdsInstances(region: string): Promise<RawRdsInstance[]>;
  listLoadBalancers(region: string): Promise<RawLoadBalancer[]>;
}
```
Each `Raw*` type is a minimal typed projection of the SDK response carrying only the fields
collectors and pricing need (id, type/class/size, state, attachment, tags, createdAt).

- **`RealAwsInventoryClient`** — constructed from `AwsClientFactory` temp credentials; uses
  `@aws-sdk/client-ec2`, `-rds`, `-elastic-load-balancing-v2` (+ classic), paginating fully.
  Owner-scoped snapshots only (`OwnerIds: ['self']`). Load balancers cover ALB/NLB (v2) and
  classic ELB.
- **`FakeAwsInventoryClient`** — constructed with a fixture set; returns deterministic
  records per region. Used in tests and when `CLOUDLEAK_FAKE_AWS=1`.

### 4.2 Credentials
`AwsClientFactory.assumeRole({ roleArn, externalId, region })` calls the existing
`StsService` to assume the customer role and returns scoped credentials for building SDK
clients. The Fake path skips this entirely.

---

## 5. Collectors & ScanRunner

### 5.1 Collector
```ts
interface Collector {
  type: ResourceType;
  collect(client: AwsInventoryClient, region: string): Promise<NormalizedResource[]>;
}
```
Each collector calls the matching `client.list*`, maps each raw record to a
`NormalizedResource`, and sets `estimatedMonthlyCost` via `estimateMonthlyCost`.

- **elastic-ip** collector emits only **unattached** EIPs (the waste case) — attached EIPs
  are free and dropped at collection.
- **ebs-snapshot** / **ebs-volume** / **ec2-instance** / **rds-instance** / **load-balancer**
  emit all records; waste judgments are deferred to Phase 3 rules. Pricing still applies.

### 5.2 ScanRunner
```ts
ScanRunner.run({
  awsAccount,            // { id, organizationId, roleArn, externalId, accountId }
  regions,              // string[]
  client,               // AwsInventoryClient
  resourceRepo,         // ResourceRepository
  scanRepo,             // ScanRepository
}): Promise<Scan>
```
Flow:
1. `scanRepo.create` → scan `status='running'`, `started_at=now()`.
2. For each `region` × each collector: run `collect`; on throw, record
   `"<type>@<region>: <message>"` in an `errors` array and continue.
3. Aggregate all `NormalizedResource[]` → rows tagged `organization_id`, `aws_account_id`.
4. `resourceRepo.deleteByAwsAccount` then `resourceRepo.bulkInsert(rows)`.
5. `scanRepo.update` → `status` = `'success'` if at least one collector produced results or
   ran cleanly, `'error'` if **every** collector threw; `finished_at=now()`;
   `stats = { resourceCounts, totalMonthlyCost, errors }`.
6. Return the updated `Scan`.

The runner imports neither the AWS SDK nor Supabase directly — both arrive via parameters,
keeping it a pure orchestration unit and worker-reusable.

---

## 6. Services & API

### 6.1 ScanService
- `run(token, userId, orgId, awsAccountId)`:
  1. Authorize caller is `owner`/`admin` (membership role check).
  2. Load the `aws_accounts` row; require `status='connected'` (else `ValidationError`).
  3. Build the client: if `CLOUDLEAK_FAKE_AWS=1` → `FakeAwsInventoryClient`; else
     `RealAwsInventoryClient` from `AwsClientFactory.assumeRole`.
  4. `ScanRunner.run({...})` with repositories built on the user-JWT client.
  5. Return the `Scan`.
- `list(token, userId, orgId)` → `ScanRepository.listByOrg`.

### 6.2 ResourceService
- `list(token, userId, orgId, { awsAccountId? })` → `ResourceRepository.listByOrg`.

### 6.3 Endpoints
| Method | Path | Purpose | Authz |
|--------|------|---------|-------|
| POST | `/api/scans` | Run a scan for an AWS account | owner/admin |
| GET  | `/api/scans` | List org scans | member |
| GET  | `/api/resources` | List org resources (optional `awsAccountId`) | member |

All inputs validated with Zod; all errors routed through the existing
`apps/web/server/api-error-handler.ts`.

---

## 7. Dashboard UI

Built with the existing dashboard shell and the project's shadcn/Tailwind styling; the
frontend-design skill guides component/layout quality.

- **`/(dashboard)/scans`** — table of scans (status badge, started/finished, resource count,
  total monthly cost). A **Run scan** control per `connected` AWS account triggers
  `POST /api/scans` (TanStack Query mutation) and refetches. Empty state guides the user to
  connect an account first.
- **`/(dashboard)/resources`** — summary cards (total resources, total estimated monthly
  cost, count by type); a table of resources (type, resource id, region, monthly cost)
  sorted by cost descending, filterable by `ResourceType`. Empty state guides the user to run
  a scan.

Dashboard navigation gains **Scans** and **Resources** links.

---

## 8. Error Handling

- Reuses the Phase 1 typed errors and central handler.
- `ScanService` throws `ForbiddenError` (not owner/admin), `NotFoundError` (account missing),
  `ValidationError` (account not `connected`).
- Per-collector AWS failures are **non-fatal**: captured in `scans.stats.errors`; the scan
  still completes. Only a total collector wipeout yields scan `status='error'`.
- Secrets (`external_id`, temp credentials) are never logged or returned in scan output.

---

## 9. Testing Strategy (TDD)

### Unit
- `pricing.estimateMonthlyCost`: representative value per resource type; unknown type/class → 0.
- Each collector: fixture raw records → expected `NormalizedResource[]` (ids, region,
  metadata, cost); elastic-ip collector drops attached EIPs.
- `ScanRunner`: with `FakeAwsInventoryClient` + in-memory/fake repos — produces correct
  `resourceCounts`/`totalMonthlyCost`, replaces prior inventory, and on an injected
  collector error records it in `stats.errors` while still completing; all-fail → `error`.

### Integration (against the real Supabase project, env-guarded with `describe.skipIf`)
- `ResourceRepository`: `bulkInsert` + `listByOrg` org-scoping; `deleteByAwsAccount` removes
  only the target account's rows.
- `ScanRepository`: create → update lifecycle; `listByOrg` ordering.
- **RLS isolation:** a user in org A cannot read org B's `resources` or `scans`. Highest-value
  security test for Phase 2.

---

## 10. Environment & Config

Adds to `.env.example`:
```
CLOUDLEAK_FAKE_AWS=1                 # use FakeAwsInventoryClient (no AWS account needed)
CLOUDLEAK_SCAN_REGIONS=us-east-1     # comma-separated regions to scan
```
`AWS_REGION` / `CLOUDLEAK_AWS_ACCOUNT_ID` from Phase 1 still apply to the Real path.

---

## 11. Build Sequence (preview — detailed in the implementation plan)

1. `packages/core`: inventory types + `pricing.ts` (+ unit tests).
2. `packages/aws`: `AwsClientFactory` + `AwsInventoryClient` interface, Real, Fake.
3. `packages/collectors`: collectors + `ScanRunner` (+ unit tests with fakes).
4. Migration `0005` RLS for `resources`/`scans`; apply via MCP; regenerate types.
5. `packages/db`: `ResourceRepository` + `ScanRepository`.
6. `apps/web`: `ScanService` + `ResourceService`, API routes, error wiring.
7. Dashboard pages: scans + resources (frontend-design).
8. Integration tests incl. RLS isolation.

Each step lands with its tests green before the next begins.
