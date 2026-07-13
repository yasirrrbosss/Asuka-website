import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { createRateLimiter } from "@/lib/rateLimit";

// Generous limit (session-restore calls this once per page load), but it stops
// the endpoint being used as a free token-validity oracle for brute forcing.
const limiter = createRateLimiter({ max: 30, windowMs: 60 * 1000 });

function getIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  if (!limiter.check(getIp(req)).allowed) {
    return NextResponse.json({ valid: false, error: "Too many requests" }, { status: 429 });
  }
  const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET ?? "";
  if (!TOKEN_SECRET) return NextResponse.json({ valid: false }, { status: 500 });
  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ valid: false }, { status: 400 });
  }
  const result = verifyToken(body.token ?? "", TOKEN_SECRET);
  if (!result.valid) return NextResponse.json({ valid: false });
  return NextResponse.json({ valid: true, user: result.payload.user });
}
