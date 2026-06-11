"use client";
import { useEffect, useRef, useState } from "react";

export interface TimelineStep {
  label: string;
  reached: boolean;
  current?: boolean;
}

export function Timeline({ steps }: { steps: TimelineStep[] }) {
  const [animated, setAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setAnimated(true);
          obs.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  const reachedCount = steps.filter((s) => s.reached).length;
  const progressPct = steps.length > 1 ? ((reachedCount - 1) / (steps.length - 1)) * 100 : 0;

  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        justifyContent: "space-between",
        margin: "32px 0",
        position: "relative",
        padding: "0 8px",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 11,
          left: "6%",
          right: "6%",
          height: 1,
          background: "var(--paper-edge)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 11,
          left: "6%",
          height: 1,
          background: "var(--moss)",
          width: animated ? `${Math.max(0, progressPct) * 0.88}%` : 0,
          transition: "width 1.4s ease-out",
        }}
      />
      {steps.map((s, i) => (
        <div
          key={s.label}
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: s.reached || s.current ? "var(--ink)" : "var(--muted)",
            fontWeight: s.reached || s.current ? 600 : 500,
            position: "relative",
            zIndex: 1,
            opacity: animated ? 1 : 0,
            transform: animated ? "translateY(0)" : "translateY(8px)",
            transition: `opacity 0.5s ease ${i * 0.15}s, transform 0.5s ease ${i * 0.15}s`,
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: s.reached || s.current ? "var(--moss)" : "#d4cfc4",
              border: "5px solid var(--bone)",
              marginBottom: 12,
              boxShadow: s.current ? "0 0 0 6px rgba(61,90,62,0.18)" : "none",
              transition: "all 0.3s",
            }}
          />
          {s.label}
        </div>
      ))}
    </div>
  );
}
