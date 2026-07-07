import type { NextConfig } from "next";

// Content-Security-Policy covering the app's real external origins:
//   - Firebase compat SDK       → www.gstatic.com
//   - Firestore REST/queries    → *.googleapis.com
//   - Google Fonts (admin)      → fonts.googleapis.com / fonts.gstatic.com
//   - Inline styles everywhere  → 'unsafe-inline' (style + Next hydration script)
//   - base64 / remote images    → data: / https:
//
// Shipped in REPORT-ONLY mode: it never blocks anything, only logs violations to
// the browser console. After confirming there are no false positives in production,
// switch the header key below from "Content-Security-Policy-Report-Only" to
// "Content-Security-Policy" to enforce it.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "script-src 'self' 'unsafe-inline' https://www.gstatic.com https://www.googleapis.com",
  "connect-src 'self' https://firestore.googleapis.com https://*.googleapis.com https://www.gstatic.com",
].join("; ");

// Baseline security headers applied to every response.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
