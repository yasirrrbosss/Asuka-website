"use client";
import { useState, useEffect, useCallback } from "react";
import { rp } from "@/lib/format";
import { Sec, BackBtn } from "./shared";
import { Timeline } from "./Timeline";

// Shape returned by /api/track/[id] — deliberately excludes customer PII,
// the payment-proof image, and internal notes.
interface Order {
  id: string;
  status?: string;                  // "pending" | "shipped" | "cancelled"
  createdAt?: string | null;
  shippedAt?: string | null;
  hasProof?: boolean;
  paymentVerified?: boolean | null; // null = legacy order
  trackingCourier?: string | null;
  trackingNumber?: string | null;
  cancelReason?: string | null;
  total?: number;
  items?: Array<{ name: string; qty: number; price: number; subtotal?: number }>;
  shipment?: { label?: string; price?: number } | null;
}

export function TrackPage({ go, initialOid }: { go: (p: string) => void; initialOid: string | null }) {
  const [trackId, setTrackId] = useState(initialOid ?? "");
  const [order, setOrder] = useState<Order | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const trackOrder = useCallback(async () => {
    if (!trackId.trim()) return;
    setSearching(true); setError(""); setOrder(null); setSearched(false);
    try {
      const res = await fetch(`/api/track/${encodeURIComponent(trackId.trim())}`);
      if (res.ok) {
        setOrder((await res.json()) as Order);
      } else if (res.status === 404) {
        setError("Order not found. Double-check your Order ID.");
      } else {
        setError("Couldn't reach the server. Please try again.");
      }
      setSearched(true);
    } catch (e) {
      console.error(e);
      setError("Couldn't reach the server. Please try again.");
      setSearched(true);
    } finally {
      setSearching(false);
    }
  }, [trackId]);

  useEffect(() => {
    if (initialOid && trackId === initialOid && !searched) trackOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Paid" now requires explicit admin verification (paymentVerified), not just
  // that customer uploaded a proof. Fallback to paymentProof-based logic for
  // legacy orders created before the verification flow shipped.
  const isCancelled = order?.status === "cancelled";
  // Legacy orders (paymentVerified null) fall back to "proof uploaded = paid".
  const isPaid = order?.paymentVerified === true || (order?.paymentVerified == null && order?.hasProof === true);
  const isShipped = order?.status === "shipped";
  const steps = order && !isCancelled ? [
    { label: "Placed", reached: true, current: !isPaid && !isShipped },
    { label: "Paid", reached: isPaid || isShipped, current: isPaid && !isShipped },
    { label: "Shipped", reached: isShipped, current: isShipped },
  ] : [];

  const ctxMessage = order
    ? isCancelled
      ? "This order was cancelled."
      : isShipped
        ? (order.trackingNumber ? "On its way — use the tracking number to follow your shipment on the courier's site." : "Shipped. We'll keep you posted on WhatsApp.")
        : isPaid
          ? "Roasting now. We'll WhatsApp when it ships."
          : order.hasProof
            ? "Payment proof received. Awaiting admin verification."
            : "Waiting for your payment."
    : "";

  return (
    <div style={{ padding: "clamp(32px, 6vw, 60px) clamp(16px, 5vw, 56px) clamp(48px, 8vw, 80px)", maxWidth: 680, margin: "0 auto" }}>
      <BackBtn onClick={() => go("home")} label="Back to home" />
      <h2 style={{
        fontFamily: "var(--font-fraunces), serif",
        fontVariationSettings: '"SOFT" 30, "WONK" 0',
        fontSize: "clamp(48px, 6vw, 72px)", fontWeight: 450,
        color: "var(--ink)", letterSpacing: "-0.022em", marginBottom: 4, lineHeight: 1.06,
      }}>
        Track your <em style={{
          color: "var(--copper)", fontStyle: "italic", fontWeight: 500,
          fontVariationSettings: '"SOFT" 60, "WONK" 1',
        }}>order</em>.
      </h2>
      <p style={{
        fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase",
        color: "var(--copper)", fontWeight: 700, marginBottom: 48,
      }}>Enter your order ID</p>

      <div style={{ display: "flex", gap: 12, marginBottom: 48, flexWrap: "wrap" }}>
        <input
          type="text"
          value={trackId}
          onChange={(e) => setTrackId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && trackOrder()}
          placeholder="ASK-XXXX"
          style={{
            flex: "1 1 200px",
            minWidth: 0,
            border: "none",
            borderBottom: "1px solid var(--ink)",
            background: "transparent",
            padding: "10px 0",
            fontSize: 16,
            fontFamily: "ui-monospace, monospace",
            color: "var(--ink)",
            outline: "none",
            letterSpacing: "0.1em",
          }}
        />
        <button
          onClick={trackOrder}
          disabled={searching || !trackId.trim()}
          style={{
            padding: "10px 28px",
            background: trackId.trim() ? "var(--ink)" : "var(--paper-edge)",
            color: "var(--cream)", border: "none",
            fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", fontWeight: 700,
            cursor: trackId.trim() ? "pointer" : "not-allowed",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}
        >{searching ? "..." : "Find"}</button>
      </div>

      {error && (
        <div style={{
          background: "rgba(196,92,62,0.06)", padding: "16px 20px",
          borderLeft: "2px solid var(--terracotta)", marginBottom: 24,
        }}>
          <span style={{ fontSize: 13, color: "var(--terracotta)" }}>{error}</span>
        </div>
      )}

      {order && (
        <div style={{ animation: "fadeUp 0.4s ease" }}>
          <p style={{
            fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase",
            color: "var(--copper)", fontWeight: 700, marginBottom: 6,
          }}>Order ID</p>
          <p style={{
            fontFamily: "ui-monospace, monospace", fontSize: 16,
            color: "var(--ink)", letterSpacing: "0.12em", marginBottom: 8,
            wordBreak: "break-all",
          }}>{order.id}</p>
          {order.createdAt && (
            <p style={{ fontSize: 12, color: "var(--ink-soft)", fontStyle: "italic" }}>
              Placed {new Date(order.createdAt).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}

          {!isCancelled && <Timeline steps={steps} />}

          <div style={{
            background: isCancelled ? "rgba(196,92,62,0.08)" : "var(--paper)",
            padding: 24,
            borderLeft: `2px solid ${isCancelled ? "var(--terracotta)" : "var(--copper)"}`,
            textAlign: "center", marginBottom: 32,
          }}>
            <p style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.6, fontStyle: "italic" }}>{ctxMessage}</p>
            {isCancelled && order.cancelReason && (
              <p style={{ fontSize: 13, color: "var(--terracotta)", marginTop: 10, lineHeight: 1.5 }}>
                Reason: {order.cancelReason}
              </p>
            )}
            {order.shippedAt && !isCancelled && (
              <p style={{
                fontSize: 11, color: "var(--copper)", marginTop: 8,
                fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase",
              }}>
                Shipped: {new Date(order.shippedAt).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
            {isShipped && (order.trackingCourier || order.trackingNumber) && (
              <div style={{ marginTop: 14, fontSize: 13, color: "var(--ink)", lineHeight: 1.7 }}>
                {order.trackingCourier && <div><b style={{ color: "var(--copper)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontSize: 11 }}>Kurir:</b> {order.trackingCourier}</div>}
                {order.trackingNumber && <div><b style={{ color: "var(--copper)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", fontSize: 11 }}>Resi:</b> <code style={{ fontFamily: "ui-monospace, monospace", background: "rgba(0,0,0,0.06)", padding: "2px 8px", borderRadius: 4 }}>{order.trackingNumber}</code></div>}
              </div>
            )}
          </div>

          <Sec t="Order details">
            {(order.items ?? []).map((it, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between",
                padding: "10px 0", fontSize: 14, color: "var(--ink-soft)",
              }}>
                <span>{it.name} × {it.qty}</span>
                <span style={{ color: "var(--ink)", fontWeight: 500 }}>{rp(it.subtotal ?? it.price * it.qty)}</span>
              </div>
            ))}
            <div style={{
              display: "flex", justifyContent: "space-between", padding: "10px 0",
              fontSize: 13, color: "var(--ink-soft)",
              borderTop: "1px solid var(--paper-edge)", marginTop: 8,
            }}>
              <span>Shipping ({order.shipment?.label ?? "—"})</span>
              <span>{rp(order.shipment?.price ?? 0)}</span>
            </div>
            <div style={{
              display: "flex", justifyContent: "space-between", padding: "16px 0 0",
              fontSize: 24, color: "var(--ink)", fontWeight: 500,
              fontFamily: "var(--font-fraunces), serif",
              fontVariationSettings: '"SOFT" 30',
              borderTop: "1px solid var(--ink)", marginTop: 12,
            }}>
              <span>Total</span><span style={{ color: "var(--copper)" }}>{rp(order.total ?? 0)}</span>
            </div>
          </Sec>
        </div>
      )}
    </div>
  );
}
