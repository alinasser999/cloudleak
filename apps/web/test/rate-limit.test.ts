import { describe, it, expect, vi, afterEach } from "vitest";
import { enforceRateLimit } from "@/server/rate-limit";
import { RateLimitError } from "@cloudleak/core";

afterEach(() => {
  vi.useRealTimers();
});

describe("enforceRateLimit", () => {
  it("allows requests up to the limit, then throws RateLimitError", () => {
    const key = `test-${Math.random()}`;
    const opts = { limit: 3, windowMs: 60_000 };
    expect(() => enforceRateLimit(key, opts)).not.toThrow();
    expect(() => enforceRateLimit(key, opts)).not.toThrow();
    expect(() => enforceRateLimit(key, opts)).not.toThrow();
    expect(() => enforceRateLimit(key, opts)).toThrow(RateLimitError);
  });

  it("keys are independent", () => {
    const opts = { limit: 1, windowMs: 60_000 };
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    enforceRateLimit(a, opts);
    expect(() => enforceRateLimit(b, opts)).not.toThrow();
    expect(() => enforceRateLimit(a, opts)).toThrow(RateLimitError);
  });

  it("resets after the window elapses", () => {
    vi.useFakeTimers();
    const key = `test-${Math.random()}`;
    const opts = { limit: 1, windowMs: 1_000 };
    enforceRateLimit(key, opts);
    expect(() => enforceRateLimit(key, opts)).toThrow(RateLimitError);
    vi.advanceTimersByTime(1_001);
    expect(() => enforceRateLimit(key, opts)).not.toThrow();
  });
});
