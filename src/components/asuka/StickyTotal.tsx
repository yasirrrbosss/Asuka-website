"use client";
import { rp } from "@/lib/format";

interface StickyTotalProps {
  total: number;
  label?: string;
  ctaLabel: string;
  onCta: () => void;
  ctaDisabled?: boolean;
}

export function StickyTotal({
  total,
  label = "Total",
  ctaLabel,
  onCta,
  ctaDisabled,
}: StickyTotalProps) {
  return (
    <div
      style={{
        position: "sticky",
        bottom: 0,
        left: 0,
        right: 0,
        background: "var(--bone)",
        borderTop: "1px solid var(--paper-edge)",
        padding: "14px clamp(16px, 5vw, 56px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        zIndex: 40,
        boxShadow: "0 -8px 24px rgba(0,0,0,0.04)",
      }}
    >
      <div>
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--copper)",
            fontWeight: 700,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: "clamp(22px, 5vw, 28px)",
            fontWeight: 500,
            color: "var(--ink)",
            marginTop: 2,
            fontFamily: "var(--font-fraunces), serif",
            fontVariationSettings: '"SOFT" 30',
          }}
        >
          {rp(total)}
        </div>
      </div>
      <button
        onClick={onCta}
        disabled={ctaDisabled}
        style={{
          padding: "14px clamp(18px, 5vw, 32px)",
          background: ctaDisabled ? "var(--paper-edge)" : "var(--ink)",
          color: "var(--cream)",
          border: "none",
          fontSize: 11,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          fontWeight: 700,
          cursor: ctaDisabled ? "not-allowed" : "pointer",
          fontFamily: "inherit",
          transition: "background 0.2s",
          whiteSpace: "nowrap",
        }}
      >
        {ctaLabel}
      </button>
    </div>
  );
}
