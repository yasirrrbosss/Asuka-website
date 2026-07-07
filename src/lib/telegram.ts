import "server-only";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_IDS = (process.env.TELEGRAM_CHAT_IDS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export interface NotifyItem { name: string; weight: string; qty: number; subtotal: number }
export interface NotifyOrder {
  id: string;
  items: NotifyItem[];
  shipment: { label: string; price: number } | null;
  customer: { name: string; contact: string; address: string };
  total: number;
  hasProof: boolean;
  createdAt: string;
}

const rp = (n: number): string => `Rp ${n.toLocaleString("id-ID")}`;

const fmtDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString("id-ID", {
      day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

// Escape HTML so user-provided strings can't break the Telegram message markup.
const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function formatOrderMessage(o: NotifyOrder): string {
  const itemsLine = o.items
    .map((it) => `• ${esc(it.name)} <i>(${esc(it.weight)})</i> × ${it.qty} — <b>${rp(it.subtotal)}</b>`)
    .join("\n");
  const ship = o.shipment
    ? `🚚 Pengiriman: ${esc(o.shipment.label)} (${rp(o.shipment.price)})`
    : "🚚 Pengiriman: —";
  const proofLine = o.hasProof
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

async function sendToChat(chatId: string, text: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    clearTimeout(timeout);
    return false;
  }
}

/**
 * Send a new-order notification to all configured Telegram chats. Best-effort:
 * never throws, so a Telegram outage can't fail the order it's notifying about.
 */
export async function sendOrderNotification(order: NotifyOrder): Promise<void> {
  if (!BOT_TOKEN || CHAT_IDS.length === 0) {
    console.error("telegram: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_IDS not configured");
    return;
  }
  const text = formatOrderMessage(order);
  const results = await Promise.all(CHAT_IDS.map((id) => sendToChat(id, text)));
  const failed = results.filter((ok) => !ok).length;
  if (failed > 0) console.warn(`telegram: ${failed}/${results.length} sends failed`);
}
