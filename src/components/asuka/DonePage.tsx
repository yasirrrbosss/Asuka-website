"use client";
import { Logo } from "./Logo";
import { CopyableId } from "./CopyableId";
import { WHATSAPP_NUMBER } from "@/lib/constants";

export function DonePage({ go, oid }: { go: (p: string) => void; oid: string | null }) {
  const waMessage = encodeURIComponent(`Hi Asuka Brewing, I'd like to follow up on order ${oid ?? ""}. Thank you!`);
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${waMessage}`;

  return (
    <div style={{
      textAlign: "center", padding: "clamp(64px, 14vw, 120px) clamp(16px, 5vw, 56px) clamp(48px, 8vw, 80px)",
      maxWidth: 560, margin: "0 auto", animation: "scaleIn 0.5s ease",
    }}>
      <div style={{ marginBottom: 32, display: "flex", justifyContent: "center" }}>
        <Logo variant="dark" height={64} />
      </div>
      <div style={{ fontSize: 64, color: "var(--copper)", marginBottom: 8, fontWeight: 300, lineHeight: 1 }}>✓</div>
      <h2 style={{
        fontFamily: "var(--font-fraunces), serif",
        fontVariationSettings: '"SOFT" 60, "WONK" 1',
        fontSize: "clamp(48px, 6vw, 72px)", fontStyle: "italic",
        fontWeight: 450, color: "var(--ink)", letterSpacing: "-0.024em", lineHeight: 1.06,
      }}>Thank you.</h2>

      {oid && (
        <>
          <div style={{
            fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase",
            color: "var(--copper)", fontWeight: 700, marginTop: 56, marginBottom: 14,
          }}>Your order ID</div>
          <CopyableId id={oid} />
          <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 16, fontStyle: "italic" }}>
            Save this ID — you&apos;ll need it to track your order.
          </p>
        </>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 56, alignItems: "center" }}>
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            width: 280, maxWidth: "100%", padding: "16px 32px",
            background: "var(--ink)", color: "var(--cream)",
            fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", fontWeight: 700,
            textAlign: "center", cursor: "pointer",
          }}
        >Message us on WhatsApp</a>
        <button onClick={() => go("track")} style={{
          width: 280, maxWidth: "100%", padding: "16px 32px",
          background: "transparent", color: "var(--ink)", border: "1px solid var(--ink)",
          fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", fontWeight: 700,
          cursor: "pointer", fontFamily: "inherit",
        }}>Track order</button>
      </div>
    </div>
  );
}
