import { describe, it, expect } from "vitest";
import { FakeAwsInventoryClient } from "@cloudleak/aws";
import { ec2InstanceCollector } from "../src/ec2-instance.js";
import { elasticIpCollector } from "../src/elastic-ip.js";

describe("ec2InstanceCollector", () => {
  it("normalizes an instance with a cost", async () => {
    const client = new FakeAwsInventoryClient({
      ec2Instances: [{ instanceId: "i-1", instanceType: "t3.medium", state: "running", tags: {} }],
    });
    const out = await ec2InstanceCollector.collect(client, "us-east-1");
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ resourceType: "ec2_instance", resourceId: "i-1", region: "us-east-1" });
    expect(out[0]!.estimatedMonthlyCost).toBeGreaterThan(0);
  });
});

describe("elasticIpCollector", () => {
  it("keeps only unattached elastic ips", async () => {
    const client = new FakeAwsInventoryClient({
      elasticIps: [
        { allocationId: "e-free", publicIp: "1.1.1.1", associationId: null, tags: {} },
        { allocationId: "e-used", publicIp: "2.2.2.2", associationId: "assoc-1", tags: {} },
      ],
    });
    const out = await elasticIpCollector.collect(client, "us-east-1");
    expect(out.map((r) => r.resourceId)).toEqual(["e-free"]);
  });
});
