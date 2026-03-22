# Flow-Reset – Vollständige Analyse aller Overlay-Zustände

## Phase 1: Analyse

### 1.1 Lokale States im OptimizationOverlay

| State | Typ | Bedeutung | Reset bei Schließen? |
|-------|-----|-----------|----------------------|
| `view` | `'entry' \| 'strategy'` | Aktuell sichtbarer Screen | ✓ via `useEffect` bei `isOpen === false` |

### 1.2 Lokale States im StepOptimizationBlock (Kind bei view='strategy')

| State | Typ | Bedeutung | Reset bei Schließen? |
|-------|-----|-----------|----------------------|
| `selectedOptionPerStep` | `number[]` | Ausgewählte Option pro Schritt (Strategie/Variante) | ✓ durch Unmount |
| `showAdoptConfirm` | `boolean` | Adopt-Confirm-Dialog sichtbar | ✓ durch Unmount |
| `fall2Viewed` | `boolean` | „Variante ansehen“ wurde geklickt (Single-Option-Fall) | ✓ durch Unmount |
| `fall2OptionToAdopt` | `object \| null` | Zur Übernahme vorgemerkte Variante | ✓ durch Unmount |

### 1.3 Props, die den Flow beeinflussen

| Prop | Quelle | Beeinflusst |
|------|--------|-------------|
| `plan`, `result` | ElterngeldWizardPage (values) | Datenbasis – ändern sich mit Nutzereingaben, nicht mit Overlay-Schließen |
| `originalPlanForOptimization`, `originalResultForOptimization` | ElterngeldWizardPage | Im Wizard immer `planForOptimization` / `liveResult` – keine Overlay-internen Werte |
| `lastAdoptedPlan`, `lastAdoptedResult` | ElterngeldWizardPage | Im Wizard nicht übergeben (undefined) – kein persistenter Adoptionszustand im Overlay |

### 1.4 Close-Wege

| Close-Weg | Auslöser | Ruft handleClose? | setShowOptimizationOverlay(false)? | StepOptimizationBlock unmountet? |
|-----------|----------|------------------|-------------------------------------|----------------------------------|
| **Optimierung schließen** (Entry) | Button-Klick | ✓ | ✓ (via onClose) | ✓ |
| **Optimierung schließen** (Strategy) | onBackToOptimization | ✓ | ✓ | ✓ |
| **Zur Monatsübersicht** (Strategy) | onNavigateToMonthEditing | ✗ | ✓ | ✓ |
| **Variante übernehmen** | onAdoptOptimization → handleClose | ✓ | ✓ (via onClose in parent) | ✓ |
| **Modal Footer / X** | – | – | hideFooter=true → kein Modal-Button | – |
| **Backdrop-Click / Escape** | – | Modal unterstützt dies nicht | – | – |

### 1.5 Mount/Unmount-Verhalten

**OptimizationOverlay** rendert bei `isOpen === false` sofort `return null` (vor dem view-Check). Dadurch:

- Der gesamte Inhalt (Modal, StepOptimizationBlock) wird **nicht gerendert**
- **StepOptimizationBlock unmountet** bei jedem Schließen
- Alle internen States von StepOptimizationBlock werden verworfen
- Beim nächsten Öffnen wird StepOptimizationBlock **neu gemountet** mit Initialwerten

**OptimizationOverlay** selbst bleibt gemountet (Parent rendert es weiter). Nur `view` ist Overlay-interner State – und wird durch `useEffect` bei `isOpen === false` auf `'entry'` zurückgesetzt.

---

## Phase 2: Validierung gegen Regeln

| Regel | Status | Begründung |
|-------|--------|------------|
| **R1** – Nach jedem Schließen gleicher Neustart | ✓ | view wird per useEffect zurückgesetzt; StepOptimizationBlock wird neu gemountet |
| **R2** – Kein versteckter Altzustand | ✓ | selectedOptionPerStep, showAdoptConfirm, fall2Viewed, fall2OptionToAdopt werden durch Unmount gelöscht |
| **R3** – Sichtbarer Einstieg und interner Zustand passen zusammen | ✓ | Entry-Screen = view='entry'; Strategy-Block ist unmountet, beim erneuten Öffnen wird er neu aufgebaut |

---

## Phase 3: Ergebnis

**Keine weiteren Änderungen erforderlich.**

Der bestehende Flow-Reset ist vollständig:

1. **OptimizationOverlay.view** – wird durch `useEffect` bei `isOpen === false` auf `'entry'` gesetzt
2. **StepOptimizationBlock** – unmountet bei jedem Schließen, alle internen States werden verworfen
3. **Alle Close-Wege** – führen zu `isOpen === false` und damit zu view-Reset und Unmount

Es existieren keine zusätzlichen Overlay-internen Zustände, die beim Schließen erhalten blieben. `displayResultForMonths` und `onResolvedResultChange` gehören zu `StepCalculationResult` auf der ElterngeldCalculationPage, nicht zum OptimizationOverlay.
