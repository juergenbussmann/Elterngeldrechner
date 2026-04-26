# Elterngeldrechner (Capacitor) – Debug-APK aus android/ auf verbundenes Gerät installieren
# Voraussetzung: Handy per USB verbunden, USB-Debugging aktiviert

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Set-Location $projectRoot

Write-Host "1/3 Web-App bauen (Production-Embed für Android, ohne PWA-Service-Worker)..." -ForegroundColor Cyan
npm run build:android:dist
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "2/3 Capacitor synchronisieren (public vorher leeren)..." -ForegroundColor Cyan
npm run cap:sync:android
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "3/3 APK auf Gerät installieren..." -ForegroundColor Cyan
Set-Location android
.\gradlew.bat clean installDebug
$exitCode = $LASTEXITCODE
Set-Location $projectRoot

if ($exitCode -eq 0) {
    Write-Host "`nApp erfolgreich installiert." -ForegroundColor Green
} else {
    Write-Host "`nInstallation fehlgeschlagen. Ist das Handy per USB verbunden und USB-Debugging aktiv?" -ForegroundColor Yellow
    exit $exitCode
}
