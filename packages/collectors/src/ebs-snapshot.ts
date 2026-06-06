import { estimateMonthlyCost } from "@cloudleak/core";
import type { Collector } from "./collector.js";

export const ebsSnapshotCollector: Collector = {
  type: "ebs_snapshot",
  async collect(client, region) {
    const rows = await client.listEbsSnapshots(region);
    return rows.map((r) => {
      const metadata = { sizeGb: r.sizeGb, startTime: r.startTime, tags: r.tags };
      return {
        resourceType: "ebs_snapshot" as const,
        resourceId: r.snapshotId,
        region,
        metadata,
        estimatedMonthlyCost: estimateMonthlyCost("ebs_snapshot", metadata),
      };
    });
  },
};
