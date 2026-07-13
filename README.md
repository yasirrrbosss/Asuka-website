# Asuka Brewing & Space

Storefront + admin dashboard untuk toko kopi Asuka Brewing (Pejaten, Jakarta Selatan). Dibangun dengan Next.js (App Router), Firestore, dan Tailwind CSS.

## Arsitektur

Browser **tidak pernah** berbicara langsung ke Firebase — semua akses Firestore berjalan server-side lewat Firebase Admin SDK, dan Firestore rules menolak seluruh akses client:

| Route | Fungsi |
|---|---|
| `GET /api/products` | Katalog produk publik (rate-limited, CDN-cacheable) |
| `POST /api/order` | Checkout — harga dihitung ulang dari katalog di server, stok dipotong atomik |
| `GET /api/track/[id]` | Lacak pesanan (hanya field non-sensitif) |
| `POST /api/admin/auth` | Login admin → token HMAC (rate limit lintas-instance via Firestore) |
| `POST /api/admin/verify` | Validasi token sesi admin |
| `GET/PATCH /api/admin/orders` | List order & aksi status (verify/ship/undo/cancel — divalidasi transisinya dalam transaksi; cancel mengembalikan stok) |
| `GET/POST/PATCH/DELETE /api/admin/products` | Kelola produk |

Notifikasi pesanan baru dikirim ke Telegram dari server (`src/lib/telegram.ts`).

## Struktur

```
src/
  app/            # App Router: halaman + API routes
    admin/        # Dashboard admin (font self-host, noindex)
    api/          # Semua endpoint (lihat tabel di atas)
  components/     # AsukaBrewing (storefront), AdminDashboard, komponen asuka/*
  lib/            # Logika murni + util (auth, orderActions, orderPricing,
                  #   rateLimit, sharedRateLimit, dll — masing-masing ada testnya)
firestore.rules   # Deny-all (deploy manual: firebase deploy --only firestore:rules)
```

## Menjalankan

```bash
cp .env.local.example .env.local   # isi kredensial (lihat komentar di file)
npm install
npm run dev
```

Wajib diisi: `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_TOKEN_SECRET`, `FIREBASE_SERVICE_ACCOUNT`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_IDS`. Tanpa service account, route yang menyentuh Firestore mengembalikan 503.

## Test & build

```bash
npm test        # vitest (unit test lib)
npm run lint
npm run build
```

## Deploy

Di-deploy ke Vercel: set semua env var di project settings, lalu push ke `main`. Perubahan `firestore.rules` di-deploy terpisah dan manual.
