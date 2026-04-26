# TWA-Ordner (veraltet)

Dieses Verzeichnis enthält einen **nicht mehr genutzten** Bubblewrap-/TWA-Entwurf. **Keine APK/AAB mehr aus diesem Ordner bauen** — sie würden eine veraltete Remote-Web-App laden.

## Aktueller Android-Build (Capacitor)

- Projekt: `android/`
- Web-Assets: `npm run build` → `dist/`, dann `npx cap sync android`
- Debug-APK: `npm run build:apk` → `android/app/build/outputs/apk/debug/app-debug.apk`
- Installation auf Gerät: `npm run install:android` oder `scripts/install-android.ps1`

Siehe `DEPRECATED.txt` im gleichen Ordner.
