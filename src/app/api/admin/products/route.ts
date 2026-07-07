import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { isAuthorizedAdmin } from "@/lib/adminGuard";

function guard(req: Request) {
  if (!isAuthorizedAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getAdminDb();
  if (!db) return NextResponse.json({ error: "Server not configured (FIREBASE_SERVICE_ACCOUNT)" }, { status: 503 });
  return db;
}

const MAX_IMG_CHARS = 1_400_000;

// Whitelist and coerce product fields. `partial` allows updates that touch only
// some fields (e.g. toggling availability) without wiping the rest.
function sanitizeProduct(input: unknown, partial: boolean): { ok: true; data: Record<string, unknown> } | { ok: false; reason: string } {
  if (!input || typeof input !== "object") return { ok: false, reason: "Invalid body" };
  const i = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  const has = (k: string) => Object.prototype.hasOwnProperty.call(i, k);

  if (has("name") || !partial) {
    const name = String(i.name ?? "").trim();
    if (!name || name.length > 200) return { ok: false, reason: "Nama tidak valid" };
    out.name = name;
  }
  if (has("weight") || !partial) {
    const weight = String(i.weight ?? "").trim();
    if (!weight || weight.length > 100) return { ok: false, reason: "Berat tidak valid" };
    out.weight = weight;
  }
  if (has("price") || !partial) {
    const price = Number(i.price);
    if (!Number.isFinite(price) || price < 0 || price > 100_000_000) return { ok: false, reason: "Harga tidak valid" };
    out.price = price;
  }
  if (has("cat") || !partial) {
    const cat = String(i.cat ?? "");
    if (cat !== "filter" && cat !== "espresso") return { ok: false, reason: "Kategori tidak valid" };
    out.cat = cat;
  }
  for (const k of ["origin", "process", "notes"] as const) {
    if (has(k) || !partial) out[k] = String(i[k] ?? "").slice(0, 500);
  }
  if (has("img") || !partial) {
    const img = String(i.img ?? "");
    if (img.length > MAX_IMG_CHARS) return { ok: false, reason: "Gambar terlalu besar" };
    out.img = img;
  }
  if (has("available") || !partial) out.available = i.available !== false;
  if (has("stock")) {
    if (i.stock === null || i.stock === undefined) out.stock = null;
    else {
      const stock = Number(i.stock);
      if (!Number.isInteger(stock) || stock < 0) return { ok: false, reason: "Stok tidak valid" };
      out.stock = stock;
    }
  }
  return { ok: true, data: out };
}

export async function POST(req: Request) {
  const g = guard(req);
  if (g instanceof NextResponse) return g;
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const s = sanitizeProduct(body, false);
  if (!s.ok) return NextResponse.json({ error: s.reason }, { status: 400 });
  try {
    const ref = await g.collection("products").add({ ...s.data, createdAt: new Date().toISOString() });
    return NextResponse.json({ id: ref.id });
  } catch (err) {
    console.error("/api/admin/products POST:", err);
    return NextResponse.json({ error: "Create failed" }, { status: 502 });
  }
}

export async function PATCH(req: Request) {
  const g = guard(req);
  if (g instanceof NextResponse) return g;
  let body: { id?: string; data?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const id = String(body.id ?? "").slice(0, 128).trim();
  if (!id) return NextResponse.json({ error: "Missing product id" }, { status: 400 });
  const s = sanitizeProduct(body.data, true);
  if (!s.ok) return NextResponse.json({ error: s.reason }, { status: 400 });
  if (Object.keys(s.data).length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  try {
    await g.collection("products").doc(id).update(s.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("/api/admin/products PATCH:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 502 });
  }
}

export async function DELETE(req: Request) {
  const g = guard(req);
  if (g instanceof NextResponse) return g;
  let body: { id?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const id = String(body.id ?? "").slice(0, 128).trim();
  if (!id) return NextResponse.json({ error: "Missing product id" }, { status: 400 });
  try {
    await g.collection("products").doc(id).delete();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("/api/admin/products DELETE:", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 502 });
  }
}
