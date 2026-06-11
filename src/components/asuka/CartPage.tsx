"use client";
import type { CSSProperties } from "react";
import { rp } from "@/lib/format";
import type { CartItem } from "@/lib/types";
import { I, ProdImg, BackBtn } from "./shared";

const qtyBtn: CSSProperties = {
  width: 32, height: 32, border: "1px solid var(--paper-edge)",
  background: "transparent", cursor: "pointer", color: "var(--ink)",
  display: "flex", alignItems: "center", justifyContent: "center",
};

export function CartPage({ cart, updateQty, removeFromCart, cartSubtotal, go }: { cart: CartItem[]; updateQty: (id: string, d: number) => void; removeFromCart: (id: string) => void; cartSubtotal: number; go: (p: string) => void }) {
  if (!cart.length) {
    return (
      <div style={{ textAlign: "center", padding: "120px 24px 80px", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ color: "var(--paper-edge)", marginBottom: 18 }}>{I.bag}</div>
        <h2 style={{
          fontFamily: "var(--font-fraunces), serif",
          fontVariationSettings: '"SOFT" 30, "WONK" 0',
          fontSize: 52, fontWeight: 450, color: "var(--ink)",
          letterSpacing: "-0.022em", lineHeight: 1.06,
        }}>
          Your cart<br /><em style={{
            color: "var(--copper)", fontStyle: "italic", fontWeight: 500,
            fontVariationSettings: '"SOFT" 60, "WONK" 1',
          }}>is empty</em>.
        </h2>
        <p style={{ color: "var(--ink-soft)", marginTop: 16, fontSize: 14 }}>No beans yet. Browse our collection.</p>
        <button onClick={() => go("home")} style={{
          marginTop: 32, background: "var(--ink)", color: "var(--cream)",
          border: "none", padding: "16px 36px",
          fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit",
        }}>Browse beans →</button>
      </div>
    );
  }
  return (
    <div style={{ padding: "clamp(32px, 6vw, 60px) clamp(16px, 5vw, 56px) clamp(48px, 8vw, 80px)", maxWidth: 760, margin: "0 auto" }}>
      <BackBtn onClick={() => go("home")} label="Continue shopping" />
      <h2 style={{
        fontFamily: "var(--font-fraunces), serif",
        fontVariationSettings: '"SOFT" 30, "WONK" 0',
        fontSize: "clamp(48px, 6vw, 72px)", fontWeight: 450,
        color: "var(--ink)", letterSpacing: "-0.022em", marginBottom: 4, lineHeight: 1.06,
      }}>
        Your <em style={{
          color: "var(--copper)", fontStyle: "italic", fontWeight: 500,
          fontVariationSettings: '"SOFT" 60, "WONK" 1',
        }}>cart</em>.
      </h2>
      <p style={{
        fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase",
        color: "var(--copper)", fontWeight: 700, marginBottom: 48,
      }}>{cart.length} {cart.length === 1 ? "item" : "items"}</p>
      {cart.map((it) => (
        <div key={it.id} className="cart-row" style={{
          padding: "20px 0", borderBottom: "1px solid var(--paper-edge)",
        }}>
          <div className="cart-row-thumb" style={{ overflow: "hidden" }}>
            <ProdImg src={it.img} cat={it.cat} style={{ aspectRatio: "1/1" }} />
          </div>
          <div className="cart-row-info" style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: "var(--font-fraunces), serif",
              fontVariationSettings: '"SOFT" 30',
              fontSize: 22, fontWeight: 500, color: "var(--ink)",
              letterSpacing: "-0.012em",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{it.name}</div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 4, fontStyle: "italic" }}>{it.weight} · {rp(it.price)}</div>
          </div>
          <div className="cart-row-qty" style={{ display: "flex", alignItems: "center" }}>
            <button onClick={() => updateQty(it.id, -1)} style={qtyBtn}>{I.minus}</button>
            <span style={{ width: 36, textAlign: "center", fontSize: 14, fontWeight: 600 }}>{it.qty}</span>
            <button onClick={() => updateQty(it.id, 1)} style={qtyBtn}>{I.plus}</button>
          </div>
          <div className="cart-row-sum" style={{
            textAlign: "right", fontWeight: 500, fontSize: 18,
            color: "var(--copper)", fontFamily: "var(--font-fraunces), serif",
            fontVariationSettings: '"SOFT" 30',
          }}>{rp(it.price * it.qty)}</div>
          <button className="cart-row-trash" onClick={() => removeFromCart(it.id)} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--paper-edge)", padding: 6,
          }}>{I.trash}</button>
        </div>
      ))}
      <style>{`
        .cart-row {
          display: grid;
          grid-template-columns: 80px 1fr auto auto auto;
          grid-template-areas: "thumb info qty sum trash";
          align-items: center;
          gap: 20px;
        }
        .cart-row-thumb { grid-area: thumb; width: 80px; height: 80px; }
        .cart-row-info  { grid-area: info; }
        .cart-row-qty   { grid-area: qty; }
        .cart-row-sum   { grid-area: sum; min-width: 100px; }
        .cart-row-trash { grid-area: trash; }

        @media (max-width: 560px) {
          .cart-row {
            grid-template-columns: 64px 1fr auto;
            grid-template-areas:
              "thumb info  trash"
              "thumb qty   sum";
            row-gap: 10px;
            column-gap: 14px;
          }
          .cart-row-thumb { width: 64px; height: 64px; }
          .cart-row-sum   { min-width: 0; font-size: 16px; }
        }
      `}</style>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--ink)",
      }}>
        <span style={{
          fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase",
          color: "var(--copper)", fontWeight: 700,
        }}>Subtotal</span>
        <span style={{
          fontSize: 36, fontWeight: 500, color: "var(--ink)",
          fontFamily: "var(--font-fraunces), serif",
          fontVariationSettings: '"SOFT" 30',
        }}>{rp(cartSubtotal)}</span>
      </div>
      <button onClick={() => go("checkout")} style={{
        width: "100%", marginTop: 32,
        background: "var(--ink)", color: "var(--cream)", border: "none", padding: "18px",
        fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", fontWeight: 700,
        cursor: "pointer", fontFamily: "inherit",
      }}>Continue to checkout →</button>
    </div>
  );
}
