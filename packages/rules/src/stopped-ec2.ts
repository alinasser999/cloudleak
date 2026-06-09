import type { Rule } from "./rule.js";

export const stoppedEc2Rule: Rule = {
  check(resource) {
    if (resource.resourceType !== "ec2_instance") return null;
    if ((resource.metadata.state as string | undefined) !== "stopped") return null;
    return {
      organizationId: resource.organizationId,
      awsAccountId: resource.awsAccountId,
      resourceId: resource.id,
      findingType: "stopped_ec2",
      severity: "high",
      estimatedMonthlySavings: resource.estimatedMonthlyCost ?? 0,
      title: `Stopped EC2: ${resource.resourceId}`,
      description:
        "This EC2 instance is stopped but still incurring EBS storage charges. Terminate it if no longer needed.",
      status: "open",
    };
  },
};
