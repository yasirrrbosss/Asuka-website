export interface RateLimiterOptions { max: number; windowMs: number; }
export type CheckResult =
  | { allowed: true; remaining: number }
  | { allowed: false; remaining: 0; retryAfterMs: number };

export interface RateLimiter { check(key: string): CheckResult; }

export function createRateLimiter({ max, windowMs }: RateLimiterOptions): RateLimiter {
  const buckets = new Map<string, number[]>();

  return {
    check(key) {
      const now = Date.now();
      const cutoff = now - windowMs;
      const arr = buckets.get(key) ?? [];
      const recent = arr.filter((t) => t > cutoff);
      if (recent.length >= max) {
        const oldest = recent[0];
        buckets.set(key, recent);
        return { allowed: false, remaining: 0, retryAfterMs: oldest + windowMs - now };
      }
      recent.push(now);
      buckets.set(key, recent);
      return { allowed: true, remaining: max - recent.length };
    },
  };
}
