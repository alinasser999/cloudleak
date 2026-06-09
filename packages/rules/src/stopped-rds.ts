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
