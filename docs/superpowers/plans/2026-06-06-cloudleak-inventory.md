# CloudLeak Phase 2 — Resource Inventory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. When building the two dashboard pages (Task 8), use the frontend-design skill.

**Goal:** Given a `connected` AWS account, assume its read-only role, enumerate six high-waste resource types into the `resources` table as a recorded `scan`, and surface them in the dashboard — runnable locally with no AWS account via a Fake client.

**Architecture:** Thin API route → `ScanService` (authz + client selection) → pure `runScan` orchestrator with an injected `AwsInventoryClient` (Real SDK or Fake) and injected repositories. Static pricing in `packages/core`. New `packages/collectors` package holds collectors + runner so the future Phase 6 worker reuses it unchanged.

**Tech Stack:** TypeScript (ESM, `.js` import specifiers), pnpm/Turborepo workspaces, Vitest, Next.js App Router, Supabase Postgres + RLS, AWS SDK v3.

---

## Conventions (match existing code)

- Every package is ESM (`"type": "module"`); **import sibling files with a `.js` extension** even though sources are `.ts` (e.g. `import { foo } from "./bar.js"`).
- Domain types are camelCase in `packages/core`; DB rows are snake_case and mapped in repositories.
- Repositories take a `Db` in the constructor and scope every query by `organization_id`.
- Services build a per-call user-JWT client with `createUserClient(accessToken)`.
- API routes: `requireUser()` → Zod-parse → call service → `handleApiError(e)` in catch.
- Tests use Vitest (`vitest run`). Integration tests that need Supabase are guarded with `describe.skipIf(!hasEnv)`.
- Commits: conventional, scoped (e.g. `feat(core):`, `feat(collectors):`).

**Branch:** All work happens on a `phase-2-inventory` branch/worktree (the executing skill sets this up). Do not commit to `master`.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `packages/core/src/types.ts` (modify) | + `ResourceType`, `ScanStatus`, `NormalizedResource`, `NewResourceRow`, `Resource`, `ScanStats`, `Scan` |
| `packages/core/src/pricing.ts` (create) | Pure `estimateMonthlyCost(type, metadata)` static price map |
| `packages/core/src/index.ts` (modify) | export `./pricing.js` |
| `packages/core/test/pricing.test.ts` (create) | Unit tests for pricing |
| `packages/aws/src/inventory-client.ts` (create) | `Raw*` types, `AwsInventoryClient` interface, `RealAwsInventoryClient`, `FakeAwsInventoryClient` (+ `demo()`) |
| `packages/aws/src/aws-client-factory.ts` (create) | `AwsCredentials`, `AwsClientFactory` interface, `RealAwsClientFactory` (STS AssumeRole → creds) |
| `packages/aws/src/index.ts` (modify) | export new modules |
| `packages/aws/package.json` (modify) | + AWS SDK service clients |
| `packages/aws/test/inventory-client.test.ts` (create) | Unit test for `FakeAwsInventoryClient.demo()` |
| `packages/collectors/*` (create package) | `Collector` interface, 6 collectors, `runScan` runner, repo interfaces |
| `packages/collectors/test/*` (create) | Unit tests for collectors + runner |
| `packages/db/src/repositories/resource.ts` (create) | `ResourceRepository` |
| `packages/db/src/repositories/scan.ts` (create) | `ScanRepository` |
| `packages/db/src/repositories/index.ts` (modify) | export new repos |
| `supabase/migrations/0005_phase2_scan_rls.sql` (create) | write/delete RLS for `resources` + `scans` |
| `apps/web/server/services/scan-service.ts` (create) | `ScanService` |
| `apps/web/server/services/resource-service.ts` (create) | `ResourceService` |
| `apps/web/app/api/scans/route.ts` (create) | POST run, GET list |
| `apps/web/app/api/resources/route.ts` (create) | GET list |
| `apps/web/app/(dashboard)/scans/page.tsx` + `scans-client.tsx` (create) | Scan history + Run scan |
| `apps/web/app/(dashboard)/resources/page.tsx` + `resources-client.tsx` (create) | Summary cards + resource table |
| `apps/web/app/(dashboard)/layout.tsx` (modify) | Nav: add Scans + Resources |
| `apps/web/package.json` (modify) | + `@cloudleak/collectors` |
| `apps/web/test/integration/scan.test.ts` (create) | Repo + RLS isolation integration tests |
| `.env.example` (modify) | + `CLOUDLEAK_FAKE_AWS`, `CLOUDLEAK_SCAN_REGIONS` |
| `apps/web/README.md` (modify) | Document local Fake scan |

---

## Task 1: Core inventory types + pricing

**Files:**
- Modify: `packages/core/src/types.ts`
- Create: `packages/core/src/pricing.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/test/pricing.test.ts`

- [ ] **Step 1: Add domain types**

Append to `packages/core/src/types.ts`:

```ts
export type ResourceType =
  | "ec2_instance"
  | "ebs_volume"
  | "ebs_snapshot"
  | "elastic_ip"
  | "rds_instance"
  | "load_balancer";

export type ScanStatus = "running" | "success" | "error";

/** What a collector emits, before persistence. */
export interface NormalizedResource {
  resourceType: ResourceType;
  resourceId: string;
  region: string;
  metadata: Record<string, unknown>;
  estimatedMonthlyCost: number;
}

/** A persistable resource row (camelCase; repository maps to snake_case). */
export interface NewResourceRow {
  organizationId: string;
  awsAccountId: string;
  resourceId: string;
  resourceType: ResourceType;
  region: string;
  metadata: Record<string, unknown>;
  estimatedMonthlyCost: number;
}

export interface Resource {
  id: string;
  organizationId: string;
  awsAccountId: string;
  resourceId: string;
  resourceType: ResourceType;
  region: string;
  metadata: Record<string, unknown>;
  estimatedMonthlyCost: number | null;
  createdAt: string;
}

export interface ScanStats {
  resourceCounts: Partial<Record<ResourceType, number>>;
  totalMonthlyCost: number;
  errors: string[];
}

export interface Scan {
  id: string;
  organizationId: string;
  awsAccountId: string;
  status: ScanStatus;
  startedAt: string | null;
  finishedAt: string | null;
  stats: ScanStats;
  createdAt: string;
}
```

- [ ] **Step 2: Write the failing pricing test**

Create `packages/core/test/pricing.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { estimateMonthlyCost } from "../src/pricing.js";

describe("estimateMonthlyCost", () => {
  it("prices a running t3.medium by the hour", () => {
    expect(
      estimateMonthlyCost("ec2_instance", { instanceType: "t3.medium", state: "running" }),
    ).toBeCloseTo(30.37, 1);
  });
  it("charges nothing for a stopped instance", () => {
    expect(
      estimateMonthlyCost("ec2_instance", { instanceType: "t3.medium", state: "stopped" }),
    ).toBe(0);
  });
  it("prices a gp3 EBS volume per GB-month", () => {
    expect(estimateMonthlyCost("ebs_volume", { volumeType: "gp3", sizeGb: 100 })).toBeCloseTo(8, 5);
  });
  it("prices a snapshot per GB-month", () => {
    expect(estimateMonthlyCost("ebs_snapshot", { sizeGb: 200 })).toBeCloseTo(10, 5);
  });
  it("charges a flat rate for an unattached elastic ip", () => {
    expect(estimateMonthlyCost("elastic_ip", {})).toBeCloseTo(3.6, 5);
  });
  it("prices a load balancer by type", () => {
    expect(estimateMonthlyCost("load_balancer", { lbType: "application" })).toBeGreaterThan(0);
  });
  it("returns 0 for an unknown ec2 instance type", () => {
    expect(
      estimateMonthlyCost("ec2_instance", { instanceType: "zz.unknown", state: "running" }),
    ).toBe(0);
  });
});
```

- [ ] **Step 3: Run the test, verify it fails**

Run: `pnpm --filter @cloudleak/core test`
Expected: FAIL — `estimateMonthlyCost` not found / no module `../src/pricing.js`.

- [ ] **Step 4: Implement pricing**

Create `packages/core/src/pricing.ts`:

```ts
import type { ResourceType } from "./types.js";

// Rough us-east-1 on-demand monthly prices. Deliberately approximate; refined in Phase 3.
const HOURS_PER_MONTH = 730;

const EC2_HOURLY: Record<string, number> = {
  "t3.micro": 0.0104,
  "t3.small": 0.0208,
  "t3.medium": 0.0416,
  "t3.large": 0.0832,
  "m5.large": 0.096,
  "m5.xlarge": 0.192,
  "c5.large": 0.085,
  "c5.xlarge": 0.17,
  "r5.large": 0.126,
};

const RDS_HOURLY: Record<string, number> = {
  "db.t3.micro": 0.017,
  "db.t3.small": 0.034,
  "db.t3.medium": 0.068,
  "db.m5.large": 0.171,
  "db.m5.xlarge": 0.342,
  "db.r5.large": 0.24,
};

const EBS_GB_MONTH: Record<string, number> = {
  gp3: 0.08,
  gp2: 0.1,
  io1: 0.125,
  io2: 0.125,
  st1: 0.045,
  sc1: 0.015,
  standard: 0.05,
};

const SNAPSHOT_GB_MONTH = 0.05;
const EIP_UNATTACHED_MONTH = 3.6; // ~$0.005/hr
const LB_MONTH: Record<string, number> = {
  application: 16.43,
  network: 16.43,
  gateway: 16.43,
  classic: 18.25,
};

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Rough estimated monthly USD cost for a resource, from its collected metadata. */
export function estimateMonthlyCost(
  type: ResourceType,
  metadata: Record<string, unknown>,
): number {
  switch (type) {
    case "ec2_instance": {
      if (str(metadata.state) !== "running") return 0;
      const rate = EC2_HOURLY[str(metadata.instanceType)] ?? 0;
      return round(rate * HOURS_PER_MONTH);
    }
    case "rds_instance": {
      const rate = RDS_HOURLY[str(metadata.instanceClass)] ?? 0;
      return round(rate * HOURS_PER_MONTH);
    }
    case "ebs_volume": {
      const rate = EBS_GB_MONTH[str(metadata.volumeType)] ?? EBS_GB_MONTH.gp2;
      return round(rate * num(metadata.sizeGb));
    }
    case "ebs_snapshot":
      return round(SNAPSHOT_GB_MONTH * num(metadata.sizeGb));
    case "elastic_ip":
      return EIP_UNATTACHED_MONTH;
    case "load_balancer":
      return LB_MONTH[str(metadata.lbType)] ?? LB_MONTH.application;
    default:
      return 0;
  }
}
```

- [ ] **Step 5: Export pricing**

Add to `packages/core/src/index.ts`:

```ts
export * from "./pricing.js";
```

- [ ] **Step 6: Run tests + typecheck, verify pass**

Run: `pnpm --filter @cloudleak/core test && pnpm --filter @cloudleak/core typecheck`
Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add packages/core
git commit -m "feat(core): inventory domain types and static pricing"
```

---

## Task 2: AWS inventory client (interface + Real + Fake) and credentials factory

**Files:**
- Modify: `packages/aws/package.json`
- Create: `packages/aws/src/aws-client-factory.ts`
- Create: `packages/aws/src/inventory-client.ts`
- Modify: `packages/aws/src/index.ts`
- Test: `packages/aws/test/inventory-client.test.ts`

- [ ] **Step 1: Add AWS SDK service deps**

Edit `packages/aws/package.json` `dependencies` to add (keep existing `@aws-sdk/client-sts` and `@cloudleak/core`):

```json
    "@aws-sdk/client-ec2": "^3.650.0",
    "@aws-sdk/client-rds": "^3.650.0",
    "@aws-sdk/client-elastic-load-balancing-v2": "^3.650.0",
    "@aws-sdk/client-elastic-load-balancing": "^3.650.0",
```

Then run: `pnpm install`
Expected: lockfile updates, install succeeds.

- [ ] **Step 2: Credentials factory**

Create `packages/aws/src/aws-client-factory.ts`:

```ts
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { AwsValidationError } from "@cloudleak/core";

export interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

export interface AssumeRoleInput {
  roleArn: string;
  externalId: string;
  region: string;
}

export interface AwsClientFactory {
  assumeRole(input: AssumeRoleInput): Promise<AwsCredentials>;
}

/** Assumes the customer's cross-account role and returns scoped temp credentials. */
export class RealAwsClientFactory implements AwsClientFactory {
  async assumeRole({ roleArn, externalId, region }: AssumeRoleInput): Promise<AwsCredentials> {
    const sts = new STSClient({ region });
    const res = await sts.send(
      new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: "cloudleak-scan",
        ExternalId: externalId,
        DurationSeconds: 3600,
      }),
    );
    const c = res.Credentials;
    if (!c?.AccessKeyId || !c.SecretAccessKey || !c.SessionToken) {
      throw new AwsValidationError("AssumeRole returned no credentials");
    }
    return {
      accessKeyId: c.AccessKeyId,
      secretAccessKey: c.SecretAccessKey,
      sessionToken: c.SessionToken,
    };
  }
}
```

- [ ] **Step 3: Inventory client interface + raw types + Fake (with demo fixture)**

Create `packages/aws/src/inventory-client.ts`:

```ts
import {
  EC2Client,
  DescribeInstancesCommand,
  DescribeVolumesCommand,
  DescribeSnapshotsCommand,
  DescribeAddressesCommand,
} from "@aws-sdk/client-ec2";
import { RDSClient, DescribeDBInstancesCommand } from "@aws-sdk/client-rds";
import {
  ElasticLoadBalancingV2Client,
  DescribeLoadBalancersCommand as DescribeV2LbCommand,
} from "@aws-sdk/client-elastic-load-balancing-v2";
import {
  ElasticLoadBalancingClient,
  DescribeLoadBalancersCommand as DescribeClassicLbCommand,
} from "@aws-sdk/client-elastic-load-balancing";
import type { AwsCredentials } from "./aws-client-factory.js";

export interface RawEc2Instance {
  instanceId: string;
  instanceType: string;
  state: string;
  launchTime?: string;
  tags: Record<string, string>;
}
export interface RawEbsVolume {
  volumeId: string;
  volumeType: string;
  sizeGb: number;
  state: string;
  attachments: number;
  createTime?: string;
  tags: Record<string, string>;
}
export interface RawEbsSnapshot {
  snapshotId: string;
  sizeGb: number;
  startTime?: string;
  tags: Record<string, string>;
}
export interface RawElasticIp {
  allocationId: string;
  publicIp: string;
  associationId: string | null;
  tags: Record<string, string>;
}
export interface RawRdsInstance {
  dbInstanceIdentifier: string;
  instanceClass: string;
  engine: string;
  status: string;
  allocatedStorageGb: number;
}
export type LbType = "application" | "network" | "gateway" | "classic";
export interface RawLoadBalancer {
  resourceId: string;
  lbType: LbType;
  createdTime?: string;
}

export interface AwsInventoryClient {
  listEc2Instances(region: string): Promise<RawEc2Instance[]>;
  listEbsVolumes(region: string): Promise<RawEbsVolume[]>;
  listEbsSnapshots(region: string): Promise<RawEbsSnapshot[]>;
  listElasticIps(region: string): Promise<RawElasticIp[]>;
  listRdsInstances(region: string): Promise<RawRdsInstance[]>;
  listLoadBalancers(region: string): Promise<RawLoadBalancer[]>;
}

export interface InventoryFixture {
  ec2Instances?: RawEc2Instance[];
  ebsVolumes?: RawEbsVolume[];
  ebsSnapshots?: RawEbsSnapshot[];
  elasticIps?: RawElasticIp[];
  rdsInstances?: RawRdsInstance[];
  loadBalancers?: RawLoadBalancer[];
}

const DEMO_FIXTURE: InventoryFixture = {
  ec2Instances: [
    { instanceId: "i-0a1b2c3d4e", instanceType: "m5.xlarge", state: "running", tags: { Name: "api-prod" } },
    { instanceId: "i-1122334455", instanceType: "t3.large", state: "stopped", tags: { Name: "legacy-worker" } },
  ],
  ebsVolumes: [
    { volumeId: "vol-0aa11bb22", volumeType: "gp3", sizeGb: 500, state: "available", attachments: 0, tags: {} },
    { volumeId: "vol-0cc33dd44", volumeType: "gp2", sizeGb: 100, state: "in-use", attachments: 1, tags: {} },
  ],
  ebsSnapshots: [
    { snapshotId: "snap-09f8e7d6", sizeGb: 800, startTime: "2024-01-04T00:00:00Z", tags: {} },
  ],
  elasticIps: [
    { allocationId: "eipalloc-0a1", publicIp: "52.10.0.1", associationId: null, tags: {} },
    { allocationId: "eipalloc-0b2", publicIp: "52.10.0.2", associationId: "eipassoc-1", tags: {} },
  ],
  rdsInstances: [
    { dbInstanceIdentifier: "analytics-db", instanceClass: "db.m5.xlarge", engine: "postgres", status: "available", allocatedStorageGb: 200 },
  ],
  loadBalancers: [
    { resourceId: "app/legacy-alb/50dc6c495c0c9188", lbType: "application", createdTime: "2023-06-01T00:00:00Z" },
  ],
};

/** Deterministic fake — no AWS account needed. Ignores region (returns the same fixture). */
export class FakeAwsInventoryClient implements AwsInventoryClient {
  constructor(private readonly fixture: InventoryFixture = {}) {}
  static demo(): FakeAwsInventoryClient {
    return new FakeAwsInventoryClient(DEMO_FIXTURE);
  }
  async listEc2Instances(): Promise<RawEc2Instance[]> {
    return this.fixture.ec2Instances ?? [];
  }
  async listEbsVolumes(): Promise<RawEbsVolume[]> {
    return this.fixture.ebsVolumes ?? [];
  }
  async listEbsSnapshots(): Promise<RawEbsSnapshot[]> {
    return this.fixture.ebsSnapshots ?? [];
  }
  async listElasticIps(): Promise<RawElasticIp[]> {
    return this.fixture.elasticIps ?? [];
  }
  async listRdsInstances(): Promise<RawRdsInstance[]> {
    return this.fixture.rdsInstances ?? [];
  }
  async listLoadBalancers(): Promise<RawLoadBalancer[]> {
    return this.fixture.loadBalancers ?? [];
  }
}

function tagMap(tags?: { Key?: string; Value?: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of tags ?? []) if (t.Key) out[t.Key] = t.Value ?? "";
  return out;
}

/** Real implementation using AWS SDK v3 with scoped credentials. Region-scoped per call. */
export class RealAwsInventoryClient implements AwsInventoryClient {
  constructor(private readonly creds: AwsCredentials) {}

  private aws() {
    return {
      accessKeyId: this.creds.accessKeyId,
      secretAccessKey: this.creds.secretAccessKey,
      sessionToken: this.creds.sessionToken,
    };
  }

  async listEc2Instances(region: string): Promise<RawEc2Instance[]> {
    const ec2 = new EC2Client({ region, credentials: this.aws() });
    const out: RawEc2Instance[] = [];
    let token: string | undefined;
    do {
      const res = await ec2.send(new DescribeInstancesCommand({ NextToken: token }));
      for (const r of res.Reservations ?? [])
        for (const i of r.Instances ?? [])
          out.push({
            instanceId: i.InstanceId ?? "",
            instanceType: String(i.InstanceType ?? ""),
            state: i.State?.Name ?? "",
            launchTime: i.LaunchTime?.toISOString(),
            tags: tagMap(i.Tags),
          });
      token = res.NextToken;
    } while (token);
    return out;
  }

  async listEbsVolumes(region: string): Promise<RawEbsVolume[]> {
    const ec2 = new EC2Client({ region, credentials: this.aws() });
    const out: RawEbsVolume[] = [];
    let token: string | undefined;
    do {
      const res = await ec2.send(new DescribeVolumesCommand({ NextToken: token }));
      for (const v of res.Volumes ?? [])
        out.push({
          volumeId: v.VolumeId ?? "",
          volumeType: String(v.VolumeType ?? ""),
          sizeGb: v.Size ?? 0,
          state: v.State ?? "",
          attachments: v.Attachments?.length ?? 0,
          createTime: v.CreateTime?.toISOString(),
          tags: tagMap(v.Tags),
        });
      token = res.NextToken;
    } while (token);
    return out;
  }

  async listEbsSnapshots(region: string): Promise<RawEbsSnapshot[]> {
    const ec2 = new EC2Client({ region, credentials: this.aws() });
    const out: RawEbsSnapshot[] = [];
    let token: string | undefined;
    do {
      const res = await ec2.send(
        new DescribeSnapshotsCommand({ OwnerIds: ["self"], NextToken: token }),
      );
      for (const s of res.Snapshots ?? [])
        out.push({
          snapshotId: s.SnapshotId ?? "",
          sizeGb: s.VolumeSize ?? 0,
          startTime: s.StartTime?.toISOString(),
          tags: tagMap(s.Tags),
        });
      token = res.NextToken;
    } while (token);
    return out;
  }

  async listElasticIps(region: string): Promise<RawElasticIp[]> {
    const ec2 = new EC2Client({ region, credentials: this.aws() });
    const res = await ec2.send(new DescribeAddressesCommand({}));
    return (res.Addresses ?? []).map((a) => ({
      allocationId: a.AllocationId ?? a.PublicIp ?? "",
      publicIp: a.PublicIp ?? "",
      associationId: a.AssociationId ?? null,
      tags: tagMap(a.Tags),
    }));
  }

  async listRdsInstances(region: string): Promise<RawRdsInstance[]> {
    const rds = new RDSClient({ region, credentials: this.aws() });
    const out: RawRdsInstance[] = [];
    let marker: string | undefined;
    do {
      const res = await rds.send(new DescribeDBInstancesCommand({ Marker: marker }));
      for (const d of res.DBInstances ?? [])
        out.push({
          dbInstanceIdentifier: d.DBInstanceIdentifier ?? "",
          instanceClass: d.DBInstanceClass ?? "",
          engine: d.Engine ?? "",
          status: d.DBInstanceStatus ?? "",
          allocatedStorageGb: d.AllocatedStorage ?? 0,
        });
      marker = res.Marker;
    } while (marker);
    return out;
  }

  async listLoadBalancers(region: string): Promise<RawLoadBalancer[]> {
    const v2 = new ElasticLoadBalancingV2Client({ region, credentials: this.aws() });
    const out: RawLoadBalancer[] = [];
    let marker: string | undefined;
    do {
      const res = await v2.send(new DescribeV2LbCommand({ Marker: marker }));
      for (const lb of res.LoadBalancers ?? [])
        out.push({
          resourceId: lb.LoadBalancerArn ?? lb.LoadBalancerName ?? "",
          lbType: (lb.Type as LbType) ?? "application",
          createdTime: lb.CreatedTime?.toISOString(),
        });
      marker = res.NextMarker;
    } while (marker);

    const classic = new ElasticLoadBalancingClient({ region, credentials: this.aws() });
    let cmarker: string | undefined;
    do {
      const res = await classic.send(new DescribeClassicLbCommand({ Marker: cmarker }));
      for (const lb of res.LoadBalancerDescriptions ?? [])
        out.push({
          resourceId: lb.LoadBalancerName ?? "",
          lbType: "classic",
          createdTime: lb.CreatedTime?.toISOString(),
        });
      cmarker = res.NextMarker;
    } while (cmarker);
    return out;
  }
}
```

- [ ] **Step 4: Export new modules**

Set `packages/aws/src/index.ts` to:

```ts
export * from "./sts-service.js";
export * from "./aws-client-factory.js";
export * from "./inventory-client.js";
```

- [ ] **Step 5: Write the failing fake-client test**

Create `packages/aws/test/inventory-client.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { FakeAwsInventoryClient } from "../src/inventory-client.js";

describe("FakeAwsInventoryClient.demo", () => {
  const c = FakeAwsInventoryClient.demo();
  it("returns seeded ec2 instances", async () => {
    expect((await c.listEc2Instances("us-east-1")).length).toBeGreaterThan(0);
  });
  it("includes an unattached elastic ip", async () => {
    const ips = await c.listElasticIps("us-east-1");
    expect(ips.some((i) => i.associationId === null)).toBe(true);
  });
  it("returns an empty array for an unset fixture section", async () => {
    expect(await new FakeAwsInventoryClient().listRdsInstances("us-east-1")).toEqual([]);
  });
});
```

- [ ] **Step 6: Run test + typecheck, verify pass**

Run: `pnpm --filter @cloudleak/aws test && pnpm --filter @cloudleak/aws typecheck`
Expected: PASS. (If SDK field names mismatch during typecheck, adjust the mapping in `inventory-client.ts` to the installed SDK's types — the `Raw*` shapes are the contract, not the SDK calls.)

- [ ] **Step 7: Commit**

```bash
git add packages/aws
git commit -m "feat(aws): inventory client (real+fake) and credentials factory"
```

---

## Task 3: Collectors package + scan runner

**Files:**
- Create: `packages/collectors/package.json`, `tsconfig.json`
- Create: `packages/collectors/src/collector.ts`, six collector files, `scan-runner.ts`, `index.ts`
- Test: `packages/collectors/test/collectors.test.ts`, `packages/collectors/test/scan-runner.test.ts`

- [ ] **Step 1: Scaffold the package**

Create `packages/collectors/package.json`:

```json
{
  "name": "@cloudleak/collectors",
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
    "@cloudleak/core": "workspace:*",
    "@cloudleak/aws": "workspace:*"
  },
  "devDependencies": {
    "@cloudleak/config": "workspace:*",
    "@types/node": "^22.0.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

Create `packages/collectors/tsconfig.json`:

```json
{
  "extends": "@cloudleak/config/tsconfig.base.json",
  "include": ["src", "test"]
}
```

Then run: `pnpm install`
Expected: workspace links `@cloudleak/collectors`.

- [ ] **Step 2: Collector interface**

Create `packages/collectors/src/collector.ts`:

```ts
import type { AwsInventoryClient } from "@cloudleak/aws";
import type { NormalizedResource, ResourceType } from "@cloudleak/core";

export interface Collector {
  type: ResourceType;
  collect(client: AwsInventoryClient, region: string): Promise<NormalizedResource[]>;
}
```

- [ ] **Step 3: The six collectors**

Create `packages/collectors/src/ec2-instance.ts`:

```ts
import { estimateMonthlyCost } from "@cloudleak/core";
import type { Collector } from "./collector.js";

export const ec2InstanceCollector: Collector = {
  type: "ec2_instance",
  async collect(client, region) {
    const rows = await client.listEc2Instances(region);
    return rows.map((r) => {
      const metadata = { instanceType: r.instanceType, state: r.state, launchTime: r.launchTime, tags: r.tags };
      return {
        resourceType: "ec2_instance" as const,
        resourceId: r.instanceId,
        region,
        metadata,
        estimatedMonthlyCost: estimateMonthlyCost("ec2_instance", metadata),
      };
    });
  },
};
```

Create `packages/collectors/src/ebs-volume.ts`:

```ts
import { estimateMonthlyCost } from "@cloudleak/core";
import type { Collector } from "./collector.js";

export const ebsVolumeCollector: Collector = {
  type: "ebs_volume",
  async collect(client, region) {
    const rows = await client.listEbsVolumes(region);
    return rows.map((r) => {
      const metadata = { volumeType: r.volumeType, sizeGb: r.sizeGb, state: r.state, attachments: r.attachments, createTime: r.createTime, tags: r.tags };
      return {
        resourceType: "ebs_volume" as const,
        resourceId: r.volumeId,
        region,
        metadata,
        estimatedMonthlyCost: estimateMonthlyCost("ebs_volume", metadata),
      };
    });
  },
};
```

Create `packages/collectors/src/ebs-snapshot.ts`:

```ts
import { estimateMonthlyCost } from "@cloudleak/core";
import type { Collector } from "./collector.js";

export const ebsSnapshotCollector: Collector = {
  type: "ebs_snapshot",
  async collect(client, region) {
    const rows = await client.listEbsSnapshots(region);
    return rows.map((r) => {
      const metadata = { sizeGb: r.sizeGb, startTime: r.startTime, tags: r.tags };
      return {
        resourceType: "ebs_snapshot" as const,
        resourceId: r.snapshotId,
        region,
        metadata,
        estimatedMonthlyCost: estimateMonthlyCost("ebs_snapshot", metadata),
      };
    });
  },
};
```

Create `packages/collectors/src/elastic-ip.ts` (drops attached EIPs — only unattached are wasteful):

```ts
import { estimateMonthlyCost } from "@cloudleak/core";
import type { Collector } from "./collector.js";

export const elasticIpCollector: Collector = {
  type: "elastic_ip",
  async collect(client, region) {
    const rows = await client.listElasticIps(region);
    return rows
      .filter((r) => r.associationId === null)
      .map((r) => {
        const metadata = { publicIp: r.publicIp, attached: false, tags: r.tags };
        return {
          resourceType: "elastic_ip" as const,
          resourceId: r.allocationId,
          region,
          metadata,
          estimatedMonthlyCost: estimateMonthlyCost("elastic_ip", metadata),
        };
      });
  },
};
```

Create `packages/collectors/src/rds-instance.ts`:

```ts
import { estimateMonthlyCost } from "@cloudleak/core";
import type { Collector } from "./collector.js";

export const rdsInstanceCollector: Collector = {
  type: "rds_instance",
  async collect(client, region) {
    const rows = await client.listRdsInstances(region);
    return rows.map((r) => {
      const metadata = { instanceClass: r.instanceClass, engine: r.engine, status: r.status, allocatedStorageGb: r.allocatedStorageGb };
      return {
        resourceType: "rds_instance" as const,
        resourceId: r.dbInstanceIdentifier,
        region,
        metadata,
        estimatedMonthlyCost: estimateMonthlyCost("rds_instance", metadata),
      };
    });
  },
};
```

Create `packages/collectors/src/load-balancer.ts`:

```ts
import { estimateMonthlyCost } from "@cloudleak/core";
import type { Collector } from "./collector.js";

export const loadBalancerCollector: Collector = {
  type: "load_balancer",
  async collect(client, region) {
    const rows = await client.listLoadBalancers(region);
    return rows.map((r) => {
      const metadata = { lbType: r.lbType, createdTime: r.createdTime };
      return {
        resourceType: "load_balancer" as const,
        resourceId: r.resourceId,
        region,
        metadata,
        estimatedMonthlyCost: estimateMonthlyCost("load_balancer", metadata),
      };
    });
  },
};
```

- [ ] **Step 4: Scan runner**

Create `packages/collectors/src/scan-runner.ts`:

```ts
import type { AwsInventoryClient } from "@cloudleak/aws";
import type { NewResourceRow, ResourceType, Scan, ScanStats, ScanStatus } from "@cloudleak/core";
import type { Collector } from "./collector.js";
import { ec2InstanceCollector } from "./ec2-instance.js";
import { ebsVolumeCollector } from "./ebs-volume.js";
import { ebsSnapshotCollector } from "./ebs-snapshot.js";
import { elasticIpCollector } from "./elastic-ip.js";
import { rdsInstanceCollector } from "./rds-instance.js";
import { loadBalancerCollector } from "./load-balancer.js";

export const ALL_COLLECTORS: Collector[] = [
  ec2InstanceCollector,
  ebsVolumeCollector,
  ebsSnapshotCollector,
  elasticIpCollector,
  rdsInstanceCollector,
  loadBalancerCollector,
];

/** Repository shape the runner needs to persist resources (structurally satisfied by ResourceRepository). */
export interface ScanResourceRepo {
  deleteByAwsAccount(organizationId: string, awsAccountId: string): Promise<void>;
  bulkInsert(rows: NewResourceRow[]): Promise<void>;
}

/** Repository shape the runner needs to record the scan (structurally satisfied by ScanRepository). */
export interface ScanRecordRepo {
  create(organizationId: string, awsAccountId: string): Promise<Scan>;
  update(
    id: string,
    patch: { status: ScanStatus; finishedAt: string; stats: ScanStats },
  ): Promise<Scan>;
}

export interface RunScanInput {
  awsAccount: { id: string; organizationId: string };
  regions: string[];
  client: AwsInventoryClient;
  resourceRepo: ScanResourceRepo;
  scanRepo: ScanRecordRepo;
  collectors?: Collector[];
}

/**
 * Runs all collectors across all regions, replaces the account's resource inventory,
 * and records the scan. Per-collector failures are non-fatal (captured in stats.errors);
 * the scan is `error` only if every collector throws.
 */
export async function runScan(input: RunScanInput): Promise<Scan> {
  const { awsAccount, regions, client, resourceRepo, scanRepo } = input;
  const collectors = input.collectors ?? ALL_COLLECTORS;

  const scan = await scanRepo.create(awsAccount.organizationId, awsAccount.id);

  const rows: NewResourceRow[] = [];
  const resourceCounts: Partial<Record<ResourceType, number>> = {};
  const errors: string[] = [];
  let totalMonthlyCost = 0;
  let ranAnyCleanly = false;

  for (const region of regions) {
    for (const c of collectors) {
      try {
        const found = await c.collect(client, region);
        ranAnyCleanly = true;
        for (const r of found) {
          rows.push({
            organizationId: awsAccount.organizationId,
            awsAccountId: awsAccount.id,
            resourceId: r.resourceId,
            resourceType: r.resourceType,
            region: r.region,
            metadata: r.metadata,
            estimatedMonthlyCost: r.estimatedMonthlyCost,
          });
          resourceCounts[r.resourceType] = (resourceCounts[r.resourceType] ?? 0) + 1;
          totalMonthlyCost += r.estimatedMonthlyCost;
        }
      } catch (e) {
        errors.push(`${c.type}@${region}: ${(e as Error).message}`);
      }
    }
  }

  await resourceRepo.deleteByAwsAccount(awsAccount.organizationId, awsAccount.id);
  await resourceRepo.bulkInsert(rows);

  const status: ScanStatus = ranAnyCleanly ? "success" : "error";
  return scanRepo.update(scan.id, {
    status,
    finishedAt: new Date().toISOString(),
    stats: { resourceCounts, totalMonthlyCost: Math.round(totalMonthlyCost * 100) / 100, errors },
  });
}
```

- [ ] **Step 5: Barrel export**

Create `packages/collectors/src/index.ts`:

```ts
export * from "./collector.js";
export * from "./scan-runner.js";
export * from "./ec2-instance.js";
export * from "./ebs-volume.js";
export * from "./ebs-snapshot.js";
export * from "./elastic-ip.js";
export * from "./rds-instance.js";
export * from "./load-balancer.js";
```

- [ ] **Step 6: Write failing collector tests**

Create `packages/collectors/test/collectors.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { FakeAwsInventoryClient } from "@cloudleak/aws";
import { ec2InstanceCollector } from "../src/ec2-instance.js";
import { elasticIpCollector } from "../src/elastic-ip.js";

describe("ec2InstanceCollector", () => {
  it("normalizes an instance with a cost", async () => {
    const client = new FakeAwsInventoryClient({
      ec2Instances: [{ instanceId: "i-1", instanceType: "t3.medium", state: "running", tags: {} }],
    });
    const out = await ec2InstanceCollector.collect(client, "us-east-1");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ resourceType: "ec2_instance", resourceId: "i-1", region: "us-east-1" });
    expect(out[0].estimatedMonthlyCost).toBeGreaterThan(0);
  });
});

describe("elasticIpCollector", () => {
  it("keeps only unattached elastic ips", async () => {
    const client = new FakeAwsInventoryClient({
      elasticIps: [
        { allocationId: "e-free", publicIp: "1.1.1.1", associationId: null, tags: {} },
        { allocationId: "e-used", publicIp: "2.2.2.2", associationId: "assoc-1", tags: {} },
      ],
    });
    const out = await elasticIpCollector.collect(client, "us-east-1");
    expect(out.map((r) => r.resourceId)).toEqual(["e-free"]);
  });
});
```

- [ ] **Step 7: Write failing scan-runner tests**

Create `packages/collectors/test/scan-runner.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import type { AwsInventoryClient } from "@cloudleak/aws";
import { FakeAwsInventoryClient } from "@cloudleak/aws";
import type { NewResourceRow, Scan, ScanStats, ScanStatus } from "@cloudleak/core";
import { runScan } from "../src/scan-runner.js";

function fakeRepos() {
  const inserted: NewResourceRow[] = [];
  let deleted = false;
  const resourceRepo = {
    async deleteByAwsAccount() {
      deleted = true;
    },
    async bulkInsert(rows: NewResourceRow[]) {
      inserted.push(...rows);
    },
  };
  const base: Scan = {
    id: "scan-1",
    organizationId: "o1",
    awsAccountId: "a1",
    status: "running",
    startedAt: "2026-06-06T00:00:00Z",
    finishedAt: null,
    stats: { resourceCounts: {}, totalMonthlyCost: 0, errors: [] },
    createdAt: "2026-06-06T00:00:00Z",
  };
  const scanRepo = {
    async create() {
      return base;
    },
    async update(id: string, patch: { status: ScanStatus; finishedAt: string; stats: ScanStats }) {
      return { ...base, ...patch };
    },
  };
  return { resourceRepo, scanRepo, inserted, deletedRef: () => deleted };
}

describe("runScan", () => {
  it("collects, replaces inventory, and records success stats", async () => {
    const client = FakeAwsInventoryClient.demo();
    const { resourceRepo, scanRepo, inserted, deletedRef } = fakeRepos();
    const scan = await runScan({
      awsAccount: { id: "a1", organizationId: "o1" },
      regions: ["us-east-1"],
      client,
      resourceRepo,
      scanRepo,
    });
    expect(deletedRef()).toBe(true);
    expect(inserted.length).toBeGreaterThan(0);
    expect(scan.status).toBe("success");
    expect(scan.stats.totalMonthlyCost).toBeGreaterThan(0);
    expect(scan.stats.resourceCounts.ec2_instance).toBe(2);
    // attached EIP dropped -> only 1 elastic_ip
    expect(scan.stats.resourceCounts.elastic_ip).toBe(1);
  });

  it("records a collector error but still succeeds when others run", async () => {
    const base = FakeAwsInventoryClient.demo();
    const client: AwsInventoryClient = Object.assign(Object.create(Object.getPrototypeOf(base)), base, {
      listEc2Instances: async () => {
        throw new Error("AccessDenied");
      },
    });
    const { resourceRepo, scanRepo } = fakeRepos();
    const scan = await runScan({
      awsAccount: { id: "a1", organizationId: "o1" },
      regions: ["us-east-1"],
      client,
      resourceRepo,
      scanRepo,
    });
    expect(scan.status).toBe("success");
    expect(scan.stats.errors.some((e) => e.includes("ec2_instance@us-east-1"))).toBe(true);
  });

  it("is an error scan when every collector throws", async () => {
    const throwing: AwsInventoryClient = {
      listEc2Instances: async () => {
        throw new Error("x");
      },
      listEbsVolumes: async () => {
        throw new Error("x");
      },
      listEbsSnapshots: async () => {
        throw new Error("x");
      },
      listElasticIps: async () => {
        throw new Error("x");
      },
      listRdsInstances: async () => {
        throw new Error("x");
      },
      listLoadBalancers: async () => {
        throw new Error("x");
      },
    };
    const { resourceRepo, scanRepo } = fakeRepos();
    const scan = await runScan({
      awsAccount: { id: "a1", organizationId: "o1" },
      regions: ["us-east-1"],
      client: throwing,
      resourceRepo,
      scanRepo,
    });
    expect(scan.status).toBe("error");
    expect(scan.stats.errors).toHaveLength(6);
  });
});
```

- [ ] **Step 8: Run tests + typecheck, verify pass**

Run: `pnpm --filter @cloudleak/collectors test && pnpm --filter @cloudleak/collectors typecheck`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add packages/collectors
git commit -m "feat(collectors): resource collectors and scan runner"
```

---

## Task 4: Migration — write/delete RLS for resources + scans

**Files:**
- Create: `supabase/migrations/0005_phase2_scan_rls.sql`

Note: SELECT policies for `resources`/`scans` already exist (migration `0001`/`0003`). This migration adds only the write/delete policies needed for user-JWT scan writes. No table or type changes, so type regeneration is **not** required.

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/0005_phase2_scan_rls.sql`:

```sql
-- Phase 2: allow members to write their org's inventory + scan rows under their own JWT.
-- Mirrors the Phase 1 user-JWT write decision (migration 0004). Read policies already exist.

-- resources: members may insert and delete their org's rows (scan = delete-then-insert).
create policy "member insert resources" on public.resources
  for insert to authenticated
  with check (organization_id in (select private.current_user_org_ids()));

create policy "member delete resources" on public.resources
  for delete to authenticated
  using (organization_id in (select private.current_user_org_ids()));

-- scans: members may insert (create a run) and update (mark finished) their org's rows.
create policy "member insert scans" on public.scans
  for insert to authenticated
  with check (organization_id in (select private.current_user_org_ids()));

create policy "member update scans" on public.scans
  for update to authenticated
  using (organization_id in (select private.current_user_org_ids()))
  with check (organization_id in (select private.current_user_org_ids()));
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Use the `mcp__claude_ai_Supabase__apply_migration` tool on the `cloudleak` project (ref `ivgytzevandcqfiiqiow`) with name `phase2_scan_rls` and the SQL above.
Expected: success.

- [ ] **Step 3: Verify no new security advisories**

Use `mcp__claude_ai_Supabase__get_advisors` (type `security`).
Expected: no **new** findings beyond the two known intentional SECURITY DEFINER RPC warnings from Phase 1 (`create_organization`, `accept_invite`).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0005_phase2_scan_rls.sql
git commit -m "feat(db): RLS write policies for resources and scans"
```

---

## Task 5: Repositories — ResourceRepository + ScanRepository

**Files:**
- Create: `packages/db/src/repositories/resource.ts`
- Create: `packages/db/src/repositories/scan.ts`
- Modify: `packages/db/src/repositories/index.ts`

- [ ] **Step 1: ResourceRepository**

Create `packages/db/src/repositories/resource.ts`:

```ts
import type { Db } from "../client.js";
import type { NewResourceRow, Resource, ResourceType } from "@cloudleak/core";

type ResourceRow = {
  id: string;
  organization_id: string;
  aws_account_id: string;
  resource_id: string;
  resource_type: string;
  region: string;
  metadata: unknown;
  estimated_monthly_cost: number | null;
  created_at: string;
};

const map = (d: ResourceRow): Resource => ({
  id: d.id,
  organizationId: d.organization_id,
  awsAccountId: d.aws_account_id,
  resourceId: d.resource_id,
  resourceType: d.resource_type as ResourceType,
  region: d.region,
  metadata: (d.metadata ?? {}) as Record<string, unknown>,
  estimatedMonthlyCost: d.estimated_monthly_cost,
  createdAt: d.created_at,
});

export class ResourceRepository {
  constructor(private readonly db: Db) {}

  async bulkInsert(rows: NewResourceRow[]): Promise<void> {
    if (rows.length === 0) return;
    const payload = rows.map((r) => ({
      organization_id: r.organizationId,
      aws_account_id: r.awsAccountId,
      resource_id: r.resourceId,
      resource_type: r.resourceType,
      region: r.region,
      metadata: r.metadata as never,
      estimated_monthly_cost: r.estimatedMonthlyCost,
    }));
    const { error } = await this.db.from("resources").insert(payload);
    if (error) throw new Error(error.message);
  }

  async deleteByAwsAccount(organizationId: string, awsAccountId: string): Promise<void> {
    const { error } = await this.db
      .from("resources")
      .delete()
      .eq("organization_id", organizationId)
      .eq("aws_account_id", awsAccountId);
    if (error) throw new Error(error.message);
  }

  async listByOrg(
    organizationId: string,
    opts: { awsAccountId?: string } = {},
  ): Promise<Resource[]> {
    let q = this.db
      .from("resources")
      .select()
      .eq("organization_id", organizationId)
      .order("estimated_monthly_cost", { ascending: false, nullsFirst: false });
    if (opts.awsAccountId) q = q.eq("aws_account_id", opts.awsAccountId);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data ?? []).map((d) => map(d as ResourceRow));
  }
}
```

- [ ] **Step 2: ScanRepository**

Create `packages/db/src/repositories/scan.ts`:

```ts
import type { Db } from "../client.js";
import { NotFoundError, type Scan, type ScanStats, type ScanStatus } from "@cloudleak/core";

type ScanRow = {
  id: string;
  organization_id: string;
  aws_account_id: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  stats: unknown;
  created_at: string;
};

const EMPTY_STATS: ScanStats = { resourceCounts: {}, totalMonthlyCost: 0, errors: [] };

const map = (d: ScanRow): Scan => ({
  id: d.id,
  organizationId: d.organization_id,
  awsAccountId: d.aws_account_id,
  status: d.status as ScanStatus,
  startedAt: d.started_at,
  finishedAt: d.finished_at,
  stats: (d.stats && typeof d.stats === "object" ? (d.stats as ScanStats) : EMPTY_STATS),
  createdAt: d.created_at,
});

export class ScanRepository {
  constructor(private readonly db: Db) {}

  async create(organizationId: string, awsAccountId: string): Promise<Scan> {
    const { data, error } = await this.db
      .from("scans")
      .insert({
        organization_id: organizationId,
        aws_account_id: awsAccountId,
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? "insert failed");
    return map(data as ScanRow);
  }

  async update(
    id: string,
    patch: { status: ScanStatus; finishedAt: string; stats: ScanStats },
  ): Promise<Scan> {
    const { data, error } = await this.db
      .from("scans")
      .update({
        status: patch.status,
        finished_at: patch.finishedAt,
        stats: patch.stats as never,
      })
      .eq("id", id)
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? "update failed");
    return map(data as ScanRow);
  }

  async listByOrg(organizationId: string): Promise<Scan[]> {
    const { data, error } = await this.db
      .from("scans")
      .select()
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((d) => map(d as ScanRow));
  }

  async getById(id: string, organizationId: string): Promise<Scan> {
    const { data } = await this.db
      .from("scans")
      .select()
      .eq("id", id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (!data) throw new NotFoundError("Scan not found");
    return map(data as ScanRow);
  }
}
```

- [ ] **Step 3: Export the repos**

Set `packages/db/src/repositories/index.ts` to:

```ts
export * from "./organization.js";
export * from "./membership.js";
export * from "./invitation.js";
export * from "./aws-account.js";
export * from "./resource.js";
export * from "./scan.js";
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @cloudleak/db typecheck`
Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git add packages/db
git commit -m "feat(db): resource and scan repositories"
```

---

## Task 6: Services — ScanService + ResourceService

**Files:**
- Modify: `apps/web/package.json` (add `@cloudleak/collectors`)
- Create: `apps/web/server/services/scan-service.ts`
- Create: `apps/web/server/services/resource-service.ts`

- [ ] **Step 1: Add the collectors dependency**

Edit `apps/web/package.json`: add `"@cloudleak/collectors": "workspace:*"` to `dependencies` (alongside the other `@cloudleak/*` deps). Then run: `pnpm install`
Expected: workspace link added.

- [ ] **Step 2: ScanService**

Create `apps/web/server/services/scan-service.ts`:

```ts
import {
  createUserClient,
  AwsAccountRepository,
  MembershipRepository,
  ResourceRepository,
  ScanRepository,
  type Db,
} from "@cloudleak/db";
import { ForbiddenError, ValidationError, type Scan } from "@cloudleak/core";
import { runScan } from "@cloudleak/collectors";
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
    return runScan({
      awsAccount: { id: acct.id, organizationId },
      regions: this.regions(),
      client,
      resourceRepo: new ResourceRepository(db),
      scanRepo: new ScanRepository(db),
    });
  }

  async list(userId: string, organizationId: string): Promise<Scan[]> {
    await this.assertMember(userId, organizationId);
    return new ScanRepository(this.db()).listByOrg(organizationId);
  }
}
```

- [ ] **Step 3: ResourceService**

Create `apps/web/server/services/resource-service.ts`:

```ts
import { createUserClient, MembershipRepository, ResourceRepository, type Db } from "@cloudleak/db";
import { ForbiddenError, type Resource } from "@cloudleak/core";

export class ResourceService {
  constructor(private readonly accessToken: string) {}

  private db(): Db {
    return createUserClient(this.accessToken);
  }

  private async assertMember(userId: string, organizationId: string): Promise<void> {
    const m = await new MembershipRepository(this.db()).findForUserInOrg(userId, organizationId);
    if (!m) throw new ForbiddenError("Not a member of this organization");
  }

  async list(
    userId: string,
    organizationId: string,
    opts: { awsAccountId?: string } = {},
  ): Promise<Resource[]> {
    await this.assertMember(userId, organizationId);
    return new ResourceRepository(this.db()).listByOrg(organizationId, opts);
  }
}
```

- [ ] **Step 4: Typecheck the web app**

Run: `pnpm --filter @cloudleak/web typecheck`
Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json apps/web/server/services
git commit -m "feat(web): scan and resource services"
```

---

## Task 7: API routes

**Files:**
- Create: `apps/web/app/api/scans/route.ts`
- Create: `apps/web/app/api/resources/route.ts`

- [ ] **Step 1: Scans route (POST run, GET list)**

Create `apps/web/app/api/scans/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { ScanService } from "@/server/services/scan-service";
import { handleApiError } from "@/server/api-error-handler";
import { ValidationError } from "@cloudleak/core";

const Body = z.object({
  organizationId: z.string().uuid(),
  awsAccountId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const { user, accessToken } = await requireUser();
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) throw new ValidationError("organizationId and awsAccountId required");
    const scan = await new ScanService(accessToken).run(
      user.id,
      parsed.data.organizationId,
      parsed.data.awsAccountId,
    );
    return NextResponse.json({ scan }, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}

export async function GET(req: Request) {
  try {
    const { user, accessToken } = await requireUser();
    const orgId = new URL(req.url).searchParams.get("organizationId");
    if (!orgId) throw new ValidationError("organizationId query param required");
    const scans = await new ScanService(accessToken).list(user.id, orgId);
    return NextResponse.json({ scans });
  } catch (e) {
    return handleApiError(e);
  }
}
```

- [ ] **Step 2: Resources route (GET list)**

Create `apps/web/app/api/resources/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ResourceService } from "@/server/services/resource-service";
import { handleApiError } from "@/server/api-error-handler";
import { ValidationError } from "@cloudleak/core";

export async function GET(req: Request) {
  try {
    const { user, accessToken } = await requireUser();
    const url = new URL(req.url);
    const orgId = url.searchParams.get("organizationId");
    if (!orgId) throw new ValidationError("organizationId query param required");
    const awsAccountId = url.searchParams.get("awsAccountId") ?? undefined;
    const resources = await new ResourceService(accessToken).list(user.id, orgId, { awsAccountId });
    return NextResponse.json({ resources });
  } catch (e) {
    return handleApiError(e);
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @cloudleak/web typecheck`
Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/scans apps/web/app/api/resources
git commit -m "feat(web): scans and resources API routes"
```

---

## Task 8: Dashboard pages (frontend-design) + nav

**Use the frontend-design skill for this task.** Match the existing styling tokens (`brand`, `brand-dark`, `ink`, rounded cards, the look of `aws-settings.tsx`). UI uses plain `fetch` + `useState` (the codebase does not use TanStack Query).

**Files:**
- Modify: `apps/web/app/(dashboard)/layout.tsx`
- Create: `apps/web/app/(dashboard)/scans/page.tsx`, `scans-client.tsx`
- Create: `apps/web/app/(dashboard)/resources/page.tsx`, `resources-client.tsx`

- [ ] **Step 1: Update dashboard nav**

Replace `apps/web/app/(dashboard)/layout.tsx` with:

```tsx
import Link from "next/link";
import type { ReactNode } from "react";

const NAV = [
  { href: "/scans", label: "Scans" },
  { href: "/resources", label: "Resources" },
  { href: "/settings/aws", label: "Settings" },
];

const COMING_SOON = ["Overview", "Findings", "Reports"];

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

- [ ] **Step 2: Scans server page**

Create `apps/web/app/(dashboard)/scans/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getActiveOrgId } from "@/lib/org";
import { ScansClient } from "./scans-client";

export default async function ScansPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");
  return <ScansClient organizationId={orgId} />;
}
```

- [ ] **Step 3: Scans client component**

Create `apps/web/app/(dashboard)/scans/scans-client.tsx`:

```tsx
"use client";
import { useCallback, useEffect, useState } from "react";

interface Account {
  id: string;
  accountId: string | null;
  status: string;
}
interface ScanStats {
  resourceCounts: Record<string, number>;
  totalMonthlyCost: number;
  errors: string[];
}
interface Scan {
  id: string;
  awsAccountId: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  stats: ScanStats;
  createdAt: string;
}

const usd = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const count = (s: ScanStats) =>
  Object.values(s.resourceCounts ?? {}).reduce((a, b) => a + b, 0);

export function ScansClient({ organizationId }: { organizationId: string }) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [s, a] = await Promise.all([
      fetch(`/api/scans?organizationId=${organizationId}`),
      fetch(`/api/aws/accounts?organizationId=${organizationId}`),
    ]);
    if (s.ok) setScans((await s.json()).scans);
    if (a.ok) setAccounts((await a.json()).accounts);
  }, [organizationId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const connected = accounts.filter((a) => a.status === "connected");

  async function runScan(awsAccountId: string) {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/scans", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ organizationId, awsAccountId }),
    });
    if (res.ok) await refresh();
    else {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? "Scan failed");
    }
    setBusy(false);
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Scans</h1>
          <p className="mt-1 text-sm text-ink/60">
            Run a scan to inventory waste across your connected AWS accounts.
          </p>
        </div>
      </div>

      {connected.length === 0 ? (
        <p className="rounded-lg border border-ink/10 bg-ink/[0.02] px-4 py-3 text-sm text-ink/60">
          No connected accounts.{" "}
          <a className="font-medium text-brand hover:underline" href="/settings/aws">
            Connect an AWS account
          </a>{" "}
          to run your first scan.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {connected.map((a) => (
            <button
              key={a.id}
              onClick={() => runScan(a.id)}
              disabled={busy}
              className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
            >
              {busy ? "Scanning…" : `Run scan · ${a.accountId ?? a.id.slice(0, 8)}`}
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/50">History</h2>
        {scans.length === 0 ? (
          <p className="text-sm text-ink/50">No scans yet.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-ink/50">
                <th className="py-2 font-medium">Started</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 text-right font-medium">Resources</th>
                <th className="py-2 text-right font-medium">Monthly cost</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((s) => (
                <tr key={s.id} className="border-b border-ink/5">
                  <td className="py-2">
                    {s.startedAt ? new Date(s.startedAt).toLocaleString() : "—"}
                  </td>
                  <td className="py-2">
                    <span
                      className={
                        s.status === "success"
                          ? "text-brand-dark"
                          : s.status === "error"
                            ? "text-red-600"
                            : "text-ink/50"
                      }
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="py-2 text-right">{count(s.stats)}</td>
                  <td className="py-2 text-right">{usd(s.stats?.totalMonthlyCost ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Resources server page**

Create `apps/web/app/(dashboard)/resources/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getActiveOrgId } from "@/lib/org";
import { ResourcesClient } from "./resources-client";

export default async function ResourcesPage() {
  const orgId = await getActiveOrgId();
  if (!orgId) redirect("/onboarding");
  return <ResourcesClient organizationId={orgId} />;
}
```

- [ ] **Step 5: Resources client component**

Create `apps/web/app/(dashboard)/resources/resources-client.tsx`:

```tsx
"use client";
import { useEffect, useMemo, useState } from "react";

interface Resource {
  id: string;
  resourceId: string;
  resourceType: string;
  region: string;
  estimatedMonthlyCost: number | null;
}

const TYPES = [
  "ec2_instance",
  "ebs_volume",
  "ebs_snapshot",
  "elastic_ip",
  "rds_instance",
  "load_balancer",
] as const;

const label = (t: string) => t.replace(/_/g, " ");
const usd = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export function ResourcesClient({ organizationId }: { organizationId: string }) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    void (async () => {
      const res = await fetch(`/api/resources?organizationId=${organizationId}`);
      if (res.ok) setResources((await res.json()).resources);
    })();
  }, [organizationId]);

  const totalCost = useMemo(
    () => resources.reduce((a, r) => a + (r.estimatedMonthlyCost ?? 0), 0),
    [resources],
  );
  const byType = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of resources) m[r.resourceType] = (m[r.resourceType] ?? 0) + 1;
    return m;
  }, [resources]);

  const shown = filter === "all" ? resources : resources.filter((r) => r.resourceType === filter);

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Resources</h1>
        <p className="mt-1 text-sm text-ink/60">
          Inventory from your most recent scan, with estimated monthly cost.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-ink/10 p-4">
          <div className="text-xs uppercase tracking-wide text-ink/50">Total resources</div>
          <div className="mt-1 text-2xl font-semibold">{resources.length}</div>
        </div>
        <div className="rounded-lg border border-ink/10 p-4">
          <div className="text-xs uppercase tracking-wide text-ink/50">Est. monthly cost</div>
          <div className="mt-1 text-2xl font-semibold">{usd(totalCost)}</div>
        </div>
        <div className="rounded-lg border border-ink/10 p-4">
          <div className="text-xs uppercase tracking-wide text-ink/50">Types</div>
          <div className="mt-1 text-2xl font-semibold">{Object.keys(byType).length}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-3 py-1 ${filter === "all" ? "bg-brand text-white" : "bg-ink/5 text-ink/70"}`}
        >
          All ({resources.length})
        </button>
        {TYPES.filter((t) => byType[t]).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`rounded-full px-3 py-1 ${filter === t ? "bg-brand text-white" : "bg-ink/5 text-ink/70"}`}
          >
            {label(t)} ({byType[t]})
          </button>
        ))}
      </div>

      {resources.length === 0 ? (
        <p className="rounded-lg border border-ink/10 bg-ink/[0.02] px-4 py-3 text-sm text-ink/60">
          No resources yet.{" "}
          <a className="font-medium text-brand hover:underline" href="/scans">
            Run a scan
          </a>{" "}
          to populate your inventory.
        </p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink/10 text-left text-ink/50">
              <th className="py-2 font-medium">Type</th>
              <th className="py-2 font-medium">Resource</th>
              <th className="py-2 font-medium">Region</th>
              <th className="py-2 text-right font-medium">Monthly cost</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-b border-ink/5">
                <td className="py-2 capitalize">{label(r.resourceType)}</td>
                <td className="py-2 font-mono text-xs">{r.resourceId}</td>
                <td className="py-2">{r.region}</td>
                <td className="py-2 text-right">{usd(r.estimatedMonthlyCost ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Typecheck + build**

Run: `pnpm --filter @cloudleak/web typecheck`
Expected: no type errors.

- [ ] **Step 7: Visual check (Playwright MCP)**

With the dev server running (`pnpm --filter @cloudleak/web dev`) and `CLOUDLEAK_FAKE_AWS=1` in `apps/web/.env.local`, sign in as the demo user, connect a fake account if needed, then navigate to `/scans`, click Run scan, and open `/resources`. Use `browser_navigate` + `browser_snapshot`/`browser_take_screenshot` to confirm the scan history populates and the resource table shows seeded resources with dollar figures.

- [ ] **Step 8: Commit**

```bash
git add "apps/web/app/(dashboard)"
git commit -m "feat(web): scans and resources dashboard pages"
```

---

## Task 9: Integration tests — repos + RLS isolation

**Files:**
- Create: `apps/web/test/integration/scan.test.ts`

These run only when Supabase env + a test user are present (`describe.skipIf`), matching `aws-connect.test.ts`. They use the service-role client to set up two orgs and assert RLS isolation through user-JWT clients.

- [ ] **Step 1: Write the integration test**

Create `apps/web/test/integration/scan.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  createServiceClient,
  createUserClient,
  OrganizationRepository,
  MembershipRepository,
  AwsAccountRepository,
  ResourceRepository,
  ScanRepository,
} from "@cloudleak/db";

const hasEnv = !!(
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.TEST_USER_ID &&
  process.env.TEST_USER_JWT
);

describe.skipIf(!hasEnv)("Phase 2 inventory (integration)", () => {
  const userId = process.env.TEST_USER_ID!;
  const token = process.env.TEST_USER_JWT!;
  let myOrgId: string;
  let otherOrgId: string;
  let myAccountId: string;
  let otherAccountId: string;

  beforeAll(async () => {
    const svc = createServiceClient();
    const myOrg = await new OrganizationRepository(svc).create("itest-inv-mine");
    await new MembershipRepository(svc).create(myOrg.id, userId, "owner");
    myOrgId = myOrg.id;
    const myAcct = await new AwsAccountRepository(svc).createPending(myOrgId, "clk_itest_mine");
    myAccountId = myAcct.id;

    // A second org the test user is NOT a member of.
    const otherOrg = await new OrganizationRepository(svc).create("itest-inv-other");
    otherOrgId = otherOrg.id;
    const otherAcct = await new AwsAccountRepository(svc).createPending(otherOrgId, "clk_itest_other");
    otherAccountId = otherAcct.id;
    // Seed a resource into the other org via service role (bypasses RLS).
    await svc.from("resources").insert({
      organization_id: otherOrgId,
      aws_account_id: otherAccountId,
      resource_id: "i-secret",
      resource_type: "ec2_instance",
      region: "us-east-1",
      metadata: {},
      estimated_monthly_cost: 100,
    });
  });

  afterAll(async () => {
    const svc = createServiceClient();
    if (myOrgId) await svc.from("organizations").delete().eq("id", myOrgId);
    if (otherOrgId) await svc.from("organizations").delete().eq("id", otherOrgId);
  });

  it("bulk-inserts and lists resources for my org under my JWT", async () => {
    const repo = new ResourceRepository(createUserClient(token));
    await repo.bulkInsert([
      {
        organizationId: myOrgId,
        awsAccountId: myAccountId,
        resourceId: "vol-1",
        resourceType: "ebs_volume",
        region: "us-east-1",
        metadata: { sizeGb: 100, volumeType: "gp3" },
        estimatedMonthlyCost: 8,
      },
    ]);
    const rows = await repo.listByOrg(myOrgId);
    expect(rows.map((r) => r.resourceId)).toContain("vol-1");
  });

  it("records a scan lifecycle under my JWT", async () => {
    const repo = new ScanRepository(createUserClient(token));
    const scan = await repo.create(myOrgId, myAccountId);
    expect(scan.status).toBe("running");
    const done = await repo.update(scan.id, {
      status: "success",
      finishedAt: new Date().toISOString(),
      stats: { resourceCounts: { ebs_volume: 1 }, totalMonthlyCost: 8, errors: [] },
    });
    expect(done.status).toBe("success");
    expect(done.stats.totalMonthlyCost).toBe(8);
  });

  it("does NOT expose another org's resources via RLS", async () => {
    const repo = new ResourceRepository(createUserClient(token));
    const rows = await repo.listByOrg(otherOrgId);
    expect(rows).toHaveLength(0); // RLS hides org B's rows even when its id is supplied
  });

  it("deleteByAwsAccount removes only the target account's resources", async () => {
    const repo = new ResourceRepository(createUserClient(token));
    await repo.deleteByAwsAccount(myOrgId, myAccountId);
    const rows = await repo.listByOrg(myOrgId, { awsAccountId: myAccountId });
    expect(rows).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test (skips without env)**

Run: `pnpm --filter @cloudleak/web test`
Expected: PASS or SKIPPED (skipped when Supabase test env vars are absent). If `TEST_USER_ID`/`TEST_USER_JWT`/`SUPABASE_SERVICE_ROLE_KEY` are set, all four cases pass — most importantly the RLS isolation case.

- [ ] **Step 3: Commit**

```bash
git add apps/web/test/integration/scan.test.ts
git commit -m "test(web): inventory repo + RLS isolation integration tests"
```

---

## Task 10: Env + docs, full verification, finish

**Files:**
- Modify: `.env.example`
- Modify: `apps/web/README.md`

- [ ] **Step 1: Document new env vars**

Add to `.env.example` (below the existing AWS vars):

```
# Phase 2 — inventory scanning
CLOUDLEAK_FAKE_AWS=1                 # use the Fake inventory client (no AWS account needed)
CLOUDLEAK_SCAN_REGIONS=us-east-1     # comma-separated regions to scan
```

- [ ] **Step 2: Document the local Fake scan in the web README**

Add a section to `apps/web/README.md` after the "Quick local login" section:

```markdown
## Run a scan locally (no AWS account)

Set `CLOUDLEAK_FAKE_AWS=1` in `apps/web/.env.local`. With this flag the scan flow uses a
seeded fake inventory client instead of calling AWS, so you can exercise the full
Scans → Resources experience without a connected account. Connect a (fake) account on
`/settings/aws`, then open `/scans` and click **Run scan**; `/resources` will populate with
seeded resources and estimated monthly cost.
```

- [ ] **Step 3: Full monorepo verification**

Run: `pnpm -r typecheck && pnpm -r test`
Expected: all packages typecheck; all unit tests pass; integration tests pass or skip.

- [ ] **Step 4: Commit**

```bash
git add .env.example apps/web/README.md
git commit -m "docs: document Phase 2 scan env vars and local fake scan"
```

- [ ] **Step 5: Finish the development branch**

Use the **superpowers:finishing-a-development-branch** skill: verify the test suite is green, then present merge/PR/keep/discard options for the `phase-2-inventory` branch.

---

## Self-Review (completed during planning)

**Spec coverage:**
- Fakeable AWS client (Real + Fake, `CLOUDLEAK_FAKE_AWS`) → Task 2. ✓
- Six collectors → Task 3. ✓
- Static pricing → Task 1. ✓
- ScanRunner records scan + persists resources, replace strategy, partial-error handling → Task 3 (+ repos Task 5). ✓
- Inline `POST /api/scans`, `GET /api/scans`, `GET /api/resources` → Task 7. ✓
- RLS write policies for resources/scans → Task 4. ✓
- Repositories org-scoped → Task 5. ✓
- Services with authz + connected-account check + Real/Fake selection + regions → Task 6. ✓
- Dashboard scans + resources pages, nav → Task 8. ✓
- Unit tests (pricing, collectors, runner incl. error paths) → Tasks 1/3. ✓
- Integration incl. RLS isolation → Task 9. ✓
- Env + docs → Task 10. ✓

**Type consistency:** `ResourceType`, `NormalizedResource`, `NewResourceRow`, `Scan`, `ScanStats`, `ScanStatus` defined once in Task 1 and used identically in Tasks 2/3/5/6. `AwsInventoryClient` + `Raw*` defined in Task 2, consumed in Task 3. Repo method names (`bulkInsert`, `deleteByAwsAccount`, `listByOrg`, `create`, `update`, `getById`) match the `ScanResourceRepo`/`ScanRecordRepo` structural interfaces in Task 3. `runScan` signature matches the call in Task 6.

**Placeholder scan:** No TBD/TODO; every code step contains full code.

**Scope:** Single subsystem (inventory). Worker/findings/Terraform deferred to later phases per the spec.
```
