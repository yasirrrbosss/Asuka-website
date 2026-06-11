import type { ShipOption } from "./types";

export const QRIS_IMAGE = "/images/qris.jpg";

// ⚠️ TODO(asuka): replace with real WhatsApp number for Asuka Brewing & Space (Pejaten).
// Format: international with no leading + or spaces (e.g. "628123456789").
// Used in wa.me deep links: https://wa.me/{WHATSAPP_NUMBER}
// Currently a placeholder — Done page "Message us on WhatsApp" + admin order
// WA links will break until this is filled in with the real café number.
export const WHATSAPP_NUMBER = "6281524444078";

// Google Maps share link from owner for the Pejaten café location.
// Used by "Get directions" CTA in the The Space section.
export const GOOGLE_MAPS_PLACE_URL = "https://maps.app.goo.gl/MubbpEBotuCzxjps8";

// Hero photography. Currently Unsplash placeholders — swap for owner-provided
// shots before launch. Same paths can be served from /public/images/ if you
// host the photos yourself (e.g. /images/hero-pour.jpg).
export const HERO_PHOTOS = {
  pour: "/images/cup.jpg",
  beans: "/images/beans.jpg",
  cafeInterior: "/images/cafeInterior.jpeg",
};

export const SHIP_OPTIONS: ShipOption[] = [
  { id: "jkt", label: "Jabodetabek", price: 10000 },
  { id: "luar", label: "Luar Jabodetabek", price: 20000 },
  { id: "pickup", label: "Self Pick Up at Store", price: 0 },
];
