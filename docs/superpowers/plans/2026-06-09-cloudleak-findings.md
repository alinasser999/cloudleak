# CloudLeak Phase 3 — Waste Detection & Findings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement waste-detection rules that run after every scan and surface actionable findings in a Findings dashboard page.

**Architecture:** A new `packages/rules/` package (mirrors `packages/collectors/`) holds five `Rule` objects and a pure `runDetection` orchestrator; `ScanService` calls detection inline after scan; `FindingRepository` persists to the already-provisioned `findings` table; a new Findings dashboard page un-grays the nav item.

**Tech Stack:** TypeScript ESM, Vitest, Supabase Postgres (RLS via MCP), Next.js App Router, React client components, Tailwind CSS, frontend-design skill for UI.

---

## File Map

| File | Action |
|---|---|
| `packages/core/src/types.ts` | Modify — add `FindingType`, `FindingSeverity`, `FindingStatus`, `NewFindingRow`, `Finding` |
| `packages/rules/package.json` | Create |
| `packages/rules/tsconfig.json` | Create |
| `packages/rules/src/rule.ts` | Create — `Rule` interface |
| `packages/rules/src/stopped-ec2.ts` | Create |
| `packages/rules/src/unattached-ebs.ts` | Create |
| `packages/rules/src/old-snapshot.ts` | Create |
| `packages/rules/src/unattached-eip.ts` | Create |
| `packages/rules/src/stopped-rds.ts` | Create |
| `packages/rules/src/detection-runner.ts` | Create — `runDetection` orchestrator |
| `packages/rules/src/index.ts` | Create |
| `packages/rules/test/rules.test.ts` | Create |
| `packages/rules/test/detection-runner.test.ts` | Create |
| `supabase/migrations/0006_phase3_findings_rls.sql` | Create + apply via MCP |
| `packages/db/src/repositories/finding.ts` | Create |
| `packages/db/src/repositories/index.ts` | Modify — add FindingRepository export |
| `apps/web/package.json` | Modify — add `@cloudleak/rules` dep |
| `apps/web/server/services/finding-service.ts` | Create |
| `apps/web/app/api/findings/route.ts` | Create — GET |
| `apps/web/app/api/findings/[id]/route.ts` | Create — PATCH |
| `apps/web/server/services/scan-service.ts` | Modify — call `runDetection` after scan |
| `apps/web/app/(dashboard)/findings/page.tsx` | Create |
| `apps/web/app/(dashboard)/findings/findings-client.tsx` | Create — **use frontend-design skill** |
| `apps/web/app/(dashboard)/layout.tsx` | Modify — promote Findings from COMING_SOON to NAV |

---

### Task 1: Core domain types for findings

**Files:**
- Modify: `packages/core/src/types.ts`

- [ ] **Step 1: Append the five new types to the end of `packages/core/src/types.ts`**

Add the following block at the end of the file (after the `Scan` interface):

```typescript
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
  resourceId: string;
  findingType: FindingType;
  severity: FindingSeverity;
  estimatedMonthlySavings: number;
  title: string;
  description: string;
  status: FindingStatus;
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

- [ ] **Step 2: Verify types compile**

Run from repo root:
```bash
pnpm --filter @cloudleak/core typecheck
```
Expected: no output (exit 0).

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/types.ts
git commit -m "feat(core): finding domain types (FindingType, FindingSeverity, NewFindingRow, Finding)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Scaffold `packages/rules/`

**Files:**
- Create: `packages/rules/package.json`
- Create: `packages/rules/tsconfig.json`
- Create: `packages/rules/src/rule.ts`

- [ ] **Step 1: Create `packages/rules/package.json`**

```json
{
  "name": "@cloudleak/rules",
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
  "dependencies": {
    "@cloudleak/core": "workspace:*"
  },
  "devDependencies": {
    "@cloudleak/config": "workspace:*",
    "@types/node": "^22.0.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Create `packages/rules/tsconfig.json`**

```json
{
  "extends": "@cloudleak/config/tsconfig.base.json",
  "include": ["src", "test"]
}
```

- [ ] **Step 3: Create `packages/rules/src/rule.ts`**

```typescript
import type { NewFindingRow, Resource } from "@cloudleak/core";

export interface Rule {
  check(resource: Resource): NewFindingRow | null;
}
```

- [ ] **Step 4: Install dependencies**

Run from repo root:
```bash
pnpm install
```
Expected: lockfile updated, `@cloudleak/rules` appears in workspace.

- [ ] **Step 5: Commit**

```bash
git add packages/rules/
git commit -m "feat(rules): scaffold @cloudleak/rules package

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Five rule implementations + tests

**Files:**
- Create: `packages/rules/src/stopped-ec2.ts`
- Create: `packages/rules/src/unattached-ebs.ts`
- Create: `packages/rules/src/old-snapshot.ts`
- Create: `packages/rules/src/unattached-eip.ts`
- Create: `packages/rules/src/stopped-rds.ts`
- Create: `packages/rules/test/rules.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `packages/rules/test/rules.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import type { Resource } from "@cloudleak/core";
import { stoppedEc2Rule } from "../src/stopped-ec2.js";
import { unattachedEbsRule } from "../src/unattached-ebs.js";
import { oldSnapshotRule } from "../src/old-snapshot.js";
import { unattachedEipRule } from "../src/unattached-eip.js";
import { stoppedRdsRule } from "../src/stopped-rds.js";

function fakeResource(overrides: Partial<Resource> & { resourceType: Resource["resourceType"] }): Resource {
  return {
    id: "db-uuid-1",
    organizationId: "org-1",
    awsAccountId: "acct-1",
    resourceId: "aws-resource-id",
    region: "us-east-1",
    metadata: {},
    estimatedMonthlyCost: 50,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("stoppedEc2Rule", () => {
  it("emits high-severity finding for stopped instance", () => {
    const r = fakeResource({ resourceType: "ec2_instance", metadata: { state: "stopped" } });
    const f = stoppedEc2Rule.check(r);
    expect(f).not.toBeNull();
    expect(f?.findingType).toBe("stopped_ec2");
    expect(f?.severity).toBe("high");
    expect(f?.estimatedMonthlySavings).toBe(50);
    expect(f?.resourceId).toBe("db-uuid-1");
    expect(f?.status).toBe("open");
  });

  it("returns null for running instance", () => {
    const r = fakeResource({ resourceType: "ec2_instance", metadata: { state: "running" } });
    expect(stoppedEc2Rule.check(r)).toBeNull();
  });

  it("returns null for other resource types", () => {
    const r = fakeResource({ resourceType: "ebs_volume", metadata: { state: "stopped" } });
    expect(stoppedEc2Rule.check(r)).toBeNull();
  });
});

describe("unattachedEbsRule", () => {
  it("emits medium finding for available volume", () => {
    const r = fakeResource({ resourceType: "ebs_volume", metadata: { state: "available" }, estimatedMonthlyCost: 20 });
    const f = unattachedEbsRule.check(r);
    expect(f).not.toBeNull();
    expect(f?.findingType).toBe("unattached_ebs");
    expect(f?.severity).toBe("medium");
    expect(f?.estimatedMonthlySavings).toBe(20);
  });

  it("returns null for in-use volume", () => {
    const r = fakeResource({ resourceType: "ebs_volume", metadata: { state: "in-use" } });
    expect(unattachedEbsRule.check(r)).toBeNull();
  });
});

describe("oldSnapshotRule", () => {
  it("emits low finding for snapshot older than 90 days", () => {
    const oldDate = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString();
    const r = fakeResource({ resourceType: "ebs_snapshot", metadata: { startTime: oldDate }, estimatedMonthlyCost: 10 });
    const f = oldSnapshotRule.check(r);
    expect(f).not.toBeNull();
    expect(f?.findingType).toBe("old_snapshot");
    expect(f?.severity).toBe("low");
    expect(f?.title).toMatch(/91d/);
  });

  it("returns null for snapshot younger than 90 days", () => {
    const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const r = fakeResource({ resourceType: "ebs_snapshot", metadata: { startTime: recentDate } });
    expect(oldSnapshotRule.check(r)).toBeNull();
  });

  it("returns null when startTime is missing", () => {
    const r = fakeResource({ resourceType: "ebs_snapshot", metadata: {} });
    expect(oldSnapshotRule.check(r)).toBeNull();
  });
});

describe("unattachedEipRule", () => {
  it("emits low finding for every elastic_ip resource (all stored EIPs are unattached)", () => {
    const r = fakeResource({ resourceType: "elastic_ip", estimatedMonthlyCost: 3.6 });
    const f = unattachedEipRule.check(r);
    expect(f).not.toBeNull();
    expect(f?.findingType).toBe("unattached_eip");
    expect(f?.severity).toBe("low");
  });

  it("returns null for other resource types", () => {
    const r = fakeResource({ resourceType: "ec2_instance" });
    expect(unattachedEipRule.check(r)).toBeNull();
  });
});

describe("stoppedRdsRule", () => {
  it("emits medium finding for stopped RDS instance", () => {
    const r = fakeResource({ resourceType: "rds_instance", metadata: { status: "stopped" }, estimatedMonthlyCost: 100 });
    const f = stoppedRdsRule.check(r);
    expect(f).not.toBeNull();
    expect(f?.findingType).toBe("stopped_rds");
    expect(f?.severity).toBe("medium");
    expect(f?.estimatedMonthlySavings).toBe(100);
  });

  it("returns null for available RDS instance", () => {
    const r = fakeResource({ resourceType: "rds_instance", metadata: { status: "available" } });
    expect(stoppedRdsRule.check(r)).toBeNull();
  });
});
```

- [ ] **Step 2: Verify tests fail**

```bash
pnpm --filter @cloudleak/rules test
```
Expected: FAIL — imports not found.

- [ ] **Step 3: Create `packages/rules/src/stopped-ec2.ts`**

```typescript
import type { Rule } from "./rule.js";

export const stoppedEc2Rule: Rule = {
  check(resource) {
    if (resource.resourceType !== "ec2_instance") return null;
    if ((resource.metadata.state as string | undefined) !== "stopped") return null;
    return {
      organizationId: resource.organizationId,
      awsAccountId: resource.awsAccountId,
      resourceId: resource.id,
      findingType: "stopped_ec2",
      severity: "high",
      estimatedMonthlySavings: resource.estimatedMonthlyCost ?? 0,
      title: `Stopped EC2: ${resource.resourceId}`,
      description:
        "This EC2 instance is stopped but still incurring EBS storage charges. Terminate it if no longer needed.",
      status: "open",
    };
  },
};
```

- [ ] **Step 4: Create `packages/rules/src/unattached-ebs.ts`**

```typescript
import type { Rule } from "./rule.js";

export const unattachedEbsRule: Rule = {
  check(resource) {
    if (resource.resourceType !== "ebs_volume") return null;
    if ((resource.metadata.state as string | undefined) !== "available") return null;
    return {
      organizationId: resource.organizationId,
      awsAccountId: resource.awsAccountId,
      resourceId: resource.id,
      findingType: "unattached_ebs",
      severity: "medium",
      estimatedMonthlySavings: resource.estimatedMonthlyCost ?? 0,
      title: `Unattached EBS volume: ${resource.resourceId}`,
      description:
        "This EBS volume is not attached to any instance and is accruing storage costs.",
      status: "open",
    };
  },
};
```

- [ ] **Step 5: Create `packages/rules/src/old-snapshot.ts`**

```typescript
import type { Rule } from "./rule.js";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export const oldSnapshotRule: Rule = {
  check(resource) {
    if (resource.resourceType !== "ebs_snapshot") return null;
    const startTime = resource.metadata.startTime as string | undefined;
    if (!startTime) return null;
    const ageMs = Date.now() - new Date(startTime).getTime();
    if (ageMs < NINETY_DAYS_MS) return null;
    const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
    return {
      organizationId: resource.organizationId,
      awsAccountId: resource.awsAccountId,
      resourceId: resource.id,
      findingType: "old_snapshot",
      severity: "low",
      estimatedMonthlySavings: resource.estimatedMonthlyCost ?? 0,
      title: `Old EBS snapshot: ${resource.resourceId} (${ageDays}d)`,
      description:
        "This EBS snapshot is over 90 days old. Review and delete if no longer needed for backup or migration.",
      status: "open",
    };
  },
};
```

- [ ] **Step 6: Create `packages/rules/src/unattached-eip.ts`**

Note: The EIP collector already filters out attached EIPs, so every `elastic_ip` row in the DB is unattached. The rule flags all of them.

```typescript
import type { Rule } from "./rule.js";

export const unattachedEipRule: Rule = {
  check(resource) {
    if (resource.resourceType !== "elastic_ip") return null;
    return {
      organizationId: resource.organizationId,
      awsAccountId: resource.awsAccountId,
      resourceId: resource.id,
      findingType: "unattached_eip",
      severity: "low",
      estimatedMonthlySavings: resource.estimatedMonthlyCost ?? 0,
      title: `Unattached Elastic IP: ${resource.resourceId}`,
      description:
        "This Elastic IP is not associated with any resource. AWS charges $3.60/mo for unattached EIPs.",
      status: "open",
    };
  },
};
```

- [ ] **Step 7: Create `packages/rules/src/stopped-rds.ts`**

```typescript
import type { Rule } from "./rule.js";

export const stoppedRdsRule: Rule = {
  check(resource) {
    if (resource.resourceType !== "rds_instance") return null;
    if ((resource.metadata.status as string | undefined) !== "stopped") return null;
    return {
      organizationId: resource.organizationId,
      awsAccountId: resource.awsAccountId,
      resourceId: resource.id,
      findingType: "stopped_rds",
      severity: "medium",
      estimatedMonthlySavings: resource.estimatedMonthlyCost ?? 0,
      title: `Stopped RDS: ${resource.resourceId}`,
      description:
        "This RDS instance is stopped but still incurring storage and license charges.",
      status: "open",
    };
  },
};
```

- [ ] **Step 8: Run tests — expect PASS**

```bash
pnpm --filter @cloudleak/rules test
```
Expected: all 11 tests pass.

- [ ] **Step 9: Commit**

```bash
git add packages/rules/src/ packages/rules/test/rules.test.ts
git commit -m "feat(rules): five waste detection rules with tests

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Detection runner + tests

**Files:**
- Create: `packages/rules/src/detection-runner.ts`
- Create: `packages/rules/src/index.ts`
- Create: `packages/rules/test/detection-runner.test.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/rules/test/detection-runner.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import type { NewFindingRow, Resource } from "@cloudleak/core";
import { runDetection } from "../src/detection-runner.js";
import type { Rule } from "../src/rule.js";

function fakeResource(id: string, type: Resource["resourceType"], cost = 10): Resource {
  return {
    id,
    organizationId: "org-1",
    awsAccountId: "acct-1",
    resourceId: `aws-${id}`,
    resourceType: type,
    region: "us-east-1",
    metadata: {},
    estimatedMonthlyCost: cost,
    createdAt: new Date().toISOString(),
  };
}

function fakeRepos() {
  const deletedAccounts: string[] = [];
  const inserted: NewFindingRow[] = [];
  const resources: Resource[] = [];
  return {
    resourceRepo: {
      async listByOrg(_orgId: string, _filter: { awsAccountId: string }) {
        return resources;
      },
    },
    findingRepo: {
      async deleteOpenByAwsAccount(_orgId: string, awsAccountId: string) {
        deletedAccounts.push(awsAccountId);
      },
      async bulkInsert(rows: NewFindingRow[]) {
        inserted.push(...rows);
      },
    },
    resources,
    inserted,
    deletedAccounts,
  };
}

const alwaysMatchRule: Rule = {
  check(resource) {
    return {
      organizationId: resource.organizationId,
      awsAccountId: resource.awsAccountId,
      resourceId: resource.id,
      findingType: "stopped_ec2",
      severity: "high",
      estimatedMonthlySavings: resource.estimatedMonthlyCost ?? 0,
      title: "test finding",
      description: "test",
      status: "open",
    };
  },
};

const neverMatchRule: Rule = {
  check() {
    return null;
  },
};

describe("runDetection", () => {
  it("emits a finding for each matching resource", async () => {
    const { resourceRepo, findingRepo, resources, inserted } = fakeRepos();
    resources.push(
      fakeResource("r1", "ec2_instance"),
      fakeResource("r2", "ec2_instance"),
    );
    const result = await runDetection({
      awsAccount: { id: "acct-1", organizationId: "org-1" },
      resourceRepo,
      findingRepo,
      rules: [alwaysMatchRule],
    });
    expect(result.count).toBe(2);
    expect(inserted).toHaveLength(2);
    expect(inserted[0]?.resourceId).toBe("r1");
    expect(inserted[1]?.resourceId).toBe("r2");
  });

  it("deletes open findings before inserting new ones", async () => {
    const { resourceRepo, findingRepo, deletedAccounts } = fakeRepos();
    await runDetection({
      awsAccount: { id: "acct-1", organizationId: "org-1" },
      resourceRepo,
      findingRepo,
      rules: [neverMatchRule],
    });
    expect(deletedAccounts).toContain("acct-1");
  });

  it("returns count=0 when no resources match any rule", async () => {
    const { resourceRepo, findingRepo, resources } = fakeRepos();
    resources.push(fakeResource("r1", "ec2_instance"));
    const result = await runDetection({
      awsAccount: { id: "acct-1", organizationId: "org-1" },
      resourceRepo,
      findingRepo,
      rules: [neverMatchRule],
    });
    expect(result.count).toBe(0);
  });

  it("skips a resource when a rule throws, continues processing", async () => {
    const throwingRule: Rule = {
      check() {
        throw new Error("rule bug");
      },
    };
    const { resourceRepo, findingRepo, resources, inserted } = fakeRepos();
    resources.push(fakeResource("r1", "ec2_instance"));
    const result = await runDetection({
      awsAccount: { id: "acct-1", organizationId: "org-1" },
      resourceRepo,
      findingRepo,
      rules: [throwingRule, alwaysMatchRule],
    });
    expect(result.count).toBe(1);
    expect(inserted).toHaveLength(1);
  });

  it("uses ALL_RULES when no rules override provided", async () => {
    const { resourceRepo, findingRepo, resources } = fakeRepos();
    resources.push(
      fakeResource("r1", "ec2_instance"),
    );
    const result = await runDetection({
      awsAccount: { id: "acct-1", organizationId: "org-1" },
      resourceRepo,
      findingRepo,
      // no rules override — uses ALL_RULES; r1 has no metadata.state so no match
    });
    expect(result.count).toBe(0);
  });
});
```

- [ ] **Step 2: Verify tests fail**

```bash
pnpm --filter @cloudleak/rules test
```
Expected: FAIL — `runDetection` not found.

- [ ] **Step 3: Create `packages/rules/src/detection-runner.ts`**

```typescript
import type { NewFindingRow, Resource } from "@cloudleak/core";
import type { Rule } from "./rule.js";
import { stoppedEc2Rule } from "./stopped-ec2.js";
import { unattachedEbsRule } from "./unattached-ebs.js";
import { oldSnapshotRule } from "./old-snapshot.js";
import { unattachedEipRule } from "./unattached-eip.js";
import { stoppedRdsRule } from "./stopped-rds.js";

export const ALL_RULES: Rule[] = [
  stoppedEc2Rule,
  unattachedEbsRule,
  oldSnapshotRule,
  unattachedEipRule,
  stoppedRdsRule,
];

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

export async function runDetection(input: RunDetectionInput): Promise<{ count: number }> {
  const { awsAccount, resourceRepo, findingRepo } = input;
  const rules = input.rules ?? ALL_RULES;

  const resources = await resourceRepo.listByOrg(awsAccount.organizationId, {
    awsAccountId: awsAccount.id,
  });

  const findings: NewFindingRow[] = [];
  for (const resource of resources) {
    for (const rule of rules) {
      try {
        const finding = rule.check(resource);
        if (finding) findings.push(finding);
      } catch (e) {
        console.error(`Rule check failed on resource ${resource.id}:`, e);
      }
    }
  }

  await findingRepo.deleteOpenByAwsAccount(awsAccount.organizationId, awsAccount.id);
  await findingRepo.bulkInsert(findings);

  return { count: findings.length };
}
```

- [ ] **Step 4: Create `packages/rules/src/index.ts`**

```typescript
export * from "./rule.js";
export * from "./detection-runner.js";
export { stoppedEc2Rule } from "./stopped-ec2.js";
export { unattachedEbsRule } from "./unattached-ebs.js";
export { oldSnapshotRule } from "./old-snapshot.js";
export { unattachedEipRule } from "./unattached-eip.js";
export { stoppedRdsRule } from "./stopped-rds.js";
```

- [ ] **Step 5: Run all rules tests — expect PASS**

```bash
pnpm --filter @cloudleak/rules test
```
Expected: 16 tests pass (11 rule tests + 5 detection-runner tests).

- [ ] **Step 6: Commit**

```bash
git add packages/rules/src/detection-runner.ts packages/rules/src/index.ts packages/rules/test/detection-runner.test.ts
git commit -m "feat(rules): detection runner with ALL_RULES orchestration

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 5: Supabase migration 0006 — findings RLS write policies

**Files:**
- Create: `supabase/migrations/0006_phase3_findings_rls.sql`
- Apply via Supabase MCP

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/0006_phase3_findings_rls.sql`:

```sql
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
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Use the Supabase MCP tool `apply_migration` with:
- `project_id`: `ivgytzevandcqfiiqiow`
- `name`: `phase3_findings_rls`
- `query`: the SQL from the migration file above

Expected: migration applied successfully.

- [ ] **Step 3: Verify with `get_advisors`**

Use `get_advisors` MCP tool. Expected: only the pre-existing advisor warnings (SECURITY DEFINER RPCs + auth config) — no new issues.

- [ ] **Step 4: Commit the migration file**

```bash
git add supabase/migrations/0006_phase3_findings_rls.sql
git commit -m "feat(db): RLS write policies for findings (insert/update/delete)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 6: `FindingRepository`

**Files:**
- Create: `packages/db/src/repositories/finding.ts`
- Modify: `packages/db/src/repositories/index.ts`

- [ ] **Step 1: Create `packages/db/src/repositories/finding.ts`**

```typescript
import type { Db } from "../client.js";
import {
  NotFoundError,
  type Finding,
  type FindingSeverity,
  type FindingStatus,
  type FindingType,
  type NewFindingRow,
} from "@cloudleak/core";

type FindingRow = {
  id: string;
  organization_id: string;
  aws_account_id: string;
  resource_id: string | null;
  finding_type: string;
  severity: string;
  estimated_monthly_savings: number | null;
  title: string;
  description: string | null;
  status: string;
  created_at: string;
};

const map = (d: FindingRow): Finding => ({
  id: d.id,
  organizationId: d.organization_id,
  awsAccountId: d.aws_account_id,
  resourceId: d.resource_id,
  findingType: d.finding_type as FindingType,
  severity: d.severity as FindingSeverity,
  estimatedMonthlySavings: d.estimated_monthly_savings,
  title: d.title,
  description: d.description,
  status: d.status as FindingStatus,
  createdAt: d.created_at,
});

export class FindingRepository {
  constructor(private readonly db: Db) {}

  async bulkInsert(rows: NewFindingRow[]): Promise<void> {
    if (rows.length === 0) return;
    const payload = rows.map((r) => ({
      organization_id: r.organizationId,
      aws_account_id: r.awsAccountId,
      resource_id: r.resourceId,
      finding_type: r.findingType,
      severity: r.severity,
      estimated_monthly_savings: r.estimatedMonthlySavings,
      title: r.title,
      description: r.description,
      status: r.status,
    }));
    const { error } = await this.db.from("findings").insert(payload);
    if (error) throw new Error(error.message);
  }

  async deleteOpenByAwsAccount(organizationId: string, awsAccountId: string): Promise<void> {
    const { error } = await this.db
      .from("findings")
      .delete()
      .eq("organization_id", organizationId)
      .eq("aws_account_id", awsAccountId)
      .eq("status", "open");
    if (error) throw new Error(error.message);
  }

  async listByOrg(
    organizationId: string,
    opts: { awsAccountId?: string; status?: FindingStatus } = {},
  ): Promise<Finding[]> {
    let q = this.db
      .from("findings")
      .select()
      .eq("organization_id", organizationId)
      .order("estimated_monthly_savings", { ascending: false, nullsFirst: false });
    if (opts.awsAccountId) q = q.eq("aws_account_id", opts.awsAccountId);
    if (opts.status) q = q.eq("status", opts.status);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []).map((d) => map(d as FindingRow));
  }

  async updateStatus(id: string, organizationId: string, status: FindingStatus): Promise<Finding> {
    const { data, error } = await this.db
      .from("findings")
      .update({ status })
      .eq("id", id)
      .eq("organization_id", organizationId)
      .select()
      .single();
    if (error || !data) throw new NotFoundError("Finding not found");
    return map(data as FindingRow);
  }
}
```

- [ ] **Step 2: Add export to `packages/db/src/repositories/index.ts`**

Append to the existing file:

```typescript
export * from "./finding.js";
```

The full file should now be:
```typescript
export * from "./organization.js";
export * from "./membership.js";
export * from "./invitation.js";
export * from "./aws-account.js";
export * from "./resource.js";
export * from "./scan.js";
export * from "./finding.js";
```

- [ ] **Step 3: Verify db package typechecks**

```bash
pnpm --filter @cloudleak/db typecheck
```
Expected: exit 0, no errors.

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/repositories/finding.ts packages/db/src/repositories/index.ts
git commit -m "feat(db): FindingRepository (bulkInsert, deleteOpenByAwsAccount, listByOrg, updateStatus)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 7: Add `@cloudleak/rules` to web app, wire `FindingService` and API routes

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/server/services/finding-service.ts`
- Create: `apps/web/app/api/findings/route.ts`
- Create: `apps/web/app/api/findings/[id]/route.ts`

- [ ] **Step 1: Add `@cloudleak/rules` to `apps/web/package.json`**

In `apps/web/package.json`, add `"@cloudleak/rules": "workspace:*"` to `dependencies` (after `@cloudleak/collectors`):

```json
"dependencies": {
  "next": "^15.1.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "@supabase/ssr": "^0.5.0",
  "@supabase/supabase-js": "^2.45.0",
  "zod": "^3.23.0",
  "@cloudleak/core": "workspace:*",
  "@cloudleak/db": "workspace:*",
  "@cloudleak/aws": "workspace:*",
  "@cloudleak/collectors": "workspace:*",
  "@cloudleak/rules": "workspace:*"
}
```

Run from repo root:
```bash
pnpm install
```

- [ ] **Step 2: Create `apps/web/server/services/finding-service.ts`**

```typescript
import {
  createUserClient,
  FindingRepository,
  MembershipRepository,
  type Db,
} from "@cloudleak/db";
import { ForbiddenError, type Finding, type FindingStatus } from "@cloudleak/core";

export class FindingService {
  constructor(private readonly accessToken: string) {}

  private db(): Db {
    return createUserClient(this.accessToken);
  }

  private async assertMember(userId: string, organizationId: string): Promise<void> {
    const m = await new MembershipRepository(this.db()).findForUserInOrg(userId, organizationId);
    if (!m) throw new ForbiddenError("Not a member of this organization");
  }

  async list(userId: string, organizationId: string): Promise<Finding[]> {
    await this.assertMember(userId, organizationId);
    return new FindingRepository(this.db()).listByOrg(organizationId);
  }

  async setStatus(
    id: string,
    userId: string,
    organizationId: string,
    status: FindingStatus,
  ): Promise<Finding> {
    await this.assertMember(userId, organizationId);
    return new FindingRepository(this.db()).updateStatus(id, organizationId, status);
  }
}
```

- [ ] **Step 3: Create `apps/web/app/api/findings/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { FindingService } from "@/server/services/finding-service";
import { handleApiError } from "@/server/api-error-handler";
import { ValidationError } from "@cloudleak/core";

export async function GET(req: Request) {
  try {
    const { user, accessToken } = await requireUser();
    const url = new URL(req.url);
    const orgId = url.searchParams.get("organizationId");
    if (!orgId) throw new ValidationError("organizationId query param required");
    const findings = await new FindingService(accessToken).list(user.id, orgId);
    return NextResponse.json({ findings });
  } catch (e) {
    return handleApiError(e);
  }
}
```

- [ ] **Step 4: Create `apps/web/app/api/findings/[id]/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { FindingService } from "@/server/services/finding-service";
import { handleApiError } from "@/server/api-error-handler";

const PatchBody = z.object({
  organizationId: z.string().uuid(),
  status: z.enum(["open", "dismissed"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { user, accessToken } = await requireUser();
    const { id } = await params;
    const body = PatchBody.parse(await req.json());
    const finding = await new FindingService(accessToken).setStatus(
      id,
      user.id,
      body.organizationId,
      body.status,
    );
    return NextResponse.json({ finding });
  } catch (e) {
    return handleApiError(e);
  }
}
```

- [ ] **Step 5: Typecheck web app**

```bash
pnpm --filter @cloudleak/web typecheck
```
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add apps/web/package.json apps/web/server/services/finding-service.ts apps/web/app/api/findings/
git commit -m "feat(web): FindingService and findings API routes (GET + PATCH)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 8: Integrate detection into `ScanService`

**Files:**
- Modify: `apps/web/server/services/scan-service.ts`

- [ ] **Step 1: Update `apps/web/server/services/scan-service.ts`**

Replace the entire file:

```typescript
import {
  createUserClient,
  AwsAccountRepository,
  FindingRepository,
  MembershipRepository,
  ResourceRepository,
  ScanRepository,
  type Db,
} from "@cloudleak/db";
import { ForbiddenError, ValidationError, type Scan } from "@cloudleak/core";
import { runScan } from "@cloudleak/collectors";
import { runDetection } from "@cloudleak/rules";
import {
  FakeAwsInventoryClient,
  RealAwsInventoryClient,
  RealAwsClientFactory,
  type AwsInventoryClient,
} from "@cloudleak/aws";

export class ScanService {
  constructor(
    private readonly accessToken: string,
    private readonly clientOverride?: AwsInventoryClient,
  ) {}

  private db(): Db {
    return createUserClient(this.accessToken);
  }

  private regions(): string[] {
    const raw = process.env.CLOUDLEAK_SCAN_REGIONS ?? "us-east-1";
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }

  private async assertAdmin(userId: string, organizationId: string): Promise<void> {
    const m = await new MembershipRepository(this.db()).findForUserInOrg(userId, organizationId);
    if (!m || (m.role !== "owner" && m.role !== "admin")) {
      throw new ForbiddenError("Only owners/admins can run scans");
    }
  }

  private async assertMember(userId: string, organizationId: string): Promise<void> {
    const m = await new MembershipRepository(this.db()).findForUserInOrg(userId, organizationId);
    if (!m) throw new ForbiddenError("Not a member of this organization");
  }

  private async buildClient(roleArn: string, externalId: string): Promise<AwsInventoryClient> {
    if (this.clientOverride) return this.clientOverride;
    if (process.env.CLOUDLEAK_FAKE_AWS === "1") return FakeAwsInventoryClient.demo();
    const creds = await new RealAwsClientFactory().assumeRole({
      roleArn,
      externalId,
      region: this.regions()[0] ?? "us-east-1",
    });
    return new RealAwsInventoryClient(creds);
  }

  async run(userId: string, organizationId: string, awsAccountId: string): Promise<Scan> {
    await this.assertAdmin(userId, organizationId);
    const db = this.db();
    const acct = await new AwsAccountRepository(db).getById(awsAccountId, organizationId);
    if (acct.status !== "connected" || !acct.roleArn) {
      throw new ValidationError("AWS account is not connected");
    }
    const client = await this.buildClient(acct.roleArn, acct.externalId);
    const scan = await runScan({
      awsAccount: { id: acct.id, organizationId },
      regions: this.regions(),
      client,
      resourceRepo: new ResourceRepository(db),
      scanRepo: new ScanRepository(db),
    });
    try {
      await runDetection({
        awsAccount: { id: acct.id, organizationId },
        resourceRepo: new ResourceRepository(db),
        findingRepo: new FindingRepository(db),
      });
    } catch (e) {
      console.error("Detection failed (non-fatal):", e);
    }
    return scan;
  }

  async list(userId: string, organizationId: string): Promise<Scan[]> {
    await this.assertMember(userId, organizationId);
    return new ScanRepository(this.db()).listByOrg(organizationId);
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @cloudleak/web typecheck
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add apps/web/server/services/scan-service.ts
git commit -m "feat(web): run detection after every scan (inline, non-fatal on error)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 9: Findings dashboard page

**Files:**
- Create: `apps/web/app/(dashboard)/findings/page.tsx`
- Create: `apps/web/app/(dashboard)/findings/findings-client.tsx`

**REQUIRED SUB-SKILL: Use `frontend-design` skill for this task.**

The findings page must match the project's existing design system:
- Tailwind CSS with `brand`, `brand-dark`, `ink` color tokens
- Same card/table/badge patterns as `resources-client.tsx` and `scans-client.tsx`
- Severity color mapping: high=orange/amber, medium=yellow, low=blue/slate
- Dismiss action per row (PATCH /api/findings/[id])
- Show dismissed toggle (hidden by default)
- Summary cards: total findings, total savings, severity breakdown
- Filter pills: All | High | Medium | Low
- Empty state: "No findings. Run a scan on the Scans page to detect waste."

- [ ] **Step 1: Invoke frontend-design skill for the Findings page**

Use the `frontend-design` skill with this context:
- Build `findings-client.tsx` (React client component, "use client") and `page.tsx` (server component).
- Props: `FindingsClient({ organizationId: string })`.
- Fetches from `GET /api/findings?organizationId=`.
- Dismisses via `PATCH /api/findings/[id]` with `{ organizationId, status: "dismissed" }`.
- Reopens via `PATCH /api/findings/[id]` with `{ organizationId, status: "open" }`.
- Interface for local types (no imports from packages):

```typescript
interface Finding {
  id: string;
  awsAccountId: string;
  resourceId: string | null;
  findingType: string;
  severity: string;
  estimatedMonthlySavings: number | null;
  title: string;
  description: string | null;
  status: string;
}
```

- Severity badge color map:
  - `high` → amber
  - `medium` → yellow
  - `low` → sky/slate blue
  - `critical` → red

- [ ] **Step 2: Create `apps/web/app/(dashboard)/findings/page.tsx`**

```typescript
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase-server";
import { MembershipRepository } from "@cloudleak/db";
import { FindingsClient } from "./findings-client";

export default async function FindingsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const memberships = await new MembershipRepository(supabase as never).listForUser(user.id);
  const orgId = memberships[0]?.organizationId;
  if (!orgId) redirect("/onboarding");

  return <FindingsClient organizationId={orgId} />;
}
```

Note: mirror the pattern from `apps/web/app/(dashboard)/scans/page.tsx` for the server component data-fetching pattern used in this project. If the existing pattern differs, match it exactly.

- [ ] **Step 3: Typecheck and run all package tests**

```bash
pnpm --filter @cloudleak/web typecheck
pnpm -r test
```
Expected: typecheck clean, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/(dashboard)/findings/
git commit -m "feat(web): Findings dashboard page with severity filter and dismiss

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 10: Promote Findings in nav + smoke test

**Files:**
- Modify: `apps/web/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Update `apps/web/app/(dashboard)/layout.tsx`**

Move `"Findings"` from `COMING_SOON` into `NAV` with `href: "/findings"`.

Replace the file content:

```typescript
import Link from "next/link";
import type { ReactNode } from "react";

const NAV = [
  { href: "/scans", label: "Scans" },
  { href: "/resources", label: "Resources" },
  { href: "/findings", label: "Findings" },
  { href: "/settings/aws", label: "Settings" },
];

const COMING_SOON = ["Overview", "Reports"];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-ink/10 px-4 py-6">
        <div className="px-2 text-lg font-semibold text-brand">CloudLeak</div>
        <nav className="mt-6 space-y-1 text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded px-2 py-1.5 font-medium text-ink hover:bg-ink/5"
            >
              {item.label}
            </Link>
          ))}
          {COMING_SOON.map((label) => (
            <span
              key={label}
              className="block cursor-not-allowed rounded px-2 py-1.5 text-ink/35"
              title="Coming soon"
            >
              {label}
            </span>
          ))}
        </nav>
      </aside>
      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Run full test suite**

```bash
pnpm -r test
```
Expected: all tests pass.

- [ ] **Step 3: Verify dev server starts**

```bash
pnpm --filter @cloudleak/web dev
```
Expected: starts on http://localhost:3000 (or 3001 if 3000 is taken). No compile errors in terminal.

- [ ] **Step 4: Smoke test in browser**

Using Playwright MCP (browser_navigate, browser_snapshot, browser_take_screenshot):
1. Navigate to `http://localhost:3001` (or 3000).
2. Log in as `demo@cloudleak.dev` / `CloudLeakDemo123!`.
3. Navigate to `/scans` and click **Run scan** to trigger detection.
4. Navigate to `/findings` — verify findings appear with severity badges and dismiss buttons.
5. Click **Dismiss** on a finding — verify it disappears from the default view.
6. Take a screenshot confirming the page works.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/(dashboard)/layout.tsx
git commit -m "feat(web): promote Findings to nav, remove from COMING_SOON

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✓ Five rules: stopped_ec2, unattached_ebs, old_snapshot, unattached_eip, stopped_rds (Tasks 3)
- ✓ `packages/rules/` package with Rule interface + runDetection (Tasks 2, 4)
- ✓ FindingRepository (Task 6)
- ✓ RLS write policies (Task 5)
- ✓ Detection runs after every scan (Task 8)
- ✓ GET /api/findings (Task 7)
- ✓ PATCH /api/findings/[id] for dismiss/reopen (Task 7)
- ✓ Findings dashboard page (Task 9)
- ✓ Nav update (Task 10)
- ✓ Dismissed findings survive re-scan (deleteOpenByAwsAccount filters `status='open'`)

**Type consistency:**
- `FindingRepository.deleteOpenByAwsAccount` matches `DetectionFindingRepo.deleteOpenByAwsAccount` ✓
- `FindingRepository.bulkInsert` matches `DetectionFindingRepo.bulkInsert` ✓
- `ResourceRepository.listByOrg(orgId, { awsAccountId? })` satisfies `DetectionResourceRepo` (required `awsAccountId` assignable to optional) ✓
- `NewFindingRow.resourceId` = DB UUID (`resource.id`), not AWS resource ID ✓
