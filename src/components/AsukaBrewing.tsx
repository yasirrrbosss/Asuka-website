"use client";
import { useState, useEffect } from "react";
import { fetchProducts } from "@/lib/products";
import { compressImageForUpload } from "@/lib/format";
import { SHIP_OPTIONS, WHATSAPP_NUMBER } from "@/lib/constants";
import type { Product, CartItem, CustomerForm } from "@/lib/types";
import { Logo } from "./asuka/shared";
import { HomePage } from "./asuka/HomePage";
import { CartPage } from "./asuka/CartPage";
import { CheckoutPage } from "./asuka/CheckoutPage";
import { PaymentPage } from "./asuka/PaymentPage";
import { DonePage } from "./asuka/DonePage";
import { TrackPage } from "./asuka/TrackPage";

export default function AsukaBrewing() {
  const [page, setPage] = useState("home");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [filter, setFilter] = useState("all");
  const [shipment, setShipment] = useState<string | null>(null);
  const [form, setForm] = useState<CustomerForm>({ name: "", contact: "", address: "" });
  const [proof, setProof] = useState<string | null>(null);
  const [proofName, setProofName] = useState("");
  const [fade, setFade] = useState(true);
  const [notif, setNotif] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [oid, setOid] = useState<string | null>(null);
  const [heroOk, setHeroOk] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => { setTimeout(() => setHeroOk(true), 100); }, []);

  // Nav-state: transparent over hero on home page, solid otherwise
  useEffect(() => {
    if (page !== "home") {
      setScrolled(true);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight - 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [page]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setProductsLoading(true);
      setProductsError(null);
      try {
        const data = await fetchProducts();
        if (mounted) setProducts(data);
      } catch (e) {
        console.error("Failed to load products:", e);
        if (mounted) setProductsError("Couldn't load products. Check your connection.");
      } finally {
        if (mounted) setProductsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const go = (p: string) => {
    setFade(false);
    setTimeout(() => {
      setPage(p);
      setFade(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 220);
  };
  const toast = (m: string) => { setNotif(m); setTimeout(() => setNotif(null), 2500); };

  const addToCart = (product: Product, qty: number) => {
    if (qty < 1) return;
    setCart((prev) => {
      const ex = prev.find((i) => i.id === product.id);
      if (ex) return prev.map((i) => i.id === product.id ? { ...i, qty: i.qty + qty } : i);
      return [...prev, { ...product, qty }];
    });
    toast(`${product.name} × ${qty} added to cart`);
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => prev.map((i) => i.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter((i) => i.qty > 0));
  };

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));

  const cartSubtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const shipPrice = shipment ? SHIP_OPTIONS.find((o) => o.id === shipment)?.price ?? 0 : 0;
  const grandTotal = cartSubtotal + shipPrice;

  const handleProof = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast("File max 5MB."); return; }
    if (!file.type.startsWith("image/")) { toast("Image files only."); return; }
    try { const b = await compressImageForUpload(file); setProof(b); setProofName(file.name); }
    catch { toast("Upload failed."); }
  };

  const placeOrder = async () => {
    setBusy(true);
    try {
      // The server prices the order from the real catalog + shipping table,
      // writes it, and decrements stock. Prices/total are NOT trusted from here.
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((i) => ({ id: i.id, qty: i.qty })),
          shipment,
          customer: form,
          paymentProof: proof || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data?.error || "Order gagal. Coba lagi.");
        return;
      }

      // Telegram notification is sent server-side by /api/order.
      setOid(data.id);
      setCart([]);
      setForm({ name: "", contact: "", address: "" });
      setShipment(null);
      setProof(null); setProofName("");
      setAgreed(false);
      go("done");
    } catch (e) {
      console.error(e);
      toast("Order failed. Check your connection.");
    } finally {
      setBusy(false);
    }
  };

  const navOnDark = page === "home" && !scrolled;

  return (
    <div style={{
      background: "var(--bone)",
      color: "var(--ink)",
      minHeight: "100vh",
      fontFamily: "var(--font-inter), 'Inter', system-ui, sans-serif",
    }}>
      {/* NAV: transparent over hero on home, solid cream elsewhere */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: navOnDark ? "20px clamp(16px, 5vw, 56px)" : "12px clamp(16px, 5vw, 56px)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: navOnDark ? "transparent" : "rgba(240,235,224,0.95)",
        backdropFilter: navOnDark ? "none" : "blur(18px)",
        WebkitBackdropFilter: navOnDark ? "none" : "blur(18px)",
        color: navOnDark ? "var(--cream)" : "var(--ink)",
        boxShadow: navOnDark ? "none" : "0 1px 0 var(--paper-edge)",
        transition: "all 0.4s",
      }}>
        <button
          type="button"
          onClick={() => go("home")}
          aria-label="Asuka — back to home"
          style={{
            fontFamily: "var(--font-fraunces), serif",
            fontVariationSettings: '"SOFT" 30',
            fontSize: "clamp(15px, 3vw, 18px)",
            letterSpacing: "clamp(0.3em, 1vw, 0.45em)",
            fontWeight: 600,
            textTransform: "uppercase",
            cursor: "pointer",
            color: "inherit",
            background: "none",
            border: "none",
            padding: 0,
          }}
        >ASUKA</button>
        <div style={{ display: "flex", gap: "clamp(14px, 3vw, 32px)", alignItems: "center" }}>
          <button type="button" onClick={() => go("track")} aria-label="Track your order" style={{
            fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase",
            cursor: "pointer", fontWeight: 500, color: "inherit",
            background: "none", border: "none", padding: 0, fontFamily: "inherit",
          }}>Track</button>
          <button type="button" onClick={() => go("cart")} aria-label={`Cart, ${cartCount} ${cartCount === 1 ? "item" : "items"}`} style={{
            position: "relative", display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 16px", border: "1px solid currentColor", borderRadius: 999,
            fontSize: 11, letterSpacing: "0.22em", textTransform: "uppercase",
            cursor: "pointer", fontWeight: 600, color: "inherit",
            background: "transparent", fontFamily: "inherit",
          }}>
            Cart
            {cartCount > 0 && (
              <span style={{
                background: "var(--terracotta)", color: "#fff",
                fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 10,
                letterSpacing: 0,
              }}>{cartCount}</span>
            )}
          </button>
        </div>
      </nav>

      {/* Spacer when nav is on light surface (so it doesn't cover content) */}
      {!navOnDark && <div style={{ height: 60 }} />}

      {/* TOAST */}
      {notif && (
        <div style={{
          position: "fixed", top: 80, right: "clamp(12px, 4vw, 20px)", left: "clamp(12px, 4vw, auto)",
          maxWidth: "calc(100vw - 24px)", zIndex: 200,
          background: "var(--ink)", color: "var(--cream)",
          padding: "12px 22px", fontSize: 12, fontWeight: 500,
          letterSpacing: "0.05em",
          boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
          animation: "slideIn 0.3s ease",
        }}>{notif}</div>
      )}

      {/* PAGES */}
      <main style={{ opacity: fade ? 1 : 0, transition: "opacity 0.22s ease" }}>
        {page === "home" && <HomePage heroOk={heroOk} filter={filter} setFilter={setFilter} addToCart={addToCart} products={products} productsLoading={productsLoading} productsError={productsError} />}
        {page === "cart" && <CartPage cart={cart} updateQty={updateQty} removeFromCart={removeFromCart} cartSubtotal={cartSubtotal} go={go} />}
        {page === "checkout" && <CheckoutPage cart={cart} cartSubtotal={cartSubtotal} shipment={shipment} setShipment={setShipment} form={form} setForm={setForm} grandTotal={grandTotal} go={go} />}
        {page === "payment" && <PaymentPage grandTotal={grandTotal} proof={proof} proofName={proofName} handleProof={handleProof} setProof={setProof} setProofName={setProofName} agreed={agreed} setAgreed={setAgreed} placeOrder={placeOrder} busy={busy} go={go} cart={cart} shipment={shipment} form={form} />}
        {page === "done" && <DonePage go={go} oid={oid} />}
        {page === "track" && <TrackPage go={go} initialOid={oid} />}
      </main>

      {/* FOOTER */}
      <footer style={{
        background: "var(--ink)", color: "var(--cream)",
        padding: "clamp(48px, 9vw, 80px) clamp(20px, 5vw, 56px) clamp(28px, 5vw, 40px)",
        textAlign: "center",
      }}>
        <Logo variant="cream" height={64} />
        <p style={{
          fontSize: 11, color: "rgba(251,247,237,0.62)",
          letterSpacing: "0.1em", lineHeight: 1.8, marginTop: 24,
        }}>Pejaten Raya 14, Jakarta Selatan<br />Roasted in small batches · Shipped from Pejaten</p>
        <div style={{ marginTop: 32, display: "flex", justifyContent: "center", gap: "clamp(16px, 4vw, 32px)", flexWrap: "wrap" }}>
          <a href="https://instagram.com/asukabrewspace" target="_blank" rel="noopener noreferrer" style={{
            color: "rgba(251,247,237,0.58)",
            fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase",
            textDecoration: "none", fontWeight: 600,
          }}>Instagram</a>
          <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" style={{
            color: "rgba(251,247,237,0.58)",
            fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase",
            textDecoration: "none", fontWeight: 600,
          }}>WhatsApp</a>
          <button type="button" onClick={() => go("track")} style={{
            color: "rgba(251,247,237,0.58)",
            fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase",
            cursor: "pointer", fontWeight: 600,
            background: "none", border: "none", padding: 0, fontFamily: "inherit",
          }}>Track Order</button>
        </div>
        <div style={{
          marginTop: 48, paddingTop: 24, borderTop: "1px solid rgba(251,247,237,0.1)",
          fontSize: 10, letterSpacing: "0.18em", color: "rgba(251,247,237,0.4)", textTransform: "uppercase",
        }}>© 2026 Asuka Brewing &amp; Space</div>
      </footer>
    </div>
  );
}
