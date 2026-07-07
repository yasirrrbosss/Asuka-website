"use client";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import type { Product } from "@/lib/types";
import { HERO_PHOTOS, GOOGLE_MAPS_PLACE_URL } from "@/lib/constants";
import { ProductCard } from "./ProductCard";
import { ProductCardSkeleton } from "./Skeleton";

interface HomeProps {
  heroOk: boolean;
  filter: string;
  setFilter: (f: string) => void;
  addToCart: (p: Product, q: number) => void;
  products: Product[];
  productsLoading: boolean;
  productsError: string | null;
}

export function HomePage({ heroOk, filter, setFilter, addToCart, products, productsLoading, productsError }: HomeProps) {
  const [retried, setRetried] = useState(0);
  const filtered = products.filter((p) => filter === "all" || p.cat === filter);

  // Reveal-on-scroll for sections
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const els = containerRef.current.querySelectorAll<HTMLElement>(".reveal");
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add("in"), i * 60);
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div ref={containerRef}>
      {/* ── HERO: dual full-bleed photos ── */}
      <section style={{
        position: "relative",
        height: "100vh",
        minHeight: 680,
        width: "100%",
        overflow: "hidden",
        color: "var(--cream)",
        display: "grid",
        gridTemplateColumns: "1.2fr 1fr",
        opacity: heroOk ? 1 : 0,
        transition: "opacity 0.8s ease",
      }} className="hero-grid">
        {/* MAIN side */}
        <div style={{ position: "relative", overflow: "hidden" }}>
          <Image
            src={HERO_PHOTOS.pour}
            alt="Coffee being poured"
            fill
            priority
            sizes="(max-width: 880px) 100vw, 55vw"
            style={{ objectFit: "cover" }}
          />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, rgba(14,9,5,0.55) 0%, rgba(14,9,5,0.32) 35%, rgba(8,5,3,0.95) 100%)",
          }} />
          <div style={{
            position: "absolute", inset: 0, zIndex: 2,
            display: "flex", flexDirection: "column", justifyContent: "flex-end",
            padding: "clamp(40px, 8vw, 80px) clamp(20px, 5vw, 72px) clamp(40px, 8vw, 80px)",
          }}>
            <div style={{
              fontSize: 10, letterSpacing: "0.4em", textTransform: "uppercase",
              fontWeight: 600, color: "var(--gold)", marginBottom: 24,
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <span style={{ width: 36, height: 1, background: "var(--gold)" }} />
              Asuka Brewing &amp; Space
            </div>
            <h1 style={{
              fontFamily: "var(--font-fraunces), serif",
              fontVariationSettings: '"SOFT" 30, "WONK" 0',
              fontWeight: 450,
              fontSize: "clamp(34px, 7vw, 84px)",
              lineHeight: 1.06,
              letterSpacing: "-0.022em",
              color: "var(--cream)",
              marginBottom: 24,
            }}>
              A space for{" "}
              <em style={{
                color: "var(--gold)", fontStyle: "italic", fontWeight: 500,
                fontVariationSettings: '"SOFT" 60, "WONK" 1',
              }}>slow coffee</em>,
              <br />roasted in Pejaten.
            </h1>
            <p style={{
              fontSize: "clamp(13px, 1.6vw, 17px)",
              fontWeight: 400,
              color: "rgba(251,247,237,0.9)",
              letterSpacing: "0.01em",
              marginBottom: 24,
              lineHeight: 1.55,
              maxWidth: 520,
              fontFamily: "var(--font-inter), sans-serif",
            }}>
              From the very beginning, every roast has been our own — crafted with care, cup after cup. Where your perception finds its place.
            </p>
            <a
              href="#collection"
              style={{
                display: "inline-flex", alignItems: "center", gap: 14,
                fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase",
                fontWeight: 600, color: "var(--cream)",
                paddingBottom: 6, borderBottom: "1px solid var(--gold)",
                width: "fit-content", marginTop: 8, cursor: "pointer",
              }}
            >Shop the beans →</a>
          </div>
        </div>

        {/* ASIDE — beans + spinning stamp */}
        <div style={{ position: "relative", background: "var(--ink)", color: "var(--cream)" }}>
          <Image
            src={HERO_PHOTOS.beans}
            alt="Coffee beans"
            fill
            sizes="(max-width: 880px) 100vw, 45vw"
            style={{ objectFit: "cover", opacity: 0.55 }}
          />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, rgba(14,9,5,0.7), rgba(8,5,3,0.95))",
          }} />

          {/* Spinning stamp */}
          <div className="hero-stamp" style={{
            position: "absolute",
            top: "50%", left: "50%",
            width: "min(240px, 55vw)", height: "min(240px, 55vw)",
            borderRadius: "50%",
            border: "1px solid rgba(232,184,112,0.42)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "stampSpin 32s linear infinite",
            transform: "translate(-50%, -50%)",
            zIndex: 1,
          }}>
            <svg viewBox="0 0 240 240" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              <defs>
                <path id="stampCircle" d="M 120, 120 m -100, 0 a 100,100 0 1,1 200,0 a 100,100 0 1,1 -200,0" fill="none" />
              </defs>
              <text fill="#e8b870" fontFamily="Inter" fontSize="11" letterSpacing="3" fontWeight="600">
                <textPath href="#stampCircle">ASUKA · BREWING &amp; SPACE · EST 2025 </textPath>
              </text>
            </svg>
            <img
              src="/images/logo-green.png"
              alt="Asuka Brewing & Space"
              style={{
                width: "36%",
                maxWidth: 92,
                height: "auto",
                display: "block",
                objectFit: "contain",
              }}
            />
          </div>

          <div style={{
            position: "absolute", inset: 0, zIndex: 2,
            display: "flex", flexDirection: "column",
            padding: "clamp(40px, 8vw, 80px) clamp(20px, 5vw, 40px)",
          }}>
            <div style={{
              fontSize: 10, letterSpacing: "0.4em", textTransform: "uppercase",
              color: "rgba(251,247,237,0.6)", fontWeight: 600, marginBottom: "auto",
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <span style={{ width: 36, height: 1, background: "rgba(251,247,237,0.45)" }} />
              Visit · Jakarta Selatan
            </div>
            <a
              href="#the-space"
              style={{
                display: "inline-flex", alignItems: "center", gap: 14,
                fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase",
                fontWeight: 600, color: "var(--gold)",
                paddingBottom: 6, borderBottom: "1px solid rgba(232,184,112,0.5)",
                width: "fit-content", cursor: "pointer",
              }}
            >Find the space →</a>
          </div>
        </div>
      </section>

      {/* ── INTRO QUOTE ── */}
      <section style={{
        padding: "var(--section-gap) clamp(20px, 5vw, 56px) var(--section-gap-tight)",
        maxWidth: 920, margin: "0 auto", textAlign: "center",
      }}>
        <div className="reveal" style={{
          fontSize: 11, letterSpacing: "0.32em", textTransform: "uppercase",
          color: "var(--copper)", fontWeight: 700, marginBottom: 32,
        }}>— Built on consistency</div>
        <p className="reveal" style={{
          fontFamily: "var(--font-fraunces), serif",
          fontVariationSettings: '"SOFT" 50, "WONK" 1',
          fontSize: "clamp(28px, 3.5vw, 48px)",
          fontStyle: "italic", fontWeight: 450,
          lineHeight: 1.28, letterSpacing: "-0.014em",
          color: "var(--ink-soft)",
        }}>
          Every coffee is carefully profiled, roasted, and evaluated to make sure each batch tastes the way it should.
          <br /><br />
          <span style={{
            color: "var(--copper)", fontStyle: "normal",
            fontVariationSettings: '"SOFT" 30, "WONK" 0',
          }}>Sweetness, clarity, and balance</span> — consistently in every cup.
        </p>
        <div className="reveal" style={{
          marginTop: 36, fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase",
          color: "var(--ink-soft)", fontWeight: 600,
        }}>— A Note from the Roaster</div>
      </section>

      {/* ── PRODUCTS ── */}
      <section id="collection" style={{
        padding: "var(--section-gap-tight) clamp(20px, 5vw, 56px) var(--section-gap)",
        maxWidth: 1320, margin: "0 auto",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-end",
          marginBottom: "clamp(40px, 6vw, 80px)", flexWrap: "wrap", gap: 20,
        }}>
          <div>
            <div className="reveal" style={{
              fontSize: 11, letterSpacing: "0.32em", textTransform: "uppercase",
              color: "var(--copper)", fontWeight: 700, marginBottom: 14,
            }}>— Single-origin · Small batches</div>
            <h2 className="reveal" style={{
              fontFamily: "var(--font-fraunces), serif",
              fontVariationSettings: '"SOFT" 30, "WONK" 0',
              fontSize: "clamp(40px, 5vw, 72px)",
              fontWeight: 450, letterSpacing: "-0.022em", lineHeight: 1.04,
            }}>
              The <em style={{
                color: "var(--copper)", fontStyle: "italic", fontWeight: 500,
                fontVariationSettings: '"SOFT" 60, "WONK" 1',
              }}>collection</em>.
            </h2>
          </div>
          <div style={{
            display: "flex", gap: 6, alignItems: "center",
            fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase",
            color: "var(--ink-soft)", fontWeight: 500,
          }}>
            {[{ k: "all", l: "All" }, { k: "filter", l: "Filter" }, { k: "espresso", l: "Espresso" }].map((f) => (
              <button key={f.k} onClick={() => setFilter(f.k)} style={{
                padding: "4px 14px", borderRadius: 999, cursor: "pointer",
                border: "none", background: filter === f.k ? "var(--ink)" : "transparent",
                color: filter === f.k ? "var(--bone)" : "var(--ink-soft)",
                fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase",
                fontWeight: 600, fontFamily: "inherit",
                transition: "all 0.2s",
              }}>{f.l}</button>
            ))}
          </div>
        </div>

        {productsLoading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: "clamp(28px, 5vw, 48px) clamp(20px, 3vw, 32px)" }}>
            {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        )}

        {!productsLoading && productsError && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <p style={{ fontSize: 14, color: "var(--terracotta)", marginBottom: 18 }}>{productsError}</p>
            <button onClick={() => { setRetried((n) => n + 1); window.location.reload(); }} style={{
              background: "var(--ink)", color: "var(--bone)", border: "none",
              padding: "14px 32px", fontSize: 11, letterSpacing: "0.25em",
              textTransform: "uppercase", fontWeight: 700, cursor: "pointer",
              fontFamily: "inherit",
            }}>Try again {retried > 0 ? `(${retried})` : ""}</button>
          </div>
        )}

        {!productsLoading && !productsError && products.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <h3 style={{ fontFamily: "var(--font-fraunces), serif", fontVariationSettings: '"SOFT" 30', fontSize: 28, color: "var(--muted)", marginBottom: 8 }}>No beans yet</h3>
            <p style={{ fontSize: 13, color: "var(--muted)" }}>New roasts are on the way.</p>
          </div>
        )}

        {!productsLoading && !productsError && products.length > 0 && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
            <p style={{ fontSize: 14 }}>No beans in this category yet.</p>
          </div>
        )}

        {!productsLoading && !productsError && filtered.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: "clamp(28px, 5vw, 48px) clamp(20px, 3vw, 32px)" }}>
            {filtered.map((p, i) => <ProductCard key={p.id} product={p} addToCart={addToCart} delay={i * 60} />)}
          </div>
        )}
      </section>

      {/* ── THE SPACE — full bleed atmospheric ── */}
      <section id="the-space" style={{
        position: "relative", height: "80vh", minHeight: 540,
        overflow: "hidden", color: "var(--cream)",
      }}>
        <Image
          src={HERO_PHOTOS.cafeInterior}
          alt="Cafe interior"
          fill
          sizes="100vw"
          style={{ objectFit: "cover" }}
        />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to right, rgba(8,5,3,0.92) 0%, rgba(14,9,5,0.55) 55%, rgba(14,9,5,0.05) 100%)",
        }} />
        <div style={{
          position: "absolute", inset: 0, zIndex: 1,
          display: "flex", alignItems: "center",
          padding: "0 clamp(32px, 8vw, 128px)",
          maxWidth: 760,
        }}>
          <div>
            <div className="reveal" style={{
              fontSize: 11, letterSpacing: "0.32em", textTransform: "uppercase",
              color: "var(--gold)", fontWeight: 700, marginBottom: 14,
            }}>— The Space</div>
            <h2 className="reveal" style={{
              fontFamily: "var(--font-fraunces), serif",
              fontVariationSettings: '"SOFT" 30, "WONK" 0',
              fontSize: "clamp(48px, 6vw, 84px)",
              fontWeight: 450, letterSpacing: "-0.024em", lineHeight: 1.06,
              color: "var(--cream)", marginBottom: 24,
            }}>
              A room built<br />for{" "}
              <em style={{
                color: "var(--gold)", fontStyle: "italic", fontWeight: 500,
                fontVariationSettings: '"SOFT" 60, "WONK" 1',
              }}>conversation</em>.
            </h2>
            <p className="reveal" style={{
              fontSize: 15, lineHeight: 1.65, maxWidth: 440,
              marginBottom: 32, color: "rgba(251,247,237,0.88)",
            }}>
              Industrial steel, warm wood, and the smell of fresh roast. Drop by our space in Pejaten — sit with a cup, watch us pour. Take some beans home, or stay until sundown.
            </p>
            <a
              className="reveal"
              href={GOOGLE_MAPS_PLACE_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex", alignItems: "center", gap: 14,
                color: "var(--gold)", fontSize: 11, letterSpacing: "0.28em",
                textTransform: "uppercase", fontWeight: 600, cursor: "pointer",
                paddingBottom: 6, borderBottom: "1px solid var(--gold)",
                width: "fit-content",
              }}
            >Get directions →</a>
          </div>
        </div>
      </section>

      {/* ── RITUAL HOURS ── */}
      <section style={{
        padding: "var(--section-gap) clamp(20px, 5vw, 56px)",
        maxWidth: 1240, margin: "0 auto",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(40px, 6vw, 80px)",
        alignItems: "start",
      }} className="ritual-grid">
        <div>
          <div className="reveal" style={{
            fontSize: 11, letterSpacing: "0.32em", textTransform: "uppercase",
            color: "var(--copper)", fontWeight: 700, marginBottom: 14,
          }}>— Open hours</div>
          <h2 className="reveal" style={{
            fontFamily: "var(--font-fraunces), serif",
            fontVariationSettings: '"SOFT" 30, "WONK" 0',
            fontSize: "clamp(40px, 5vw, 72px)",
            fontWeight: 450, letterSpacing: "-0.022em", lineHeight: 1.04,
          }}>
            Our <em style={{
              color: "var(--copper)", fontStyle: "italic", fontWeight: 500,
              fontVariationSettings: '"SOFT" 60, "WONK" 1',
            }}>ritual</em>,<br />your time.
          </h2>
          <p className="reveal" style={{
            fontSize: 15, lineHeight: 1.7, color: "var(--ink-soft)",
            marginTop: 24, maxWidth: 420,
          }}>
            Open every day at our Pejaten space. Best filter coffee in the morning. Best conversation after sunset.
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {[
            { day: "Mon — Fri", time: "8 am — 1 am" },
            { day: "Sat — Sun", time: "8 am — 1 am" },
            { day: "Public holidays", time: "Open as usual", closed: false },
          ].map((row) => (
            <div key={row.day} className="reveal" style={{
              padding: "24px 0", borderBottom: "1px solid var(--paper)",
              display: "grid", gridTemplateColumns: "120px 1fr", gap: 32, alignItems: "baseline",
            }}>
              <span style={{ fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "var(--copper)", fontWeight: 700 }}>{row.day}</span>
              <span style={{
                fontFamily: row.closed ? "var(--font-inter), sans-serif" : "var(--font-fraunces), serif",
                fontVariationSettings: row.closed ? "normal" : '"SOFT" 60, "WONK" 1',
                fontSize: row.closed ? 14 : 26,
                fontWeight: row.closed ? 600 : 450,
                color: row.closed ? "rgba(14,9,5,0.45)" : "var(--ink)",
                fontStyle: row.closed ? "normal" : "italic",
                letterSpacing: row.closed ? "0.18em" : 0,
                textTransform: row.closed ? "uppercase" : "none",
              }}>{row.time}</span>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        @media (max-width: 880px) {
          .hero-grid { grid-template-columns: 1fr !important; height: auto !important; min-height: auto !important; }
          .hero-grid > div { height: 70vh; min-height: 520px; }
          .ritual-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
        }
        @media (max-width: 560px) {
          .hero-grid > div { height: 64vh; min-height: 460px; }
        }
      `}</style>
    </div>
  );
}
