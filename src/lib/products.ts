import type { Product } from "./types";

// The storefront reads the catalog through GET /api/products (server-side
// Admin SDK). The browser talks only to our own origin: no Firebase client
// SDK, no CDN scripts, and Firestore rules can deny all direct client access.
export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch("/api/products");
  if (!res.ok) throw new Error(`Failed to load products (${res.status})`);
  const data = (await res.json()) as { products?: Product[] };
  return data.products ?? [];
}
