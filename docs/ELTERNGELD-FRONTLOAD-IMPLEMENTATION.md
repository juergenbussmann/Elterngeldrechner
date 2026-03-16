# frontLoad – Wiedereinführung des Optimierungsziels „Am Anfang mehr Geld“

## 1. Angepasste Dateien

| Datei | Änderungen |
|-------|------------|
| `src/modules/documents/elterngeld/calculation/elterngeldOptimization.ts` | Strategielogik, UNSUPPORTED_GOALS, Typen, GOAL_LABELS |
| `src/modules/documents/elterngeld/steps/OptimizationGoalDialog.tsx` | frontLoad als Hauptziel im UI |
| `src/modules/documents/elterngeld/steps/StepCalculationResult.tsx` | getExplanationText, differenzText, getSuggestionDeltaLines, Differenz-CSS |
| `src/modules/documents/elterngeld/calculation/elterngeldOptimization.test.ts` | Neuer Test F1 für frontLoad |

---

## 2. Technische Umsetzung

### 2.1 Strategielogik

- **`addFrontLoadCandidates`**: Erzeugt Mutationskandidaten durch:
  - **Shift zwischen Eltern** (`addShiftCandidatesInDirectionForFrontLoad`): Monate von einem Elternteil zum anderen verschieben (beide Richtungen A→B und B→A), ohne Filter nach Gesamtsumme
  - **Plus→Basis** (`addPlusToBasisCandidates` mit `strategyTypeOverride: 'frontLoad'`): Plus-Monate in Basis umwandeln

- **`computeFrontLoadScore(result)`**: Gewichtete Summe der monatlichen Haushaltsbeträge. Frühe Monate erhalten höheres Gewicht: `amount * (maxMonth - month + 1)`. Höherer Score = mehr Auszahlung am Anfang.

- **`filterImprovedCandidates`** (frontLoad): Kandidat wird behalten, wenn:
  - `frontLoadScore > baseFrontLoadScore`
  - `total >= baseTotal * 0.95` (max. 5 % Verlust der Gesamtsumme)

- **`selectTop3`** (frontLoad): Sortierung nach `frontLoadScore` absteigend, bei Gleichstand nach `householdTotal`.

### 2.2 UNSUPPORTED_GOALS

- **Vorher:** `['frontLoad', 'balanced']`
- **Nachher:** `['balanced']`
- `frontLoad` ist damit aktiv, `balanced` bleibt deaktiviert.

---

## 3. Bewertungslogik

- **Metrik:** Gewichtete Summe der monatlichen Beträge (frühe Monate stärker gewichtet)
- **Verbesserung:** Höherer frontLoad-Score bei mindestens 95 % der ursprünglichen Gesamtsumme
- **Darstellung:** „Auszahlung früher“ als Metrik-Label, „Mehr Auszahlung am Anfang“ als Verbesserungstext

---

## 4. UI-Integration

### OptimizationGoalDialog.tsx

- **Neues Hauptziel:** „Am Anfang mehr Geld“
- **Beschreibung:** „Bevorzugt höhere Auszahlungen in den ersten Lebensmonaten.“
- **GOAL_LABELS:** `frontLoad: 'Am Anfang mehr Geld'`

### StepCalculationResult.tsx

- **getExplanationText:** „Diese Variante konzentriert höhere Auszahlungen in die ersten Lebensmonate.“
- **differenzText:** „Verbesserung: Mehr Auszahlung am Anfang“
- **getSuggestionDeltaLines:** „Mehr Auszahlung in frühen Monaten“ + Gesamtsumme + Bezugsdauer

---

## 5. Bestätigungen

### balanced weiterhin deaktiviert

- `UNSUPPORTED_GOALS` enthält weiterhin nur `['balanced']`
- `balanced` erscheint nicht im OptimizationGoalDialog
- Keine Änderungen an der balanced-Logik

### Keine Änderung an Berechnungslogik oder Datenmodell

- **Unverändert:** `calculatePlan`, `applicationToCalculationPlan`, `partnerBonusValidation`, `validatePartnerBonus`
- **Unverändert:** `ElterngeldApplication`, `benefitPlan`, `elterngeldTypes`
- **Keine neuen Fachfelder**
- Optimierung arbeitet ausschließlich über Plan-Mutationen und Aufrufe von `calculatePlan`

---

## 6. Verifikation

| Prüfung | Ergebnis |
|---------|----------|
| Build | ✓ Erfolgreich |
| Alle Tests (49) | ✓ Bestanden |
| frontLoad-Test F1 | ✓ 3 Vorschläge, status: improved |
| maxMoney, longerDuration, partnerBonus | ✓ Unverändert funktionsfähig |
