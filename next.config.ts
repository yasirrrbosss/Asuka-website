import type { NextConfig } from "next";

// Content-Security-Policy — ENFORCED. The app is now fully first-party:
//   - No Firebase client SDK (catalog/orders/admin all go through /api/*)
//   - Fonts self-hosted via next/font (no fonts.googleapis.com)
//   - base64 / remote images  → data: / https: (product images may be URLs)
//   - 'unsafe-inline'         → inline styles + Next's hydration scripts
// Dev additions: 'unsafe-eval' (React Refresh) and ws: (HMR websocket).
const isDev = process.env.NODE_ENV === "development";
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  `connect-src 'self'${isDev ? " ws:" : ""}`,
].join("; ");

// Baseline security headers applied to every response.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
