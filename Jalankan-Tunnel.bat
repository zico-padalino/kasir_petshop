@echo off
setlocal EnableExtensions
chcp 65001 >nul
title PetShop Dzikra - Cloudflare Tunnel
color 0B

set "ROOT=%~dp0"
set "MOBILE=%ROOT%mobile"
set "MODE=Quick"
set "LOCAL_URL=http://127.0.0.1:5173"
set "TUNNEL_NAME=kasir-dzikra"
set "DEV_TITLE=KasirDzikra-Vite"
set "CF="

if /I "%~1"=="-Mode" if /I "%~2"=="Named" set "MODE=Named"
if /I "%~1"=="Named" set "MODE=Named"

cls
echo =================================
echo PetShop Dzikra - Cloudflare Tunnel
echo =================================
echo.
echo Quick tunnel: double-klik file ini.
echo Named tunnel: Jalankan-Tunnel.bat -Mode Named
echo Pastikan Node.js sudah terpasang.
echo Tekan Ctrl+C untuk stop tunnel dan server.
echo.
echo =================================
echo PetShop Dzikra - Cloudflare Tunnel
echo =================================
echo.
echo Mode: %MODE%
echo Root: %ROOT%
echo.

if not exist "%MOBILE%\package.json" (
  color 0C
  echo [ERROR] Folder mobile tidak ditemukan.
  echo.
  echo Jalankan file ini dari:
  echo   D:\projek sampingan\kasir dzikra\Jalankan-Tunnel.bat
  echo.
  echo Jangan COPY bat ke Desktop.
  echo Buat Shortcut: klik kanan - Send to - Desktop.
  echo.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  color 0C
  echo [ERROR] Node.js belum terpasang. Install dari https://nodejs.org
  pause
  exit /b 1
)

where cloudflared >nul 2>nul
if not errorlevel 1 (
  for /f "delims=" %%i in ('where cloudflared') do (
    set "CF=%%i"
    goto :have_cf
  )
)

if exist "%ROOT%tools\cloudflared.exe" (
  set "CF=%ROOT%tools\cloudflared.exe"
  goto :have_cf
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
echo.

pushd "%MOBILE%"
if not exist "node_modules\" (
  echo Menginstal npm...
  call npm install
  if errorlevel 1 (
    color 0C
    echo [ERROR] npm install gagal.
    popd
    pause
    exit /b 1
  )
)
popd

echo Menyalakan server lokal...
start "%DEV_TITLE%" /D "%MOBILE%" cmd /k "npm run dev"
echo Menunggu 10 detik agar Vite siap...
timeout /t 10 /nobreak >nul

echo.
echo Menyalakan Cloudflare Tunnel...
echo URL publik akan muncul di bawah.
echo.
echo =================================
echo PetShop Dzikra - Cloudflare Tunnel
echo =================================
echo.

set "TUNNEL_TOKEN="
set "TUNNEL_ORIGIN_CERT="

if /I "%MODE%"=="Named" (
  "%CF%" tunnel run %TUNNEL_NAME%
) else (
  "%CF%" tunnel --no-autoupdate --url %LOCAL_URL%
)

echo.
echo Menghentikan server lokal...
taskkill /FI "WINDOWTITLE eq %DEV_TITLE*" /F >nul 2>nul
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do taskkill /PID %%p /F >nul 2>nul

echo Selesai.
pause
endlocal
