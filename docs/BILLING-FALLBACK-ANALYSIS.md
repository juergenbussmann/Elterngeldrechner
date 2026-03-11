# Billing Fallback – Analyse & Debug

## 1. Suche: Fallback-Texte im Projekt

**Der exakte Text "Abo-Version in einer späteren App verfügbar" existiert nicht im Projekt.**

Die folgenden deutschen Fallback-Texte sind definiert:

| i18n-Key | Deutscher Text | Datei:Zeile |
|----------|----------------|-------------|
| `billing.subscriptionComingSoon` | "Abos werden in einer späteren Version verfügbar. Ausgewählt: {{planLabel}}" | `src/locales/de.json:157` |
| `billing.webOnly` | "Abos sind nur in der Android-App über Google Play verfügbar." | `src/locales/de.json:158` |
| `billing.integrationPending` | "Abo-Funktion wird vorbereitet." | `src/locales/de.json:161` |
| `billing.notAvailable` | "Käufe sind auf diesem Gerät nicht verfügbar." | `src/locales/de.json:168` |
| `billing.purchaseFailed` | "Kauf fehlgeschlagen." | `src/locales/de.json:167` |

---

## 2. Wo der Fallback gerendert wird

| Datei | Zeile | Kontext |
|-------|-------|---------|
| `src/screens/BegleitungPlusScreen.tsx` | 55–58 | `showToast(result.stubMessageKey)` in `handleSubscribe` |
| `src/core/begleitungPlus/ui/BegleitungPlusUpsellPanel.tsx` | 46–48 | `showToast(result.stubMessageKey)` in `handleSubscribe` |

Die Fallback-Meldungen werden als **Toast** angezeigt, nicht als statischer UI-Text. Der Nutzer klickt auf „Jetzt Begleitung Plus nutzen“ → `subscribeToPlan()` wird aufgerufen → bei Fehlern wird ein Toast mit dem jeweiligen `stubMessageKey` angezeigt.

---

## 3. Bedingungen, die den Fallback auslösen

### Bedingungskette

```
handleSubscribe() → subscribeToPlan(selectedPlan) → [verschiedene Branches]
```

| Bedingung | stubMessageKey | Bedeutung |
|-----------|----------------|-----------|
| `!useNativeBilling && !BILLING_STUB_ACTIVATE` | `billing.webOnly` | Web/PWA: Abos sind nicht verfügbar |
| `useNativeBilling && purchaseSubscription()` gibt `!success && !cancelled` zurück | `billing.notAvailable` oder `billing.purchaseFailed` | Android: Kauf fehlgeschlagen |
| `!useNativeBilling` (in purchaseSubscription) | `billing.notAvailable` | Billing nicht bereit (wird von subscribeToPlan nicht ausgelöst, da purchaseSubscription nur bei useNativeBilling aufgerufen wird) |

### useNativeBilling

```ts
useNativeBilling = isNativeAndroid && BILLING_ENABLED
```

- `isNativeAndroid`: Capacitor-Plattform ist Android
- `BILLING_ENABLED`: `VITE_BILLING_ENABLED=true` in `.env.production`

### Wann wird welcher Fallback ausgelöst?

| Auslöser | stubMessageKey |
|----------|----------------|
| Billing nicht bereit (Web oder nicht Android) | `billing.webOnly` |
| Billing nicht bereit (Android, aber VITE_BILLING_ENABLED fehlt) | `billing.webOnly` (nicht `notAvailable`, da useNativeBilling false ist) |
| Keine ProductDetails vom Native Plugin | `billing.purchaseFailed` (Plugin wirft Fehler) |
| Keine subscriptionOfferDetails | `billing.purchaseFailed` |
| Kein passender Base Plan | `billing.purchaseFailed` |
| Restore/Sync nicht geladen | Kein direkter Fallback; Sync läuft beim Öffnen der Seite |

**Hinweis:** ProductDetails, subscriptionOfferDetails und Base Plans werden im Native Plugin (`@capgo/native-purchases`) verarbeitet. Die App erhält nur Erfolg/Fehler; keine Details zu Anzahl oder Inhalt der ProductDetails.

---

## 4. Debug-Logs (DEV)

Die folgenden Debug-Logs wurden ergänzt (nur in `import.meta.env.DEV`):

- **subscribeToPlan:** `billingReady`, `productId`, `plan`, `basePlanId`, `stubMessageKey`, `condition`
- **purchaseSubscription:** bei `!useNativeBilling` (falls direkt aufgerufen)
- **BegleitungPlusScreen:** vor `showToast` mit `billingReady`, `productId`, `selectedPlan`, `basePlanId`, `stubMessageKey`
- **BegleitungPlusUpsellPanel:** vor `showToast` mit denselben Feldern

---

## 5. Minimale Änderung: Fallback nur bei echter Unverfügbarkeit

**Aktuelles Verhalten:**

- `billing.webOnly`: wird nur bei Web/kein Android angezeigt → korrekt
- `billing.purchaseFailed`: wird bei jedem Kauf-Fehler angezeigt (inkl. User-Abbruch) → User-Abbruch wird bereits durch `cancelled` ausgenommen
- `billing.subscriptionComingSoon` / `billing.integrationPending`: werden aktuell nicht ausgelöst; sie sind nur für die `goBackOnStub`-Logik vorhanden

**Empfehlung:** Das Verhalten ist bereits korrekt. Der Fallback wird nur angezeigt, wenn:

1. **billing.webOnly:** Abos auf der Plattform nicht verfügbar (Web)
2. **billing.notAvailable:** Billing auf dem Gerät nicht verfügbar
3. **billing.purchaseFailed:** Kauf fehlgeschlagen (z. B. Produkt nicht gefunden, Netzwerkfehler)

User-Abbruch wird durch `result.cancelled` ausgeloggt und führt keinen Toast aus.

---

## 6. Entfernen der Debug-Logs

Die Debug-Logs sind mit `import.meta.env.DEV` abgesichert und erscheinen nur in der Entwicklungsumgebung. Für Production können sie entfernt oder mit einer eigenen Umgebungsvariable gesteuert werden.

---

## 7. Änderungen für Android-Test-Builds (2026-03)

### BILLING_ENABLED-Fallback

**Problem:** Bei Dev/Test-Builds (z. B. Live-Reload) wird `.env.production` nicht geladen → `VITE_BILLING_ENABLED` war leer → `BILLING_ENABLED=false` → Stub statt echtem Kauf.

**Lösung in `src/config/billing.ts`:**

- `BILLING_ENABLED` ist jetzt `true`, wenn:
  - `VITE_BILLING_ENABLED === 'true'` oder `=== '1'`, **oder**
  - `isNativeAndroid && VITE_BILLING_ENABLED !== 'false'` (Fallback für Android)
- Auf Android wird Billing damit aktiviert, sofern die Env-Variable nicht explizit `false` ist.

### .env.development

- Neu: `.env.development` mit `VITE_BILLING_ENABLED=true`
- Wird bei `npm run dev` geladen; ermöglicht echten Billing-Flow bei Live-Reload auf dem Gerät.

### Debug-Logs (DEV)

- **billing.ts:** `isNativeAndroid`, `BILLING_ENABLED`, `raw`/`envBillingEnabled`/`envBillingDisabled`
- **billingService.ts:** `useNativeBilling`, `isNativeAndroid`, `BILLING_ENABLED`, `isNativePurchasesAvailable`
- **subscribeToPlan.ts:** Beim Einstieg: `plan`, `productId`, `basePlanId`, `useNativeBilling`, `BILLING_ENABLED`, `isNativeAndroid`, `isNativePurchasesAvailable`, `willCallRealPurchase`
