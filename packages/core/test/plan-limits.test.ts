import { describe, it, expect } from "vitest";
import { PLAN_LIMITS, planLimits } from "../src/plan-limits.js";
import type { Plan } from "../src/types.js";

const PLANS: Plan[] = ["starter", "growth", "agency"];

describe("plan limits", () => {
  it("defines limits for every plan", () => {
    for (const p of PLANS) {
      expect(PLAN_LIMITS[p]).toBeDefined();
    }
  });

  it("quotas grow monotonically up the tiers", () => {
    const order: Plan[] = ["starter", "growth", "agency"];
    for (let i = 1; i < order.length; i++) {
      const lo = PLAN_LIMITS[order[i - 1]!];
      const hi = PLAN_LIMITS[order[i]!];
      expect(hi.maxAwsAccounts).toBeGreaterThanOrEqual(lo.maxAwsAccounts);
      expect(hi.maxSeats).toBeGreaterThanOrEqual(lo.maxSeats);
      expect(hi.allowedScanFrequencies.length).toBeGreaterThanOrEqual(
        lo.allowedScanFrequencies.length,
      );
    }
  });

  it("always allows the 'off' cadence", () => {
    for (const p of PLANS) {
      expect(planLimits(p).allowedScanFrequencies).toContain("off");
    }
  });

  it("gates daily scans behind the paid tiers", () => {
    expect(planLimits("starter").allowedScanFrequencies).not.toContain("daily");
    expect(planLimits("growth").allowedScanFrequencies).toContain("daily");
  });

  it("falls back to starter limits for an unknown plan", () => {
    expect(planLimits("enterprise" as Plan)).toEqual(PLAN_LIMITS.starter);
  });
});
