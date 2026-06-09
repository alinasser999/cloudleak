import type { AwsInventoryClient } from "@cloudleak/aws";
import type { NewResourceRow, ResourceType, Scan, ScanStats, ScanStatus } from "@cloudleak/core";
import type { Collector } from "./collector.js";
import { ec2InstanceCollector } from "./ec2-instance.js";
import { ebsVolumeCollector } from "./ebs-volume.js";
import { ebsSnapshotCollector } from "./ebs-snapshot.js";
import { elasticIpCollector } from "./elastic-ip.js";
import { rdsInstanceCollector } from "./rds-instance.js";
import { loadBalancerCollector } from "./load-balancer.js";

export const ALL_COLLECTORS: Collector[] = [
  ec2InstanceCollector,
  ebsVolumeCollector,
  ebsSnapshotCollector,
  elasticIpCollector,
  rdsInstanceCollector,
  loadBalancerCollector,
];

/** Repository shape the runner needs to persist resources (structurally satisfied by ResourceRepository). */
export interface ScanResourceRepo {
  deleteByAwsAccount(organizationId: string, awsAccountId: string): Promise<void>;
  bulkInsert(rows: NewResourceRow[]): Promise<void>;
}

/** Repository shape the runner needs to record the scan (structurally satisfied by ScanRepository). */
export interface ScanRecordRepo {
  create(organizationId: string, awsAccountId: string): Promise<Scan>;
  update(
    id: string,
    patch: { status: ScanStatus; finishedAt: string; stats: ScanStats },
  ): Promise<Scan>;
}

export interface RunScanInput {
  awsAccount: { id: string; organizationId: string };
  regions: string[];
  client: AwsInventoryClient;
  resourceRepo: ScanResourceRepo;
  scanRepo: ScanRecordRepo;
  collectors?: Collector[];
}

/**
 * Runs all collectors across all regions, replaces the account's resource inventory,
 * and records the scan. Per-collector failures are non-fatal (captured in stats.errors);
 * the scan is `error` only if every collector throws.
 */
export async function runScan(input: RunScanInput): Promise<Scan> {
  const { awsAccount, regions, client, resourceRepo, scanRepo } = input;
  const collectors = input.collectors ?? ALL_COLLECTORS;

  const scan = await scanRepo.create(awsAccount.organizationId, awsAccount.id);

  const rows: NewResourceRow[] = [];
  const resourceCounts: Partial<Record<ResourceType, number>> = {};
  const errors: string[] = [];
  let totalMonthlyCost = 0;
  let ranAnyCleanly = false;

  for (const region of regions) {
    for (const c of collectors) {
      try {
        const found = await c.collect(client, region);
        ranAnyCleanly = true;
        for (const r of found) {
          rows.push({
            organizationId: awsAccount.organizationId,
            awsAccountId: awsAccount.id,
            resourceId: r.resourceId,
            resourceType: r.resourceType,
            region: r.region,
            metadata: r.metadata,
            estimatedMonthlyCost: r.estimatedMonthlyCost,
          });
          resourceCounts[r.resourceType] = (resourceCounts[r.resourceType] ?? 0) + 1;
          totalMonthlyCost += r.estimatedMonthlyCost;
        }
      } catch (e) {
        errors.push(`${c.type}@${region}: ${(e as Error).message}`);
      }
    }
  }

  await resourceRepo.deleteByAwsAccount(awsAccount.organizationId, awsAccount.id);
  await resourceRepo.bulkInsert(rows);

  const status: ScanStatus = ranAnyCleanly ? "success" : "error";
  return scanRepo.update(scan.id, {
    status,
    finishedAt: new Date().toISOString(),
    stats: { resourceCounts, totalMonthlyCost: Math.round(totalMonthlyCost * 100) / 100, errors },
  });
}
