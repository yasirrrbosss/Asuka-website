import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const TOKEN_SECRET = process.env.ADMIN_TOKEN_SECRET ?? "";
  if (!TOKEN_SECRET) return NextResponse.json({ valid: false }, { status: 500 });
  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ valid: false }, { status: 400 });
  }
  const result = verifyToken(body.token ?? "", TOKEN_SECRET);
  return NextResponse.json({ valid: result.valid });
}
