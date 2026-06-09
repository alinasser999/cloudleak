import { estimateMonthlyCost } from "@cloudleak/core";
import type { Collector } from "./collector.js";

export const elasticIpCollector: Collector = {
  type: "elastic_ip",
  async collect(client, region) {
    const rows = await client.listElasticIps(region);
    return rows
      .filter((r) => r.associationId === null)
      .map((r) => {
        const metadata = { publicIp: r.publicIp, attached: false, tags: r.tags };
        return {
          resourceType: "elastic_ip" as const,
          resourceId: r.allocationId,
          region,
          metadata,
          estimatedMonthlyCost: estimateMonthlyCost("elastic_ip", metadata),
        };
      });
  },
};
