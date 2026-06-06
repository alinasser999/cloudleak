import { estimateMonthlyCost } from "@cloudleak/core";
import type { Collector } from "./collector.js";

export const rdsInstanceCollector: Collector = {
  type: "rds_instance",
  async collect(client, region) {
    const rows = await client.listRdsInstances(region);
    return rows.map((r) => {
      const metadata = { instanceClass: r.instanceClass, engine: r.engine, status: r.status, allocatedStorageGb: r.allocatedStorageGb };
      return {
        resourceType: "rds_instance" as const,
        resourceId: r.dbInstanceIdentifier,
        region,
        metadata,
        estimatedMonthlyCost: estimateMonthlyCost("rds_instance", metadata),
      };
    });
  },
};
