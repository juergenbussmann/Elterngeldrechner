# Analyse: Fehlende Vorbelegung der Monatskacheln nach Modellwahl

**Stand:** Faktenbasierte Code-Analyse, ohne Implementierung oder Fixes.

---

## 1. Modell-Button Handler

**Datei:** `src/modules/documents/elterngeld/steps/StepPlan.tsx`

### Buttons (Zeilen 462–476)

```tsx
{MODEL_OPTIONS.map((opt) => (
  <ElterngeldSelectButton
    key={opt.value}
    label={opt.label}
    selected={isSelected}
    onClick={() => update('model', opt.value)}
    ...
  />
))}
```

`MODEL_OPTIONS` (Zeilen 84–88):
- `{ value: 'basis', label: 'Basiselterngeld' }`
- `{ value: 'plus', label: 'ElterngeldPlus' }`
- `{ value: 'mixed', label: 'Gemischt' }`

### Handler `update` (Zeilen 186–197)

```ts
const update = useCallback(
  (field: string, value: string | boolean) => {
    const base = { ...values.benefitPlan, [field]: value };
    const benefitPlan =
      field === 'model' ? { ...base, concreteMonthDistribution: undefined } : base;
    onChange({
      ...values,
      benefitPlan,
    });
  },
  [values, onChange]
);
```

**Bei Klick auf Modell-Button:**
- `update('model', opt.value)` wird ausgeführt
- `base` = `{ ...values.benefitPlan, model: opt.value }` (nur `model` wird überschrieben)
- `benefitPlan` = `{ ...base, concreteMonthDistribution: undefined }`
- `parentAMonths` und `parentBMonths` kommen aus `base` und bleiben unverändert

**Gesetzte State-Werte:**
- `values.benefitPlan.model` = `'basis' | 'plus' | 'mixed'`
- `values.benefitPlan.concreteMonthDistribution` = `undefined`
- `values.benefitPlan.parentAMonths` = unverändert
- `values.benefitPlan.parentBMonths` = unverändert

---

## 2. State nach Modellwahl

| Feld | Nach Modellwahl |
|------|-----------------|
| `values.benefitPlan.model` | neu gewähltes Modell |
| `values.benefitPlan.concreteMonthDistribution` | `undefined` |
| `values.benefitPlan.parentAMonths` | unverändert (oft `''` oder `'0'`) |
| `values.benefitPlan.parentBMonths` | unverändert (oft `''` oder `'0'`) |
| `values.benefitPlan.partnershipBonus` | unverändert |

**INITIAL_ELTERNGELD_APPLICATION** (elterngeldTypes.ts, Zeilen 84–86):  
`parentAMonths: ''`, `parentBMonths: ''`.

**Folge:** Nach Modellwahl gibt es typischerweise keine explizite Monatsverteilung und keine sinnvollen Counts. `update` erzeugt und setzt weder `concreteMonthDistribution` noch modellabhängige `parentAMonths`/`parentBMonths`.

---

## 3. Rendering der Monatskacheln

**Datei:** `src/modules/documents/elterngeld/monthGridMappings.ts`

### `getMonthGridItemsFromValues` (Zeilen 76–100)

```ts
export function getMonthGridItemsFromValues(values: ElterngeldApplication, maxMonths: number): MonthGridItem[] {
  const dist = values.benefitPlan.concreteMonthDistribution;
  const hasPartner = values.applicantMode === 'both_parents';
  if (dist && dist.length > 0) {
    return getMonthGridItemsFromDistribution(dist, values.benefitPlan.model, hasPartner, maxMonths);
  }
  const countA = parseInt(String(values.benefitPlan.parentAMonths || ''), 10) || 0;
  const countB = hasPartner ? parseInt(String(values.benefitPlan.parentBMonths || ''), 10) || 0 : 0;
  return getMonthGridItemsFromCounts(countA, countB, values.benefitPlan.model, values.benefitPlan.partnershipBonus, hasPartner, maxMonths);
}
```

**Pfadwahl:**
1. Wenn `concreteMonthDistribution` existiert und nicht leer ist → `getMonthGridItemsFromDistribution`
2. Sonst → Count-Fallback mit `getMonthGridItemsFromCounts`

**Nach Modellwahl:** `concreteMonthDistribution === undefined` → Fallback mit `countA`, `countB`.

### `getMonthGridItemsFromCounts` (Zeilen 104–150)

```ts
for (let m = 1; m <= maxMonths; m++) {
  const motherHas = m <= parentAMonths;   // parentAMonths = countA = 0
  const partnerHas = hasPartner && m <= parentBMonths;  // parentBMonths = countB = 0
  // ...
  } else {
    state = 'none';
    label = 'Kein Bezug';
    subLabel = '–';
  }
}
```

Wenn `parentAMonths` und `parentBMonths` leer oder `'0'` sind:
- `countA = 0`, `countB = 0`
- `motherHas = false`, `partnerHas = false` für alle Monate
- alle Kacheln werden mit `state = 'none'`, `label = 'Kein Bezug'` gerendert

**Grund:** Die Count-Logik interpretiert leere bzw. null Counts korrekt als „keine belegten Monate“. Die fehlende Vorbelegung kommt daher, dass beim Modellwechsel keine modellgerechten Counts oder eine `concreteMonthDistribution` gesetzt werden.

---

## 4. Default-Logik für Monatsverteilung

### `getDefaultMode` (applicationToCalculationPlan.ts, Zeilen 56–61)

```ts
function getDefaultMode(model: string): MonthMode {
  if (model === 'plus') return 'plus';
  if (model === 'partnerBonus') return 'partnerBonus';
  return 'basis';
}
```

**Verwendung:** Nur innerhalb von `applicationToCalculationPlan` für die Umwandlung App → CalculationPlan. Nicht für Monatskacheln im StepPlan.

### `createMonths` (applicationToCalculationPlan.ts, Zeilen 31–51)

Erzeugt `ParentMonthInput[]` aus einem Count und Modus. Wird nur bei der Konvertierung zu `ElterngeldCalculationPlan` genutzt.

### `createMonthsFromDistribution` (applicationToCalculationPlan.ts, Zeilen 86–107)

Nutzt `concreteMonthDistribution`, um Plan-Monate zu erzeugen. Wird nur aufgerufen, wenn `dist && dist.length > 0`.

### Fazit

- Es existiert Logik für Monatserzeugung und Default-Modus (`getDefaultMode`, `createMonths`, `createMonthsFromDistribution`).
- Sie wird ausschließlich in `applicationToCalculationPlan` verwendet.
- Sie wird beim Modellwechsel im StepPlan nicht aufgerufen.
- Es gibt keine Logik, die bei Modellwahl eine modellbasierte Initialverteilung für StepPlan erzeugt oder `parentAMonths`/`parentBMonths` sinnvoll setzt.

---

## 5. Vergleich mit bestehenden Pfaden

### `assignMonth` (StepPlan.tsx, Zeilen 215–263)

Wird beim Klick auf eine Monatskachel aufgerufen (über den Monatsdialog). Setzt:

- `parentAMonths` / `parentBMonths` (je nach Zuordnung)
- `concreteMonthDistribution: undefined`

Bsp. für Mutter-Monate: `parentAMonths: String(capped)`, `parentBMonths: String(Math.min(countB, capped - 1))`. So entsteht eine sinnvolle Verteilung – aber nur bei expliziter Nutzerinteraktion.

### `handleConfirm` (StepPlan.tsx, Zeilen 304–356)

Wird beim Bestätigen im Monatsdialog aufgerufen. Aktualisiert `parentAMonths` und `parentBMonths` für Bereiche („nächsten Monat“, „nächste 3 Monate“, „alle folgenden Monate“). Voraussetzung: `activeMonth !== null` und `currentState` gesetzt – also Nutzer hat bereits ein konkretes Monat ausgewählt.

### `mergePlanIntoPreparation` (planToApplicationMerge.ts)

Setzt `parentAMonths`, `parentBMonths` und `concreteMonthDistribution` aus einem übernommenen Optimierungsplan. Wird nur beim Übernehmen einer Variante genutzt.

### Unterschied zur Modellwahl

- `assignMonth` und `handleConfirm` setzen die Counts/Verteilung nur, wenn der Nutzer Monate interaktiv zuweist.
- `mergePlanIntoPreparation` setzt sie nur beim Übernehmen einer Variante.
- Beim Modell-Button (`update('model', ...)`) existiert keiner dieser Pfade, es werden keine Counts oder eine `concreteMonthDistribution` erzeugt oder angepasst.

---

## 6. Erster Bruchpunkt

**Datei:** `src/modules/documents/elterngeld/steps/StepPlan.tsx`  
**Funktion:** `update`  
**Zeilen:** 186–197

```ts
const update = useCallback(
  (field: string, value: string | boolean) => {
    const base = { ...values.benefitPlan, [field]: value };
    const benefitPlan =
      field === 'model' ? { ...base, concreteMonthDistribution: undefined } : base;
    onChange({
      ...values,
      benefitPlan,
    });
  },
  [values, onChange]
);
```

Beim Modellwechsel (`field === 'model'`):

- Es wird nur `model` gesetzt und `concreteMonthDistribution` auf `undefined` gesetzt.
- Es wird weder eine modellbasierte Initialverteilung erzeugt noch `parentAMonths` oder `parentBMonths` angepasst.
- Die bestehende Initialisierungslogik in `applicationToCalculationPlan` wird hier nicht genutzt.

---

## 7. Ergebnis

### Was passiert aktuell nach Modellwahl?

- `model` wird aktualisiert.
- `concreteMonthDistribution` wird auf `undefined` gesetzt.
- `parentAMonths` und `parentBMonths` bleiben unverändert (oft `''`).

### Warum führt das zu „Kein Bezug“?

- Ohne `concreteMonthDistribution` greift der Count-Fallback.
- Leere bzw. null Counts ergeben `countA = 0`, `countB = 0`.
- `getMonthGridItemsFromCounts(0, 0, ...)` liefert für alle Monate `state = 'none'`, `label = 'Kein Bezug'`.

### Gibt es eine bestehende Logik für eine sinnvolle Vorbelegung?

- In `applicationToCalculationPlan` existieren `getDefaultMode`, `createMonths`, `createMonthsFromDistribution`.
- Diese dienen der Konvertierung App → CalculationPlan, nicht der Darstellung im StepPlan.

### Wird diese Logik beim Modellwechsel genutzt?

**Nein.** `update('model', ...)` ruft keine dieser Funktionen auf und setzt keine modellbasierten Defaults.

### Erster Bruchpunkt

| Aspekt | Befund |
|--------|--------|
| **Datei** | `StepPlan.tsx` |
| **Funktion** | `update` |
| **Zeilen** | 186–197 |
| **Einordnung** | **A: Fehlende Initialisierung** |

### Einordnung A/B/C

**A. Fehlende Initialisierung**

Beim Modellwechsel fehlt eine modellbezogene Initialisierung. Es werden weder

- `parentAMonths`/`parentBMonths` auf sinnvolle Defaults gesetzt (z. B. 14 für Basis, 24 für Plus)
- noch eine `concreteMonthDistribution` aus dem Modell abgeleitet.

Die Count-Logik arbeitet korrekt (0 → „Kein Bezug“); das Problem ist, dass nie modellangepasste Counts oder eine Verteilung erzeugt werden.

**Nicht B (falscher Default):** Die Count-Logik verhält sich fachlich korrekt.

**Nicht C (vorhandene Logik wird nicht aufgerufen):** Die Logik in `applicationToCalculationPlan` dient einem anderen Zweck und ist für StepPlan nicht vorgesehen. Es fehlt eine eigene Modell-Initialisierungslogik im StepPlan.

---

## Zusätzliche Belege

### Rendering-Aufruf (StepPlan.tsx, Zeilen 265–289)

```ts
const items = useMemo(() => {
  const result = getMonthGridItemsFromValues(values, maxMonths);
  return result;
}, [values, maxMonths]);
```

`values` enthält nach Modellwechsel `concreteMonthDistribution: undefined` und typischerweise leere Counts → Fallback → „Kein Bezug“ für alle Monate.
