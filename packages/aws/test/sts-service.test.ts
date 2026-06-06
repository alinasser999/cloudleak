import { describe, it, expect } from "vitest";
import { FakeStsService } from "../src/sts-service.js";
import { AwsValidationError } from "@cloudleak/core";

describe("FakeStsService", () => {
  it("returns the configured account id on success", async () => {
    const sts = new FakeStsService({ mode: "success", accountId: "123456789012" });
    await expect(
      sts.assumeRole("arn:aws:iam::123456789012:role/X", "clk_x"),
    ).resolves.toEqual({ accountId: "123456789012" });
  });
  it("throws AwsValidationError on failure", async () => {
    const sts = new FakeStsService({ mode: "fail" });
    await expect(
      sts.assumeRole("arn:aws:iam::1:role/X", "clk_x"),
    ).rejects.toBeInstanceOf(AwsValidationError);
  });
});
