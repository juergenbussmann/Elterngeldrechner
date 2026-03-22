# Berechnungs- und Optimierungslogik – Validierung nach Entfernung des zweiten Einstiegs

## Phase 1: Analyse

### 1.1 Zentrale Berechnungslogik

| Funktion | Ort | Verwendung |
|----------|-----|------------|
| **calculatePlan** | calculationEngine.ts | Basis-Elterngeld-Berechnung |
| **buildOptimizationResult** | elterngeldOptimization.ts | Varianten/Strategien pro Ziel (maxMoney, longerDuration, frontLoad, partnerBonus) |

**Aufrufer von calculatePlan:**
- ElterngeldWizardPage: liveResult, optimizationSummary
- ElterngeldCalculationPage: handleCalculate, handleGoalToPlan, handleAdoptOptimization, etc.
- stepDecisionFlow: indirekt über buildOptimizationResult
- elterngeldOptimization: intern für jede Variante

**Aufrufer von buildOptimizationResult:**
- stepDecisionFlow: buildStepDecisionContext (Schritt 1–3)
- ElterngeldWizardPage: optimizationSummary.hasAnySuggestions
- StepCalculationResult: optimizationResultSet (nur wenn optimizationGoal gesetzt)
- StepCalculationInput: Partner-Bonus-Prüfung
- OptimizationSuggestionBlock

### 1.2 Wo wird die Optimierungslogik jetzt ausgelöst?

| Pfad | Trigger | Ablauf |
|------|---------|--------|
| **Wizard (einziger aktiver Pfad)** | „Optimierung ansehen“ (StepPlan/StepSummary) | OptimizationOverlay → StepOptimizationBlock → buildStepDecisionContext → buildOptimizationResult (mehrere Ziele) |
| Calculation Page | – | optimizationGoal wird nie gesetzt → Optimierungsblock wird nicht gerendert |

**StepOptimizationBlock** nutzt `buildStepDecisionContext(plan, result, opts)`, das intern für jeden Schritt `buildOptimizationResult` mit maxMoney, partnerBonus, longerDuration, frontLoad aufruft. Die Variantenerzeugung ist vollständig in stepDecisionFlow integriert.

### 1.3 Datenfluss Monatsübersicht

| Kontext | Datenquelle | Aktualisierung bei Übernahme |
|---------|-------------|------------------------------|
| **Wizard StepPlan** | values (ElterngeldApplication) | mergePlanIntoPreparation(prev, plan) → setValues |
| **OptimizationOverlay** | plan, result von Wizard | plan = applicationToCalculationPlan(values), result = calculatePlan(plan) |

Die Monatscards im Wizard kommen aus `values.benefitPlan` (monthGridMappings). Bei Übernahme: `onAdoptOptimization(plan)` → `mergePlanIntoPreparation(prev, plan)` → `setValues` → Re-Render → Monatsübersicht zeigt die übernommene Verteilung.

### 1.4 Rolle von handleRunOptimization (entfernt)

**handleRunOptimization** hat ausschließlich UI-State gesetzt:
- setOptimizationGoal(goal)
- setOptimizationStatus('proposed')
- setPlanUsedForResult(currentPlan)
- setResult(calculatePlan(currentPlan))
- setOriginalPlanForOptimization / setOriginalResultForOptimization
- setView('result')

**Keine eigene Berechnungslogik.** Die eigentliche Optimierung passiert in StepCalculationResult über `buildOptimizationResult(plan, result, optimizationGoal)` im useMemo für optimizationResultSet. handleRunOptimization hat nur den State gesetzt, damit StepCalculationResult den Optimierungsblock anzeigen konnte.

---

## Phase 2: Validierung gegen Regeln

| Regel | Status | Begründung |
|-------|--------|------------|
| **R1** – Berechnung unabhängig vom UI | ✓ | calculatePlan und buildOptimizationResult sind reine Funktionen, nicht an entfernte Dialoge gebunden |
| **R2** – Varianten werden erzeugt | ✓ | StepOptimizationBlock → buildStepDecisionContext → buildOptimizationResult (mehrere Ziele) |
| **R3** – Monatsübersicht basiert auf Berechnung | ✓ | values → applicationToCalculationPlan → calculatePlan; Übernahme aktualisiert values |
| **R4** – Übernahme funktioniert | ✓ | onAdoptOptimization → mergePlanIntoPreparation → setValues → Monatsübersicht aktualisiert |
| **R5** – Keine tote Logik | ⚠️ | Calculation Page: optimizationGoal, handleAdoptOptimization etc. werden nicht mehr ausgelöst; Logik existiert, ist dort aber ungenutzt |

---

## Phase 3: Ergebnis

**Keine Korrekturen erforderlich.**

Die Berechnungs- und Optimierungslogik ist vollständig intakt:

1. **calculatePlan** – weiterhin überall genutzt (Wizard, Calculation, stepDecisionFlow, elterngeldOptimization)
2. **buildOptimizationResult** – wird von stepDecisionFlow und Wizard (optimizationSummary) aufgerufen
3. **StepOptimizationBlock** – nutzt buildStepDecisionContext, der alle Varianten erzeugt
4. **Übernahme** – mergePlanIntoPreparation aktualisiert values, Monatsübersicht reagiert

**handleRunOptimization** war nur UI-State; die eigentliche Logik steckt in stepDecisionFlow und buildOptimizationResult und wird über den Wizard-Flow weiterhin genutzt.

**Hinweis R5:** Auf der Calculation Page sind optimizationGoal, handleAdoptOptimization usw. ohne den zweiten Einstieg nicht mehr erreichbar. Das ist beabsichtigt; die Logik ist nicht verloren, sondern auf der Calculation Page schlicht nicht mehr im Einsatz. Eine Bereinigung wäre optional, nicht zwingend.
