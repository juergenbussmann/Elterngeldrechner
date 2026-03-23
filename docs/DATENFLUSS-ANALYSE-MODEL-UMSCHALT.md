# Datenfluss-Analyse: Model-Umschalt (Basis / Plus / Gemischt) im Wizard

**Stand:** Nur Lesen, Nachvollziehen, Dokumentieren. Keine Änderungen.

**Fokus:** Route `/documents/elterngeld`, Wizard, StepPlan → Summary → Optimierung.

---

## 1. StepPlan.tsx – Umschalt-Mechanismus

### UI-Elemente (Zeilen 453–474)

```ts
{MODEL_OPTIONS.map((opt) => {
  const isSelected = values.benefitPlan.model === opt.value;
  return (
    <ElterngeldSelectButton
      key={opt.value}
      label={opt.label}
      selected={isSelected}
      onClick={() => update('model', opt.value)}
      ...
    />
  );
})}
```

**Optionen** (Zeilen 86–88):

| value   | label           |
|---------|-----------------|
| `basis` | Basiselterngeld |
| `plus`  | ElterngeldPlus  |
| `mixed` | Gemischt        |

### Funktion `update` (Zeilen 186–194)

```ts
const update = useCallback(
  (field: string, value: string | boolean) => {
    onChange({
      ...values,
      benefitPlan: { ...values.benefitPlan, [field]: value },
    });
  },
  [values, onChange]
);
```

**Beim Klick auf einen Model-Button:**

- Es wird ausschließlich `benefitPlan.model` gesetzt.
- `onChange` = `setValues` aus ElterngeldWizardPage.
- **Nicht** geändert: `concreteMonthDistribution`, `parentAMonths`, `parentBMonths`.

---

## 2. State und Props – Überblick

### ElterngeldWizardPage (Zeile 58)

| Variable | Typ | Bedeutung |
|---------|-----|-----------|
| `values` | `ElterngeldApplication` | Zentraler Formular-State |
| `setValues` | `(v) => void` | State-Setter, als `onChange` weitergegeben |

### StepPlan – eingehende Props (Zeilen 161–168)

| Prop | Quelle | Bedeutung |
|------|--------|-----------|
| `values` | ElterngeldWizardPage | Aktueller Formular-State |
| `onChange` | `setValues` | Setter für `values` |

### Berechnete Werte in ElterngeldWizardPage (Zeilen 87–120)

| Variable | Berechnung | Dependencies |
|---------|------------|--------------|
| `liveResult` | `calculatePlan(applicationToCalculationPlan(values))` | `[values]` |
| `planForOptimization` | `applicationToCalculationPlan(values)` | `[values]` |
| `optimizationSummary` | `buildOptimizationResult(planForOptimization, liveResult, goal)` für mehrere goals | `[planForOptimization, liveResult]` |

---

## 3. Datenfluss nach dem Model-Umschalt

### Kette beim Klick auf Model-Button

```
Klick auf Basis/Plus/Gemischt
  → update('model', opt.value)
  → onChange({ ...values, benefitPlan: { ...values.benefitPlan, model: opt.value } })
  → setValues(...)  (ElterngeldWizardPage)
  → values wird neu gesetzt
```

### Reaktion der Memos (ElterngeldWizardPage)

- `liveResult` – `[values]`: Bei neuem `values` wird neu berechnet ✓
- `planForOptimization` – `[values]`: Bei neuem `values` wird neu berechnet ✓
- `optimizationSummary` – `[planForOptimization, liveResult]`: Bei neuer Berechnung wird neu berechnet ✓

### Wichtig: `applicationToCalculationPlan`

Die Frage ist, ob `applicationToCalculationPlan(values)` bei geändertem `model` tatsächlich einen anderen Plan liefert.

**Datei:** `applicationToCalculationPlan.ts`

**Fall A – mit `concreteMonthDistribution` (Zeilen 117–171):**

- Wenn `dist = app.benefitPlan.concreteMonthDistribution` existiert und nicht leer ist:
  - Plan wird aus `createMonthsFromDistribution(dist, ...)` erzeugt.
  - Monatsmodi kommen ausschließlich aus `dist` (modeA/modeB).
  - `model` wird hier nicht für die Monatsmodi genutzt.
  - Änderung von `model` ändert den Plan nicht.

**Fall B – ohne `concreteMonthDistribution` (Zeilen 173–234):**

- `defaultMode = getDefaultMode(model)` (basis→basis, plus→plus, mixed→basis).
- `createMonths(countA, defaultMode, model, ...)` nutzt `model`.
- Änderung von `model` wirkt sich aus.

---

## 4. StepSummary – Reaktion auf State

### Props (Zeilen 313–326)

```ts
<StepSummary
  values={values}
  liveResult={liveResult}
  optimizationSummary={optimizationSummary}
  ...
/>
```

### Verwendung von `liveResult` (Zeilen 109, 151–168)

- `result = liveResult ?? null`
- Anzeige: Gesamtbetrag, Dauer, Bonusmonate (Zeilen 156–166)
- `maxMonths = values.benefitPlan.model === 'plus' ? 24 : 14` (Zeile 111)
- `displayHint` verwendet `values.benefitPlan.model` (Zeile 136)

**Reaktion auf Model-Umschalt:**

- `liveResult` hängt von `values` ab → bei Änderung von `values` neu berechnet.
- Wenn `applicationToCalculationPlan` bei geändertem `model` einen anderen Plan liefert, ändert sich `liveResult`.
- StepSummary zeigt dann die aktualisierten Werte.

---

## 5. ElterngeldLiveCard – „Geschätzte Orientierung“

### Platzierung (ElterngeldWizardPage, Zeile 270)

```ts
{liveResult && <ElterngeldLiveCard result={liveResult} />}
```

- Anzeige oberhalb der Step-Inhalte.
- Props: `result={liveResult}` (Gesamtbetrag, Eltern-Summen).

**Reaktion:** Gleiche Logik wie StepSummary – reagiert über `liveResult` auf Änderungen von `values`.

---

## 6. StepPlan – interne Summary-Card (Gesamtbetrag, Dauer, Bonusmonate)

### Berechnung (Zeilen 357–365)

```ts
const planForCheck = applicationToCalculationPlan(values);

const planResult = useMemo(() => {
  try {
    return calculatePlan(planForCheck);
  } catch {
    return null;
  }
}, [planForCheck]);
```

- `planForCheck` wird bei jedem Render neu berechnet (kein useMemo).
- `planResult` hängt von `planForCheck` ab.
- Bei neuem `values` → neuer `planForCheck` → neuer `planResult`.

**Anzeige** (Zeilen 419–436): Gesamtbetrag, Dauer (`countBezugMonths`), Bonusmonate (`countPartnerBonusMonths`).

---

## 7. Optimierung – OptimizationOverlay

### Props von ElterngeldWizardPage (Zeilen 382–391)

```ts
<OptimizationOverlay
  plan={planForOptimization}
  result={liveResult}
  originalPlanForOptimization={planForOptimization}
  originalResultForOptimization={liveResult}
  onAdoptOptimization={(plan) => setValues((prev) => mergePlanIntoPreparation(prev, plan))}
  ...
/>
```

### Verwendung von `plan` und `result` im OptimizationOverlay

- Entry-View: Anzeige von Gesamtbetrag, Dauer, Bonusmonate (Zeilen 139–153).
- Strategy-View: Übergabe an `StepOptimizationBlock` (Zeilen 97–99).

### StepOptimizationBlock (aus StepCalculationResult.tsx)

- Erhält `plan`, `result`, `originalPlanForOptimization`, `originalResultForOptimization`.
- Nutzt `buildOptimizationResult`, `buildDecisionContext` usw.

**Reaktion auf Model-Umschalt:**

- `planForOptimization` und `liveResult` hängen von `values` ab.
- Bei Änderung von `model` und damit `values` werden beide neu berechnet.
- Ob die Optimierung anders reagiert, hängt wieder von `applicationToCalculationPlan` ab (Fall A vs. B).

---

## 8. Zusammenfassung des Datenflusses

```
Model-Umschalt (Basis/Plus/Gemischt)
        │
        ▼
update('model', opt.value)
        │
        ▼
onChange({ ...values, benefitPlan: { ...values.benefitPlan, model: value } })
        │
        ▼
setValues(...)  ← ElterngeldWizardPage
        │
        ▼
values neu
        │
        ├─────────────────────────────────────────────────────────┐
        │                                                         │
        ▼                                                         ▼
liveResult = useMemo(                                            planForOptimization = useMemo(
  () => calculatePlan(applicationToCalculationPlan(values)),       () => applicationToCalculationPlan(values),
  [values]                                                         [values]
)                                                               )
        │                                                         │
        ├──► ElterngeldLiveCard (Geschätzte Orientierung)          │
        │                                                         │
        ├──► StepSummary (Geschätzter Gesamtbetrag, Dauer, Bonus)  │
        │                                                         │
        └────────────────────────────────────────────────────────┼──► optimizationSummary
                                                                  │         │
                                                                  │         ▼
                                                                  └──► OptimizationOverlay
                                                                           (plan, result)
                                                                                 │
                                                                                 ▼
                                                                        StepOptimizationBlock
```

---

## 9. Abhängigkeit von `applicationToCalculationPlan`

| Bedingung | Auswirkung von Model-Umschalt |
|-----------|-------------------------------|
| `concreteMonthDistribution` **vorhanden** | `model` wird im Plan nicht genutzt → Berechnung und Anzeige ändern sich nicht |
| `concreteMonthDistribution` **nicht vorhanden** | `model` wird genutzt → Berechnung und Anzeige sollten sich ändern |

**Bemerkung:** `update('model', …)` ändert `concreteMonthDistribution` nicht. Im Gegensatz dazu setzen `assignMonth` und `handleConfirm` `concreteMonthDistribution: undefined`.
