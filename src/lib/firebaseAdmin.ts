import "server-only";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

// Server-side Firestore access with elevated privileges. This is what lets us
// lock the client Firestore Security Rules down to deny all writes (and all
// order reads): every privileged operation now goes through a server route that
// uses this connection instead of the public client SDK.
//
// Requires FIREBASE_SERVICE_ACCOUNT — the JSON service-account key from the
// Firebase console (Project Settings → Service accounts → Generate new private
// key), stored as a single-line JSON string (or base64 of it) in the env.

let cached: Firestore | null = null;

function parseServiceAccount(raw: string): Record<string, unknown> {
  const text = raw.trim().startsWith("{")
    ? raw
    : Buffer.from(raw, "base64").toString("utf-8");
  const svc = JSON.parse(text) as Record<string, unknown>;
  // Env vars often escape newlines in the private key; undo that.
  if (typeof svc.private_key === "string") {
    svc.private_key = svc.private_key.replace(/\\n/g, "\n");
  }
  return svc;
}

/** Returns the Admin Firestore, or null if the service account isn't configured. */
export function getAdminDb(): Firestore | null {
  if (cached) return cached;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const svc = parseServiceAccount(raw);
    const app: App = getApps().length
      ? getApps()[0]
      : initializeApp({ credential: cert(svc as never) });
    cached = getFirestore(app);
    return cached;
  } catch (err) {
    console.error("firebaseAdmin: failed to initialize:", err instanceof Error ? err.message : err);
    return null;
  }
}
