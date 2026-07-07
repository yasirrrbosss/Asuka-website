import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://studio-9530567368-17f88.web.app";
const SITE_NAME = "Asuka Brewing & Space";
const DESCRIPTION =
  "Specialty single-origin coffee beans, slow-roasted at Asuka Brewing & Space, Pejaten — Jakarta Selatan. Shipped to your door.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Single-Origin Beans, Slow-Roasted`,
    template: `%s · ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "kopi specialty", "single origin", "beans", "roastery", "Pejaten",
    "Jakarta Selatan", "filter coffee", "espresso", "Asuka Brewing",
  ],
  authors: [{ name: SITE_NAME }],
  icons: {
    icon: "/favicon.ico",
    apple: "/images/logo-green.png",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Single-Origin Beans, Slow-Roasted`,
    description: DESCRIPTION,
    url: "/",
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Single-Origin Beans, Slow-Roasted`,
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
