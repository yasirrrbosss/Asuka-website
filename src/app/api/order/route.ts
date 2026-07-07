import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { createRateLimiter } from "@/lib/rateLimit";
import { buildOrder, type CatalogProduct, type IncomingOrder } from "@/lib/orderPricing";
import { SHIP_OPTIONS } from "@/lib/constants";
import { sendOrderNotification } from "@/lib/telegram";

const MAX_BODY_BYTES = 4 * 1024 * 1024;
const limiter = createRateLimiter({ max: 12, windowMs: 60 * 1000 });

function getIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: Request) {
  if (!limiter.check(getIp(req)).allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ error: "Server not configured (FIREBASE_SERVICE_ACCOUNT)" }, { status: 503 });
  }

  const lenHeader = req.headers.get("content-length");
  if (lenHeader && parseInt(lenHeader, 10) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  let body: IncomingOrder;
  try {
    body = (await req.json()) as IncomingOrder;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Load only the referenced products, straight from the DB, to price the order.
  const ids = Array.from(
    new Set((Array.isArray(body.items) ? body.items : []).map((i) => (typeof i?.id === "string" ? i.id : "")).filter(Boolean)),
  );
  if (ids.length === 0) return NextResponse.json({ error: "Keranjang kosong" }, { status: 400 });
  if (ids.length > 100) return NextResponse.json({ error: "Terlalu banyak item" }, { status: 400 });

  const catalog = new Map<string, CatalogProduct>();
  try {
    const refs = ids.map((id) => db.collection("products").doc(id));
    const snaps = await db.getAll(...refs);
    for (const snap of snaps) {
      if (!snap.exists) continue;
      const d = snap.data() as Record<string, unknown>;
      catalog.set(snap.id, {
        id: snap.id,
        name: String(d.name ?? ""),
        weight: String(d.weight ?? ""),
        price: Number(d.price ?? NaN),
        available: d.available !== false,
        stock: typeof d.stock === "number" ? d.stock : undefined,
      });
    }
  } catch (err) {
    console.error("/api/order: catalog load failed:", err);
    return NextResponse.json({ error: "Gagal memuat produk" }, { status: 502 });
  }

  const built = buildOrder(body, catalog, SHIP_OPTIONS);
  if (!built.ok) return NextResponse.json({ error: built.reason }, { status: 400 });

  const orderRef = db.collection("orders").doc();
  const createdAt = new Date().toISOString();
  try {
    const batch = db.batch();
    batch.set(orderRef, {
      items: built.order.items,
      shipment: built.order.shipment,
      customer: built.order.customer,
      total: built.order.total,
      status: "pending",
      paymentProof: built.order.paymentProof,
      paymentVerified: false,
      createdAt,
    });
    // Decrement stock only for products that actually track it.
    for (const it of built.order.items) {
      if (typeof catalog.get(it.id)?.stock === "number") {
        batch.update(db.collection("products").doc(it.id), { stock: FieldValue.increment(-it.qty) });
      }
    }
    await batch.commit();
  } catch (err) {
    console.error("/api/order: commit failed:", err);
    return NextResponse.json({ error: "Gagal menyimpan order" }, { status: 502 });
  }

  // Notify the shop (best-effort, never fails the order).
  await sendOrderNotification({
    id: orderRef.id,
    items: built.order.items.map((i) => ({ name: i.name, weight: i.weight, qty: i.qty, subtotal: i.subtotal })),
    shipment: { label: built.order.shipment.label, price: built.order.shipment.price },
    customer: built.order.customer,
    total: built.order.total,
    hasProof: built.order.paymentProof != null,
    createdAt,
  });

  return NextResponse.json({
    id: orderRef.id,
    total: built.order.total,
    items: built.order.items,
    shipment: built.order.shipment,
    customer: built.order.customer,
    createdAt,
  });
}
