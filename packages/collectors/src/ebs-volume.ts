import { estimateMonthlyCost } from "@cloudleak/core";
import type { Collector } from "./collector.js";

export const ebsVolumeCollector: Collector = {
  type: "ebs_volume",
  async collect(client, region) {
    const rows = await client.listEbsVolumes(region);
    return rows.map((r) => {
      const metadata = { volumeType: r.volumeType, sizeGb: r.sizeGb, state: r.state, attachments: r.attachments, createTime: r.createTime, tags: r.tags };
      return {
        resourceType: "ebs_volume" as const,
        resourceId: r.volumeId,
        region,
        metadata,
        estimatedMonthlyCost: estimateMonthlyCost("ebs_volume", metadata),
      };
    });
  },
};
