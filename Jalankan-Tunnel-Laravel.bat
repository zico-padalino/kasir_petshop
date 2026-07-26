@echo off
setlocal EnableExtensions
chcp 65001 >nul
title PetShop Dzikra - Cloudflare Tunnel (Laravel)
color 0B

set "ROOT=%~dp0"
set "MODE=Quick"
set "LOCAL_URL=http://127.0.0.1:8900"
set "APP_PORT=8900"
set "TUNNEL_NAME=kasir-dzikra"
set "DEV_TITLE=KasirDzikra-Laravel"
set "CF="
set "CONFIG=%ROOT%scripts\cloudflare\config.yml"

if /I "%~1"=="-Mode" if /I "%~2"=="Named" set "MODE=Named"
if /I "%~1"=="Named" set "MODE=Named"

REM Hapus env yang bikin quick tunnel mencari cert.pem
set TUNNEL_TOKEN=
set TUNNEL_ORIGIN_CERT=
set TUNNEL_CREDENTIALS=
set TUNNEL_CONFIG=
set CLOUDFLARED_ORIGINCERT=

cls
echo ========================================
echo PetShop Dzikra - Tunnel Laravel
echo ========================================
echo.
echo Quick tunnel : double-klik file ini
echo Named tunnel : Jalankan-Tunnel-Laravel.bat Named
echo.
echo Mode : %MODE%
echo Port : %APP_PORT%
echo Root : %ROOT%
echo.

if not exist "%ROOT%artisan" (
  color 0C
  echo [ERROR] File artisan tidak ditemukan.
  echo Jalankan dari folder project Laravel.
  pause
  exit /b 1
)

where php >nul 2>nul
if errorlevel 1 (
  color 0C
  echo [ERROR] PHP belum terpasang / tidak ada di PATH.
  pause
  exit /b 1
)

REM Utamakan cloudflared di folder tools proyek
if exist "%ROOT%tools\cloudflared.exe" (
  set "CF=%ROOT%tools\cloudflared.exe"
  goto :have_cf
)

where cloudflared >nul 2>nul
if not errorlevel 1 (
  for /f "delims=" %%i in ('where cloudflared') do (
    set "CF=%%i"
    goto :have_cf
  )
)

echo [INFO] Mengunduh cloudflared...
if not exist "%ROOT%tools" mkdir "%ROOT%tools"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile '%ROOT%tools\cloudflared.exe' -UseBasicParsing"
if not exist "%ROOT%tools\cloudflared.exe" (
  color 0C
  echo [ERROR] Gagal unduh cloudflared.
  pause
  exit /b 1
)
set "CF=%ROOT%tools\cloudflared.exe"

:have_cf
echo [OK] cloudflared siap
echo     %CF%
"%CF%" --version
echo.

echo Menyalakan Laravel di %LOCAL_URL% ...
start "%DEV_TITLE%" /D "%ROOT%" cmd /k "php artisan serve --host=127.0.0.1 --port=%APP_PORT%"
echo Menunggu 5 detik agar Laravel siap...
timeout /t 5 /nobreak >nul

echo.
echo Menyalakan Cloudflare Tunnel...
echo URL publik akan muncul di bawah (https://....trycloudflare.com).
echo.
echo PENTING:
echo   - Buka URL HTTPS di HP/browser untuk akses aman
echo   - Setelah dapat URL tunnel, opsional update .env:
echo       APP_URL=https://URL-TUNNEL-ANDA
echo       SESSION_SECURE_COOKIE=true
echo     lalu: php artisan config:clear
echo   - Jangan pakai http://IP:8900 untuk fitur kamera
echo.
echo ========================================
echo.

if /I "%MODE%"=="Named" (
  if not exist "%CONFIG%" (
    color 0C
    echo [ERROR] File config Named Tunnel belum ada:
    echo   %CONFIG%
    echo.
    echo Salin scripts\cloudflare\config.yml.example menjadi config.yml
    echo lalu isi Tunnel ID dan credentials-file.
    pause
    exit /b 1
  )
  "%CF%" tunnel --config "%CONFIG%" run
) else (
  REM Flag global HARUS sebelum subcommand "tunnel"
  "%CF%" --no-autoupdate tunnel --url %LOCAL_URL%
)

echo.
if errorlevel 1 (
  color 0C
  echo [ERROR] Tunnel gagal.
  echo.
  echo Coba:
  echo   1. Pastikan internet PC aktif
  echo   2. Pastikan Laravel jalan di port %APP_PORT%
  echo   3. Tutup Cloudflare WARP jika mengganggu
  echo.
)

echo Menghentikan Laravel serve...
taskkill /FI "WINDOWTITLE eq %DEV_TITLE*" /F >nul 2>nul
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%APP_PORT%" ^| findstr "LISTENING"') do taskkill /PID %%p /F >nul 2>nul

echo Selesai.
pause
endlocal
