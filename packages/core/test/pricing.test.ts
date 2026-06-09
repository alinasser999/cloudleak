import { describe, it, expect } from "vitest";
import { estimateMonthlyCost } from "../src/pricing.js";

describe("estimateMonthlyCost", () => {
  it("prices a running t3.medium by the hour", () => {
    expect(
      estimateMonthlyCost("ec2_instance", { instanceType: "t3.medium", state: "running" }),
    ).toBeCloseTo(30.37, 1);
  });
  it("charges nothing for a stopped instance", () => {
    expect(
      estimateMonthlyCost("ec2_instance", { instanceType: "t3.medium", state: "stopped" }),
    ).toBe(0);
  });
  it("prices a gp3 EBS volume per GB-month", () => {
    expect(estimateMonthlyCost("ebs_volume", { volumeType: "gp3", sizeGb: 100 })).toBeCloseTo(8, 5);
  });
  it("prices a snapshot per GB-month", () => {
    expect(estimateMonthlyCost("ebs_snapshot", { sizeGb: 200 })).toBeCloseTo(10, 5);
  });
  it("charges a flat rate for an unattached elastic ip", () => {
    expect(estimateMonthlyCost("elastic_ip", {})).toBeCloseTo(3.6, 5);
  });
  it("prices a load balancer by type", () => {
    expect(estimateMonthlyCost("load_balancer", { lbType: "application" })).toBeGreaterThan(0);
  });
  it("returns 0 for an unknown ec2 instance type", () => {
    expect(
      estimateMonthlyCost("ec2_instance", { instanceType: "zz.unknown", state: "running" }),
    ).toBe(0);
  });
});
