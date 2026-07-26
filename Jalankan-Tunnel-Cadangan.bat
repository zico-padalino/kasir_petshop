@echo off
setlocal EnableExtensions
chcp 65001 >nul
title PetShop Dzikra - LocalTunnel (Cadangan)
color 0B

set "ROOT=%~dp0"
set "MOBILE=%ROOT%mobile"
set "DEV_TITLE=KasirDzikra-Vite"

cls
echo ========================================
echo  Cadangan HTTPS: LocalTunnel
echo ========================================
echo.
echo Pakai ini jika Cloudflare Tunnel gagal.
echo Cari baris "your url is: https://...."
echo Lalu buka di HP.
echo.

where node >nul 2>nul
if errorlevel 1 (
  color 0C
  echo [ERROR] Node.js belum ada.
  pause
  exit /b 1
)

echo Menyalakan Vite...
start "%DEV_TITLE%" /D "%MOBILE%" cmd /k "npm run dev"
timeout /t 12 /nobreak >nul

echo.
echo Menyalakan LocalTunnel...
echo.
cd /d "%MOBILE%"
npx --yes localtunnel --port 5173

echo.
taskkill /FI "WINDOWTITLE eq %DEV_TITLE*" /F >nul 2>nul
pause
endlocal
