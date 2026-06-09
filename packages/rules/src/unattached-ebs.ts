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
