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
