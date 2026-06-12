import { RateLimitError } from "@cloudleak/core";

/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * This guards against accidental floods and casual abuse (e.g. someone holding
 * down "Resend" or scripting invite spam). It is per-instance: on serverless
 * each warm instance keeps its own counters, so it is a speed bump, not a
 * distributed quota. For hard, cross-instance limits, back this with Redis/
 * Upstash — the call sites would not change.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

/**
 * Record a hit for `key` and throw RateLimitError if it exceeds the budget.
 * `key` should scope the limit — typically `"<action>:<userId>"`.
 */
export function enforceRateLimit(key: string, opts: RateLimitOptions): void {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    sweep(now);
    return;
  }

  existing.count += 1;
  if (existing.count > opts.limit) {
    const retrySec = Math.ceil((existing.resetAt - now) / 1000);
    throw new RateLimitError(`Too many requests — try again in ${retrySec}s`);
  }
}

/** Drop expired buckets opportunistically so the map can't grow unbounded. */
function sweep(now: number): void {
  if (buckets.size < 5000) return;
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
  }
}
