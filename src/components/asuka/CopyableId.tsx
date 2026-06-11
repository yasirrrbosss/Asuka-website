"use client";
import { useState } from "react";
import { copyText } from "@/lib/clipboard";

export function CopyableId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    const ok = await copyText(id);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <button
      onClick={handle}
      aria-label="Copy order ID"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        background: "var(--paper)",
        border: "none",
        padding: "16px clamp(18px, 4vw, 28px)",
        fontFamily: "ui-monospace, 'JetBrains Mono', monospace",
        fontSize: "clamp(14px, 3vw, 18px)",
        letterSpacing: "0.12em",
        cursor: "pointer",
        color: "var(--ink)",
        transition: "background 0.2s",
        maxWidth: "100%",
        wordBreak: "break-all",
        textAlign: "left",
      }}
      onMouseOver={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "#dfd9cf";
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "var(--paper)";
      }}
    >
      {id}
      <span
        style={{
          fontSize: 13,
          opacity: 0.55,
          fontFamily: "var(--font-inter, sans-serif)",
          letterSpacing: "normal",
        }}
      >
        {copied ? "✓ Copied" : "⧉ Copy"}
      </span>
    </button>
  );
}
