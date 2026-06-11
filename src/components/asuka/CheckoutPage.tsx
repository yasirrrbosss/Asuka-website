"use client";
import { rp } from "@/lib/format";
import { SHIP_OPTIONS } from "@/lib/constants";
import type { CartItem, CustomerForm } from "@/lib/types";
import { Sec, BackBtn, Field } from "./shared";
import { StickyTotal } from "./StickyTotal";
import { validateName, validateWhatsApp, validateAddress, type Result } from "@/lib/validation";

export function CheckoutPage({ cart, shipment, setShipment, form, setForm, grandTotal, go }: { cart: CartItem[]; cartSubtotal: number; shipment: string | null; setShipment: (s: string) => void; form: CustomerForm; setForm: (f: CustomerForm) => void; grandTotal: number; go: (p: string) => void }) {
  const nameRes = validateName(form.name);
  const waRes = validateWhatsApp(form.contact);
  const addrRes = validateAddress(form.address);
  const allValid = nameRes.ok && waRes.ok && addrRes.ok && !!shipment;

  const showErr = (val: string, res: Result): string | undefined =>
    val.length > 0 && !res.ok ? res.reason : undefined;
  const showHint = (val: string, res: Result): string | undefined =>
    val.length > 0 && res.ok ? "✓ Looks good" : undefined;

  return (
    <>
      <div style={{ padding: "clamp(32px, 6vw, 60px) clamp(16px, 5vw, 56px) clamp(60px, 10vw, 100px)", maxWidth: 720, margin: "0 auto" }}>
        <BackBtn onClick={() => go("cart")} label="Back to cart" />
        <h2 style={{
          fontFamily: "var(--font-fraunces), serif",
          fontVariationSettings: '"SOFT" 30, "WONK" 0',
          fontSize: "clamp(48px, 6vw, 72px)", fontWeight: 450,
          color: "var(--ink)", letterSpacing: "-0.022em", marginBottom: 4, lineHeight: 1.06,
        }}>
          Delivery <em style={{
            color: "var(--copper)", fontStyle: "italic", fontWeight: 500,
            fontVariationSettings: '"SOFT" 60, "WONK" 1',
          }}>details</em>.
        </h2>
        <p style={{
          fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase",
          color: "var(--copper)", fontWeight: 700, marginBottom: 56,
        }}>Step 2 of 3</p>

        <Sec t="Order summary">
          {cart.map((it) => (
            <div key={it.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: 14, color: "var(--ink-soft)" }}>
              <span>{it.name} <span style={{ color: "var(--paper-edge)" }}>× {it.qty}</span></span>
              <span style={{ color: "var(--ink)", fontWeight: 500 }}>{rp(it.price * it.qty)}</span>
            </div>
          ))}
        </Sec>

        <Sec t="Shipping">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(160px, 100%), 1fr))", gap: 8 }}>
            {SHIP_OPTIONS.map((o) => (
              <label key={o.id} style={{
                border: shipment === o.id ? "1px solid var(--copper)" : "1px solid var(--paper-edge)",
                background: shipment === o.id ? "rgba(160,93,58,0.08)" : "transparent",
                padding: "16px 14px", textAlign: "center", cursor: "pointer",
                transition: "all 0.2s",
              }}>
                <input type="radio" name="ship" checked={shipment === o.id} onChange={() => setShipment(o.id)} style={{ display: "none" }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{o.label}</div>
                <div style={{ fontSize: 11, letterSpacing: "0.18em", color: "var(--copper)", marginTop: 6, fontWeight: 600 }}>{o.price === 0 ? "FREE" : rp(o.price).toUpperCase()}</div>
              </label>
            ))}
          </div>
        </Sec>

        <Sec t="Recipient">
          <Field
            l="Full name"
            v={form.name}
            set={(v) => setForm({ ...form, name: v })}
            ph="As on your ID"
            error={showErr(form.name, nameRes)}
            hint={showHint(form.name, nameRes)}
          />
          <Field
            l="WhatsApp"
            v={form.contact}
            set={(v) => setForm({ ...form, contact: v.replace(/[^\d+\-\s]/g, "").slice(0, 17) })}
            ph="0812-3456-7890"
            type="tel"
            inputMode="tel"
            error={showErr(form.contact, waRes)}
            hint={showHint(form.contact, waRes)}
          />
          <Field
            l="Address"
            v={form.address}
            set={(v) => setForm({ ...form, address: v })}
            ph="Street, RT/RW, Kelurahan, Kecamatan, Kota"
            multi
            error={showErr(form.address, addrRes)}
            hint={showHint(form.address, addrRes)}
          />
        </Sec>
      </div>

      <StickyTotal
        total={grandTotal}
        ctaLabel="Continue →"
        onCta={() => allValid && go("payment")}
        ctaDisabled={!allValid}
      />
    </>
  );
}
