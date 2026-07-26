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

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $Cloudflared
$psi.Arguments = "--no-autoupdate tunnel --url $LocalUrl"
$psi.UseShellExecute = $false
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.CreateNoWindow = $true
$psi.StandardOutputEncoding = [System.Text.Encoding]::UTF8
$psi.StandardErrorEncoding = [System.Text.Encoding]::UTF8

$p = New-Object System.Diagnostics.Process
$p.StartInfo = $psi

$found = $false
$sync = [hashtable]::Synchronized(@{ Found = $false; Url = '' })

$handler = {
  if (-not $_.Data) { return }
  $line = $_.Data
  Add-Content -Path $LogFile -Value $line -Encoding UTF8
  Write-Host $line
  if (-not $sync.Found -and $line -match 'https://[a-z0-9-]+\.trycloudflare\.com') {
    $u = $Matches[0]
    $sync.Found = $true
    $sync.Url = $u
    Set-Content -Path $UrlFile -Value $u -Encoding UTF8
    try { Set-Clipboard -Value $u } catch {}
    Write-Host ''
    Write-Host '========================================' -ForegroundColor Green
    Write-Host '  URL SIAP (sudah di-copy ke clipboard)' -ForegroundColor Green
    Write-Host ("  $u") -ForegroundColor Yellow
    Write-Host '  Tempel URL itu di browser HP' -ForegroundColor Green
    Write-Host ("  Juga disimpan di: $UrlFile") -ForegroundColor Cyan
    Write-Host '========================================' -ForegroundColor Green
    Write-Host ''
  }
}

Register-ObjectEvent -InputObject $p -EventName OutputDataReceived -Action $handler | Out-Null
Register-ObjectEvent -InputObject $p -EventName ErrorDataReceived -Action $handler | Out-Null

[void]$p.Start()
$p.BeginOutputReadLine()
$p.BeginErrorReadLine()

Write-Host 'Menunggu Cloudflare membuat URL (bisa 10-60 detik)...' -ForegroundColor Cyan

$deadline = (Get-Date).AddMinutes(2)
while (-not $p.HasExited -and (Get-Date) -lt $deadline) {
  Start-Sleep -Milliseconds 500
  if ($sync.Found) { break }
}

if (-not $sync.Found) {
  Write-Host '[ERROR] URL belum muncul dalam 2 menit.' -ForegroundColor Red
  Write-Host "Cek log: $LogFile" -ForegroundColor Red
  Write-Host 'Pastikan internet aktif, matikan Cloudflare WARP jika ada.' -ForegroundColor Yellow
}

if (-not $p.HasExited) {
  Write-Host 'Tunnel berjalan. Tutup jendela / Ctrl+C untuk stop.' -ForegroundColor Cyan
  try { $p.WaitForExit() } catch {}
}

Get-EventSubscriber | Where-Object { $_.SourceObject -eq $p } | Unregister-Event -Force -ErrorAction SilentlyContinue
if (-not $p.HasExited) {
  try { $p.Kill() } catch {}
}
