@echo off
chcp 65001 >nul
title Deploy Kasir Dzikra ke Cloudflare Pages
cd /d "%~dp0mobile"

echo ========================================
echo   Deploy PetShop Dzikra ke Cloudflare
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js belum terpasang.
  echo Install dari https://nodejs.org lalu coba lagi.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo Menginstal dependensi...
  call npm install
  if errorlevel 1 (
    echo [ERROR] npm install gagal.
    pause
    exit /b 1
  )
  echo.
)

echo [1/2] Build aplikasi...
call npm run build
if errorlevel 1 (
  echo [ERROR] Build gagal.
  pause
  exit /b 1
)
echo.

echo [2/2] Upload ke Cloudflare Pages...
echo (Jika diminta login, ikuti instruksi di browser)
echo.
call npx --yes wrangler pages deploy dist --project-name=kasir-dzikra-mobile
if errorlevel 1 (
  echo.
  echo [ERROR] Deploy gagal.
  echo Pastikan sudah login: npx wrangler login
  echo.
  pause
  exit /b 1
)

echo.
echo ========================================
echo   Selesai! Cek URL di Cloudflare Pages.
echo ========================================
echo.
pause
