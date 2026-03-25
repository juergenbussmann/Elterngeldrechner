# Startet die PWA im Entwicklungsmodus so, dass andere Geräte im LAN sie erreichen.
# Voraussetzung: PC und Handy im gleichen WLAN. Windows-Firewall ggf. Port 5173 erlauben.

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$ips = @()
try {
  $ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
      $_.IPAddress -notlike '127.*' -and
      $_.IPAddress -notlike '169.254.*' -and
      $_.PrefixOrigin -ne 'WellKnown'
    } |
    Select-Object -ExpandProperty IPAddress -Unique
} catch {
  $ips = @()
}

Write-Host ''
Write-Host 'Stillberatung – Dev-Server für Handy (Browser)' -ForegroundColor Cyan
Write-Host 'Im Handy-Browser eine dieser Adressen öffnen:' -ForegroundColor White
if ($ips.Count -gt 0) {
  foreach ($ip in $ips) {
    Write-Host "  http://${ip}:5173" -ForegroundColor Green
  }
} else {
  Write-Host '  (IP nicht ermittelt – in Windows: ipconfig → IPv4-Adresse, dann http://<IP>:5173)' -ForegroundColor Yellow
}
Write-Host ''
Write-Host 'Optional – native Android-App (USB, Debugging an): npm run install:android' -ForegroundColor DarkGray
Write-Host ''

npm run dev:mobile
