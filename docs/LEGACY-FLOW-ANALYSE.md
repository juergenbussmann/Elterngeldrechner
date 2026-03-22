# Legacy-Flow – Vollständige Analyse

## Phase 1: Analyse

### 1.1 Routing und Screens

| Route | Komponente | Zweck |
|-------|-------------|-------|
| `/documents/elterngeld` | ElterngeldWizardPage | Vorbereitung auf Antrag |
| `/documents/elterngeld-calculation` | ElterngeldCalculationPage | Detaillierte Berechnung |

### 1.2 Wizard-Screens (ElterngeldWizardPage)

| Schritt | Komponente | Verwendet? |
|---------|------------|------------|
| Intro | StepIntro | ✓ |
| Geburt & Kind | StepGeburtKind | ✓ |
| Einkommen | StepEinkommen | ✓ |
| Eltern & Arbeit | StepElternArbeit | ✓ |
| Monate planen | StepPlan | ✓ |
| Zusammenfassung | StepSummary | ✓ |
| Dokumente | StepDocuments | ✓ |

### 1.3 Legacy-Komponenten (nicht importiert)

| Komponente | Importe | Status |
|------------|---------|--------|
| **StepGeburtstermin** | 0 | **Legacy – entfernen** |
| **StepBasicData** | 0 | **Legacy – entfernen** |

### 1.4 Optimierungsflows

**Flow A – Wizard (OptimizationOverlay):**
- Einstieg: „Optimierung ansehen“ in StepPlan oder StepSummary
- Beide rufen `setShowOptimizationOverlay(true)` auf
- Overlay: Entry → Strategy (StepOptimizationBlock)
- Ein Einstieg, ein Flow

**Flow B – Calculation Page:**
- Einstieg: „Optimierung ansehen“ / onOpenOptimizationGoal
- OptimizationGoalDialog (Ziel wählen) → handleRunOptimization → view=result
- StepCalculationResult mit StepOptimizationBlock
- Eigener Kontext: detaillierte Berechnung, Varianten A/B

**Kernlogik:** Beide nutzen StepOptimizationBlock. Unterschiedliche Einstiege, gleiche Optimierungslogik.

### 1.5 Einstiegspunkte Optimierung

| Ort | Aktion | Ziel |
|-----|--------|------|
| StepPlan | mainHint.action=openOptimization | OptimizationOverlay |
| StepPlan | Button „Optimierung ansehen“ | OptimizationOverlay |
| StepSummary | Button „Optimierung ansehen“ | OptimizationOverlay |
| StepCalculationResult | onOpenOptimizationGoal | OptimizationGoalDialog |

Wizard-Einstiege führen alle zum OptimizationOverlay. Calculation-Einstieg zum OptimizationGoalDialog.

### 1.6 Conditional Rendering – Wizard

- `step.id === 'geburtKind'` → StepGeburtKind
- `step.id === 'einkommen'` → StepEinkommen
- usw.

Keine versteckten Branches. Jeder Schritt hat genau eine Komponente.

### 1.7 Conditional Rendering – Calculation

- `view === 'goal'` → Goal-Card
- `view === 'input'` → StepCalculationInput
- `view === 'result'` → StepCalculationResult
- `view === 'compare'` → StepCalculationComparison

Klare View-Logik, keine Duplikate.

---

## Phase 2: Validierung

| Regel | Status | Begründung |
|-------|--------|------------|
| **R1** – Nur ein Flow pro Kontext | ✓ | Wizard: ein Overlay-Flow. Calculation: ein Goal→Result-Flow |
| **R2** – Keine Legacy-Screens | ✗ | StepGeburtstermin, StepBasicData sind ungenutzt |
| **R3** – Kein alternativer Einstieg | ✓ | Alle Wizard-Einstiege → OptimizationOverlay |
| **R4** – Keine versteckten Branches | ✓ | Keine if/else mit unterschiedlichen Screens |

---

## Phase 3: Umsetzung

### Entfernen

1. **StepGeburtstermin.tsx** – nicht importiert
2. **StepBasicData.tsx** – nicht importiert

### Beibehalten

- ElterngeldWizardPage und ElterngeldCalculationPage: unterschiedliche Use-Cases (Vorbereitung vs. Berechnung)
- OptimizationOverlay und OptimizationGoalDialog: unterschiedliche Einstiege, gleiche Kernlogik (StepOptimizationBlock)
