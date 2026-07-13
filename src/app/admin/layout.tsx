import type { Metadata } from "next";
import { DM_Sans, Cormorant_Garamond } from "next/font/google";

// Self-hosted via next/font (downloaded at build time) — the admin page makes
// no runtime request to Google Fonts, which lets the CSP stay first-party only.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Asuka Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${dmSans.variable} ${cormorant.variable}`}>{children}</div>;
}
