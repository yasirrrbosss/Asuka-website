"use client";
import { useRef, useState } from "react";
import { rp } from "@/lib/format";
import { SHIP_OPTIONS, QRIS_IMAGE } from "@/lib/constants";
import type { CartItem, CustomerForm } from "@/lib/types";
import { I, Sec, BackBtn } from "./shared";

export function PaymentPage({ grandTotal, proof, proofName, handleProof, setProof, setProofName, agreed, setAgreed, placeOrder, busy, go, cart, shipment, form }: { grandTotal: number; proof: string | null; proofName: string; handleProof: (f: File) => void; setProof: (p: string | null) => void; setProofName: (n: string) => void; agreed: boolean; setAgreed: (a: boolean) => void; placeOrder: () => void; busy: boolean; go: (p: string) => void; cart: CartItem[]; shipment: string | null; form: CustomerForm }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const canSubmit = !!proof && agreed && !busy;
  const shipObj = SHIP_OPTIONS.find((o) => o.id === shipment);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleProof(f);
  };

  return (
    <div style={{ padding: "clamp(32px, 6vw, 60px) clamp(16px, 5vw, 56px) clamp(48px, 8vw, 80px)", maxWidth: 620, margin: "0 auto" }}>
      <BackBtn onClick={() => go("checkout")} label="Back" />
      <h2 style={{
        fontFamily: "var(--font-fraunces), serif",
        fontVariationSettings: '"SOFT" 30, "WONK" 0',
        fontSize: "clamp(48px, 6vw, 72px)", fontWeight: 450,
        color: "var(--ink)", letterSpacing: "-0.022em", marginBottom: 4, lineHeight: 1.06,
      }}>
        <em style={{
          color: "var(--copper)", fontStyle: "italic", fontWeight: 500,
          fontVariationSettings: '"SOFT" 60, "WONK" 1',
        }}>Pay</em>.
      </h2>
      <p style={{
        fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase",
        color: "var(--copper)", fontWeight: 700, marginBottom: 48,
      }}>Step 3 of 3 · Scan &amp; upload proof</p>

      <Sec t="Order summary">
        {cart.map((it) => (
          <div key={it.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13, color: "var(--ink-soft)" }}>
            <span>{it.name} × {it.qty}</span>
            <span style={{ color: "var(--ink)", fontWeight: 500 }}>{rp(it.price * it.qty)}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", fontSize: 13, color: "var(--ink-soft)", borderTop: "1px solid var(--paper-edge)", marginTop: 8 }}>
          <span>Shipping ({shipObj?.label})</span><span>{rp(shipObj?.price ?? 0)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 0 0", fontSize: 22, color: "var(--ink)", fontWeight: 500, fontFamily: "var(--font-fraunces), serif", fontVariationSettings: '"SOFT" 30', borderTop: "1px solid var(--ink)", marginTop: 12 }}>
          <span>Total</span><span style={{ color: "var(--copper)" }}>{rp(grandTotal)}</span>
        </div>
      </Sec>

      <Sec t="Recipient">
        <div style={{ fontSize: 14, color: "var(--ink)", lineHeight: 1.7 }}>
          <div style={{
            fontFamily: "var(--font-fraunces), serif",
            fontVariationSettings: '"SOFT" 30',
            fontSize: 20, fontWeight: 500,
          }}>{form.name}</div>
          <div style={{ color: "var(--ink-soft)" }}>{form.contact}</div>
          <div style={{ color: "var(--ink-soft)" }}>{form.address}</div>
        </div>
      </Sec>

      <Sec t="Scan QRIS">
        <div style={{ background: "var(--paper)", padding: 28, textAlign: "center" }}>
          <img
            src={QRIS_IMAGE}
            alt="QRIS"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              const next = (e.target as HTMLImageElement).nextSibling as HTMLElement;
              if (next) next.style.display = "flex";
            }}
            style={{ maxWidth: 280, width: "100%", height: "auto", margin: "0 auto", display: "block" }}
          />
          <div style={{ display: "none", flexDirection: "column", alignItems: "center", padding: "40px 20px", color: "var(--ink-soft)" }}>
            {I.img}
            <span style={{ fontSize: 13, marginTop: 8 }}>QRIS image not found</span>
            <span style={{ fontSize: 11, color: "var(--paper-edge)", marginTop: 4 }}>Place QRIS at {QRIS_IMAGE}</span>
          </div>
          <div style={{
            marginTop: 16, fontSize: 18, color: "var(--copper)", fontWeight: 500,
            letterSpacing: "-0.005em", fontFamily: "var(--font-fraunces), serif",
            fontVariationSettings: '"SOFT" 30',
          }}>Total: {rp(grandTotal)}</div>
          <p style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 12, lineHeight: 1.6 }}>
            Transfer the exact amount.<br />If the amount doesn&apos;t match, we won&apos;t process the order.
          </p>
        </div>
      </Sec>

      <Sec t="Upload payment proof">
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) handleProof(f); e.target.value = ""; }} />
        {!proof ? (
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            style={{
              padding: "44px 20px", border: `1px dashed ${dragOver ? "var(--copper)" : "var(--ink-soft)"}`,
              background: dragOver ? "rgba(160,93,58,0.06)" : "transparent",
              cursor: "pointer", textAlign: "center",
              transition: "all 0.2s",
            }}
          >
            <div style={{ color: "var(--ink-soft)", marginBottom: 10 }}>{I.upload}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Drop or tap to choose screenshot</div>
            <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 6, fontStyle: "italic" }}>JPG, PNG · max 5MB</div>
          </div>
        ) : (
          <div style={{ background: "var(--paper)", overflow: "hidden" }}>
            <img src={proof} alt="Bukti" style={{ width: "100%", maxHeight: 300, objectFit: "contain", display: "block" }} />
            <div style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, color: "var(--copper)", fontWeight: 600 }}>{proofName}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => fileRef.current?.click()} style={{
                  background: "transparent", border: "1px solid var(--ink)",
                  padding: "6px 14px", fontSize: 11, letterSpacing: "0.22em",
                  textTransform: "uppercase", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                }}>Replace</button>
                <button onClick={() => { setProof(null); setProofName(""); }} style={{
                  background: "transparent", border: "none", cursor: "pointer", color: "var(--ink-soft)",
                }}>{I.trash}</button>
              </div>
            </div>
          </div>
        )}
      </Sec>

      <label style={{
        display: "flex", alignItems: "flex-start", gap: 12, padding: "20px 0 32px",
        cursor: "pointer", fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.6,
      }}>
        <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{
          accentColor: "var(--copper)", width: 18, height: 18, marginTop: 2,
        }} />
        <span>I agree to this transaction. Orders cannot be cancelled once shipped.</span>
      </label>

      <button onClick={placeOrder} disabled={!canSubmit} style={{
        width: "100%", padding: "18px",
        background: canSubmit ? "var(--ink)" : "var(--paper-edge)",
        color: "var(--cream)", border: "none",
        fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", fontWeight: 700,
        cursor: canSubmit ? "pointer" : "not-allowed", fontFamily: "inherit",
      }}>{busy ? "Processing..." : "Place order"}</button>
      <p style={{
        fontSize: 11, color: "var(--ink-soft)", textAlign: "center",
        marginTop: 14, lineHeight: 1.6, fontStyle: "italic",
      }}>We&apos;ll verify payment and contact you on WhatsApp.</p>
    </div>
  );
}
