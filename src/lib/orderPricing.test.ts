import { describe, it, expect } from "vitest";
import { buildOrder, type CatalogProduct } from "./orderPricing";
import type { ShipOption } from "./types";

const SHIP: ShipOption[] = [
  { id: "jkt", label: "Jabodetabek", price: 10000 },
  { id: "pickup", label: "Self Pick Up", price: 0 },
];

const catalog = new Map<string, CatalogProduct>([
  ["a", { id: "a", name: "Gayo", weight: "200gr", price: 150000, available: true, stock: 5 }],
  ["b", { id: "b", name: "Toraja", weight: "200gr", price: 120000, available: true }],
  ["soldout", { id: "soldout", name: "Rare", weight: "200gr", price: 200000, available: false, stock: 3 }],
]);

const base = {
  customer: { name: "Budi", contact: "081234567890", address: "Jl. Pejaten Raya 14, Jakarta" },
  shipment: "jkt",
};

describe("buildOrder", () => {
  it("prices from the catalog, ignoring any client-supplied price/total", () => {
    const res = buildOrder({ ...base, items: [{ id: "a", qty: 2 }] }, catalog, SHIP);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.order.items[0].price).toBe(150000);
      expect(res.order.items[0].subtotal).toBe(300000);
      expect(res.order.total).toBe(310000); // 300000 + 10000 shipping
    }
  });

  it("uses the server shipping price, not the client's", () => {
    const res = buildOrder({ ...base, shipment: "pickup", items: [{ id: "b", qty: 1 }] }, catalog, SHIP);
    expect(res.ok && res.order.total).toBe(120000);
  });

  it("rejects an unknown product", () => {
    const res = buildOrder({ ...base, items: [{ id: "ghost", qty: 1 }] }, catalog, SHIP);
    expect(res).toEqual({ ok: false, reason: expect.stringContaining("tidak ditemukan") });
  });

  it("rejects an unavailable product", () => {
    const res = buildOrder({ ...base, items: [{ id: "soldout", qty: 1 }] }, catalog, SHIP);
    expect(res.ok).toBe(false);
  });

  it("rejects qty above tracked stock", () => {
    const res = buildOrder({ ...base, items: [{ id: "a", qty: 6 }] }, catalog, SHIP);
    expect(res.ok).toBe(false);
  });

  it("allows any qty for untracked-stock products", () => {
    const res = buildOrder({ ...base, items: [{ id: "b", qty: 50 }] }, catalog, SHIP);
    expect(res.ok).toBe(true);
  });

  it("rejects invalid quantities", () => {
    expect(buildOrder({ ...base, items: [{ id: "a", qty: 0 }] }, catalog, SHIP).ok).toBe(false);
    expect(buildOrder({ ...base, items: [{ id: "a", qty: -1 }] }, catalog, SHIP).ok).toBe(false);
    expect(buildOrder({ ...base, items: [{ id: "a", qty: 1.5 }] }, catalog, SHIP).ok).toBe(false);
  });

  it("rejects an unknown shipping option", () => {
    const res = buildOrder({ ...base, shipment: "teleport", items: [{ id: "a", qty: 1 }] }, catalog, SHIP);
    expect(res.ok).toBe(false);
  });

  it("rejects an empty cart", () => {
    expect(buildOrder({ ...base, items: [] }, catalog, SHIP).ok).toBe(false);
  });

  it("validates customer fields", () => {
    expect(buildOrder({ ...base, customer: { name: "A", contact: "081234567890", address: "Jl. Pejaten Raya 14" }, items: [{ id: "a", qty: 1 }] }, catalog, SHIP).ok).toBe(false);
    expect(buildOrder({ ...base, customer: { name: "Budi", contact: "123", address: "Jl. Pejaten Raya 14" }, items: [{ id: "a", qty: 1 }] }, catalog, SHIP).ok).toBe(false);
    expect(buildOrder({ ...base, customer: { name: "Budi", contact: "081234567890", address: "short" }, items: [{ id: "a", qty: 1 }] }, catalog, SHIP).ok).toBe(false);
  });

  it("accepts a valid data-URL payment proof and rejects a non-image", () => {
    const okProof = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    expect(buildOrder({ ...base, items: [{ id: "a", qty: 1 }], paymentProof: okProof }, catalog, SHIP).ok).toBe(true);
    expect(buildOrder({ ...base, items: [{ id: "a", qty: 1 }], paymentProof: "data:text/html,evil" }, catalog, SHIP).ok).toBe(false);
  });

  it("rejects a proof with an image MIME but non-image bytes (magic-byte spoof)", () => {
    // Valid data:image/png prefix, but the bytes ('AAAA' -> 0x00 0x00 0x00) aren't a PNG.
    const spoof = "data:image/png;base64,AAAAAAAA";
    expect(buildOrder({ ...base, items: [{ id: "a", qty: 1 }], paymentProof: spoof }, catalog, SHIP).ok).toBe(false);
  });
});
