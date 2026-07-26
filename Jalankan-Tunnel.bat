@echo off
setlocal EnableExtensions
chcp 65001 >nul
title PetShop Dzikra - Tunnel HTTPS
color 0A

set "ROOT=%~dp0"
set "MOBILE=%ROOT%mobile"
set "DEV_TITLE=KasirDzikra-Vite"
set "CF=%ROOT%tools\cloudflared.exe"
set "URLFILE=%ROOT%tools\tunnel-url.txt"

set TUNNEL_TOKEN=
set TUNNEL_ORIGIN_CERT=
set TUNNEL_CREDENTIALS=
set TUNNEL_CONFIG=

cls
echo ========================================
echo  PetShop Dzikra - Tunnel untuk Kamera
echo ========================================
echo.
echo Langkah:
echo  1. Vite akan dinyalakan
echo  2. Tunnel Cloudflare dijalankan DI JENDELA INI
echo  3. Cari baris hijau "trycloudflare.com"
echo  4. Salin URL itu, buka di HP
echo.
echo Tekan Ctrl+C untuk stop.
echo.

if not exist "%MOBILE%\package.json" (
  color 0C
  echo [ERROR] Folder mobile tidak ketemu.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  color 0C
  echo [ERROR] Node.js belum ada.
  pause
  exit /b 1
)

if not exist "%ROOT%tools" mkdir "%ROOT%tools"

if not exist "%CF%" (
  echo Mengunduh cloudflared...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile '%CF%' -UseBasicParsing"
)

if not exist "%CF%" (
  color 0C
  echo [ERROR] cloudflared gagal diunduh.
  echo.
  echo CADANGAN - jalankan manual di terminal lain:
  echo   cd /d "%MOBILE%"
  echo   npm run dev
  echo Lalu terminal baru:
  echo   npx --yes localtunnel --port 5173
  pause
  exit /b 1
)

echo [OK] %CF%
"%CF%" --version
echo.

echo Menyalakan Vite (jendela baru)...
start "%DEV_TITLE%" /D "%MOBILE%" cmd /k "npm run dev"
echo Tunggu 12 detik...
timeout /t 12 /nobreak >nul

echo.
echo ========================================
echo  TUNNEL MULAI - SCROLL KE BAWAH
echo  Cari: https://....trycloudflare.com
echo ========================================
echo.

REM Langsung di console agar URL terlihat jelas (cara yang sudah berhasil diuji)
"%CF%" --no-autoupdate tunnel --url http://127.0.0.1:5173

echo.
echo Tunnel berhenti.
echo Menghentikan Vite...
taskkill /FI "WINDOWTITLE eq %DEV_TITLE*" /F >nul 2>nul
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do taskkill /PID %%p /F >nul 2>nul
pause
endlocal
