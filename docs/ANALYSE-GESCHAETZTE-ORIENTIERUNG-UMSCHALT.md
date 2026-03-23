# Ursachenanalyse: „Geschätzte Orientierung“ aktualisiert sich nicht beim Umschalten (Basis / Plus / Gemischt)

**Stand:** Reine Ist-Analyse. Keine Änderungen vorgenommen.

**Kontext:** Route `/documents/elterngeld`, Wizard, StepPlan. Problem: Gesamtbetrag, Dauer und Bonusmonate bleiben beim Wechsel zwischen Basiselterngeld / ElterngeldPlus / Gemischt unverändert.

---

## 1. Umschalt-Mechanismus

### Handler

- **Datei:** `src/modules/documents/elterngeld/steps/StepPlan.tsx`
- **Zeile 468:** `onClick={() => update('model', opt.value)}`
- **Optionen:** `MODEL_OPTIONS` (Zeile 86–88):
  - `{ value: 'basis', label: 'Basiselterngeld' }`
  - `{ value: 'plus', label: 'ElterngeldPlus' }`
  - `{ value: 'mixed', label: 'Gemischt' }`

### `update`-Funktion

- **Datei:** `StepPlan.tsx`, Zeilen 186–194
- **Implementierung:**
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

### Änderungen beim Umschalten

- Es wird ausschließlich `benefitPlan.model` gesetzt.
- `onChange` ist `setValues` aus `ElterngeldWizardPage` (State-Setter).
- Beim Aufruf `update('model', 'plus')` oder `update('model', 'basis')`:
  - `values.benefitPlan.model` ändert sich.
  - `values.benefitPlan.concreteMonthDistribution` wird **nicht** angepasst.
  - `values.benefitPlan.parentAMonths` und `values.benefitPlan.parentBMonths` bleiben unverändert.

### Abgleich mit anderen Flows

- **assignMonth** (Zeile 217): setzt `concreteMonthDistribution: undefined`.
- **handleConfirm** (Zeile 303): setzt `concreteMonthDistribution: undefined`.
- **update('model', …)**: berührt `concreteMonthDistribution` nicht.

---

## 2. State-Struktur

### Zentraler State

- **Speicherort:** `ElterngeldWizardPage.tsx`, Zeile 58
- **Variable:** `values` via `useState<ElterngeldApplication>(...)`
- **Setter:** `setValues` (als `onChange` an StepPlan übergeben)

### Relevante Felder für Berechnung und Anzeige

| Feld | Verwendung |
|------|------------|
| `values.benefitPlan.model` | Nur im Count-Pfad (ohne `concreteMonthDistribution`) für `getDefaultMode` und `createMonths`. |
| `values.benefitPlan.concreteMonthDistribution` | Wenn vorhanden: exklusive Quelle für Monatsmodi (modeA, modeB). `model` wird ignoriert. |
| `values.benefitPlan.parentAMonths` / `parentBMonths` | Im Count-Pfad für `parseMonthCount`. |
| `values.benefitPlan.partnershipBonus` | Für Partner-Bonus-Logik. |
| `values.applicantMode`, `values.parentA`, `values.parentB`, etc. | Einkommen, Geburtsdatum, etc. |

### Zuständigkeit

- Berechnung: `applicationToCalculationPlan(values)` → `ElterngeldCalculationPlan` → `calculatePlan(...)`.
- Anzeige: `liveResult` (ElterngeldLiveCard) und `planResult` (StepPlan-Summary-Card).
- Optimierung: `planForOptimization` = `applicationToCalculationPlan(values)`.

---

## 3. Obere Zusammenfassung („Geschätzte Orientierung“)

### Zwei Anzeigeorte

1. **ElterngeldLiveCard** („Geschätzte Orientierung“)
   - **Datei:** `src/modules/documents/elterngeld/ui/ElterngeldLiveCard.tsx`
   - Zeile 26: `title = 'Geschätzte Orientierung'`
   - Zeigt: `result.parents[].total`, `result.householdTotal` (Gesamtbetrag).

2. **StepPlan-Summary-Card** (im Plan-Schritt)
   - **Datei:** `StepPlan.tsx`, Zeilen 419–436
   - Zeigt: Gesamtbetrag, Dauer (`countBezugMonths`), Bonusmonate (`countPartnerBonusMonths`).

### Datenquellen

| Komponente | Prop/Variable | Herkunft |
|------------|---------------|----------|
| ElterngeldLiveCard | `result={liveResult}` | `ElterngeldWizardPage.tsx`, Zeilen 87–97 |
| StepPlan Summary | `planResult` | `StepPlan.tsx`, Zeilen 357–365 |

### ElterngeldWizardPage (liveResult)

```ts
const liveResult = useMemo(() => {
  const birthDate = values.child.birthDate?.trim() || values.child.expectedBirthDate?.trim();
  if (!birthDate) return null;
  try {
    const plan = applicationToCalculationPlan(values);
    return calculatePlan(plan);
  } catch {
    return null;
  }
}, [values]);
```

- **Dependencies:** `[values]`
- Bei Änderung von `values` (inkl. `model`) wird `liveResult` neu berechnet.

### StepPlan (planResult)

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

- **planForCheck:** Aufruf ohne Memo → neuer Objekt-Referenz pro Render.
- **Dependencies:** `[planForCheck]`
- Da `planForCheck` bei jedem Render neu erzeugt wird: `useMemo` berechnet stets neu → keine veraltete Memo-Logik.

### Wichtig

- Beide nutzen dieselbe Berechnung: `applicationToCalculationPlan(values)` und `calculatePlan(...)`.
- Die relevante Frage ist, ob `applicationToCalculationPlan` bei geändertem `model` tatsächlich einen anderen Plan liefert.

---

## 4. Berechnungslogik

### `applicationToCalculationPlan`

- **Datei:** `src/modules/documents/elterngeld/applicationToCalculationPlan.ts`
- **Zeilen 117–171:** Wenn `concreteMonthDistribution` gesetzt ist (Länge > 0):

```ts
const dist = app.benefitPlan.concreteMonthDistribution;
if (dist && dist.length > 0) {
  const { parentAMonths: rawAMonths, parentBMonths: rawBMonths } = createMonthsFromDistribution(
    dist,
    hasSecondParent,
    hoursA,
    hoursB
  );
  // ...
  return { childBirthDate, parents, ... };
}
```

- `model` wird in diesem Zweig **nicht** benutzt.
- Monatsmodi kommen ausschließlich aus `dist` (modeA, modeB).

### `createMonthsFromDistribution`

- **Zeilen 86–106**
- Liest für jeden Monat `modeA` und `modeB` aus der Distribution.
- `model` wird nicht übergeben.
- Rückgabe: `parentAMonths`, `parentBMonths` mit modes aus der Distribution.

### Count-Pfad (ohne `concreteMonthDistribution`)

- **Zeilen 173–234**
- `defaultMode = getDefaultMode(model)` (Zeilen 56–60): `basis` → `basis`, `plus` → `plus`, `mixed` → `basis`.
- `createMonths(countA, defaultMode, model, ...)` nutzt `model` für `maxBelegung` und `defaultMode` für die Modi.

### Ergebnis

- **Mit `concreteMonthDistribution`:** `model` hat keinen Einfluss auf den Plan.
- **Ohne `concreteMonthDistribution`:** `model` beeinflusst `defaultMode` und `maxBelegung` und damit den Plan.

---

## 5. Optimierung

### Einstieg

- **Datei:** `ElterngeldWizardPage.tsx`, Zeile 99
- `planForOptimization = useMemo(() => applicationToCalculationPlan(values), [values]);`
- Wird an `OptimizationOverlay` übergeben (Zeilen 383, 390).
- `buildOptimizationResult(planForOptimization, liveResult, goal)` in Zeile 108.

### Datenfluss

- `planForOptimization` und `liveResult` stammen beide aus `applicationToCalculationPlan(values)` bzw. `calculatePlan(...)`.
- Dieselbe Berechnungsbasis wie für die Zusammenfassung.
- Wenn die Zusammenfassung wegen `concreteMonthDistribution` nicht reagiert, nutzt die Optimierung dieselben veralteten Daten.

---

## 6. Bruchstelle

### Ort der Inkonsistenz

- **Datei:** `src/modules/documents/elterngeld/applicationToCalculationPlan.ts`, Zeilen 117–118

```ts
const dist = app.benefitPlan.concreteMonthDistribution;
if (dist && dist.length > 0) {
```

- Sobald `concreteMonthDistribution` existiert, wird ausschließlich dieser Zweig genutzt.
- Die Modi (modeA, modeB) kommen vollständig aus der Distribution.
- `benefitPlan.model` spielt in diesem Pfad keine Rolle.

### Verhalten von `update('model', …)`

- `update` ändert nur `benefitPlan.model`.
- `concreteMonthDistribution` bleibt erhalten.
- Da der Plan vollständig aus der Distribution gebaut wird, bleibt der berechnete Plan unverändert.

### Wann existiert `concreteMonthDistribution`?

1. Nach Übernahme einer Optimierung: `mergePlanIntoPreparation` (planToApplicationMerge.ts, Zeilen 65, 104) setzt `concreteMonthDistribution`.
2. Nach Persistierung und Reload: `elterngeldPreparationStorage.ts`, Zeilen 81–91, speichert und lädt `concreteMonthDistribution`.
3. Nach Bestätigung im Monats-Dialog: `handleConfirm` baut eine neue Distribution aus der Grid-State und setzt sie (implizit über `newBp`).

- **assignMonth** und **handleConfirm** setzen `concreteMonthDistribution` auf `undefined` bzw. überschreiben sie.
- **update('model', …)** berührt `concreteMonthDistribution` nicht.

### Kurzfassung der Bruchstelle

- **Datei:** `applicationToCalculationPlan.ts`
- **Zeilen:** 117–171 (Distribution-Pfad)
- **Problem:** Im Distribution-Pfad wird `app.benefitPlan.model` nicht verwendet; die Monatsmodi stammen nur aus `concreteMonthDistribution`.
- **Konsequenz:** Umschalten zwischen Basis / Plus / Gemischt ändert den berechneten Plan nicht, solange `concreteMonthDistribution` gesetzt ist.
- **Ursache im Flow:** `update('model', …)` aktualisiert `model`, setzt aber `concreteMonthDistribution` nicht auf `undefined` und löst damit keinen Wechsel in den Count-Pfad aus.

---

## Code-Referenzen (Überblick)

| Thema | Datei | Zeilen |
|-------|-------|--------|
| Model-Umschalter | StepPlan.tsx | 453–474, 468 |
| `update` | StepPlan.tsx | 186–194 |
| `liveResult` | ElterngeldWizardPage.tsx | 87–97 |
| `planResult` | StepPlan.tsx | 357–365 |
| Distribution-Pfad | applicationToCalculationPlan.ts | 117–171 |
| Count-Pfad | applicationToCalculationPlan.ts | 173–234 |
| `createMonthsFromDistribution` | applicationToCalculationPlan.ts | 86–106 |
| `getDefaultMode` | applicationToCalculationPlan.ts | 56–60 |
