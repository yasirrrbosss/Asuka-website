import crypto from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import type { CheckResult } from "./rateLimit";

// Cross-instance rate limiting backed by Firestore (M1 follow-up). The
// in-memory limiter only counts attempts on the instance that happens to serve
// the request; on serverless every cold start resets it. Login attempts are
// low-volume, so a Firestore transaction per attempt is cheap and gives one
// shared counter for the whole deployment.
//
// The `rateLimits` collection is server-only (Firestore rules deny all client
// access via the default deny). Documents carry `expiresAt` so a Firestore TTL
// policy on that field can garbage-collect old buckets (optional).

export interface SharedRateLimitOptions { max: number; windowMs: number; }

export interface Decision {
  allowed: boolean;
  /** Pruned hit list, including the new hit when allowed. */
  hits: number[];
  retryAfterMs: number;
}

/** Pure sliding-window decision over a stored hit list. Exported for tests. */
export function decideRateLimit(stored: unknown, now: number, { max, windowMs }: SharedRateLimitOptions): Decision {
  const cutoff = now - windowMs;
  const hits = (Array.isArray(stored) ? stored : [])
    .filter((t): t is number => typeof t === "number" && Number.isFinite(t) && t > cutoff && t <= now)
    .sort((a, b) => a - b)
    // An attacker can't grow the doc unbounded: only the newest `max` matter.
    .slice(-max);
  if (hits.length >= max) {
    return { allowed: false, hits, retryAfterMs: hits[0] + windowMs - now };
  }
  return { allowed: true, hits: [...hits, now], retryAfterMs: 0 };
}

/**
 * Check + record one attempt for `key` inside a Firestore transaction.
 * Throws on Firestore errors — callers decide the fallback (e.g. the
 * in-memory limiter), so a Firestore outage can't disable auth entirely.
 */
export async function checkSharedRateLimit(
  db: Firestore,
  scope: string,
  key: string,
  opts: SharedRateLimitOptions,
): Promise<CheckResult> {
  // Hash the key: raw IPs stay out of stored doc ids, and any character is safe.
  const id = crypto.createHash("sha256").update(`${scope}:${key}`).digest("hex").slice(0, 48);
  const ref = db.collection("rateLimits").doc(id);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    const d = decideRateLimit(snap.get("hits"), now, opts);
    if (!d.allowed) return { allowed: false, remaining: 0, retryAfterMs: d.retryAfterMs };
    tx.set(ref, { scope, hits: d.hits, expiresAt: new Date(now + opts.windowMs) });
    return { allowed: true, remaining: opts.max - d.hits.length };
  });
}
