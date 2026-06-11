import { NextResponse } from "next/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_IDS = (process.env.TELEGRAM_CHAT_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const MAX_BODY_BYTES = 8 * 1024 * 1024;

interface OrderItem {
  name: string;
  weight: string;
  qty: number;
  price: number;
  subtotal: number;
}
interface OrderBody {
  id: string;
  items: OrderItem[];
  shipment?: { id: string; label: string; price: number };
  customer: { name: string; contact: string; address: string };
  total: number;
  status: string;
  paymentProof: string | null;
  createdAt: string;
}

function isOrderBody(x: unknown): x is OrderBody {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (typeof o.id !== "string" || !o.id) return false;
  if (!Array.isArray(o.items) || o.items.length === 0) return false;
  if (typeof o.total !== "number" || o.total <= 0) return false;
  const customer = o.customer as Record<string, unknown> | undefined;
  if (!customer || typeof customer.name !== "string") return false;
  if (typeof o.createdAt !== "string") return false;
  return true;
}

const rp = (n: number): string => `Rp ${n.toLocaleString("id-ID")}`;

const fmtDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

// Escape HTML special chars so user-provided strings can't break the Telegram message.
const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function formatOrderMessage(o: OrderBody): string {
  const itemsLine = o.items
    .map((it) => `• ${esc(it.name)} <i>(${esc(it.weight)})</i> × ${it.qty} — <b>${rp(it.subtotal)}</b>`)
    .join("\n");
  const ship = o.shipment
    ? `🚚 Pengiriman: ${esc(o.shipment.label)} (${rp(o.shipment.price)})`
    : "🚚 Pengiriman: —";
  const proofLine = o.paymentProof
    ? "💳 Bukti pembayaran: <b>✅ Sudah dikirim</b>"
    : "💳 Bukti pembayaran: <i>belum</i>";

  return [
    "🔔 <b>Order Baru — Asuka Brewing</b>",
    "",
    `🆔 <code>${esc(o.id)}</code>`,
    `👤 <b>${esc(o.customer.name)}</b>`,
    `📱 ${esc(o.customer.contact)}`,
    `📍 ${esc(o.customer.address)}`,
    "",
    "🛒 <b>Items:</b>",
    itemsLine,
    "",
    ship,
    `💰 <b>Total: ${rp(o.total)}</b>`,
    "",
    proofLine,
    `🕒 ${esc(fmtDate(o.createdAt))}`,
  ].join("\n");
}

async function sendToChat(chatId: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `${res.status} ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (err) {
    clearTimeout(timeout);
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}

export async function POST(req: Request) {
  try {
    if (!BOT_TOKEN || CHAT_IDS.length === 0) {
      console.error("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_IDS not configured");
      return NextResponse.json({ success: false, error: "Telegram not configured" }, { status: 200 });
    }

    const lenHeader = req.headers.get("content-length");
    if (lenHeader && parseInt(lenHeader, 10) > MAX_BODY_BYTES) {
      return NextResponse.json({ success: false, error: "Payload too large" }, { status: 413 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
    }
    if (!isOrderBody(body)) {
      return NextResponse.json({ success: false, error: "Missing or invalid order fields" }, { status: 400 });
    }
    const order = body;

    const text = formatOrderMessage(order);
    const results = await Promise.all(CHAT_IDS.map((id) => sendToChat(id, text)));
    const failed = results.filter((r) => !r.ok);
    if (failed.length === results.length) {
      console.error("All Telegram sends failed:", failed);
      return NextResponse.json({ success: false, error: "All sends failed", details: failed }, { status: 200 });
    }
    if (failed.length > 0) {
      console.warn("Some Telegram sends failed:", failed);
    }
    return NextResponse.json({ success: true, sent: results.length - failed.length, failed: failed.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    console.error("/api/notify-order error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 200 });
  }
}
