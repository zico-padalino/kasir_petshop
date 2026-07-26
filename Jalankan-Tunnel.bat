@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title PetShop Dzikra - Cloudflare Tunnel
color 0B

:: Selalu pakai lokasi file .bat ini (bukan folder kerja saat ini)
set "ROOT=%~dp0"
:: hapus trailing backslash bermasalah untuk pengecekan
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "MODE=Quick"
set "LOCAL_URL=http://127.0.0.1:5173"
set "TUNNEL_NAME=kasir-dzikra"
set "DEV_TITLE=KasirDzikra-Vite"
set "MOBILE=%ROOT%\mobile"

:parse
if /I "%~1"=="" goto after_parse
if /I "%~1"=="-Mode" (
  if /I "%~2"=="Named" set "MODE=Named"
  shift & shift & goto parse
)
if /I "%~1"=="Named" (
  set "MODE=Named"
  shift & goto parse
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
echo Mode : %MODE%
echo Root : %ROOT%
echo Target: %LOCAL_URL%
echo.

if not exist "%MOBILE%\package.json" (
  color 0C
  echo [ERROR] Folder mobile tidak ditemukan.
  echo.
  echo Jalankan bat ini dari folder proyek:
  echo   D:\projek sampingan\kasir dzikra\Jalankan-Tunnel.bat
  echo.
  echo Jangan copy file .bat ke Desktop — buat Shortcut saja
  echo (klik kanan -^> Send to -^> Desktop^).
  echo.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  color 0C
  echo [ERROR] Node.js belum terpasang.
  echo Install dari https://nodejs.org
  echo.
  pause
  exit /b 1
)

:: cari cloudflared
set "CF="
where cloudflared >nul 2>nul
if not errorlevel 1 for /f "delims=" %%i in ('where cloudflared 2^>nul') do (
  set "CF=%%i"
  goto cf_ok
)
if exist "%ROOT%\cloudflared.exe" set "CF=%ROOT%\cloudflared.exe" & goto cf_ok
if exist "%ROOT%\tools\cloudflared.exe" set "CF=%ROOT%\tools\cloudflared.exe" & goto cf_ok
if exist "%LOCALAPPDATA%\cloudflared\cloudflared.exe" set "CF=%LOCALAPPDATA%\cloudflared\cloudflared.exe" & goto cf_ok

echo [INFO] Mengunduh cloudflared ke tools\ ...
if not exist "%ROOT%\tools" mkdir "%ROOT%\tools"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile '%ROOT%\tools\cloudflared.exe' -UseBasicParsing"
if not exist "%ROOT%\tools\cloudflared.exe" (
  color 0C
  echo [ERROR] Gagal unduh cloudflared.
  pause
  exit /b 1
)
set "CF=%ROOT%\tools\cloudflared.exe"

:cf_ok
echo [OK] cloudflared: %CF%
echo.

:: npm install bila perlu
pushd "%MOBILE%"
if not exist "node_modules\" (
  echo Menginstal dependensi npm...
  call npm install
  if errorlevel 1 (
    color 0C
    echo [ERROR] npm install gagal.
    popd
    pause
    exit /b 1
  )
  echo.
)
popd

:: matikan instance lama dengan judul sama (jika ada)
taskkill /FI "WINDOWTITLE eq %DEV_TITLE*" /F >nul 2>nul

:: jalankan Vite di jendela baru (helper agar path ber-spasi aman)
echo Menyalakan server lokal (Vite^)...
>
"%TEMP%\kasir-dzikra-vite.bat" echo @echo off
>>"%TEMP%\kasir-dzikra-vite.bat" echo title %DEV_TITLE%
>>"%TEMP%\kasir-dzikra-vite.bat" echo cd /d "%MOBILE%"
>>"%TEMP%\kasir-dzikra-vite.bat" echo npm run dev
>>"%TEMP%\kasir-dzikra-vite.bat" echo pause
start "%DEV_TITLE%" cmd /c "%TEMP%\kasir-dzikra-vite.bat"
echo Menunggu server siap di port 5173...
timeout /t 8 /nobreak >nul

:: pastikan port sudah listen (opsional, coba singkat)
powershell -NoProfile -Command ^
  "$ok=$false; 1..15 | ForEach-Object { try { $c=New-Object Net.Sockets.TcpClient('127.0.0.1',5173); if($c.Connected){$ok=$true;$c.Close(); break} } catch {}; Start-Sleep -Seconds 1 }; if(-not $ok){ exit 1 }"
if errorlevel 1 (
  color 0E
  echo [PERINGATAN] Port 5173 belum terdeteksi. Tunnel tetap dicoba...
  color 0B
  echo.
)

echo.
echo Menyalakan Cloudflare Tunnel...
echo URL publik akan muncul di bawah (https://....trycloudflare.com^)
echo.
echo =================================
echo PetShop Dzikra - Cloudflare Tunnel
echo =================================
echo.

:: Quick tunnel tidak butuh cert.pem / login
:: Hapus env yang bisa memaksa mode named
set "TUNNEL_TOKEN="
set "CLOUDFLARE_API_TOKEN="
set "TUNNEL_ORIGIN_CERT="

if /I "%MODE%"=="Named" (
  echo Mode Named butuh: cloudflared tunnel login
  echo dan tunnel bernama "%TUNNEL_NAME%" sudah dibuat.
  echo.
  "%CF%" tunnel run %TUNNEL_NAME%
) else (
  "%CF%" tunnel --no-autoupdate --url %LOCAL_URL%
)

echo.
echo Menghentikan server lokal...
taskkill /FI "WINDOWTITLE eq %DEV_TITLE*" /F >nul 2>nul
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do (
  taskkill /PID %%p /F >nul 2>nul
)

echo Tunnel ^& server dihentikan.
pause
endlocal
