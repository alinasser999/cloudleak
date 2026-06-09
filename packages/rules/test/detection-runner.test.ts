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

  it("uses ALL_RULES when no rules override provided (r1 has no matching metadata)", async () => {
    const { resourceRepo, findingRepo, resources } = fakeRepos();
    resources.push(fakeResource("r1", "ec2_instance"));
    const result = await runDetection({
      awsAccount: { id: "acct-1", organizationId: "org-1" },
      resourceRepo,
      findingRepo,
    });
    expect(result.count).toBe(0);
  });
});
