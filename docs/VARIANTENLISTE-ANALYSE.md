# Variantenliste – Analyse & Validierung

## PHASE 1 – ANALYSE

### Aktuelle Darstellung (OptionCard)

**Struktur:**
1. Title (opt.label)
2. Description (opt.description)
3. planChangeLines („Was wird geändert“ / „Geänderte Monate und Verteilung“) – nur wenn `!hideMonthDetails`
4. impactLines (Geld/Dauer-Delta) mit Farben

**Datenquellen:**
- `getResultChangePreviewUserFriendly(currentResult, opt.result)` → Monatsänderungen
- `opt.impact` → financialDelta, durationDelta, bonusDelta, advantage, tradeoff

**Vergleichsbasis:** `currentResult` = aktueller Plan (relativ zum vorherigen Schritt)

### hideMonthDetails

- **Strategie-Step:** `hideMonthDetails=true` → Monatsänderungen werden **nicht** angezeigt
- **Schritt 1+2, OptimizationComparisonBlock:** `hideMonthDetails=false` → Monatsänderungen werden angezeigt

### Bereits vorhanden

- Change-Logik: `getResultChangePreviewUserFriendly` liefert z. B. „Monat 3–5 wird zu ElterngeldPlus mit beiden Eltern“
- Delta-Farben: `--positive` (#166534), `--negative` (#b91c1c), `--structural` (color-primary)
- `hasStructuralOnly`: wenn Geld+Dauer gleich, aber Monate anders

---

## PHASE 2 – VALIDIERUNG

| Regel | Status | Befund |
|-------|--------|--------|
| **R1** Unterschiede sichtbar | ❌ | Im Strategie-Step werden Monatsänderungen ausgeblendet |
| **R2** Monatsänderungen hervorheben | ⚠️ | Vorhanden, aber Reihenfolge/Platzierung nicht optimal |
| **R3** Keine versteckten Unterschiede | ❌ | Strategie-Step blendet Monate aus |
| **R4** Vergleich zum aktuellen Plan | ✅ | currentResult ist die Basis |
| **R5** Keine Überladung | ✅ | Keine komplette Matrix |

---

## UMSETZUNGSPLAN

1. **hideMonthDetails entfernen** – Monatsänderungen auch im Strategie-Step anzeigen
2. **Abschnitt „Das ändert sich“** – Titel und klare Monatsänderungen
3. **Reihenfolge:** Geldblock → Monatsänderungen → Beschreibung
4. **hasStructuralOnly:** Monatsänderungen stärker hervorheben (z. B. Grün)
5. **Nur bestehende Tokens** – keine neuen Styles
