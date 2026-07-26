@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title PetShop Dzikra - Cloudflare Tunnel
color 0B

cd /d "%~dp0"

set "MODE=Quick"
set "LOCAL_URL=http://127.0.0.1:5173"
set "TUNNEL_NAME=kasir-dzikra"
set "DEV_TITLE=KasirDzikra-Vite"

:parse
if /I "%~1"=="" goto after_parse
if /I "%~1"=="-Mode" (
  if /I "%~2"=="Named" set "MODE=Named"
  shift
  shift
  goto parse
)
if /I "%~1"=="Named" (
  set "MODE=Named"
  shift
  goto parse
)
shift
goto parse

:after_parse
cls
echo =================================
echo PetShop Dzikra - Cloudflare Tunnel
echo =================================
echo.
echo Quick tunnel (default^): double-klik file ini.
echo Named tunnel: Jalankan-Tunnel.bat -Mode Named
echo Pastikan Node.js sudah terpasang.
echo Tekan Ctrl+C untuk menghentikan tunnel ^& server.
echo.
echo =================================
echo PetShop Dzikra - Cloudflare Tunnel
echo =================================
echo.
echo Mode: %MODE%
echo Target lokal: %LOCAL_URL%
echo.

:: --- cek Node.js ---
where node >nul 2>nul
if errorlevel 1 (
  color 0C
  echo [ERROR] Node.js belum terpasang.
  echo Install dari https://nodejs.org lalu coba lagi.
  echo.
  pause
  exit /b 1
)

:: --- cek / cari cloudflared ---
set "CF="
where cloudflared >nul 2>nul
if not errorlevel 1 (
  for /f "delims=" %%i in ('where cloudflared') do (
    set "CF=%%i"
    goto cf_found
  )
)
if exist "%~dp0cloudflared.exe" set "CF=%~dp0cloudflared.exe"
if exist "%~dp0tools\cloudflared.exe" set "CF=%~dp0tools\cloudflared.exe"
if exist "%LOCALAPPDATA%\cloudflared\cloudflared.exe" set "CF=%LOCALAPPDATA%\cloudflared\cloudflared.exe"

:cf_found
if not defined CF (
  color 0E
  echo [INFO] cloudflared belum ditemukan.
  echo.
  echo Mengunduh cloudflared ke folder tools\ ...
  if not exist "%~dp0tools" mkdir "%~dp0tools"
  powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "try { Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile '%~dp0tools\cloudflared.exe' -UseBasicParsing } catch { exit 1 }"
  if not exist "%~dp0tools\cloudflared.exe" (
    color 0C
    echo [ERROR] Gagal mengunduh cloudflared.
    echo Download manual:
    echo   https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
    echo Simpan sebagai: tools\cloudflared.exe
    echo.
    pause
    exit /b 1
  )
  set "CF=%~dp0tools\cloudflared.exe"
  color 0B
  echo [OK] cloudflared siap: tools\cloudflared.exe
  echo.
)

:: --- siapkan mobile app ---
cd /d "%~dp0mobile"
if not exist "node_modules\" (
  echo Menginstal dependensi npm...
  call npm install
  if errorlevel 1 (
    color 0C
    echo [ERROR] npm install gagal.
    pause
    exit /b 1
  )
  echo.
)

:: --- hidupkan Vite di jendela terpisah ---
echo Menyalakan server lokal (Vite^)...
start "%DEV_TITLE%" /D "%~dp0mobile" /min cmd /c "npm run dev"
echo Menunggu server siap...
timeout /t 5 /nobreak >nul

:: --- jalankan tunnel ---
cd /d "%~dp0"
echo.
echo Menyalakan Cloudflare Tunnel...
echo URL publik akan muncul di bawah (https://....trycloudflare.com^)
echo.
echo =================================
echo PetShop Dzikra - Cloudflare Tunnel
echo =================================
echo.

if /I "%MODE%"=="Named" (
  "%CF%" tunnel run %TUNNEL_NAME%
) else (
  "%CF%" tunnel --url %LOCAL_URL%
)

:: setelah tunnel berhenti / Ctrl+C
echo.
echo Menghentikan server lokal...
taskkill /FI "WINDOWTITLE eq %DEV_TITLE*" /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq %DEV_TITLE%" /F >nul 2>nul

echo.
echo Tunnel ^& server dihentikan.
pause
endlocal
