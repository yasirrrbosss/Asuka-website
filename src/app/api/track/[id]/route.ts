import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { createRateLimiter } from "@/lib/rateLimit";

// Customer-facing order tracking. Reads the order server-side (Admin SDK) and
// returns ONLY the fields the track page needs. Customer PII (name/contact/
// address), the payment-proof image, and internal admin notes never leave the
// server. Firestore rules deny all client order reads, so this is the only path.

const limiter = createRateLimiter({ max: 30, windowMs: 60 * 1000 });

function getIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  if (!limiter.check(getIp(req)).allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (!id || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
    return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
  }
  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured" }, { status: 503 });

  let d: Record<string, unknown>;
  try {
    const snap = await db.collection("orders").doc(id).get();
    if (!snap.exists) return NextResponse.json({ error: "not_found" }, { status: 404 });
    d = snap.data() as Record<string, unknown>;
  } catch (err) {
    console.error("/api/track:", err);
    return NextResponse.json({ error: "Upstream error" }, { status: 502 });
  }

  const shipment = (d.shipment ?? null) as { label?: string; price?: number } | null;
  const items = Array.isArray(d.items)
    ? (d.items as Array<Record<string, unknown>>).map((it) => ({
        name: String(it.name ?? ""),
        qty: Number(it.qty ?? 0),
        price: Number(it.price ?? 0),
        subtotal: it.subtotal != null ? Number(it.subtotal) : undefined,
      }))
    : [];

  // Whitelist: nothing customer-identifying or internal is included.
  return NextResponse.json({
    id,
    status: (d.status as string) ?? "pending",
    createdAt: (d.createdAt as string) ?? null,
    shippedAt: (d.shippedAt as string) ?? null,
    paymentVerified: "paymentVerified" in d ? d.paymentVerified === true : null,
    hasProof: d.paymentProof != null && d.paymentProof !== "",
    trackingCourier: (d.trackingCourier as string) ?? null,
    trackingNumber: (d.trackingNumber as string) ?? null,
    cancelReason: (d.cancelReason as string) ?? null,
    total: Number(d.total ?? 0),
    items,
    shipment: shipment ? { label: shipment.label ?? "", price: Number(shipment.price ?? 0) } : null,
  });
}
