"use client";

const FIREBASE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

declare global {
  interface Window {
    firebase: any;
  }
}

let _db: any = null;
let _ok = false;

const loadScript = (u: string): Promise<void> =>
  new Promise((r) => {
    const s = document.createElement("script");
    s.src = u;
    s.onload = () => r();
    document.head.appendChild(s);
  });

export const initFB = (): Promise<void> =>
  new Promise((resolve) => {
    if (_ok) return resolve();
    loadScript("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js")
      .then(() =>
        loadScript("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js")
      )
      .then(() => {
        if (!window.firebase.apps.length)
          window.firebase.initializeApp(FIREBASE_CONFIG);
        _db = window.firebase.firestore();
        _ok = true;
        resolve();
      });
  });

export const pushOrder = async (d: Record<string, any>): Promise<string> => {
  await initFB();
  const ref = await _db.collection("orders").add(d);
  return ref.id as string;
};

/**
 * Atomically decrement a product's stock field by `qty` (Firestore server-side increment).
 * If the product has no `stock` field set, this creates one — which is fine because
 * admin can still toggle `available` for products with stock tracking off.
 */
export const decrementProductStock = async (productId: string, qty: number): Promise<void> => {
  await initFB();
  const fv = window.firebase.firestore.FieldValue;
  await _db.collection("products").doc(productId).update({
    stock: fv.increment(-qty),
  });
};

export const fetchProductsFromDB = async (): Promise<any[]> => {
  await initFB();
  const snap = await _db.collection("products").orderBy("createdAt", "desc").get();
  return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
};

export const fetchOrder = async (id: string): Promise<any | null> => {
  await initFB();
  const doc = await _db.collection("orders").doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
};
