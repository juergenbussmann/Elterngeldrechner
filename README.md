# stillberatung-pwa
Stillberatung 1

## Netlify: Admin-PIN (Begleitung Plus)

Für den Admin-Schalter auf der Entwickler-Seite (Einstellungen → Entwickler → Begleitung Plus (Admin)):

1. In Netlify: **Site settings → Environment variables**
2. Variable hinzufügen: `VITE_ADMIN_PIN` = dein geheimer PIN
3. **Rebuild** auslösen – Vite baut die Variable zur Build-Zeit ein

Ohne gesetzte Variable erscheint „Admin-PIN nicht konfiguriert“; eine Freischaltung ist nicht möglich.

## Billing (Begleitung Plus)

- **Android:** `VITE_BILLING_ENABLED=true` – echte Google-Play-Abos. Siehe `docs/BILLING-ANDROID-TEST.md`.
- **Web/PWA:** Stub – Toast „Abos später verfügbar“. `VITE_BILLING_STUB_ACTIVATE=true` + DEV: Plus lokal simulieren.
