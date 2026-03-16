# Elterngeld-Wizard: Fehlerbehebung und Verifikation

---

## Absicherungsdurchlauf (Tests + TDZ-Suche)

### Ergänzte Tests

- **Neuer Test:** `Elterngeld-Wizard – kritischer Flow`
  - `Intro → Geburt & Kind → Eltern & Arbeit → Weiter → Monate planen ohne Runtime-Error`
  - Simuliert den exakten Flow: Klick „Jetzt planen“, dann 3× „Weiter“
  - Verifiziert, dass StepPlan (Monate planen) nach dem Übergang von Eltern & Arbeit fehlerfrei rendert

### TDZ-Suche im Elterngeld-Modul

- **Geprüfte Dateien:** StepPlan, StepCalculationInput, StepCalculationResult, ElterngeldCalculationPage, ElterngeldWizardPage, CalculationMonthPanel, OptimizationGoalDialog, PartnerBonusCheckDialog
- **Ergebnis:** Keine weiteren Stellen mit useCallback/useMemo gefunden, die Variablen erst nach ihrer Deklaration verwenden
- **Angepasste Dateien:** Keine (bereits behobener Fix in StepPlan.tsx)

### Bestätigung

- Keine Berechnungslogik verändert
- Nur Deklarationsreihenfolge in StepPlan.tsx angepasst (bereits in vorherigem Fix)

---

## 1. Exakt reproduzierte Ursache

**Fehler:** `ReferenceError: Cannot access 'currentState' before initialization`

**Datei:** `src/modules/documents/elterngeld/steps/StepPlan.tsx`

**Ursache:** In `StepPlan.tsx` wurde `applyToFollowingMonths` (useCallback) **vor** der Variable `currentState` definiert. Der Callback nutzt `currentState` im Körper und in der Dependency-Liste. Dadurch griff der Callback auf eine Variable zu, die in derselben Render-Passage noch nicht deklariert war (Temporal Dead Zone in JavaScript).

**Auslöser:** Beim Klick auf „Weiter“ im Step „Eltern & Arbeit“ wechselt der Wizard zum Step „Monate planen“ (StepPlan). Beim ersten Render von StepPlan wurde `applyToFollowingMonths` erstellt und dabei `currentState` referenziert – bevor `currentState` überhaupt deklariert war.

---

## 2. Konkreter Fix

**Änderung:** Die Definition von `currentState` wurde **vor** `applyToFollowingMonths` verschoben.

```tsx
// VORHER (fehlerhaft): applyToFollowingMonths zuerst, currentState danach
const applyToFollowingMonths = useCallback(..., [..., currentState, ...]);
const currentState = activeMonth !== null ? getCurrentMonthState(...) : null;

// NACHHER (korrekt): currentState zuerst, dann applyToFollowingMonths
const currentState = activeMonth !== null ? getCurrentMonthState(...) : null;
const applyToFollowingMonths = useCallback(..., [..., currentState, ...]);
```

**Dateien geändert:**
- `src/modules/documents/elterngeld/steps/StepPlan.tsx` – Reihenfolge der Deklarationen angepasst
- `src/modules/documents/elterngeld/ElterngeldWizardFlow.test.tsx` – I18nProvider für Tests ergänzt (kein Fehlerfix, nur Test-Setup)

---

## 3. Automatisierte Verifikation

| Prüfung | Ergebnis |
|---------|----------|
| `npm run build` | ✓ Erfolgreich |
| `ElterngeldWizardFlow.test.tsx` (3 Tests) | ✓ Alle bestanden |
| StepPlan-Render mit Initial-Werten | ✓ Kein Crash |
| StepPlan-Render mit both_parents + parentB | ✓ Kein Crash |
| StepPlan-Render mit benefitPlan-Monaten | ✓ Kein Crash |

---

## 4. Manuelle Flow-Prüfung (durchzuführen)

**Start:** `npm run dev` – dann im Browser die Elterngeld-Seite öffnen.

### 4.1 Wizard-Flow

1. **Intro** → „Weiter“
2. **Geburt & Kind** → Geburtstermin/Kind-Daten → „Weiter“
3. **Eltern & Arbeit** → Daten eingeben → **„Weiter“** ← kritischer Übergang
4. **Monate planen** → Monate anpassen → „Weiter“
5. **Ergebnis** → prüfen
6. **Dokumente** → prüfen
7. **Vor/Zurück** zwischen allen Steps durchklicken

### 4.2 Zusätzliche Prüfungen

- **Berechnungsseite** (Elterngeld-Berechnung ohne Wizard)
- **Optimierungsdialog** (falls vorhanden)
- **PartnerBonusCheckDialog** (im Step „Monate planen“ bei Partner-Bonus)

### 4.3 Gespeicherte Daten

- Wizard starten, Daten eingeben, speichern
- Seite neu laden / App neu öffnen
- Gespeicherte Daten laden und Flow erneut durchlaufen

---

## 5. Aussage zur Fehlerbehebung

**Der ursprüngliche Fehler (`ReferenceError: Cannot access 'currentState' before initialization`) ist behoben.**

Die Ursache war eine falsche Reihenfolge der Variablendeklaration in `StepPlan.tsx`. Der Fix verschiebt `currentState` vor `applyToFollowingMonths`, sodass keine Temporal Dead Zone mehr auftritt.

**Manuelle Verifikation:** Bitte den Wizard-Flow wie unter Abschnitt 4 beschrieben einmal vollständig durchklicken, um die Behebung im laufenden System zu bestätigen.
