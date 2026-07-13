import { describe, it, expect } from "vitest";
import { decideRateLimit } from "./sharedRateLimit";

const OPTS = { max: 5, windowMs: 15 * 60 * 1000 };
const NOW = 1_800_000_000_000;

describe("decideRateLimit", () => {
  it("allows the first attempt and records it", () => {
    const d = decideRateLimit(undefined, NOW, OPTS);
    expect(d.allowed).toBe(true);
    expect(d.hits).toEqual([NOW]);
  });

  it("allows up to max attempts inside the window", () => {
    let hits: number[] = [];
    for (let i = 0; i < OPTS.max; i++) {
      const d = decideRateLimit(hits, NOW + i, OPTS);
      expect(d.allowed).toBe(true);
      hits = d.hits;
    }
    const d = decideRateLimit(hits, NOW + OPTS.max, OPTS);
    expect(d.allowed).toBe(false);
    expect(d.retryAfterMs).toBeGreaterThan(0);
    expect(d.retryAfterMs).toBeLessThanOrEqual(OPTS.windowMs);
  });

  it("expires hits that fall outside the window", () => {
    const old = Array.from({ length: 5 }, (_, i) => NOW - OPTS.windowMs - 1000 + i);
    const d = decideRateLimit(old, NOW, OPTS);
    expect(d.allowed).toBe(true);
    expect(d.hits).toEqual([NOW]);
  });

  it("a denied attempt does not extend the window", () => {
    const hits = Array.from({ length: 5 }, (_, i) => NOW - 1000 + i);
    const d1 = decideRateLimit(hits, NOW, OPTS);
    expect(d1.allowed).toBe(false);
    // Denied result returns the same pruned hits — nothing new recorded.
    expect(d1.hits).toEqual(hits);
  });

  it("ignores garbage and future timestamps in the stored doc", () => {
    const stored = ["x", null, NaN, Infinity, NOW + 999_999, NOW - 10] as unknown[];
    const d = decideRateLimit(stored, NOW, OPTS);
    expect(d.allowed).toBe(true);
    expect(d.hits).toEqual([NOW - 10, NOW]);
  });

  it("caps stored hits at max so the doc can't grow unbounded", () => {
    const stored = Array.from({ length: 500 }, (_, i) => NOW - i);
    const d = decideRateLimit(stored, NOW, OPTS);
    expect(d.allowed).toBe(false);
    expect(d.hits.length).toBeLessThanOrEqual(OPTS.max);
  });
});
