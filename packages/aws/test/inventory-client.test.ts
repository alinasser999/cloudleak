import { describe, it, expect } from "vitest";
import { FakeAwsInventoryClient } from "../src/inventory-client.js";

describe("FakeAwsInventoryClient.demo", () => {
  const c = FakeAwsInventoryClient.demo();
  it("returns seeded ec2 instances", async () => {
    expect((await c.listEc2Instances("us-east-1")).length).toBeGreaterThan(0);
  });
  it("includes an unattached elastic ip", async () => {
    const ips = await c.listElasticIps("us-east-1");
    expect(ips.some((i) => i.associationId === null)).toBe(true);
  });
  it("returns an empty array for an unset fixture section", async () => {
    expect(await new FakeAwsInventoryClient().listRdsInstances("us-east-1")).toEqual([]);
  });
});
