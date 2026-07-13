import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { createRateLimiter } from "@/lib/rateLimit";
import { checkSharedRateLimit } from "@/lib/sharedRateLimit";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { signToken } from "@/lib/auth";

const LIMIT = { max: 5, windowMs: 15 * 60 * 1000 };
// In-memory limiter runs first: it's free, and it stops a warm instance from
// hammering Firestore once an attacker is already blocked. The Firestore-backed
// limiter behind it is the real cross-instance cap (M1); if Firestore errors,
// we fall back to memory-only rather than failing open or closed.
const memoryLimiter = createRateLimiter(LIMIT);

function getIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

// Length-independent constant-time string compare: hashing both sides first
// means the comparison never short-circuits on length or first-differing byte,
// so it can't be used as a timing oracle for the username or password.
function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  let limit = memoryLimiter.check(ip);
  if (limit.allowed) {
    const db = getAdminDb();
    if (db) {
      try {
        limit = await checkSharedRateLimit(db, "admin-auth", ip, LIMIT);
      } catch (err) {
        console.error("/api/admin/auth: shared rate limit unavailable:", err);
      }
    }
  }
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${Math.ceil(limit.retryAfterMs / 1000)} seconds.` },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } },
    );
  }

  const ADMIN_USER = process.env.ADMIN_USERNAME ?? "admin";
  const ADMIN_PASS = process.env.ADMIN_PASSWORD ?? "";
  const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET ?? "";

  if (!ADMIN_PASS) {
    return NextResponse.json({ error: "ADMIN_PASSWORD not configured on server." }, { status: 500 });
  }
  if (!TOKEN_SECRET) {
    return NextResponse.json({ error: "ADMIN_TOKEN_SECRET not configured on server." }, { status: 500 });
  }

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const { username, password } = body;

  // Evaluate both checks without short-circuiting so a wrong username and a
  // wrong password are indistinguishable by timing.
  const userOk = safeEqual(String(username ?? ""), ADMIN_USER);
  const passOk = safeEqual(String(password ?? ""), ADMIN_PASS);
  if (userOk && passOk) {
    const token = signToken({ user: ADMIN_USER, iat: Math.floor(Date.now() / 1000) }, TOKEN_SECRET);
    return NextResponse.json({ success: true, token });
  }
  return NextResponse.json({ error: "Username atau password salah." }, { status: 401 });
}
