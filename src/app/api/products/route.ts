import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { createRateLimiter } from "@/lib/rateLimit";

// Public product catalog for the storefront. Served through the Admin SDK so
// the browser needs no Firebase client SDK at all (no CDN scripts, no
// firestore.googleapis.com in the CSP) and the Firestore rules can deny every
// direct client read.

const limiter = createRateLimiter({ max: 60, windowMs: 60 * 1000 });

function getIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function GET(req: Request) {
  if (!limiter.check(getIp(req)).allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 503 });

  try {
    const snap = await db.collection("products").orderBy("createdAt", "desc").get();
    const products = snap.docs.map((d) => {
      const p = d.data();
      // Whitelisted catalog fields — everything here renders on the storefront.
      return {
        id: d.id,
        name: String(p.name ?? ""),
        weight: String(p.weight ?? ""),
        price: Number(p.price ?? 0),
        origin: String(p.origin ?? ""),
        process: String(p.process ?? ""),
        notes: String(p.notes ?? ""),
        cat: p.cat === "espresso" ? "espresso" : "filter",
        img: String(p.img ?? ""),
        available: p.available !== false,
        ...(typeof p.stock === "number" ? { stock: p.stock } : {}),
        createdAt: String(p.createdAt ?? ""),
      };
    });
    return NextResponse.json(
      { products },
      // Let the CDN absorb repeat storefront loads instead of Firestore.
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
    );
  } catch (err) {
    console.error("/api/products GET:", err);
    return NextResponse.json({ error: "Failed to load products" }, { status: 502 });
  }
}
