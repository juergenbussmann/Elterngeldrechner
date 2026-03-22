# Analyse: Optimierungsflow – Varianten, Delta-Inkonsistenz, Übernahme

**Stand:** Nach Code-Analyse, keine Änderungen vorgenommen.

---

## Schritt 1: Relevante Dateien

### Kern-Berechnung
| Datei | Rolle |
|-------|-------|
| `calculation/calculationEngine.ts` | `calculatePlan(plan)` – zentrale Berechnung |
| `calculation/elterngeldOptimization.ts` | `buildOptimizationResult(plan, result, goal)` – Kandidatenerzeugung, Top-3, Suggestions |
| `calculation/stepDecisionFlow.ts` | `buildStepDecisionContext(plan, result, opts)` – Wizard-Steps, Step 1/2/3 |
| `calculation/decisionContext.ts` | `buildDecisionContext(resultSet, selectedIndex, opts)` – Optionen mit `impact` |
| `calculation/resolveBaseline()` | Vergleichsbasis (vsCurrent / vsOriginal / vsLastAdopted) |

### Wizard / Flow
| Datei | Rolle |
|------|-------|
| `steps/OptimizationOverlay.tsx` | Modal „Aufteilung prüfen“ – hostet `StepOptimizationBlock` |
| `steps/StepPlan.tsx` | Monatsplanung, Button „Varianten vergleichen“ |
| `steps/StepSummary.tsx` | Zusammenfassung |
| `ElterngeldWizardPage.tsx` | Wizard-Container, `onAdoptOptimization` → `mergePlanIntoPreparation` |

### UI-Komponenten
| Datei | Rolle |
|------|-------|
| `steps/StepCalculationResult.tsx` | `StepOptimizationBlock` (Wizard), `OptionCard`, `AdoptConfirmDialog` |
| `steps/StepCalculationResult.tsx` | `OptimizationComparisonBlock` (alter/einfacher Vergleich) |
| `shared/ui/Card.tsx`, `Button.tsx` | UI-Basis |

---

## Schritt 2: Datenfluss

### Berechnungskette (einmal pro Kontext)
```
calculatePlan(plan) → CalculationResult
       ↓
buildOptimizationResult(plan, result, goal)
  → findCandidates → generateMutationCandidates → addAlternativeCandidates, addShift..., etc.
  → selectTop3 (max 3 pro Ziel)
  → candidateToSuggestion (optimizedTotal, deltaValue, …)
  → OptimizationResultSet { goal, suggestions }
       ↓
buildDecisionContext(resultSet, selectedIndex, opts)
  → resolveBaseline(mode, …) → basePlan, baseResult
  → options[] mit impact: { financialDelta, durationDelta, bonusDelta, … }
  → financialDelta = s.optimizedTotal - baseTotal
       ↓
DecisionOption { plan, result, impact, strategyType, … }
```

### Optionen-Struktur (DecisionOption)
```ts
{
  id, label, description, strategyType,
  impact: {
    financialDelta: number,   // optimizedTotal - baseTotal
    durationDelta: number,
    bonusDelta: number,
    changeSummary, advantage, tradeoff, coreChanges, fullSummary
  },
  plan, result, suggestion?
}
```

### Wo Delta berechnet wird
1. **buildDecisionContext** (decisionContext.ts, ca. Zeile 523):
   - `financialDelta: s.optimizedTotal - baseTotal`
   - `baseTotal = baseResult.householdTotal` aus `resolveBaseline()`
   - Keine weitere Berechnung im Dialog

2. **AdoptConfirmDialog** – nutzt nur übergebene Werte:
   - `deltaTotal={adoptDialogOption?.financialDelta ?? 0}`
   - `deltaDuration={adoptDialogOption?.durationDelta ?? 0}`
   - Keine eigene Berechnung im Dialog ✓

### Übergabe in den Dialog
- **StepOptimizationBlock**: `openAdoptDialog` speichert `selectedOption.impact.financialDelta` in `adoptDialogOption`
- **OptimizationComparisonBlock**: `deltaTotal={selectedOption?.impact.financialDelta ?? 0}` direkt
- Beide nutzen dasselbe `impact` der gewählten Option

---

## Schritt 3: Variantenproblem

### Erzeugung von Varianten (buildOptimizationResult)

**Goals:** `maxMoney`, `longerDuration`, `frontLoad`, `partnerBonus`

**Kandidatenerzeugung (findCandidates → generateMutationCandidates):**
- **addAlternativeCandidates**: motherOnly, bothBalanced, withoutPartTime, withPartTime (bei overlap)
- **maxMoney**: addShiftBetweenParentsCandidates, addPlusToBasisCandidates
- **longerDuration**: addBasisToPlusCandidates
- **partnerBonus**: addPartnerBonusOverlapCandidates, tryAddPartnerBonus
- **frontLoad**: addShiftCandidatesInDirectionForFrontLoad, addPlusToBasisCandidates

**Filterungen:**
- `selectTop3`: max 3 pro Ziel, dedupliziert nach `resultFingerprint`
- `filterImprovedCandidates` (goal-spezifisch)
- `shouldShowVariant`: Varianten mit gleicher Dauer und weniger Geld nur bei „erklärbarem Vorteil“

### Filter in buildStepDecisionContext

**Step 1 (Grundmodell):**
- Nur `current`, `motherOnly` (wenn hasFatherMonths), `bothBalanced` aus maxMoney
- `createBothBalancedPlan` liefert `null`, wenn `monthsA.length === 0 || monthsB.length === 0` → bei „alle Monate Mutter Plus“ keine bothBalanced-Option

**Step 2 (Teilzeit/Bonus):**
- `isPartTimeStepRelevant`:
  - `a === 0 || b === 0` → false (wenn ein Elternteil 0 Monate hat, wird Step 2 übersprungen)
  - Bei „alle Monate Mutter Plus“: `b === 0` → Step 2 wird nicht angezeigt
  - PartnerBonus-Logik (withPartTime) kommt nur in Step 2 vor

**Step 3 (Optimierungsziele):**
- Goals: `maxMoney`, `longerDuration`, `frontLoad` + `partnerBonus` (wenn hasPartner und nicht motherOnly)
- `bestPerGoal`: nur eine beste Variante pro Ziel
- Filter:
  - `resultsAreEqual(currentResult, s.result)` → überspringen
  - `!shouldShowVariant(s, currentResult, goal)` → überspringen
  - `step1Choice === 'motherOnly' && optB > 0` → überspringen
  - `step1Choice === 'bothBalanced' && (optA === 0 || optB === 0)` → überspringen

### Konkreter Fall „alle Monate Mutter Plus“

1. **Step 1:** current, evtl. bothBalanced (wenn createBothBalancedPlan etwas findet – bei mother-only oft nicht)
2. **Step 2:** wird übersprungen (`b === 0`) → keine withPartTime-Option
3. **Step 3:** `partnerBonus` wird inzwischen mitberechnet (wenn hasPartner)
   - `addPartnerBonusOverlapCandidates`: kopiert Mutter-Monate zum Partner → „Beide Plus“
   - Aber: `addShiftCandidatesInDirection` (maxMoney) fügt nur hinzu, wenn `res.householdTotal > currentTotal` – bei gleichem Einkommen oft kein höherer Betrag

**Deduplizierung:**
- `bestPerGoal`: nur eine Variante pro Ziel → andere Ziele mit ähnlicher Aufteilung können wegfallen
- `seenKeys` in `buildDecisionContext`: gleiche `distinctnessKey` → Option wird nicht doppelt gezeigt
- `resultsAreSemanticallyEquivalent`: semantisch gleiche Ergebnisse werden zusammengefasst

### Mögliche Ursachen für fehlende „Beide Plus“-Varianten

1. Step 2 wird bei mother-only übersprungen → withPartTime fehlt dort
2. Step 3: `partnerBonus` wird inzwischen berücksichtigt (letzte Änderung)
3. `addShiftBetweenParentsCandidates` filtert nach `res.householdTotal > currentTotal` → bei ähnlichen Einkommen oft keine „bessere“ Variante
4. `shouldShowVariant`: Varianten mit gleicher Dauer und weniger Geld werden nur mit erklärbarem Vorteil gezeigt

---

## Schritt 4: Delta-Inkonsistenz

### Berechnungspfad für financialDelta

| Stelle | Formel | Baseline |
|--------|--------|----------|
| buildDecisionContext | `s.optimizedTotal - baseTotal` | baseResult aus resolveBaseline |
| resolveBaseline | baseResult = current / original / lastAdopted | je nach comparisonMode |

### Baseline in Step 3

- Step 3 übergibt `opts` mit `originalPlan: currentPlan`, `originalResult: currentResult`
- Damit wird die Baseline in Step 3 auf den Plan nach Step 1/2 gesetzt, nicht den ursprünglichen Wizard-Plan
- `comparisonMode` default: `vsCurrent`

### Mögliche Inkonsistenzen

1. **Karte vs. Dialog:**
   - Karte: `opt.impact.financialDelta` (aus buildDecisionContext)
   - Dialog: `adoptDialogOption.financialDelta` = `selectedOption.impact.financialDelta`
   - Quelle ist dieselbe → theoretisch konsistent

2. **Baseline-Unterschiede:**
   - Wenn Step 3 `originalPlan`/`originalResult` mit currentPlan/currentResult überschreibt, ist die Basis der Plan nach Step 1/2, nicht der ursprüngliche Wizard-Plan
   - Bei Step-1-Wahl „current“ bleibt baseline = original
   - Bei Step-1-Wahl „bothBalanced“ ist baseline = bothBalanced-Variante

3. **Fallback auf 0:**
   - `deltaTotal={adoptDialogOption?.financialDelta ?? 0}` – wenn adoptDialogOption null, wird 0 genutzt
   - In `openAdoptDialog`: `if (!selectedOption?.impact) return` – Dialog öffnet nicht, wenn impact fehlt

4. **OptimizationComparisonBlock:**
   - Nutzt `selectedOption?.impact.financialDelta` direkt
   - Kein adoptDialogOption – konsistent mit StepOptimizationBlock, sofern dieselbe Option gewählt ist

---

## Schritt 5: Übernahme-Flow

### Ablauf

1. Nutzer wählt Option → `handleSelectOption` → `selectedOptionPerStep` wird aktualisiert
2. Klick „Diese Variante übernehmen“ → `openAdoptDialog` (oder direkter Bestätigungs-Dialog)
3. `openAdoptDialog`:
   - prüft `selectedOption?.impact`
   - setzt `adoptDialogOption` mit plan, result, financialDelta, durationDelta
   - öffnet `AdoptConfirmDialog`
4. `AdoptConfirmDialog`:
   - zeigt Deltas aus `adoptDialogOption`
   - Bei Bestätigung: `onAdoptOptimization?.(plan)`
5. **ElterngeldWizardPage:** `onAdoptOptimization` → `mergePlanIntoPreparation(prev, plan)` → Plan wird zentral aktualisiert

### Übernahme-Aktion

- **StepOptimizationBlock:** 
  - Haupt-Button: `canAdopt && !(optimization && stepOptions.length === 1)` → bei mehreren Optionen sichtbar
  - Einzel-Option-Zweig: „Diese Variante übernehmen“ nur wenn `opt.strategyType !== 'current'`
  - `canAdopt = isFinalDifferent && onAdoptOptimization`
- **OptimizationComparisonBlock:** 
  - Direktes Öffnen des Bestätigungs-Dialogs, `onConfirm` ruft `onAdoptOptimization(selectedOption.plan)` auf

### Zentrale Aktualisierung

- Wizard: `setValues((prev) => mergePlanIntoPreparation(prev, plan))`
- Monatsübersicht nutzt `values` → Plan wird korrekt dargestellt

### Potenzielle Lücken

1. **lastAdoptedPlan/lastAdoptedResult:** Im Wizard werden diese nicht gesetzt – nach Übernahme gibt es keine gesonderte „letzte Übernahme“-Basis für Deltas
2. **Einzel-Option-Fall:** Wenn nur eine Option („current“) angezeigt wird, wird der Übernahme-Button ausgeblendet (korrekt)
3. **strategyStepRequireExplicitSelection:** Bei Step 3 mit mehreren Optionen und `skipToStrategyStep` muss explizit gewählt werden; vor einer Wahl ist `selectedOptionIndex = -1` und `finalResolvedResult` kommt noch vom vorherigen Step

---

## Zusammenfassung der Erkenntnisse

### 1. Fehlende sinnvolle Varianten
- Step 2 wird bei „alle Monate Mutter Plus“ übersprungen (b=0)
- Step 3 berücksichtigt inzwischen `partnerBonus`
- `addShiftBetweenParentsCandidates` filtert streng nach höherem Total
- `bestPerGoal` reduziert auf eine Variante pro Ziel
- `createBothBalancedPlan` liefert bei mother-only `null`

### 2. Delta-Inkonsistenz
- Eine Berechnungsquelle: `impact` in `buildDecisionContext`
- Dialog nutzt diese Werte, keine eigene Berechnung
- Mögliche Abweichung: unterschiedliche Baseline (current vs. original vs. lastAdopted) je nach Step-Context

### 3. Übernahme
- Klare Aktion „Diese Variante übernehmen“ / „Vorschlag übernehmen“ vorhanden
- Plan wird zentral über `mergePlanIntoPreparation` aktualisiert
- Bei Einzel-Option = „current“ wird Übernahme korrekt ausgeblendet

---

*Analyse abgeschlossen. Keine Code-Änderungen vorgenommen.*
