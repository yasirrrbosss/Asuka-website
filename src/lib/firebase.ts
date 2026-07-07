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

// Order creation and stock decrement now happen server-side via /api/order
// (Firebase Admin SDK), so the client no longer writes to Firestore directly.

export const fetchProductsFromDB = async (): Promise<any[]> => {
  await initFB();
  const snap = await _db.collection("products").orderBy("createdAt", "desc").get();
  return snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
};

// Customer order tracking goes through /api/track/[id], which strips PII and
// internal fields. Reading the raw order doc client-side is intentionally not
// exposed here to avoid leaking customer data into the browser.
