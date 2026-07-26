#Requires -Version 5.1
param(
  [Parameter(Mandatory = $true)][string]$Cloudflared,
  [Parameter(Mandatory = $true)][string]$LocalUrl,
  [Parameter(Mandatory = $true)][string]$LogFile,
  [Parameter(Mandatory = $true)][string]$UrlFile
)

$ErrorActionPreference = 'Continue'

if (Test-Path $UrlFile) { Remove-Item $UrlFile -Force -ErrorAction SilentlyContinue }
if (Test-Path $LogFile) { Remove-Item $LogFile -Force -ErrorAction SilentlyContinue }
New-Item -ItemType File -Path $LogFile -Force | Out-Null

Write-Host 'Menjalankan cloudflared...' -ForegroundColor Cyan
Write-Host "  $Cloudflared --no-autoupdate tunnel --url $LocalUrl"
Write-Host ''

$outLog = "$LogFile.out"
$errLog = "$LogFile.err"
Remove-Item $outLog, $errLog -Force -ErrorAction SilentlyContinue

$p = Start-Process -FilePath $Cloudflared `
  -ArgumentList @('--no-autoupdate', 'tunnel', '--url', $LocalUrl) `
  -RedirectStandardOutput $outLog `
  -RedirectStandardError $errLog `
  -NoNewWindow `
  -PassThru

Write-Host 'Menunggu URL dari Cloudflare (maks 90 detik)...' -ForegroundColor Cyan

$url = $null
$deadline = (Get-Date).AddSeconds(90)

while ((Get-Date) -lt $deadline) {
  if ($p.HasExited) { break }

  Start-Sleep -Seconds 2

  $chunk = @()
  if (Test-Path $errLog) { $chunk += Get-Content $errLog -ErrorAction SilentlyContinue }
  if (Test-Path $outLog) { $chunk += Get-Content $outLog -ErrorAction SilentlyContinue }

  # tampilkan baris baru ke layar
  $chunk | Select-Object -Last 8 | ForEach-Object { Write-Host $_ }

  $joined = ($chunk -join "`n")
  if ($joined -match 'https://[a-z0-9-]+\.trycloudflare\.com') {
    $url = $Matches[0]
    break
  }
}

# gabungkan log
$all = @()
if (Test-Path $errLog) { $all += Get-Content $errLog -ErrorAction SilentlyContinue }
if (Test-Path $outLog) { $all += Get-Content $outLog -ErrorAction SilentlyContinue }
$all | Set-Content -Path $LogFile -Encoding UTF8

if ($url) {
  Set-Content -Path $UrlFile -Value $url -Encoding UTF8
  try { Set-Clipboard -Value $url } catch {}
  Write-Host ''
  Write-Host '========================================' -ForegroundColor Green
  Write-Host '  URL SIAP (sudah di-copy)' -ForegroundColor Green
  Write-Host "  $url" -ForegroundColor Yellow
  Write-Host '  Buka di HP sekarang' -ForegroundColor Green
  Write-Host "  File: $UrlFile" -ForegroundColor Cyan
  Write-Host '========================================' -ForegroundColor Green
  Write-Host ''
  Write-Host 'Tunnel tetap jalan. Tutup jendela ini untuk stop.' -ForegroundColor Cyan
  try { Wait-Process -Id $p.Id } catch {}
} else {
  Write-Host ''
  Write-Host '[ERROR] Cloudflare tidak memberi URL.' -ForegroundColor Red
  Write-Host "Log: $LogFile" -ForegroundColor Yellow
  if ($all.Count -gt 0) {
    Write-Host '--- isi log ---' -ForegroundColor DarkGray
    $all | Select-Object -Last 20 | ForEach-Object { Write-Host $_ -ForegroundColor DarkGray }
  }
  if (-not $p.HasExited) {
    try { Stop-Process -Id $p.Id -Force } catch {}
  }
  exit 1
}

if (-not $p.HasExited) {
  try { Stop-Process -Id $p.Id -Force } catch {}
}
