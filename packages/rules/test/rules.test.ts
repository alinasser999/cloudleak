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
