export interface Product {
  id: string;
  name: string;
  weight: string;
  price: number;
  origin: string;
  process: string;
  notes: string;
  cat: "filter" | "espresso";
  img: string;
  available: boolean;
  /** Quantity in stock. Undefined = stock tracking off (treat as unlimited). 0 = sold out. */
  stock?: number;
  createdAt?: string;
}

/** Effective availability: explicit `available` flag AND stock not depleted. */
export const isInStock = (p: Pick<Product, "available" | "stock">): boolean =>
  p.available !== false && (p.stock === undefined || p.stock > 0);

export type OrderStatus = "pending" | "shipped" | "cancelled";

export interface CartItem extends Product {
  qty: number;
}

export interface ShipOption {
  id: string;
  label: string;
  price: number;
}

export interface CustomerForm {
  name: string;
  contact: string;
  address: string;
}
