"use client";
import { useState } from "react";
import type { ReactNode, CSSProperties } from "react";
import { Logo } from "./Logo";

export const I = {
  bag: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>,
  minus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>,
  trash: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>,
  back: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>,
  check: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
  upload: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>,
  img: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>,
};

export { Logo };

/**
 * Product image with fallback when image is missing or fails to load.
 */
export function ProdImg({ src, cat, style: sx }: { src: string; cat: string; style?: CSSProperties }) {
  const [err, setErr] = useState(false);
  if (err || !src) {
    return (
      <div style={{
        width: "100%", aspectRatio: "1/1",
        background: cat === "espresso"
          ? "linear-gradient(145deg, #2a1f17 0%, #3a2818 50%, #5a4530 100%)"
          : "linear-gradient(145deg, #3d5a3e 0%, #5a7d5c 50%, var(--copper) 100%)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden", ...sx,
      }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 30% 70%, rgba(255,255,255,.06) 0%, transparent 60%)" }} />
        <Logo variant="cream" height={32} />
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(240,235,224,.4)", marginTop: 8 }}>{cat}</span>
      </div>
    );
  }
  return (
    <div style={{ width: "100%", aspectRatio: "1/1", overflow: "hidden", ...sx }}>
      <img src={src} alt="" loading="lazy" onError={() => setErr(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
    </div>
  );
}

/** Section block — italic-heavy editorial: small uppercase label + content. */
export function Sec({ t, children }: { t: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h3 style={{ fontSize: 11, fontWeight: 700, marginBottom: 16, color: "var(--copper)", letterSpacing: "0.28em", textTransform: "uppercase" }}>{t}</h3>
      {children}
    </div>
  );
}

export function BackBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} style={{
      display: "inline-flex", alignItems: "center", gap: 10,
      background: "none", border: "none", color: "var(--copper)",
      cursor: "pointer", fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase",
      fontWeight: 700, marginBottom: 32, fontFamily: "inherit",
      paddingBottom: 4, borderBottom: "1px solid var(--copper)", width: "fit-content",
    }}>{I.back} {label}</button>
  );
}

interface FieldProps {
  l: string;
  v: string;
  set: (v: string) => void;
  ph: string;
  multi?: boolean;
  type?: string;
  inputMode?: "text" | "tel" | "numeric" | "email";
  error?: string;
  hint?: string;
}

export function Field({ l, v, set, ph, multi, type = "text", inputMode, error, hint }: FieldProps) {
  const inputStyle: CSSProperties = {
    width: "100%",
    border: "none",
    borderBottom: error ? "1px solid var(--terracotta)" : "1px solid var(--ink-soft)",
    background: "transparent",
    padding: "10px 0 9px",
    fontSize: 16,
    fontFamily: "inherit",
    color: "var(--ink)",
    outline: "none",
    resize: multi ? "vertical" : undefined,
  };
  return (
    <div style={{ marginBottom: 32 }}>
      <label style={{ display: "block", fontSize: 10, fontWeight: 600, color: "var(--copper)", marginBottom: 10, letterSpacing: "0.28em", textTransform: "uppercase" }}>{l}</label>
      {multi
        ? <textarea value={v} onChange={(e) => set(e.target.value)} placeholder={ph} rows={3} style={inputStyle} />
        : <input type={type} inputMode={inputMode} value={v} onChange={(e) => set(e.target.value)} placeholder={ph} style={inputStyle} />}
      <div style={{ minHeight: 18, marginTop: 8, fontSize: 11, letterSpacing: "0.04em" }}>
        {error
          ? <span style={{ color: "var(--terracotta)" }}>{error}</span>
          : hint ? <span style={{ color: "var(--moss)" }}>{hint}</span> : null}
      </div>
    </div>
  );
}
