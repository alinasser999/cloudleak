import { describe, it, expect } from "vitest";
import { generateExternalId } from "../src/ids.js";

describe("generateExternalId", () => {
  it("has the clk_ prefix", () => {
    expect(generateExternalId().startsWith("clk_")).toBe(true);
  });
  it("uses only url-safe chars after the prefix", () => {
    const body = generateExternalId().slice(4);
    expect(body).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it("is long enough to be unguessable (>= 32 body chars)", () => {
    expect(generateExternalId().slice(4).length).toBeGreaterThanOrEqual(32);
  });
  it("produces unique values", () => {
    const set = new Set(Array.from({ length: 1000 }, () => generateExternalId()));
    expect(set.size).toBe(1000);
  });
});
