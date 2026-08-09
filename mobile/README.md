# pet Shop E-POS — Versi Mobile (Netlify)

Versi mobile (PWA) dari aplikasi kasir Laravel **pet Shop**. Dibuat ulang sebagai
aplikasi web statis (React + Vite) dengan UI/UX & struktur **identik** dengan versi Laravel.

Cocok untuk **uji coba**: seluruh database disimpan **di perangkat** (browser `localStorage`),
tanpa server & tanpa koneksi database. Bisa langsung di-deploy ke **Netlify**.

## Fitur (sama seperti versi Laravel)

- Login + sistem role: **Admin**, **Kasir**, **Owner**
- Dashboard (statistik, stok menipis, produk terlaris, transaksi terbaru)
- Kasir / POS (grid produk, keranjang, diskon, tunai/transfer/QRIS, kembalian, struk)
- Riwayat Transaksi + detail + struk (bisa di-print)
- Laporan Penjualan (per metode bayar, performa kasir, produk terlaris, penjualan harian)
- Manajemen Produk (CRUD + tambah stok)
- Manajemen Kategori
- Manajemen Pengguna & Role

## Akun demo

| Role  | Email               | Password   |
|-------|---------------------|------------|
| Admin | admin@petshop.com   | `password` |
| Kasir | kasir@petshop.com   | `password` |
| Owner | owner@petshop.com   | `password` |

## Menjalankan secara lokal

```bash
cd mobile
npm install
npm run dev
```

Buka alamat yang ditampilkan (default http://localhost:5173).
Karena mobile-first, buka DevTools → mode perangkat, atau akses lewat HP di jaringan yang sama.

## Build produksi

```bash
npm run build      # hasil di folder dist/
npm run preview    # pratinjau hasil build
```

## Deploy ke Netlify

Config sudah siap di `netlify.toml` (root & `mobile/`):
- Base directory: `mobile`
- Build command: `npm run build`
- Publish directory: `dist`

Cara paling mudah di Windows: double-klik `Jalankan-Deploy-Netlify.bat` di root repo.

### A. Otomatis dari Git (disarankan) — termasuk ganti akun

1. Buka https://app.netlify.com/logout lalu login **akun Netlify baru**.
2. **Add new site → Import an existing project → GitHub**
3. Pilih repo `zico-padalino/kasir_petshop` (izinkan akses GitHub jika diminta).
4. Settings biasanya terisi otomatis dari `netlify.toml`. Deploy.
5. Site lama di akun sebelumnya tidak ikut pindah — di akun baru akan dapat URL baru
   (`https://nama-acak.netlify.app`). Kamera tetap bisa dipakai karena HTTPS.

### B. CLI (akun baru / ganti akun)

```bash
cd mobile
npx netlify-cli logout
npx netlify-cli login          # login akun baru di browser
npm run build
npx netlify-cli sites:create   # sekali saja
npx netlify-cli link           # hubungkan folder ke site
npm run deploy:netlify
```

### C. Manual (drag & drop)

```bash
cd mobile
npm install
npm run build
```

Lalu buka https://app.netlify.com/drop dan seret folder `mobile/dist` ke sana
(pastikan sudah login akun Netlify yang diinginkan).

## Catatan penting

- **Database di perangkat**: data (produk, transaksi, dll) tersimpan di `localStorage`
  browser masing-masing. Menghapus data browser = mereset ke data awal (seed).
- Untuk **mereset data** ke kondisi awal, hapus key `pet_shop_db_v3` di localStorage
  (atau clear site data), lalu refresh.
- Password disimpan apa adanya (plaintext) karena **hanya untuk uji coba lokal**.
  Jangan gunakan pola ini untuk produksi nyata.
- Routing memakai HashRouter (`/#/...`) supaya aman di hosting statis mana pun.
