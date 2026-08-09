# Cloudflare Tunnel untuk Laravel (pet Shop E-POS)

Panduan membuka aplikasi Laravel lokal ke internet tanpa port forwarding atau IP publik.

## Persyaratan

- Windows
- PHP dan Composer
- Project Laravel
- Cloudflared
- Database lokal sudah berjalan

Install cloudflared:

```powershell
winget install --id Cloudflare.cloudflared
```

Atau gunakan binary di `tools/cloudflared.exe` (otomatis diunduh oleh `Jalankan-Tunnel-Laravel.bat`).

Verifikasi:

```powershell
cloudflared --version
php --version
```

## Konfigurasi Laravel (sudah diset)

Di `.env`:

```env
APP_URL=http://localhost:8900
APP_PORT=8900
SESSION_SECURE_COOKIE=false
```

Di `bootstrap/app.php`: trusted proxy Cloudflare aktif.

Di `AppServiceProvider`: `URL::forceScheme('https')` jika `APP_URL` memakai HTTPS.

## Cara cepat (disarankan)

Double-klik:

```text
Jalankan-Tunnel-Laravel.bat
```

Script akan:

1. Menyalakan `php artisan serve --host=127.0.0.1 --port=8900`
2. Membuka Quick Tunnel Cloudflare
3. Menampilkan URL `https://….trycloudflare.com`

Buka URL itu di browser / HP.

Setelah URL muncul, opsional update `.env`:

```env
APP_URL=https://nama-acak.trycloudflare.com
SESSION_SECURE_COOKIE=true
```

Lalu:

```powershell
php artisan config:clear
```

## Manual Quick Tunnel

Terminal 1:

```powershell
php artisan serve --host=127.0.0.1 --port=8900
```

Terminal 2:

```powershell
cloudflared tunnel --url http://127.0.0.1:8900
```

## Named Tunnel (domain tetap)

### 1. Login

```powershell
cloudflared tunnel login
```

### 2. Buat tunnel

```powershell
cloudflared tunnel create pet-shop
```

### 3. Salin config

Salin `scripts/cloudflare/config.yml.example` → `scripts/cloudflare/config.yml`, isi Tunnel ID dan path credential.

### 4. DNS

```powershell
cloudflared tunnel route dns TUNNEL_ID app.domainanda.com
```

### 5. `.env`

```env
APP_URL=https://app.domainanda.com
APP_PORT=8900
SESSION_SECURE_COOKIE=true
```

```powershell
php artisan config:clear
```

### 6. Jalankan

```powershell
php artisan serve --host=127.0.0.1 --port=8900
cloudflared tunnel --config scripts/cloudflare/config.yml run
```

Atau:

```powershell
Jalankan-Tunnel-Laravel.bat Named
```

## Alur koneksi

```text
Browser
  ↓ HTTPS
Cloudflare
  ↓ tunnel terenkripsi
cloudflared di PC
  ↓ HTTP localhost
Laravel 127.0.0.1:8900
  ↓
MySQL lokal (petshop)
```

Database tidak dibuka ke internet.

## Pemecahan masalah

| Masalah | Solusi |
|---------|--------|
| 502 Bad Gateway | Pastikan Laravel jalan di port 8900 |
| Login gagal di localhost | Set `SESSION_SECURE_COOKIE=false` dan `APP_URL=http://localhost:8900` |
| Redirect/asset HTTP | Set `APP_URL` ke HTTPS tunnel, lalu `php artisan optimize:clear` |
| cloudflared tidak ditemukan | Restart terminal atau pakai `Jalankan-Tunnel-Laravel.bat` |

## Catatan kamera / HTTPS

Untuk fitur yang butuh kamera HP, **harus** pakai URL HTTPS dari tunnel (`trycloudflare.com` atau named domain), bukan `http://IP:8900`.

## Mode

- **Quick Tunnel** — demo, URL berubah tiap jalan
- **Named Tunnel** — domain permanen
- **Production** — jangan andalkan `php artisan serve`
