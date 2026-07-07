import type { ShipOption } from "./types";
import { decodeBase64Image, validateImageBuffer } from "./imageGuard";

export interface IncomingItem { id?: string; qty?: number }
export interface IncomingCustomer { name?: string; contact?: string; address?: string }
export interface IncomingOrder {
  items?: IncomingItem[];
  shipment?: string | { id?: string } | null;
  customer?: IncomingCustomer;
  paymentProof?: string | null;
}

/** Server-known product facts used to price an order authoritatively. */
export interface CatalogProduct {
  id: string;
  name: string;
  weight: string;
  price: number;
  available: boolean;
  stock?: number;
}

export interface BuiltItem { id: string; name: string; weight: string; qty: number; price: number; subtotal: number }
export interface BuiltOrder {
  items: BuiltItem[];
  shipment: { id: string; label: string; price: number };
  customer: { name: string; contact: string; address: string };
  total: number;
  paymentProof: string | null;
}
export type BuildResult = { ok: true; order: BuiltOrder } | { ok: false; reason: string };

const MAX_QTY_PER_ITEM = 999;
// The whole order doc (proof + items + customer) must fit Firestore's 1 MiB
// limit. The client compresses proofs under ~900KB; cap the base64 string here
// with a small margin, and cap the decoded image bytes for the magic-byte check.
const MAX_PROOF_CHARS = 1_000_000;
const MAX_PROOF_DECODED_BYTES = 750_000;

/**
 * Recompute an order from trusted server data. Prices, subtotals, shipping cost,
 * and the grand total are taken from the catalog and shipping table — never from
 * the client — so a tampered client total or price can't be persisted.
 */
export function buildOrder(
  input: IncomingOrder,
  catalog: Map<string, CatalogProduct>,
  shipOptions: ShipOption[],
): BuildResult {
  if (!input || typeof input !== "object") return { ok: false, reason: "Invalid order" };

  const name = (input.customer?.name ?? "").trim();
  const contact = (input.customer?.contact ?? "").trim();
  const address = (input.customer?.address ?? "").trim();
  if (name.length < 2 || name.length > 200) return { ok: false, reason: "Nama tidak valid" };
  if (contact.length < 8 || contact.length > 30) return { ok: false, reason: "Kontak tidak valid" };
  if (address.length < 10 || address.length > 1000) return { ok: false, reason: "Alamat tidak valid" };

  const rawItems = Array.isArray(input.items) ? input.items : [];
  if (rawItems.length === 0) return { ok: false, reason: "Keranjang kosong" };
  if (rawItems.length > 100) return { ok: false, reason: "Terlalu banyak item" };

  const items: BuiltItem[] = [];
  for (const it of rawItems) {
    const id = typeof it?.id === "string" ? it.id : "";
    const qty = Number(it?.qty);
    if (!id) return { ok: false, reason: "Item tanpa id produk" };
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_ITEM) {
      return { ok: false, reason: "Jumlah item tidak valid" };
    }
    const p = catalog.get(id);
    if (!p) return { ok: false, reason: `Produk tidak ditemukan: ${id}` };
    if (p.available === false) return { ok: false, reason: `Produk tidak tersedia: ${p.name}` };
    if (typeof p.stock === "number" && qty > p.stock) {
      return { ok: false, reason: `Stok tidak cukup: ${p.name}` };
    }
    if (!Number.isFinite(p.price) || p.price < 0) return { ok: false, reason: `Harga tidak valid: ${p.name}` };
    const subtotal = p.price * qty;
    items.push({ id, name: p.name, weight: p.weight, qty, price: p.price, subtotal });
  }

  const shipId = typeof input.shipment === "string" ? input.shipment : input.shipment?.id ?? "";
  const shipOpt = shipOptions.find((s) => s.id === shipId);
  if (!shipOpt) return { ok: false, reason: "Opsi pengiriman tidak valid" };

  let proof: string | null = null;
  if (input.paymentProof != null) {
    if (typeof input.paymentProof !== "string") return { ok: false, reason: "Bukti bayar tidak valid" };
    if (input.paymentProof.length > MAX_PROOF_CHARS) return { ok: false, reason: "Bukti bayar terlalu besar" };
    if (!/^data:image\/(png|jpe?g|webp|gif);base64,/.test(input.paymentProof)) {
      return { ok: false, reason: "Format bukti bayar tidak valid" };
    }
    // Magic-byte check: the declared MIME can be spoofed, so verify the actual
    // decoded bytes are a real image (PNG/JPEG/WebP/GIF).
    const buf = decodeBase64Image(input.paymentProof);
    if (!buf) return { ok: false, reason: "Bukti bayar tidak terbaca" };
    const check = validateImageBuffer(buf, { maxBytes: MAX_PROOF_DECODED_BYTES });
    if (!check.ok) return { ok: false, reason: "Bukti bayar bukan gambar yang valid" };
    proof = input.paymentProof;
  }

  const itemsTotal = items.reduce((s, i) => s + i.subtotal, 0);
  const total = itemsTotal + shipOpt.price;

  return {
    ok: true,
    order: {
      items,
      shipment: { id: shipOpt.id, label: shipOpt.label, price: shipOpt.price },
      customer: { name, contact, address },
      total,
      paymentProof: proof,
    },
  };
}
