# PetShop Dzikra E-POS — Versi Mobile (Netlify)

Versi mobile (PWA) dari aplikasi kasir Laravel **Kasir Dzikra**. Dibuat ulang sebagai
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

Ada 2 cara:

### A. Otomatis dari Git (disarankan)

1. Push seluruh repo ke GitHub/GitLab.
2. Di Netlify: **Add new site → Import an existing project** → pilih repo.
3. Netlify akan membaca `mobile/netlify.toml`:
   - Base directory: `mobile`
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Klik **Deploy**.

### B. Manual (drag & drop)

```bash
cd mobile
npm install
npm run build
```

Lalu buka https://app.netlify.com/drop dan seret folder `mobile/dist` ke sana.

## Catatan penting

- **Database di perangkat**: data (produk, transaksi, dll) tersimpan di `localStorage`
  browser masing-masing. Menghapus data browser = mereset ke data awal (seed).
- Untuk **mereset data** ke kondisi awal, hapus key `kasir_dzikra_db_v1` di localStorage
  (atau clear site data), lalu refresh.
- Password disimpan apa adanya (plaintext) karena **hanya untuk uji coba lokal**.
  Jangan gunakan pola ini untuk produksi nyata.
- Routing memakai HashRouter (`/#/...`) supaya aman di hosting statis mana pun.
