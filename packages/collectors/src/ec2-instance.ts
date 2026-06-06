import { estimateMonthlyCost } from "@cloudleak/core";
import type { Collector } from "./collector.js";

export const ec2InstanceCollector: Collector = {
  type: "ec2_instance",
  async collect(client, region) {
    const rows = await client.listEc2Instances(region);
    return rows.map((r) => {
      const metadata = { instanceType: r.instanceType, state: r.state, launchTime: r.launchTime, tags: r.tags };
      return {
        resourceType: "ec2_instance" as const,
        resourceId: r.instanceId,
        region,
        metadata,
        estimatedMonthlyCost: estimateMonthlyCost("ec2_instance", metadata),
      };
    });
  },
};
