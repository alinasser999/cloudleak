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
    async update(_id: string, patch: { status: ScanStatus; finishedAt: string; stats: ScanStats }) {
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
