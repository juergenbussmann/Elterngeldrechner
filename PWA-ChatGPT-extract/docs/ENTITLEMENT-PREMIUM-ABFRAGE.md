# Premium-Entitlement – Abfrage-Stellen

## Datenfluss

```
Android + Billing:  Google Play (getPurchases) → syncEntitlementsFromStore → activatePlus/deactivatePlus → localStorage (Cache)
Web:                Kein Store → Cache nur für DEV/Admin-Stub
```

- **Source of Truth (Android):** Google Play Store. `syncEntitlementsFromStore` überschreibt den Cache.
- **Cache:** localStorage. Wird von Sync, Kauf, Dev und Admin geschrieben.
- **Abfrage:** `getEntitlements()` liest aus dem Cache. `useBegleitungPlus()` und `isPlus()` nutzen das.

## Stellen, an denen Premium abgefragt wird

| Datei | Verwendung | Warum ausreichend |
|-------|------------|-------------------|
| `useBegleitungPlus.ts` | `getEntitlements()` → `isPlus`, `hasFeature`, `limits` | Hook liest Cache, hört auf `begleitung-plus-changed`. Sync/Kauf/Admin lösen das Event aus. |
| `isPlus.ts` | `getEntitlements().isPremium` | Synchroner Check für Services. Cache wird von Sync aktualisiert. |
| `AppShell.tsx` | `useBegleitungPlus()` → `isPlus` | Banner-Steuerung. Reagiert auf Event. |
| `UCheckFormScreen.tsx` | `useBegleitungPlus()` → `isPlus` | Feature-Gate. |
| `AppointmentsPage.tsx` | `useBegleitungPlus()` → `isPlus`, `limits` | Limits und Lock-Logik. |
| `ContactsPage.tsx` | `useBegleitungPlus()` → `isPlus`, `limits` | Limits und Lock-Logik. |
| `ChecklistsBreastfeedingPage.tsx` | `useBegleitungPlus()` → `isPlus` | Plus-Section, Upsell. |
| `ChecklistsPregnancyPage.tsx` | `useBegleitungPlus()` → `isPlus` | Plus-Section, Upsell. |
| `ChecklistsBirthPage.tsx` | `useBegleitungPlus()` → `isPlus` | Plus-Section, Upsell. |
| `ChecklistDetailPage.tsx` | `useBegleitungPlus()` → `isPlus` | Plus-Inhalte. |
| `ChecklistsScreen.tsx` | `useBegleitungPlus()` → `isPlus` | Plus-Banner. |
| `PlusSection.tsx` | `useBegleitungPlus()` → `isPlus` | Plus-Content-Gate. |
| `checklistsService.ts` | `requirePlus()` | Guard für Service-Aufrufe. |
| `DeveloperScreen.tsx` | `useBegleitungPlus()` → `isPlus` | Status-Anzeige. |

**Fazit:** Alle Abfragen laufen über `getEntitlements()` bzw. `useBegleitungPlus()`. Der Cache wird von `syncEntitlementsFromStore` (App-Start), `purchaseSubscription` (Kauf) und Dev/Admin aktualisiert. Keine zusätzlichen Änderungen an den Abfrage-Stellen nötig.
