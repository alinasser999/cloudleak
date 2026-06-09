import type { NewFindingRow, Resource } from "@cloudleak/core";
import { generateRemediation } from "@cloudleak/remediation";
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
        if (finding) {
          const rem = generateRemediation(finding.findingType, resource);
          findings.push({ ...finding, terraformFix: rem.terraform, manualFix: rem.manual });
        }
      } catch (e) {
        console.error(`Rule check failed on resource ${resource.id}:`, e);
      }
    }
  }

  await findingRepo.deleteOpenByAwsAccount(awsAccount.organizationId, awsAccount.id);
  await findingRepo.bulkInsert(findings);

  return { count: findings.length };
}
