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
