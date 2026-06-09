# CloudLeak — Phase 3 (Waste Detection & Findings) Design Spec

**Date:** 2026-06-09
**Status:** Approved
**Scope:** Phase 3 of the CloudLeak SaaS — waste detection rules and the Findings dashboard.
Builds on Phase 2 (resource inventory). Consumes the `resources` table; writes to the
already-provisioned `findings` table.

---

## 1. Context & Scope

Phase 2 populates `resources` with a cost-annotated inventory snapshot. Phase 3 applies
deterministic waste-detection rules to that snapshot, persists actionable `findings`, and
surfaces them in a Findings dashboard page. This is the core product value: "here is $X of
waste, here is why, here is how to fix it."

### In scope for Phase 3
- Five waste-detection rules covering the most impactful, unambiguously detectable waste:
  stopped EC2 instances, unattached EBS volumes, old EBS snapshots (>90 days),
  unattached Elastic IPs, stopped RDS instances.
- A `packages/rules/` package (mirrors `packages/collectors/`) with a `Rule` interface and
  a `runDetection` orchestrator.
- `FindingRepository` in `packages/db`.
- RLS write policies for `findings` (insert/update/delete — member-scoped).
- Detection runs **automatically inline** after every successful scan (no separate trigger).
- `GET /api/findings` — list findings (member). `PATCH /api/findings/[id]` — dismiss/reopen.
- Findings dashboard page (ungray "Findings" nav): summary cards + dismissable table.

### Explicitly out of scope (later phases)
- Terraform/IaC remediation snippets (Phase 4).
- Slack/email alerts on new findings (Phase 5 Overview + notifications).
- CloudWatch utilization data for idle-detection beyond stopped-state (Phase 6+).
- Load-balancer waste rules (no utilization data available in Phase 3 — YAGNI).
- Reports/PDF export (Phase 7).

---

## 2. Architecture

Same layering as Phases 1–2: thin API route → service (authz) → `runDetection` (pure
orchestrator with injected repos). New `packages/rules/` sits between `@cloudleak/core`
and `apps/web`.

```
packages/
  core/
    src/
      types.ts      # + FindingType, FindingSeverity, FindingStatus, NewFindingRow, Finding
  rules/            # NEW @cloudleak/rules — depends on @cloudleak/core only
    src/
      rule.ts                 # Rule interface
      stopped-ec2.ts
      unattached-ebs.ts
      old-snapshot.ts
      unattached-eip.ts
      stopped-rds.ts
      detection-runner.ts     # runDetection(input) → { count }
      index.ts
    package.json
    tsconfig.json
  db/
    src/
      repositories/
        finding.ts            # FindingRepository
packages/collectors/
  src/
    scan-runner.ts            # unchanged — ScanRunner stays pure; detection added in service
apps/web/
  server/services/
    scan-service.ts           # + call runDetection after runScan
    finding-service.ts        # FindingService.list / dismiss / reopen
  app/api/
    findings/route.ts         # GET (list)
    findings/[id]/route.ts    # PATCH (dismiss/reopen)
  app/(dashboard)/
    findings/                 # page.tsx + findings-client.tsx
    layout.tsx                # promote Findings from COMING_SOON → NAV
supabase/migrations/
  0006_phase3_findings_rls.sql
```

---

## 3. Data Model

The `findings` table already exists (migration `0001`). No structural changes needed.

```sql
findings (
  id uuid,
  organization_id uuid,
  aws_account_id uuid,
  resource_id uuid references resources(id) on delete set null,
  finding_type text,           -- FindingType value
  severity text,               -- FindingSeverity value
  confidence_score int,        -- not used in Phase 3 (nullable, omitted)
  estimated_monthly_savings numeric,
  risk_score int,              -- not used in Phase 3 (nullable, omitted)
  title text,
  description text,
  terraform_fix text,          -- not used in Phase 3 (null)
  manual_fix text,             -- not used in Phase 3 (null)
  status text default 'open',  -- 'open' | 'dismissed'
  created_at timestamptz
)
```

### Re-detection strategy
Detection **replaces** an account's open findings on each scan: `deleteByAwsAccount` (deletes
`status='open'` rows only — preserves `'dismissed'`) then `bulkInsert`. Dismissed findings
survive a re-scan so the user's decision is respected. If the underlying resource is gone
(e.g. deleted EIP), the FK `resource_id` goes to `null` via `on delete set null`, and the
finding is deleted on the next scan because the resource no longer appears in the inventory.

### RLS additions (migration 0006)
```sql
-- member can insert findings for own org
create policy "member insert findings" on public.findings
  for insert with check (organization_id in (select private.current_user_org_ids()));

-- member can update findings for own org (status dismiss/reopen)
create policy "member update findings" on public.findings
  for update using (organization_id in (select private.current_user_org_ids()));

-- member can delete findings for own org (re-scan replace)
create policy "member delete findings" on public.findings
  for delete using (organization_id in (select private.current_user_org_ids()));
```

---

## 4. Domain Types (additions to `packages/core/src/types.ts`)

```ts
export type FindingType =
  | "stopped_ec2"
  | "unattached_ebs"
  | "old_snapshot"
  | "unattached_eip"
  | "stopped_rds";

export type FindingSeverity = "low" | "medium" | "high" | "critical";
export type FindingStatus = "open" | "dismissed";

export interface NewFindingRow {
  organizationId: string;
  awsAccountId: string;
  resourceId: string;       // UUID of the resources row
  findingType: FindingType;
  severity: FindingSeverity;
  estimatedMonthlySavings: number;
  title: string;
  description: string;
  status: FindingStatus;    // always 'open' at creation
}

export interface Finding {
  id: string;
  organizationId: string;
  awsAccountId: string;
  resourceId: string | null;
  findingType: FindingType;
  severity: FindingSeverity;
  estimatedMonthlySavings: number | null;
  title: string;
  description: string | null;
  status: FindingStatus;
  createdAt: string;
}
```

---

## 5. Rule Engine (`packages/rules/`)

### 5.1 Rule interface

```ts
// rule.ts
import type { Finding, Resource } from "@cloudleak/core";

export interface Rule {
  findingType: FindingType;
  check(resource: Resource): NewFindingRow | null;
}
```

Each rule inspects one `Resource` at a time. No cross-resource context needed for Phase 3.
Returns `null` if the resource is not wasteful, or a `NewFindingRow` if it is.
`resource.id` (the DB UUID) populates `resourceId`; the rule sets `organizationId` and
`awsAccountId` from the resource row.

### 5.2 The five rules

| Rule file | Condition | Severity | Title pattern |
|---|---|---|---|
| `stopped-ec2.ts` | `metadata.state === "stopped"` | `high` | `"Stopped EC2: {resourceId}"` |
| `unattached-ebs.ts` | `metadata.state === "available"` | `medium` | `"Unattached EBS volume: {resourceId}"` |
| `old-snapshot.ts` | `metadata.startTime` older than 90 days | `low` | `"Old EBS snapshot: {resourceId} ({age}d)"` |
| `unattached-eip.ts` | `metadata.associationId === null` (or falsy) | `low` | `"Unattached Elastic IP: {resourceId}"` |
| `stopped-rds.ts` | `metadata.dbInstanceStatus === "stopped"` | `medium` | `"Stopped RDS: {resourceId}"` |

`estimatedMonthlySavings` = `resource.estimatedMonthlyCost ?? 0` for all rules (deleting the
resource saves its full estimated cost).

Each rule emits a human-readable `description` explaining why it is wasteful and what to do:
- stopped_ec2: "This EC2 instance is stopped but still incurring EBS storage charges. Terminate it if no longer needed."
- unattached_ebs: "This EBS volume is not attached to any instance and is accruing storage costs."
- old_snapshot: "This EBS snapshot is over 90 days old. Review and delete if no longer needed for backup or migration."
- unattached_eip: "This Elastic IP is not associated with any resource. AWS charges $3.60/mo for unattached EIPs."
- stopped_rds: "This RDS instance is stopped but still incurring storage and license charges."

### 5.3 `runDetection` orchestrator

```ts
export interface DetectionResourceRepo {
  listByOrg(orgId: string, filter: { awsAccountId: string }): Promise<Resource[]>;
}
export interface DetectionFindingRepo {
  deleteOpenByAwsAccount(orgId: string, awsAccountId: string): Promise<void>;
  bulkInsert(rows: NewFindingRow[]): Promise<void>;
}
export interface RunDetectionInput {
  awsAccount: { id: string; organizationId: string };
  resourceRepo: DetectionResourceRepo;
  findingRepo: DetectionFindingRepo;
  rules?: Rule[];
}

export async function runDetection(input: RunDetectionInput): Promise<{ count: number }>;
```

Flow:
1. Load all resources for the account via `resourceRepo.listByOrg`.
2. Apply each rule to each resource (nested loop, per-rule try/catch — rule errors non-fatal,
   logged to console, finding skipped).
3. Collect all non-null `NewFindingRow[]`.
4. `findingRepo.deleteOpenByAwsAccount` — deletes only `status='open'` rows for this account.
5. `findingRepo.bulkInsert(findings)` (no-op if empty array).
6. Return `{ count: findings.length }`.

### 5.4 Integration with ScanService

`ScanService.run()` calls `runScan(...)` then immediately calls `runDetection(...)`. Detection
failure is caught and logged but does not fail the HTTP response (the scan already succeeded).

---

## 6. `FindingRepository` (`packages/db`)

```ts
class FindingRepository {
  listByOrg(orgId: string, filter?: { awsAccountId?: string; status?: FindingStatus }): Promise<Finding[]>;
  updateStatus(id: string, orgId: string, status: FindingStatus): Promise<Finding>;
  deleteOpenByAwsAccount(orgId: string, awsAccountId: string): Promise<void>;
  bulkInsert(rows: NewFindingRow[]): Promise<void>;
}
```

`listByOrg` orders by `severity` (critical > high > medium > low) then
`estimated_monthly_savings desc`. `deleteOpenByAwsAccount` filters `status='open'` only.

---

## 7. Services & API

### 7.1 FindingService

```ts
class FindingService {
  list(orgId: string): Promise<Finding[]>;
  dismiss(id: string, orgId: string): Promise<Finding>;
  reopen(id: string, orgId: string): Promise<Finding>;
}
```

No authz beyond org membership (member can dismiss — matches Phase 2 resource-read pattern).

### 7.2 Endpoints

| Method | Path | Purpose | Authz |
|--------|------|---------|-------|
| GET | `/api/findings?organizationId=` | List org findings | member |
| PATCH | `/api/findings/[id]` | `{ status: "dismissed" \| "open" }` | member |

All inputs Zod-validated. Errors via `handleApiError`.

---

## 8. Dashboard UI — Findings Page

Built with the existing dashboard shell (brand/ink Tailwind tokens, shadcn conventions).
frontend-design skill guides aesthetic quality.

### Layout
- **Summary cards (3):** Total findings, Total monthly savings (brand-colored), Severity
  breakdown (count by severity level).
- **Filter pills:** All | Critical | High | Medium | Low (+ Open/Dismissed toggle).
- **Table:** severity badge, title, description excerpt, resource type, region, savings,
  dismiss/reopen button. Sorted severity desc → savings desc.
- **Empty state:** "No findings. Run a scan on the Scans page to detect waste."
- **Dismissed state:** dimmed row, "Reopen" button. Dismissed findings hidden by default
  (toggle "Show dismissed" to reveal).

### Nav change
In `layout.tsx`: move `"Findings"` from `COMING_SOON` array into `NAV` array with
`href: "/findings"`.

---

## 9. Error Handling

- Rules that throw: error caught per-rule, finding skipped, error logged to `console.error`
  (not surfaced in API response since detection is automatic post-scan).
- `FindingRepository.updateStatus` with an `id` not in the user's org: Supabase returns 0
  rows (RLS blocks it) → service throws `NotFoundError`.
- `GET /api/findings` with no org membership: RLS returns empty array (not an error).

---

## 10. Testing Strategy (TDD)

### Unit tests (`packages/rules/`)
- Each rule: fixture `Resource` matching condition → emits expected `NewFindingRow` (type,
  severity, savings, title). Fixture resource NOT matching → returns `null`.
- `old_snapshot` rule: resource with `startTime` < 90d ago → null; ≥ 90d → finding.
- `runDetection`: with fake repos — loads resources, applies rules, delete-then-insert called;
  dismissed finding on a re-run not deleted; empty resource list → count=0.

### Unit tests (`packages/db`) — structural (no live DB in unit tests)
- Type-level: `FindingRepository` satisfies `DetectionFindingRepo` and `FindingServiceRepo`.

### Integration (env-guarded `describe.skipIf`)
- `FindingRepository.bulkInsert` + `listByOrg` org-scoping.
- `deleteOpenByAwsAccount` leaves `dismissed` rows intact.
- RLS: org A member cannot read/write org B findings.

---

## 11. Build Sequence (preview — detailed in the implementation plan)

1. `packages/core`: add `FindingType`, `FindingSeverity`, `FindingStatus`, `NewFindingRow`,
   `Finding` types to `types.ts`.
2. `packages/rules`: scaffold package, `Rule` interface, five rule implementations + unit tests.
3. `packages/rules`: `runDetection` orchestrator + unit tests.
4. Migration `0006` RLS for `findings`; apply via MCP.
5. `packages/db`: `FindingRepository`.
6. `apps/web`: `ScanService` calls `runDetection` post-scan; `FindingService`;
   `GET /api/findings`; `PATCH /api/findings/[id]`.
7. Findings dashboard page (frontend-design skill).
8. Promote "Findings" from `COMING_SOON` → `NAV` in `layout.tsx`.
9. Integration tests.

Each step lands with tests green before the next begins.
