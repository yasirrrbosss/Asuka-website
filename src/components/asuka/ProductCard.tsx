"use client";
import { useState, useEffect, useRef } from "react";
import { rp } from "@/lib/format";
import { isInStock, type Product } from "@/lib/types";
import { ProdImg } from "./shared";

/**
 * Atmospheric (Variant C) product card. Photo dominates; copy overlays the
 * bottom of the photo with a dark gradient so cards read as cohesive
 * "tile" units. Hover lifts + saturation bump + photo zoom.
 */
export function ProductCard({ product, addToCart, delay }: { product: Product; addToCart: (p: Product, q: number) => void; delay: number }) {
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const soldOut = !isInStock(product);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setTimeout(() => setVisible(true), delay);
        obs.disconnect();
      }
    }, { threshold: 0.05 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [delay]);

  const handleAdd = () => {
    if (soldOut) return;
    addToCart(product, 1);
  };

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={soldOut ? -1 : 0}
      aria-label={soldOut ? `${product.name} — sold out` : `Add ${product.name} to cart — ${rp(product.price)}`}
      aria-disabled={soldOut}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleAdd}
      onKeyDown={(e) => {
        if (soldOut) return;
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleAdd(); }
      }}
      style={{
        cursor: soldOut ? "not-allowed" : "pointer",
        opacity: visible ? (soldOut ? 0.55 : 1) : 0,
        transform: visible ? (hovered && !soldOut ? "translateY(-6px)" : "translateY(0)") : "translateY(28px)",
        transition: "opacity 0.7s var(--ease-out-soft), transform 0.4s var(--ease-out-soft)",
        position: "relative",
      }}
    >
      <div style={{
        aspectRatio: "5/6",
        background: "#3a2818",
        overflow: "hidden",
        position: "relative",
      }}>
        <div style={{
          width: "100%", height: "100%",
          transform: hovered && !soldOut ? "scale(1.06)" : "scale(1)",
          filter: soldOut ? "grayscale(0.4)" : (hovered ? "saturate(1.1)" : "saturate(0.95)"),
          transition: "transform 0.7s var(--ease-out-soft), filter 0.4s",
        }}>
          <ProdImg src={product.img} cat={product.cat} style={{ aspectRatio: "5/6", height: "100%" }} />
        </div>

        {soldOut && (
          <div style={{
            position: "absolute", top: 18, left: 18, zIndex: 2,
            background: "var(--terracotta)", color: "#fff",
            fontSize: 9, fontWeight: 700, letterSpacing: "0.22em",
            textTransform: "uppercase", padding: "5px 12px",
          }}>Sold Out</div>
        )}

        {/* Bottom-aligned copy overlay */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          padding: "20px 22px 22px",
          background: "linear-gradient(to top, rgba(8,5,3,0.95) 0%, rgba(8,5,3,0.85) 35%, rgba(8,5,3,0.55) 65%, rgba(8,5,3,0.15) 90%, transparent 100%)",
          color: "var(--cream)",
        }}>
          <div style={{
            fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase",
            color: "var(--gold)", fontWeight: 600, marginBottom: 6,
          }}>{product.cat} · {product.origin}</div>
          <h3 style={{
            fontFamily: "var(--font-fraunces), serif",
            fontVariationSettings: '"SOFT" 30, "WONK" 0',
            fontSize: "clamp(20px, 4.5vw, 26px)", fontWeight: 450, letterSpacing: "-0.012em",
            color: "var(--cream)", marginBottom: 4, lineHeight: 1.1,
          }}>{product.name}</h3>
          <p style={{ fontSize: 12, color: "rgba(251,247,237,0.75)", fontStyle: "italic", marginBottom: 14 }}>
            {product.notes}
          </p>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "baseline",
            paddingTop: 14, borderTop: "1px solid rgba(251,247,237,0.2)",
          }}>
            <span style={{
              fontFamily: "var(--font-fraunces), serif",
              fontVariationSettings: '"SOFT" 30',
              fontSize: "clamp(17px, 3.5vw, 20px)", color: "var(--gold)", fontWeight: 500,
            }}>{rp(product.price)}</span>
            <span style={{
              fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase",
              color: "var(--cream)", fontWeight: 600,
              display: "inline-flex", alignItems: "center", gap: hovered && !soldOut ? 14 : 6,
              transition: "gap 0.3s",
            }}>{soldOut ? "Sold out" : "Add →"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
