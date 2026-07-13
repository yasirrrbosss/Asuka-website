import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminGuard";
import { applyOrderAction, type OrderActionInput } from "@/lib/orderActions";

function guard(req: Request) {
  if (!isAuthorizedAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured (FIREBASE_SERVICE_ACCOUNT)" }, { status: 503 });
  return db;
}

const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;

// List all orders (admin dashboard). Order reads are denied to clients by the
// Firestore rules, so this is the only path to the full order list.
//
// The base64 payment-proof images are NOT included in the list — with them the
// response grows by up to ~1MB per order. The dashboard fetches a single proof
// on demand via `?proof=<orderId>`.
export async function GET(req: Request) {
  const g = guard(req);
  if (g instanceof NextResponse) return g;

  const proofId = new URL(req.url).searchParams.get("proof");
  if (proofId !== null) {
    if (!ID_RE.test(proofId)) return NextResponse.json({ error: "Invalid order id" }, { status: 400 });
    try {
      const snap = await g.collection("orders").doc(proofId).get();
      if (!snap.exists) return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 });
      const proof = snap.get("paymentProof");
      return NextResponse.json({ proof: typeof proof === "string" && proof ? proof : null });
    } catch (err) {
      console.error("/api/admin/orders GET proof:", err);
      return NextResponse.json({ error: "Failed to load proof" }, { status: 502 });
    }
  }

  try {
    const snap = await g.collection("orders").orderBy("createdAt", "desc").get();
    const orders = snap.docs.map((d) => {
      const { paymentProof, ...rest } = d.data();
      return { id: d.id, ...rest, hasProof: typeof paymentProof === "string" && paymentProof.length > 0 };
    });
    return NextResponse.json({ orders });
  } catch (err) {
    console.error("/api/admin/orders GET:", err);
    return NextResponse.json({ error: "Failed to load orders" }, { status: 502 });
  }
}

// Perform a state transition on one order. The transition rules live in
// applyOrderAction (validated against the CURRENT document inside a
// transaction), so the client can't ship a cancelled order, double-cancel, or
// set arbitrary fields. Cancelling a pending order returns its items' stock.
export async function PATCH(req: Request) {
  const g = guard(req);
  if (g instanceof NextResponse) return g;
  const db = g;

  let body: OrderActionInput & { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const id = String(body.id ?? "").trim();
  if (!ID_RE.test(id)) return NextResponse.json({ error: "Missing order id" }, { status: 400 });

  const now = new Date().toISOString();
  const orderRef = db.collection("orders").doc(id);

  try {
    const result = await db.runTransaction(async (tx) => {
      const snap = await tx.get(orderRef);
      if (!snap.exists) return { error: "Order tidak ditemukan", status: 404 } as const;

      const act = applyOrderAction(snap.data() ?? {}, body, now);
      if (!act.ok) return { error: act.reason, status: act.status } as const;

      // Restock: give back stock for items whose product still tracks it.
      if (act.restock) {
        const items = (snap.get("items") ?? []) as Array<{ id?: unknown; qty?: unknown }>;
        const entries = items
          .map((it) => ({ id: typeof it.id === "string" ? it.id : "", qty: Number(it.qty) }))
          .filter((it) => ID_RE.test(it.id) && Number.isFinite(it.qty) && it.qty > 0);
        if (entries.length > 0) {
          const refs = entries.map((it) => db.collection("products").doc(it.id));
          const prodSnaps = await tx.getAll(...refs);
          prodSnaps.forEach((p, i) => {
            if (p.exists && typeof p.get("stock") === "number") {
              tx.update(p.ref, { stock: FieldValue.increment(entries[i].qty) });
            }
          });
        }
      }

      const write: Record<string, unknown> = { ...act.update };
      for (const k of act.remove) write[k] = FieldValue.delete();
      tx.update(orderRef, write);
      return { update: act.update, removed: act.remove } as const;
    });

    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, update: result.update, removed: result.removed });
  } catch (err) {
    console.error("/api/admin/orders PATCH:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 502 });
  }
}
