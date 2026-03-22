# Zweiter Optimierungsweg – vollständig entfernt

## Phase 1: Analyse

### 1.1 Ehemalige Optimierungs-Trigger

| Trigger | Ort | Ziel (vorher) | Status |
|---------|-----|---------------|--------|
| „Optimierung ansehen“ | StepPlan | OptimizationOverlay | ✓ Einziger Weg |
| „Optimierung ansehen“ | StepSummary | OptimizationOverlay | ✓ Einziger Weg |
| „Aufteilung prüfen“ | StepCalculationResult | OptimizationGoalDialog | ✗ Entfernt |
| „Aufteilung prüfen“ | ElterngeldCalculationPage (Input) | handleRunOptimization | ✗ Entfernt |
| action.action === 'openOptimization' | StepCalculationResult | onOpenOptimizationGoal | ✗ Entfernt |

### 1.2 Entfernte Komponenten / Logik

| Element | Aktion |
|---------|--------|
| OptimizationGoalDialog (Komponente) | Entfernt – Datei nur noch MAIN_GOAL_OPTIONS |
| showOptimizationGoalDialog | Entfernt |
| handleRunOptimization | Entfernt |
| onOpenOptimizationGoal | Aus StepCalculationResult entfernt |
| Button „Aufteilung prüfen“ (Calculation Input) | Entfernt |
| Button „Aufteilung prüfen“ (StepCalculationResult) | Entfernt |
| Validation-Action openOptimization | Entfernt |
| onBackToOptimization Fallback ?? onOpenOptimizationGoal | Nur noch onBackFromOptimization |

### 1.3 Beibehalten (Goal-Card)

- MAIN_GOAL_OPTIONS – für die Card „Was ist dir wichtiger?“ auf der Berechnungsseite (nur Navigation)
- Kein eigener Optimierungsdialog mehr

---

## Phase 2: Validierung

| Regel | Status |
|-------|--------|
| R1 – Nur ein Optimierungsweg | ✓ Einziger Einstieg: OptimizationOverlay im Wizard |
| R2 – Kein direkter Berechnungs-Einstieg | ✓ Entfernt |
| R3 – Kein Goal-Dialog als Parallel-Flow | ✓ Entfernt |
| R4 – Keine zweite Wahrheit | ✓ Kein zweiter Einstieg mehr |
| R5 – Calculation startet keinen eigenen Flow | ✓ Keine Optimierungs-Buttons mehr |

---

## Zielzustand

- **Einziger Optimierungsweg:** OptimizationOverlay im Wizard (StepPlan / StepSummary)
- **Calculation Page:** Zeigt nur Ergebnisse, Monatsübersicht und Status – keine Optimierungs-Buttons
- **Kein paralleler Goal-Dialog mehr**
