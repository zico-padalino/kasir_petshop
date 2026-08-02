@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"

echo ============================================
echo   Deploy Kasir Dzikra Mobile ke Netlify
echo ============================================
echo.
echo Repo GitHub : https://github.com/zico-padalino/kasir_petshop.git
echo Build folder: mobile/
echo.
echo Pilih cara deploy:
echo   1. Buka Netlify (akun BARU) + hubungkan GitHub  [disarankan]
echo   2. Login CLI ke akun Netlify lalu deploy sekarang
echo   3. Logout CLI (ganti akun) lalu login ulang
echo   4. Build saja (lalu drag-drop ke https://app.netlify.com/drop)
echo   0. Keluar
echo.
set /p PILIH="Pilihan [1/2/3/4/0]: "

if "%PILIH%"=="0" goto :eof
if "%PILIH%"=="1" goto :WEB
if "%PILIH%"=="2" goto :CLI
if "%PILIH%"=="3" goto :SWITCH
if "%PILIH%"=="4" goto :BUILDONLY
echo Pilihan tidak valid.
pause
goto :eof

:WEB
echo.
echo Membuka Netlify...
echo.
echo LANGKAH GANTI / AKUN BARU:
echo  1. Logout dulu dari akun Netlify lama (avatar kanan atas ^> Sign out)
echo  2. Sign up / Log in dengan akun Netlify BARU
echo  3. Add new site ^> Import an existing project ^> GitHub
echo  4. Pilih repo: zico-padalino/kasir_petshop
echo  5. Pastikan settings terisi otomatis dari netlify.toml:
echo       Base directory : mobile
echo       Build command  : npm run build
echo       Publish dir    : dist
echo  6. Deploy site
echo.
start "" "https://app.netlify.com/logout"
timeout /t 2 >nul
start "" "https://app.netlify.com/start"
echo.
echo Setelah site live, kamera HP bisa dipakai lewat URL https://....netlify.app
pause
goto :eof

:SWITCH
echo.
echo Logout Netlify CLI...
cd mobile
call npx --yes netlify-cli logout
if errorlevel 1 (
  echo Logout gagal / belum login. Lanjut login saja.
)
echo.
echo Login ke akun Netlify BARU (browser akan terbuka)...
call npx --yes netlify-cli login
if errorlevel 1 (
  echo Login gagal.
  pause
  goto :eof
)
echo.
echo Login OK. Jalankan lagi script ini dan pilih 2 untuk deploy.
pause
goto :eof

:BUILDONLY
echo.
echo Install ^& build...
cd mobile
call npm install
if errorlevel 1 (
  echo npm install gagal.
  pause
  goto :eof
)
call npm run build
if errorlevel 1 (
  echo Build gagal.
  pause
  goto :eof
)
echo.
echo Build selesai: mobile\dist
echo Seret folder itu ke: https://app.netlify.com/drop
start "" "https://app.netlify.com/drop"
explorer "%cd%\dist"
pause
goto :eof

:CLI
echo.
echo Install ^& build...
cd mobile
call npm install
if errorlevel 1 (
  echo npm install gagal.
  pause
  goto :eof
)
call npm run build
if errorlevel 1 (
  echo Build gagal.
  pause
  goto :eof
)
echo.
echo Pastikan sudah login akun Netlify yang diinginkan.
echo Jika belum / mau ganti akun, batalkan lalu pilih opsi 3.
echo.
call npx --yes netlify-cli status
echo.
echo Deploy production...
call npx --yes netlify-cli deploy --prod --dir=dist
if errorlevel 1 (
  echo.
  echo Deploy gagal. Kemungkinan site belum di-link.
  echo Coba: npx netlify-cli sites:create
  echo Lalu:  npx netlify-cli link
  echo Atau pilih opsi 1 (hubungkan lewat GitHub).
  pause
  goto :eof
)
echo.
echo Selesai. Buka URL yang ditampilkan di atas di HP (HTTPS) untuk uji kamera.
pause
goto :eof
