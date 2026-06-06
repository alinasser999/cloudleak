import { describe, it, expect } from "vitest";
import { renderRoleTerraform } from "../src/terraform.js";

const opts = {
  externalId: "clk_abc123",
  cloudleakAccountId: "123456789012",
  roleName: "CloudLeakReadOnly",
};

describe("renderRoleTerraform", () => {
  it("injects the external id", () => {
    expect(renderRoleTerraform(opts)).toContain("clk_abc123");
  });
  it("locks the trust policy to the cloudleak account", () => {
    expect(renderRoleTerraform(opts)).toContain("arn:aws:iam::123456789012:root");
  });
  it("uses the given role name", () => {
    expect(renderRoleTerraform(opts)).toContain("CloudLeakReadOnly");
  });
  it("attaches a read-only managed policy", () => {
    expect(renderRoleTerraform(opts)).toContain("ReadOnlyAccess");
  });
  it("leaves no unreplaced placeholders", () => {
    expect(renderRoleTerraform(opts)).not.toMatch(/\{\{.*?\}\}/);
  });
});
