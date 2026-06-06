import {
  EC2Client,
  DescribeInstancesCommand,
  DescribeVolumesCommand,
  DescribeSnapshotsCommand,
  DescribeAddressesCommand,
} from "@aws-sdk/client-ec2";
import { RDSClient, DescribeDBInstancesCommand } from "@aws-sdk/client-rds";
import {
  ElasticLoadBalancingV2Client,
  DescribeLoadBalancersCommand as DescribeV2LbCommand,
} from "@aws-sdk/client-elastic-load-balancing-v2";
import {
  ElasticLoadBalancingClient,
  DescribeLoadBalancersCommand as DescribeClassicLbCommand,
} from "@aws-sdk/client-elastic-load-balancing";
import type { AwsCredentials } from "./aws-client-factory.js";

export interface RawEc2Instance {
  instanceId: string;
  instanceType: string;
  state: string;
  launchTime?: string;
  tags: Record<string, string>;
}
export interface RawEbsVolume {
  volumeId: string;
  volumeType: string;
  sizeGb: number;
  state: string;
  attachments: number;
  createTime?: string;
  tags: Record<string, string>;
}
export interface RawEbsSnapshot {
  snapshotId: string;
  sizeGb: number;
  startTime?: string;
  tags: Record<string, string>;
}
export interface RawElasticIp {
  allocationId: string;
  publicIp: string;
  associationId: string | null;
  tags: Record<string, string>;
}
export interface RawRdsInstance {
  dbInstanceIdentifier: string;
  instanceClass: string;
  engine: string;
  status: string;
  allocatedStorageGb: number;
}
export type LbType = "application" | "network" | "gateway" | "classic";
export interface RawLoadBalancer {
  resourceId: string;
  lbType: LbType;
  createdTime?: string;
}

export interface AwsInventoryClient {
  listEc2Instances(region: string): Promise<RawEc2Instance[]>;
  listEbsVolumes(region: string): Promise<RawEbsVolume[]>;
  listEbsSnapshots(region: string): Promise<RawEbsSnapshot[]>;
  listElasticIps(region: string): Promise<RawElasticIp[]>;
  listRdsInstances(region: string): Promise<RawRdsInstance[]>;
  listLoadBalancers(region: string): Promise<RawLoadBalancer[]>;
}

export interface InventoryFixture {
  ec2Instances?: RawEc2Instance[];
  ebsVolumes?: RawEbsVolume[];
  ebsSnapshots?: RawEbsSnapshot[];
  elasticIps?: RawElasticIp[];
  rdsInstances?: RawRdsInstance[];
  loadBalancers?: RawLoadBalancer[];
}

const DEMO_FIXTURE: InventoryFixture = {
  ec2Instances: [
    { instanceId: "i-0a1b2c3d4e", instanceType: "m5.xlarge", state: "running", tags: { Name: "api-prod" } },
    { instanceId: "i-1122334455", instanceType: "t3.large", state: "stopped", tags: { Name: "legacy-worker" } },
  ],
  ebsVolumes: [
    { volumeId: "vol-0aa11bb22", volumeType: "gp3", sizeGb: 500, state: "available", attachments: 0, tags: {} },
    { volumeId: "vol-0cc33dd44", volumeType: "gp2", sizeGb: 100, state: "in-use", attachments: 1, tags: {} },
  ],
  ebsSnapshots: [
    { snapshotId: "snap-09f8e7d6", sizeGb: 800, startTime: "2024-01-04T00:00:00Z", tags: {} },
  ],
  elasticIps: [
    { allocationId: "eipalloc-0a1", publicIp: "52.10.0.1", associationId: null, tags: {} },
    { allocationId: "eipalloc-0b2", publicIp: "52.10.0.2", associationId: "eipassoc-1", tags: {} },
  ],
  rdsInstances: [
    { dbInstanceIdentifier: "analytics-db", instanceClass: "db.m5.xlarge", engine: "postgres", status: "available", allocatedStorageGb: 200 },
  ],
  loadBalancers: [
    { resourceId: "app/legacy-alb/50dc6c495c0c9188", lbType: "application", createdTime: "2023-06-01T00:00:00Z" },
  ],
};

/** Deterministic fake — no AWS account needed. Ignores region (returns the same fixture). */
export class FakeAwsInventoryClient implements AwsInventoryClient {
  constructor(private readonly fixture: InventoryFixture = {}) {}
  static demo(): FakeAwsInventoryClient {
    return new FakeAwsInventoryClient(DEMO_FIXTURE);
  }
  async listEc2Instances(_region: string): Promise<RawEc2Instance[]> {
    return this.fixture.ec2Instances ?? [];
  }
  async listEbsVolumes(_region: string): Promise<RawEbsVolume[]> {
    return this.fixture.ebsVolumes ?? [];
  }
  async listEbsSnapshots(_region: string): Promise<RawEbsSnapshot[]> {
    return this.fixture.ebsSnapshots ?? [];
  }
  async listElasticIps(_region: string): Promise<RawElasticIp[]> {
    return this.fixture.elasticIps ?? [];
  }
  async listRdsInstances(_region: string): Promise<RawRdsInstance[]> {
    return this.fixture.rdsInstances ?? [];
  }
  async listLoadBalancers(_region: string): Promise<RawLoadBalancer[]> {
    return this.fixture.loadBalancers ?? [];
  }
}

function tagMap(tags?: { Key?: string; Value?: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of tags ?? []) if (t.Key) out[t.Key] = t.Value ?? "";
  return out;
}

/** Real implementation using AWS SDK v3 with scoped credentials. Region-scoped per call. */
export class RealAwsInventoryClient implements AwsInventoryClient {
  constructor(private readonly creds: AwsCredentials) {}

  private aws() {
    return {
      accessKeyId: this.creds.accessKeyId,
      secretAccessKey: this.creds.secretAccessKey,
      sessionToken: this.creds.sessionToken,
    };
  }

  async listEc2Instances(region: string): Promise<RawEc2Instance[]> {
    const ec2 = new EC2Client({ region, credentials: this.aws() });
    const out: RawEc2Instance[] = [];
    let token: string | undefined;
    do {
      const res = await ec2.send(new DescribeInstancesCommand({ NextToken: token }));
      for (const r of res.Reservations ?? [])
        for (const i of r.Instances ?? [])
          out.push({
            instanceId: i.InstanceId ?? "",
            instanceType: String(i.InstanceType ?? ""),
            state: i.State?.Name ?? "",
            launchTime: i.LaunchTime?.toISOString(),
            tags: tagMap(i.Tags),
          });
      token = res.NextToken;
    } while (token);
    return out;
  }

  async listEbsVolumes(region: string): Promise<RawEbsVolume[]> {
    const ec2 = new EC2Client({ region, credentials: this.aws() });
    const out: RawEbsVolume[] = [];
    let token: string | undefined;
    do {
      const res = await ec2.send(new DescribeVolumesCommand({ NextToken: token }));
      for (const v of res.Volumes ?? [])
        out.push({
          volumeId: v.VolumeId ?? "",
          volumeType: String(v.VolumeType ?? ""),
          sizeGb: v.Size ?? 0,
          state: v.State ?? "",
          attachments: v.Attachments?.length ?? 0,
          createTime: v.CreateTime?.toISOString(),
          tags: tagMap(v.Tags),
        });
      token = res.NextToken;
    } while (token);
    return out;
  }

  async listEbsSnapshots(region: string): Promise<RawEbsSnapshot[]> {
    const ec2 = new EC2Client({ region, credentials: this.aws() });
    const out: RawEbsSnapshot[] = [];
    let token: string | undefined;
    do {
      const res = await ec2.send(
        new DescribeSnapshotsCommand({ OwnerIds: ["self"], NextToken: token }),
      );
      for (const s of res.Snapshots ?? [])
        out.push({
          snapshotId: s.SnapshotId ?? "",
          sizeGb: s.VolumeSize ?? 0,
          startTime: s.StartTime?.toISOString(),
          tags: tagMap(s.Tags),
        });
      token = res.NextToken;
    } while (token);
    return out;
  }

  async listElasticIps(region: string): Promise<RawElasticIp[]> {
    const ec2 = new EC2Client({ region, credentials: this.aws() });
    const res = await ec2.send(new DescribeAddressesCommand({}));
    return (res.Addresses ?? []).map((a) => ({
      allocationId: a.AllocationId ?? a.PublicIp ?? "",
      publicIp: a.PublicIp ?? "",
      associationId: a.AssociationId ?? null,
      tags: tagMap(a.Tags),
    }));
  }

  async listRdsInstances(region: string): Promise<RawRdsInstance[]> {
    const rds = new RDSClient({ region, credentials: this.aws() });
    const out: RawRdsInstance[] = [];
    let marker: string | undefined;
    do {
      const res = await rds.send(new DescribeDBInstancesCommand({ Marker: marker }));
      for (const d of res.DBInstances ?? [])
        out.push({
          dbInstanceIdentifier: d.DBInstanceIdentifier ?? "",
          instanceClass: d.DBInstanceClass ?? "",
          engine: d.Engine ?? "",
          status: d.DBInstanceStatus ?? "",
          allocatedStorageGb: d.AllocatedStorage ?? 0,
        });
      marker = res.Marker;
    } while (marker);
    return out;
  }

  async listLoadBalancers(region: string): Promise<RawLoadBalancer[]> {
    const v2 = new ElasticLoadBalancingV2Client({ region, credentials: this.aws() });
    const out: RawLoadBalancer[] = [];
    let marker: string | undefined;
    do {
      const res = await v2.send(new DescribeV2LbCommand({ Marker: marker }));
      for (const lb of res.LoadBalancers ?? [])
        out.push({
          resourceId: lb.LoadBalancerArn ?? lb.LoadBalancerName ?? "",
          lbType: (lb.Type as LbType) ?? "application",
          createdTime: lb.CreatedTime?.toISOString(),
        });
      marker = res.NextMarker;
    } while (marker);

    const classic = new ElasticLoadBalancingClient({ region, credentials: this.aws() });
    let cmarker: string | undefined;
    do {
      const res = await classic.send(new DescribeClassicLbCommand({ Marker: cmarker }));
      for (const lb of res.LoadBalancerDescriptions ?? [])
        out.push({
          resourceId: lb.LoadBalancerName ?? "",
          lbType: "classic",
          createdTime: lb.CreatedTime?.toISOString(),
        });
      cmarker = res.NextMarker;
    } while (cmarker);
    return out;
  }
}
