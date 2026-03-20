# Google Play Billing – Lokal und auf Android testen

## Voraussetzungen

1. **Google Play Console:** App mit Abonnement-Produkten angelegt
   - Monetarisierung → Abonnements
   - Produkt-ID: `2.23` mit Base Plans `2-23-monatlich` (monatlich), `2-23-365` (jährlich)
   - Base Plan IDs: `monthly`, `yearly` (oder in `billing.ts` anpassen)

2. **Billing aktivieren:** `.env` oder `.env.production` mit:
   ```
   VITE_BILLING_ENABLED=true
   ```

3. **Lizenz-Tester:** In Play Console → Setup → Lizenzierung → Testkonten hinzufügen

## Lokal (Web)

```bash
npm run dev
```

- Billing ist deaktiviert (Stub)
- Mit `VITE_BILLING_STUB_ACTIVATE=true` in DEV: Plus wird lokal simuliert

## Android (Gerät/Emulator)

- **Wichtig:** Billing funktioniert nur mit einer App vom Play Store (interner Test-Track)
- Build von Play Store installieren oder über Internal Testing:

```bash
npm run build
npx cap sync android
cd android
.\gradlew.bat assembleDebug
```

- AAB für Upload: `.\gradlew.bat bundleRelease` (siehe `npm run build:aab`)
- App aus dem internen Test-Track installieren
- Mit Lizenz-Tester-Konto einloggen

## Testablauf

1. App starten → Zur Begleitung-Plus-Seite navigieren
2. Plan wählen → „Jetzt Begleitung Plus nutzen“
3. Google Play Kauf-Dialog erscheint
4. „Käufe wiederherstellen“ testen (nach App-Neuinstallation)
