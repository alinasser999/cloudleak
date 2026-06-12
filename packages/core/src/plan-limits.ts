import type { Plan } from "./types.js";

/** Schedule cadences a plan is allowed to use, mirrored from db's ScheduleFrequency. */
export type ScanFrequency = "off" | "weekly" | "daily";

export interface PlanLimits {
  /** Max connected (or pending) AWS accounts. */
  maxAwsAccounts: number;
  /** Max occupied seats = active members + pending invitations. */
  maxSeats: number;
  /** Scheduled-scan cadences available on this plan. */
  allowedScanFrequencies: ScanFrequency[];
}

/**
 * Per-plan quotas. These gate the paid tiers so the plan a customer is on
 * actually means something; billing (Stripe) sets the plan, this enforces it.
 * Deliberately conservative defaults — tune as pricing firms up.
 */
export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  starter: { maxAwsAccounts: 1, maxSeats: 2, allowedScanFrequencies: ["off", "weekly"] },
  growth: { maxAwsAccounts: 5, maxSeats: 10, allowedScanFrequencies: ["off", "weekly", "daily"] },
  agency: { maxAwsAccounts: 25, maxSeats: 50, allowedScanFrequencies: ["off", "weekly", "daily"] },
};

export function planLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.starter;
}

/** Human-friendly plan label for upgrade prompts. */
export const PLAN_LABEL: Record<Plan, string> = {
  starter: "Starter",
  growth: "Growth",
  agency: "Agency",
};
