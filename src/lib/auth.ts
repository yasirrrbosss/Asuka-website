import crypto from "node:crypto";

export interface AdminPayload { user: string; iat: number; }
export type VerifyResult = { valid: true; payload: AdminPayload } | { valid: false };

// Tokens older than this are rejected even if the signature is valid, so a
// leaked token can't be replayed forever. Session-restore issues a fresh token
// on each successful login.
export const DEFAULT_MAX_AGE_SECONDS = 24 * 60 * 60;

export interface VerifyOptions { maxAgeSeconds?: number; nowSeconds?: number; }

function hmac(payloadB64: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

export function signToken(payload: AdminPayload, secret: string): string {
  if (!secret) throw new Error("signToken: secret is required");
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${hmac(payloadB64, secret)}`;
}

export function verifyToken(token: string, secret: string, opts: VerifyOptions = {}): VerifyResult {
  const maxAgeSeconds = opts.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;
  const nowSeconds = opts.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!secret) return { valid: false };
  if (typeof token !== "string" || !token) return { valid: false };
  const parts = token.split(".");
  if (parts.length !== 2) return { valid: false };
  const [payloadB64, sig] = parts;
  const expected = hmac(payloadB64, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { valid: false };
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8")) as AdminPayload;
    if (typeof payload?.user !== "string" || typeof payload?.iat !== "number") return { valid: false };
    // Reject expired (and clock-skew-implausible future) tokens.
    if (maxAgeSeconds > 0) {
      const age = nowSeconds - payload.iat;
      if (!Number.isFinite(age) || age < -60 || age > maxAgeSeconds) return { valid: false };
    }
    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}
