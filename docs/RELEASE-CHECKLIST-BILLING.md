# Release-Checkliste: Google Play Billing

Vor dem Upload in die Play Console prüfen.

---

## 1. Produkt-IDs in Play Console

- [ ] **Abonnements angelegt** unter: Monetarisierung → Abonnements
- [ ] Produkt-ID `2.23` mit Base Plans `2-23-monatlich` und `2-23-365`
- [ ] IDs in `src/config/billing.ts` stimmen exakt mit der Console überein
- [ ] Abos aktiviert und freigegeben

---

## 2. Android-Testnutzer

- [ ] Lizenz-Tester hinzugefügt: Setup → Lizenzierung → Testkonten
- [ ] Gmail-Adressen der Tester eingetragen
- [ ] Interne oder geschlossene Test-Track konfiguriert

---

## 3. Build-Konfiguration

- [ ] `.env.production` oder Build-Env: `VITE_BILLING_ENABLED=true`
- [ ] Ohne diese Variable: kein echtes Billing, Nutzer erhalten kein Premium

---

## 4. Testkauf

- [ ] App aus internem Test-Track installieren (nicht Debug-Build direkt)
- [ ] Mit Lizenz-Tester-Konto auf Gerät eingeloggt
- [ ] Begleitung Plus öffnen → Plan wählen → Kauf starten
- [ ] Google-Play-Dialog erscheint, Kauf durchführen
- [ ] Premium wird freigeschaltet, App zeigt Plus-Features

---

## 5. Restore-Test

- [ ] Nach Testkauf: App deinstallieren
- [ ] App erneut aus Test-Track installieren
- [ ] Begleitung Plus öffnen → „Käufe wiederherstellen“
- [ ] Premium wird wiederhergestellt

---

## 6. Freigabeprüfung

- [ ] Kein Premium ohne echten Kauf (kein Stub in Production)
- [ ] Developer-Screen Admin-Bereich in Production ausgeblendet
- [ ] Web/PWA: Stub-Toast, kein Premium

---

## Manuell vor Upload

1. **VITE_BILLING_ENABLED** im Production-Build setzen
2. **Produkt-IDs** in Play Console anlegen und aktivieren
3. **Lizenz-Tester** konfigurieren
4. **Testkauf** und **Restore** mit Testkonto durchführen
