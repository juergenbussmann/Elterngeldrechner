# Monetarisierung – Google Play Abos – Minimaler Umsetzungsplan

**Stand:** Analyse abgeschlossen  
**Ziel:** Echte Google-Play-Abos in der bestehenden Capacitor-Android-App integrieren, ohne UI/UX zu ändern.

---

## 1. Analyse der vorhandenen Struktur

### 1.1 Begleitung-Plus-Architektur (bereits vorhanden)

| Komponente | Datei | Rolle |
|------------|-------|-------|
| Paywall-UI | `src/screens/BegleitungPlusScreen.tsx` | Plan-Auswahl, CTA, Benefits |
| Kauf-Logik | `src/core/begleitungPlus/subscribeToPlan.ts` | Stub: Toast oder DEV-Aktivierung |
| Entitlement-Store | `src/core/begleitungPlus/begleitungPlusStore.ts` | localStorage, `activatePlus(expiresAt?)`, `getEntitlements()` |
| Billing-Config | `src/config/billing.ts` | `BILLING_ENABLED`, `BILLING_PRODUCT_ID`, `BILLING_BASE_PLAN_IDS` |
| Plan-Typen | `src/core/begleitungPlus/planTypes.ts` | `PlanId`, `PLAN_OPTIONS` |
| Entitlements | `src/core/begleitungPlus/entitlements.ts` | `isPremium`, `activatedAt`, `expiresAt` |

**Fazit:** Die Architektur ist bereits für Billing vorbereitet. `activatePlus(expiresAt?)` unterstützt Ablaufdaten. Keine neue Architektur nötig.

### 1.2 Plattform-Stack

- **Capacitor 8.1** (Android)
- **Kein** bestehendes Billing-Plugin
- **Kein** Capacitor-Import in `src/` (nur in `package.json`)

---

## 2. Ist ein nativer Bridge / Plugin nötig?

**Ja – aber kein eigener.** Die Google Play Billing Library ist nur nativ verfügbar. Statt eines eigenen Bridges wird ein **fertiges Capacitor-Plugin** verwendet:

| Option | Empfehlung | Begründung |
|--------|------------|------------|
| **@capgo/native-purchases** | ✅ Ja | Capacitor 8-kompatibel, Google Billing 7.x, aktiv gepflegt, `purchaseProduct`, `restorePurchases`, `getPurchases` |
| Eigener Bridge | ❌ Nein | Hoher Aufwand, Fehleranfälligkeit, Wartung |
| squareetlabs/capacitor-subscriptions | Alternative | Weniger Sterne, weniger Dokumentation |

**Minimaler Einbau:** `npm install @capgo/native-purchases` + `npx cap sync`. Kein eigener nativer Code.

---

## 3. Konkrete Dateiliste – Änderungen

### 3.1 Zu ändernde Dateien (minimal)

| # | Datei | Änderung |
|---|-------|----------|
| 1 | `src/config/billing.ts` | Google-Play-Product-IDs + Base-Plan-IDs, Plattform-Check (`isNativeAndroid`) |
| 2 | `src/core/begleitungPlus/subscribeToPlan.ts` | Statt Stripe-TODO: echte `NativePurchases.purchaseProduct()`-Integration |
| 3 | `src/core/begleitungPlus/begleitungPlusStore.ts` | Keine Änderung (bereits `activatePlus(expiresAt)`) |
| 4 | `src/screens/BegleitungPlusScreen.tsx` | Restore-Button hinzufügen (Text-Link, gleicher Stil wie Microcopy) |
| 5 | `src/main.tsx` | Entitlement-Sync beim App-Start (nur wenn `isNativeAndroid` + `BILLING_ENABLED`) |
| 6 | `package.json` | Dependency: `@capgo/native-purchases` |
| 7 | `android/app/src/main/AndroidManifest.xml` | Permission: `com.android.vending.BILLING` |
| 8 | `src/locales/de.json` | Keys: `billing.restore`, `billing.restoreSuccess`, `billing.restoreNothing` |
| 9 | `src/locales/en.json` | Entsprechend |

### 3.2 Neue Dateien (optional, empfohlen)

| # | Datei | Zweck |
|---|-------|-------|
| 10 | `src/core/begleitungPlus/restorePurchases.ts` | `restorePurchases()` + Sync mit Store |
| 11 | `src/core/begleitungPlus/syncEntitlementsFromStore.ts` | `getPurchases()` → `activatePlus(expiresAt)` / `deactivatePlus()` |

**Alternative:** Beide Funktionen direkt in `subscribeToPlan.ts` ergänzen (weniger Dateien, etwas mehr Zeilen).

### 3.3 Nicht geändert (SSOT, Layout, Texte)

- `docs/SSOT-AppStyle.md` – unverändert
- `src/screens/start.css`, `Start.tsx` – unverändert
- `src/core/begleitungPlus/ui/begleitungPlusScreen.css` – unverändert
- Bestehende Begleitung-Plus-Texte, Benefits, Plan-Optionen – unverändert
- `BegleitungPlusUpsellPanel`, `LimitReachedBanner`, `ProgressTriggerBanner` – unverändert

---

## 4. Technischer Ablauf

### 4.1 Kauf-Flow (subscribeToPlan)

```
User wählt Plan → handleSubscribe() → subscribeToPlan(selectedPlan)
  → isNativeAndroid && BILLING_ENABLED?
    → NativePurchases.purchaseProduct({ productIdentifier, planIdentifier, productType: SUBS })
    → Bei Erfolg: activatePlus(transaction.expirationDate)
    → goBack()
  → Sonst: bestehender Stub (Toast / DEV-Aktivierung)
```

### 4.2 Restore-Flow

```
User klickt "Käufe wiederherstellen"
  → restorePurchases() → NativePurchases.restorePurchases()
  → syncEntitlementsFromStore() → getPurchases(SUBS)
  → Aktives Abo? → activatePlus(expirationDate)
  → Kein Abo? → deactivatePlus()
  → Toast: Erfolg oder "Keine Käufe gefunden"
```

### 4.3 Entitlement-Sync (App-Start)

```
main.tsx bootstrap()
  → isNativeAndroid && BILLING_ENABLED?
    → syncEntitlementsFromStore() (im Hintergrund)
    → getPurchases(SUBS) → gültiges Abo? → activatePlus(expiresAt)
```

---

## 5. Billing-Konfiguration (billing.ts) – Erweiterung

```ts
// Neu: Plattform-Check
import { Capacitor } from '@capacitor/core';
export const isNativeAndroid =
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

// Google Play: EIN Abo-Produkt "2.23" mit zwei Base Plans
export const BILLING_PRODUCT_ID = '2.23' as const;

export const BILLING_BASE_PLAN_IDS = {
  monthly: '2-23-monatlich',   // Base Plan ID aus Google Play Console
  yearly: '2-23-365',         // Base Plan ID aus Google Play Console
} as const;
```

**Hinweis:** Die exakten IDs kommen aus der Google Play Console (Produkte & Abos anlegen).

---

## 6. BegleitungPlusScreen – Restore-Button (minimal)

**Position:** Direkt unter dem Microcopy-Text ("Jederzeit kündbar. Keine versteckten Kosten."), vor dem Free-Tier-Bereich.

**Umsetzung:** Text-Link im gleichen Stil wie bestehende Links, nur sichtbar wenn `isNativeAndroid && BILLING_ENABLED`:

```tsx
{isNativeAndroid && BILLING_ENABLED && (
  <button type="button" className="ui-link" onClick={handleRestore}>
    {t('billing.restore')}
  </button>
)}
```

Kein neues CSS nötig, wenn `ui-link` bereits existiert; sonst minimaler Stil (unterstreichen, gleiche Schrift wie Microcopy).

---

## 7. Zustandsanzeige (minimal)

- **Bereits vorhanden:** `useBegleitungPlus()` → `isPlus`, `entitlements`
- **Kein zusätzlicher Indikator** auf dem BegleitungPlusScreen nötig
- Optional: Beim Restore kurz Loading-State am Button (z.B. disabled + "Wird wiederhergestellt...")

---

## 8. Abhängigkeiten

| Paket | Version | Zweck |
|-------|---------|-------|
| `@capgo/native-purchases` | ^8.x (Capacitor 8-kompatibel) | Google Play Billing + StoreKit 2 |
| `@capacitor/core` | bereits vorhanden | Für `Capacitor.isNativePlatform()` |

---

## 9. Google Play Console – Voraussetzungen

1. **Abos anlegen:** Zwei Abo-Produkte (monthly, yearly) mit Base Plans
2. **Product IDs** in `billing.ts` eintragen (müssen exakt übereinstimmen)
3. **Lizenz-Tester** hinzufügen für Tests
4. **Interne/geschlossene Test-Track** mit Build hochladen (Billing funktioniert nur mit Store-Installation)

---

## 10. Zusammenfassung – Warum nur diese Änderungen?

| Aspekt | Begründung |
|--------|------------|
| **Kein Redesign** | SSOT und bestehende UI bleiben unverändert |
| **Keine neue Architektur** | `subscribeToPlan`, `begleitungPlusStore`, `activatePlus(expiresAt)` sind bereits passend |
| **Plugin statt eigener Bridge** | @capgo/native-purchases deckt Kauf, Restore, getPurchases ab |
| **Minimale UI-Erweiterung** | Nur ein Restore-Button, gleicher Stil wie Microcopy |
| **Plattform-Check** | Web/PWA behält Stub-Verhalten; nur Android nutzt echtes Billing |
| **Sync beim Start** | Ein Aufruf in `main.tsx` reicht für Entitlement-Sync |

---

## 11. Implementierungsreihenfolge

1. `package.json` – Dependency + `npx cap sync`
2. `AndroidManifest.xml` – BILLING-Permission
3. `billing.ts` – `isNativeAndroid`, `BILLING_BASE_PLAN_IDS`
4. `syncEntitlementsFromStore.ts` – neue Datei
5. `restorePurchases.ts` – neue Datei (oder in subscribeToPlan)
6. `subscribeToPlan.ts` – Google-Play-Integration
7. `main.tsx` – Sync beim Start
8. `BegleitungPlusScreen.tsx` – Restore-Button
9. `locales` – neue Keys
10. Google Play Console – Produkte anlegen, IDs eintragen
