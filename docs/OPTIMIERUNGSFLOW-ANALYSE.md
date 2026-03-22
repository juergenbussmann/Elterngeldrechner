# Optimierungsflow – Analyse und Validierung

## Phase 1: Analyse

### 1.1 Einstiegspunkte in die Optimierung

| Einstieg | Ort | Aktion | Ergebnis |
|----------|-----|--------|----------|
| **Monatsübersicht (Plan)** | `StepPlan.tsx` | `onShowOptimizationOverlay(true)` via Button „Optimierung ansehen“ | Overlay öffnet |
| **Zusammenfassung** | `StepSummary.tsx` | `onOpenOptimization()` → `setShowOptimizationOverlay(true)` | Overlay öffnet |

**Beide Einstiege** führen zu `setShowOptimizationOverlay(true)` → identischer Start.

### 1.2 Mögliche Zustände (OptimizationOverlay)

| Zustand | Bedeutung | UI |
|---------|-----------|-----|
| `view = 'entry'` | Einstiegs-Screen | „Aktueller Plan“-Card + „Optimierungsstrategie wählen“ + „Optimierung schließen“ |
| `view = 'strategy'` | Strategie-/Varianten-Screen | `StepOptimizationBlock` mit skipToStrategyStep |

### 1.3 Schließ-Aktionen und deren Verhalten

| Aktion | Aufruf | setView('entry')? | onClose()? |
|--------|--------|-------------------|------------|
| **Optimierung schließen** (Entry) | `handleClose()` | ✓ | ✓ |
| **Optimierung schließen** (Strategy) | `onBackToOptimization` → `handleClose()` | ✓ | ✓ |
| **Zur Monatsübersicht** (Strategy) | `onNavigateToMonthEditing()` | ✗ | ✗ (nur setShowOptimizationOverlay(false)) |

### 1.4 Gefundener Flow-Bruch (R1–R5 verletzt)

**Flow A (Optimierung schließen):**
1. Öffnen → Entry-Screen
2. „Optimierungsstrategie wählen“ → Strategy-Screen
3. „Optimierung schließen“ → `handleClose()` → view = 'entry'
4. Erneut öffnen → **Entry-Screen** ✓

**Flow B (Zur Monatsübersicht):**
1. Öffnen → Entry-Screen
2. „Optimierungsstrategie wählen“ → Strategy-Screen
3. „Zur Monatsübersicht“ → `onNavigateToMonthEditing()` → **view bleibt 'strategy'**
4. Erneut öffnen → **Strategy-Screen direkt** (Entry wird übersprungen!) ✗

**Ursache:** `onNavigateToMonthEditing` ruft nur `setShowOptimizationOverlay(false)` auf. Die `OptimizationOverlay`-Komponente wird nicht unmountet, ihr `view`-State bleibt erhalten. Beim nächsten Öffnen ist `view` noch `'strategy'`.

### 1.5 State-Verwendung

- `OptimizationOverlay` bleibt gemountet (conditional render nur bei `step.id === 'plan' || 'summary'`).
- Bei `isOpen === false` wird `return null` ausgeführt – Inhalt wird nicht gerendert, aber der Component-State (z. B. `view`) bleibt erhalten.
- `StepOptimizationBlock` wird bei jedem Wechsel zu `view === 'strategy'` neu gerendert → interner State (z. B. `selectedOptionPerStep`) ist jeweils frisch.

### 1.6 ElterngeldCalculationPage (separater Kontext)

- Eigene Route `/documents/elterngeld-calculation`
- Eigener Flow: `goal` → `input` → `result` mit `OptimizationGoalDialog` und `StepCalculationResult`
- Kein `OptimizationOverlay` – anderer Use-Case (Berechnung vs. Vorbereitung)

---

## Phase 2: Validierung gegen Regeln

| Regel | Status | Begründung |
|-------|--------|------------|
| **R1** – Ein Einstieg, ein Flow | ✗ | Nach „Zur Monatsübersicht“ startet der nächste Öffnungsvorgang direkt im Strategy-Screen |
| **R2** – Kein versteckter Zustand | ✗ | `view` bleibt nach „Zur Monatsübersicht“ auf `'strategy'` |
| **R3** – Keine zweite Wahrheit | ✗ | Zwei unterschiedliche Start-Screens je nach vorheriger Schließ-Aktion |
| **R4** – Zustand beeinflusst Inhalt, nicht Flow | ✓ | (nicht betroffen) |
| **R5** – Abbruch ist neutral | ✗ | „Zur Monatsübersicht“ erzeugt einen alternativen Flow beim erneuten Öffnen |

---

## Phase 3: Umsetzung

### Maßnahme: View-Reset bei jedem Schließen

**Lösung:** `view` muss bei jedem Schließen des Overlays auf `'entry'` zurückgesetzt werden – unabhängig davon, ob über „Optimierung schließen“ oder „Zur Monatsübersicht“ geschlossen wird.

**Implementierung:** `useEffect` in `OptimizationOverlay`, der bei `isOpen === false` `setView('entry')` aufruft.

```tsx
useEffect(() => {
  if (!isOpen) setView('entry');
}, [isOpen]);
```

**Ergebnis:**
- Jeder Schließ-Vorgang (inkl. „Zur Monatsübersicht“) führt zu `isOpen = false`
- Beim nächsten Öffnen ist `view` wieder `'entry'`
- Einheitlicher Flow für alle Einstiege und alle Schließ-Arten
