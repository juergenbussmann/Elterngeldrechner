# TWA (Trusted Web Activity) – Stillberatung

Android-App-Bundle für Google Play, das die PWA unter https://www.stillberatung-jt.de als TWA öffnet.

## Voraussetzungen

- `bubblewrap doctor` erfolgreich
- PWA unter https://www.stillberatung-jt.de erreichbar (inkl. `/manifest.webmanifest` und `/brand/icon-512.png`)

## AAB bauen

### Erster Build (Keystore anlegen)

```powershell
cd twa-android
bubblewrap build
```

Beim ersten Lauf wird ein Keystore erstellt. **Wichtig:** Keystore-Pfad und Passwörter für spätere Updates aufbewahren.

### Spätere Builds (Keystore vorhanden)

```powershell
cd twa-android
bubblewrap build
```

## Build-URLs (Manifest/Icon)

**Aktuell (Netlify):** Da www.stillberatung-jt.de Manifest/Icon noch 404 liefert, nutzt `twa-manifest.json` Netlify:

- `iconUrl`: `https://2026-02-27-stillberatung-final.netlify.app/brand/icon-512.png`
- `maskableIconUrl`: `https://2026-02-27-stillberatung-final.netlify.app/brand/icon-512.png`
- `webManifestUrl`: `https://2026-02-27-stillberatung-final.netlify.app/manifest.webmanifest`

**Wichtig:** Die TWA öffnet weiterhin `https://www.stillberatung-jt.de/` (siehe `host`). Die obigen URLs dienen nur der Build-Generierung.

**Nach Deploy auf Produktion:** Sobald www.stillberatung-jt.de `manifest.webmanifest` und `brand/icon-512.png` nicht mehr 404 liefert, in `twa-manifest.json` wieder auf die Produktions-URLs umstellen und erneut `bubblewrap update` + `bubblewrap build` ausführen.

## Digital Asset Links

Für die TWA-Verifizierung muss unter  
`https://www.stillberatung-jt.de/.well-known/assetlinks.json`  
die Verknüpfung zur App hinterlegt sein. Erzeugen mit:

```powershell
bubblewrap fingerprint
```

## AAB-Pfad nach Build

```
twa-android/app-release-bundle.aab
```

(Alternativ: `twa-android/app/build/outputs/bundle/release/app-release.aab` vor dem Signieren)
