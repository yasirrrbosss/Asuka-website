import crypto from "node:crypto";

export interface AdminPayload { user: string; iat: number; }
export type VerifyResult = { valid: true; payload: AdminPayload } | { valid: false };

function hmac(payloadB64: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

export function signToken(payload: AdminPayload, secret: string): string {
  if (!secret) throw new Error("signToken: secret is required");
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${hmac(payloadB64, secret)}`;
}

export function verifyToken(token: string, secret: string): VerifyResult {
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
    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}
