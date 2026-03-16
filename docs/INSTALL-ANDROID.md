# App auf Android-Handy installieren

## Voraussetzungen

- Android-Handy per USB mit dem PC verbunden
- USB-Debugging aktiviert (Einstellungen → Entwickleroptionen)
- Android Studio oder mindestens Android SDK installiert

## Installation

```bash
npm run install:android
```

Dieser Befehl:
1. Baut die Web-App (Vite)
2. Synchronisiert mit dem Android-Projekt (Capacitor)
3. Installiert die Debug-APK auf dem verbundenen Gerät

## Alternativ: Release-Build (AAB für Play Store)

```bash
npm run build:aab
```

Die AAB-Datei liegt danach unter `android/app/build/outputs/bundle/release/`.
