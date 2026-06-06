import type { ResourceType } from "./types.js";

// Rough us-east-1 on-demand monthly prices. Deliberately approximate; refined in Phase 3.
const HOURS_PER_MONTH = 730;

const EC2_HOURLY: Record<string, number> = {
  "t3.micro": 0.0104,
  "t3.small": 0.0208,
  "t3.medium": 0.0416,
  "t3.large": 0.0832,
  "m5.large": 0.096,
  "m5.xlarge": 0.192,
  "c5.large": 0.085,
  "c5.xlarge": 0.17,
  "r5.large": 0.126,
};

const RDS_HOURLY: Record<string, number> = {
  "db.t3.micro": 0.017,
  "db.t3.small": 0.034,
  "db.t3.medium": 0.068,
  "db.m5.large": 0.171,
  "db.m5.xlarge": 0.342,
  "db.r5.large": 0.24,
};

const EBS_GB_MONTH: Record<string, number> = {
  gp3: 0.08,
  gp2: 0.1,
  io1: 0.125,
  io2: 0.125,
  st1: 0.045,
  sc1: 0.015,
  standard: 0.05,
};

const SNAPSHOT_GB_MONTH = 0.05;
const EIP_UNATTACHED_MONTH = 3.6; // ~$0.005/hr
const LB_MONTH: Record<string, number> = {
  application: 16.43,
  network: 16.43,
  gateway: 16.43,
  classic: 18.25,
};

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Rough estimated monthly USD cost for a resource, from its collected metadata. */
export function estimateMonthlyCost(
  type: ResourceType,
  metadata: Record<string, unknown>,
): number {
  switch (type) {
    case "ec2_instance": {
      if (str(metadata.state) !== "running") return 0;
      const rate = EC2_HOURLY[str(metadata.instanceType)] ?? 0;
      return round(rate * HOURS_PER_MONTH);
    }
    case "rds_instance": {
      const rate = RDS_HOURLY[str(metadata.instanceClass)] ?? 0;
      return round(rate * HOURS_PER_MONTH);
    }
    case "ebs_volume": {
      const rate = EBS_GB_MONTH[str(metadata.volumeType)] ?? 0.1;
      return round(rate * num(metadata.sizeGb));
    }
    case "ebs_snapshot":
      return round(SNAPSHOT_GB_MONTH * num(metadata.sizeGb));
    case "elastic_ip":
      return EIP_UNATTACHED_MONTH;
    case "load_balancer":
      return LB_MONTH[str(metadata.lbType)] ?? 16.43;
    default:
      return 0;
  }
}
