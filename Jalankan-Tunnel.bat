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
set "LOG=%ROOT%tools\tunnel-log.txt"
set "URLFILE=%ROOT%tools\tunnel-url.txt"
set "PS1=%ROOT%scripts\start-quick-tunnel.ps1"

if /I "%~1"=="-Mode" if /I "%~2"=="Named" set "MODE=Named"
if /I "%~1"=="Named" set "MODE=Named"

set TUNNEL_TOKEN=
set TUNNEL_ORIGIN_CERT=
set TUNNEL_CREDENTIALS=
set TUNNEL_CONFIG=
set CLOUDFLARED_ORIGINCERT=

cls
echo ========================================
echo PetShop Dzikra - Cloudflare Tunnel
echo ========================================
echo.
echo Mode : %MODE%
echo.
echo PENTING:
echo   - Akan muncul URL seperti:
echo     https://kata-acak-panjang.trycloudflare.com
echo   - "xxxx-xxxx" hanya CONTOH, bukan URL asli
echo   - Lihat jendela INI (bukan jendela Vite)
echo.

if not exist "%MOBILE%\package.json" (
  color 0C
  echo [ERROR] Folder mobile tidak ditemukan.
  echo Jalankan dari folder project, jangan copy bat ke Desktop.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  color 0C
  echo [ERROR] Node.js belum terpasang.
  pause
  exit /b 1
)

if not exist "%ROOT%tools" mkdir "%ROOT%tools"

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
powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile '%ROOT%tools\cloudflared.exe' -UseBasicParsing"
if not exist "%ROOT%tools\cloudflared.exe" (
  color 0C
  echo [ERROR] Gagal unduh cloudflared.
  pause
  exit /b 1
)
set "CF=%ROOT%tools\cloudflared.exe"

:have_cf
echo [OK] %CF%
"%CF%" --version
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

echo Menyalakan Vite...
start "%DEV_TITLE%" /D "%MOBILE%" cmd /k "npm run dev"
echo Menunggu 10 detik agar Vite siap...
timeout /t 10 /nobreak >nul

echo.
echo ========================================
echo Menyalakan tunnel - JANGAN TUTUP jendela ini
echo ========================================
echo.

if /I "%MODE%"=="Named" (
  "%CF%" tunnel run %TUNNEL_NAME%
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%" -Cloudflared "%CF%" -LocalUrl "%LOCAL_URL%" -LogFile "%LOG%" -UrlFile "%URLFILE%"
)

echo.
if exist "%URLFILE%" (
  color 0A
  echo.
  echo ========== URL UNTUK HP ==========
  type "%URLFILE%"
  echo ==================================
  echo File: %URLFILE%
  echo.
) else (
  color 0C
  echo [ERROR] URL tidak muncul.
  echo Cek: %LOG%
  echo.
)

echo Menghentikan Vite...
taskkill /FI "WINDOWTITLE eq %DEV_TITLE*" /F >nul 2>nul
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do taskkill /PID %%p /F >nul 2>nul

echo Selesai.
pause
endlocal
