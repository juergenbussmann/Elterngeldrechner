# Monatsstrategie + Footer – Analyse & Validierung

## PHASE 1 – ANALYSE

### 1. Gewählte Strategie
- **ElterngeldCalculationPage:** `optimizationGoal`, `plan`, `result` (result = calculatePlan(plan))
- **StepOptimizationBlock:** interner State `selectedOptionPerStep` → `finalResolvedPlan`/`finalResolvedResult` aus `buildStepDecisionContext`
- **Disconnect:** Die Monatsübersicht nutzt `result` (vom Parent), nicht die gewählte Variante aus StepOptimizationBlock

### 2. Monatsübersicht
- **Komponente:** `StepCalculationResult` → Card „Monatsplan“ mit `MonthGrid`, `PlanPhases`, `MonthSummary`
- **Datenquelle:** `result.parents` → `getMonthGridItemsFromResults(parents, maxMonth)`
- **Problem:** `result` kommt vom Parent und ändert sich erst bei „Diese Variante übernehmen“

### 3. Datenfluss
- Nutzer wählt Variante → StepOptimizationBlock setzt `finalResolvedResult` intern
- Monatsplan rendert weiter mit `result` (alter Plan)
- → **R1/R2/R3-Verletzung:** Strategiewechsel hat keine sichtbare Folge

### 4. Footer-Buttons

**OptimizationOverlay (Wizard):**
- Modal-Footer: `t('common.close')` = „Schließen“
- Content: „Optimierung schließen“
- → **Doppelte Schließen-Aktion**

**ElterngeldCalculationPage (view=result):**
- „Optimierung schließen“ → handleDiscardOptimization (setzt optimizationGoal zurück)
- „Zurück zur Eingabe“ → handleBack (wechselt zu input, dort ist Monatsplan)

### 5. Navigation
- `onNavigateToMonthEditing` wurde entfernt (vorheriger Fix)
- Kein expliziter Button „Zur Monatsübersicht“

---

## PHASE 2 – VALIDIERUNG

| Regel | Status |
|-------|--------|
| R1 Strategiewechsel sichtbar | ❌ Monatscards reagieren nicht |
| R2 Monatsübersicht abgeleitet | ❌ Zeigt immer aktuellen Plan, nicht gewählte Variante |
| R3 Keine entkoppelte UI | ❌ Strategie und Monate wirken getrennt |
| R4 Footer semantisch eindeutig | ❌ Zwei ähnliche Schließen-Buttons |
| R5 Eine Aktion zur Monatsübersicht | ❌ Fehlt |
| R6 Schließen rein navigational | ⚠️ Modal-„Schließen“ und „Optimierung schließen“ redundant |

---

## UMSETZUNGSPLAN

### TEIL 1 – Monatsstrategie anbinden
- StepOptimizationBlock: `onResolvedResultChange?: (result: CalculationResult) => void`
- StepCalculationResult: State für Anzeige-Result, Monatsplan nutzt gewählte Variante wenn vorhanden

### TEIL 2 – Footer
- Modal: `hideFooter={true}` um doppeltes „Schließen“ zu vermeiden
- OptimizationOverlay: `onNavigateToMonthEditing` wieder einführen, Button „Zur Monatsübersicht“
- ElterngeldWizardPage: Callback für Navigation zur Monatsübersicht übergeben
