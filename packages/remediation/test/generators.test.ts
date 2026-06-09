import { describe, expect, it } from "vitest";
import { generateRemediation } from "../src/generators.js";
import type { Resource } from "@cloudleak/core";

function makeResource(overrides: Partial<Resource> = {}): Resource {
  return {
    id: "uuid-1",
    organizationId: "org-1",
    awsAccountId: "acct-1",
    resourceId: "i-abc123",
    resourceType: "ec2_instance",
    region: "us-east-1",
    metadata: {},
    estimatedMonthlyCost: 10,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("generateRemediation", () => {
  it("stopped_ec2 — terraform contains instance ID and region", () => {
    const res = makeResource({ resourceId: "i-abc123", region: "us-east-1" });
    const out = generateRemediation("stopped_ec2", res);
    expect(out.terraform).toContain("i-abc123");
    expect(out.terraform).toContain("us-east-1");
    expect(out.terraform).toContain("aws_instance");
    expect(out.manual).toContain("i-abc123");
  });

  it("unattached_ebs — terraform contains volume ID", () => {
    const res = makeResource({ resourceId: "vol-xyz999", resourceType: "ebs_volume", region: "eu-west-1" });
    const out = generateRemediation("unattached_ebs", res);
    expect(out.terraform).toContain("vol-xyz999");
    expect(out.terraform).toContain("aws_ebs_volume");
    expect(out.manual).toContain("vol-xyz999");
  });

  it("old_snapshot — terraform contains snapshot ID", () => {
    const res = makeResource({ resourceId: "snap-111aaa", resourceType: "ebs_snapshot", region: "us-west-2" });
    const out = generateRemediation("old_snapshot", res);
    expect(out.terraform).toContain("snap-111aaa");
    expect(out.terraform).toContain("aws_ebs_snapshot");
    expect(out.manual).toContain("snap-111aaa");
  });

  it("unattached_eip — terraform contains allocation ID", () => {
    const res = makeResource({ resourceId: "eipalloc-abc", resourceType: "elastic_ip", region: "ap-southeast-1" });
    const out = generateRemediation("unattached_eip", res);
    expect(out.terraform).toContain("eipalloc-abc");
    expect(out.terraform).toContain("aws_eip");
    expect(out.manual).toContain("eipalloc-abc");
  });

  it("stopped_rds — terraform contains DB identifier", () => {
    const res = makeResource({ resourceId: "my-prod-db", resourceType: "rds_instance", region: "us-east-2" });
    const out = generateRemediation("stopped_rds", res);
    expect(out.terraform).toContain("my-prod-db");
    expect(out.terraform).toContain("aws_db_instance");
    expect(out.manual).toContain("my-prod-db");
  });

  it("all generators return non-empty terraform and manual strings", () => {
    const types = ["stopped_ec2", "unattached_ebs", "old_snapshot", "unattached_eip", "stopped_rds"] as const;
    for (const t of types) {
      const out = generateRemediation(t, makeResource());
      expect(out.terraform.length).toBeGreaterThan(50);
      expect(out.manual.length).toBeGreaterThan(10);
    }
  });

  it("resource IDs with hyphens produce valid Terraform identifiers", () => {
    const res = makeResource({ resourceId: "i-0a1b2c3d4e" });
    const out = generateRemediation("stopped_ec2", res);
    // Terraform resource name must not contain hyphens
    const nameMatch = out.terraform.match(/resource "aws_instance" "([^"]+)"/);
    expect(nameMatch).not.toBeNull();
    expect(nameMatch![1]).not.toContain("-");
  });
});
