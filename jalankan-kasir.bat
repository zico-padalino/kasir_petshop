@echo off
chcp 65001 >nul
title Jalankan Kasir Dzikra (Mobile)
cd /d "%~dp0mobile"

echo ========================================
echo   PetShop Dzikra — Kasir Mobile
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

echo Menyalakan server lokal...
echo Buka di browser: http://localhost:5173
echo Tekan Ctrl+C untuk berhenti.
echo.
call npm run dev
pause
