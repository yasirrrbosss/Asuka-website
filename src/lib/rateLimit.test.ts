import { describe, it, expect, beforeEach, vi } from "vitest";
import { createRateLimiter } from "./rateLimit";

describe("createRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  it("allows up to max attempts", () => {
    const limiter = createRateLimiter({ max: 3, windowMs: 60_000 });
    expect(limiter.check("1.2.3.4")).toEqual({ allowed: true, remaining: 2 });
    expect(limiter.check("1.2.3.4")).toEqual({ allowed: true, remaining: 1 });
    expect(limiter.check("1.2.3.4")).toEqual({ allowed: true, remaining: 0 });
  });

  it("blocks after max attempts within window", () => {
    const limiter = createRateLimiter({ max: 2, windowMs: 60_000 });
    limiter.check("1.2.3.4");
    limiter.check("1.2.3.4");
    const result = limiter.check("1.2.3.4");
    expect(result.allowed).toBe(false);
    expect(result).toMatchObject({ allowed: false, remaining: 0 });
    if (!result.allowed) {
      expect(result.retryAfterMs).toBeGreaterThan(0);
    }
  });

  it("tracks different keys independently", () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000 });
    expect(limiter.check("1.1.1.1").allowed).toBe(true);
    expect(limiter.check("2.2.2.2").allowed).toBe(true);
  });

  it("resets after window expires", () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000 });
    limiter.check("1.2.3.4");
    expect(limiter.check("1.2.3.4").allowed).toBe(false);
    vi.advanceTimersByTime(61_000);
    expect(limiter.check("1.2.3.4").allowed).toBe(true);
  });
});
