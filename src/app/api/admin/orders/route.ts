import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminGuard";

function guard(req: Request) {
  if (!isAuthorizedAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured (FIREBASE_SERVICE_ACCOUNT)" }, { status: 503 });
  return db;
}

// List all orders (admin dashboard). Order reads are denied to clients by the
// Firestore rules, so this is the only path to the full order list.
export async function GET(req: Request) {
  const g = guard(req);
  if (g instanceof NextResponse) return g;
  try {
    const snap = await g.collection("orders").orderBy("createdAt", "desc").get();
    const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ orders });
  } catch (err) {
    console.error("/api/admin/orders GET:", err);
    return NextResponse.json({ error: "Failed to load orders" }, { status: 502 });
  }
}

const str = (v: unknown, max: number): string => String(v ?? "").slice(0, max).trim();

// Perform a state transition on one order. Each action writes a fixed, validated
// set of fields — the client can't set arbitrary document data.
export async function PATCH(req: Request) {
  const g = guard(req);
  if (g instanceof NextResponse) return g;
  const db = g;

  let body: { id?: string; action?: string; courier?: string; resi?: string; reason?: string; notes?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const id = str(body.id, 128);
  if (!id) return NextResponse.json({ error: "Missing order id" }, { status: 400 });

  const now = new Date().toISOString();
  let update: Record<string, unknown>;
  switch (body.action) {
    case "verify":
      update = { paymentVerified: true, paymentVerifiedAt: now };
      break;
    case "ship": {
      const courier = str(body.courier, 100);
      const resi = str(body.resi, 100);
      if (!courier || !resi) return NextResponse.json({ error: "Courier & resi wajib" }, { status: 400 });
      update = { status: "shipped", shippedAt: now, trackingCourier: courier, trackingNumber: resi };
      break;
    }
    case "undo":
      update = { status: "pending", shippedAt: null };
      break;
    case "cancel": {
      const reason = str(body.reason, 500);
      if (!reason) return NextResponse.json({ error: "Alasan wajib" }, { status: 400 });
      update = { status: "cancelled", cancelledAt: now, cancelReason: reason };
      break;
    }
    case "notes":
      update = { internalNotes: str(body.notes, 2000) };
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  try {
    await db.collection("orders").doc(id).update(update);
    return NextResponse.json({ ok: true, update });
  } catch (err) {
    console.error("/api/admin/orders PATCH:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 502 });
  }
}
