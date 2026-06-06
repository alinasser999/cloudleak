import { estimateMonthlyCost } from "@cloudleak/core";
import type { Collector } from "./collector.js";

export const loadBalancerCollector: Collector = {
  type: "load_balancer",
  async collect(client, region) {
    const rows = await client.listLoadBalancers(region);
    return rows.map((r) => {
      const metadata = { lbType: r.lbType, createdTime: r.createdTime };
      return {
        resourceType: "load_balancer" as const,
        resourceId: r.resourceId,
        region,
        metadata,
        estimatedMonthlyCost: estimateMonthlyCost("load_balancer", metadata),
      };
    });
  },
};
