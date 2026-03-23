# concreteMonthDistribution – Komplettkatalog aller Fundstellen

**Stand:** Nur lesen, nachvollziehen, dokumentieren. Keine Änderungen.

---

## Kategorisierung

| Kategorie | Bedeutung |
|-----------|-----------|
| **setzen** | Distribution wird erzeugt und in benefitPlan geschrieben |
| **verändern** | Distribution wird bearbeitet oder transformiert |
| **löschen** | Distribution wird auf `undefined` gesetzt oder entfernt |

---

## 1. StepPlan.tsx

### 1.1 assignMonth – **löschen**

| Attribut | Wert |
|----------|------|
| **Datei** | `src/modules/documents/elterngeld/steps/StepPlan.tsx` |
| **Funktion** | `assignMonth` |
| **Zeilen** | 212–261 |
| **Auslöser** | Klick auf Mutter/Partner/Beide/Kein Bezug im Monats-Panel (Zeilen 628–632) |

**Exakte Wirkung:**

```ts
const clearDistribution = { ...bp, concreteMonthDistribution: undefined };
```

- `clearDistribution` wird in alle vier `benefitPlan`-Zweige (mother, partner, both, none) übernommen.
- Die Distribution wird **vollständig gelöscht** (auf `undefined` gesetzt).
- Gleichzeitig werden `parentAMonths`, `parentBMonths`, `partnershipBonus` je nach `who` neu gesetzt.
- **Ergebnis:** State wechselt auf Count-Logik; `getMonthGridItemsFromValues` und `applicationToCalculationPlan` nutzen anschließend den Fallback-Pfad.

---

### 1.2 handleConfirm – **löschen**

| Attribut | Wert |
|----------|------|
| **Datei** | `src/modules/documents/elterngeld/steps/StepPlan.tsx` |
| **Funktion** | `handleConfirm` |
| **Zeilen** | 301–355 |
| **Auslöser** | Klick auf „Übernehmen“ im Monats-Panel (Zeile 722) |

**Exakte Wirkung:**

```ts
let newBp = { ...bp, model: selectedModelInDialog, concreteMonthDistribution: undefined };
```

- `newBp` startet mit `concreteMonthDistribution: undefined`.
- Zusätzlich wird `model` aus dem Dialog übernommen (`selectedModelInDialog`).
- Wenn `selectedApplyRange` und `currentState` gesetzt sind: `parentAMonths`, `parentBMonths`, `partnershipBonus` werden je nach Range angepasst.
- Es wird **keine** neue Distribution aus dem Grid erzeugt.
- **Ergebnis:** Distribution wird gelöscht; State bleibt count-basiert; Dialog schließt sich.

---

### 1.3 items (useMemo) – **nur lesen**

| Attribut | Wert |
|----------|------|
| **Datei** | `src/modules/documents/elterngeld/steps/StepPlan.tsx` |
| **Kontext** | `useMemo` für `items` (Zeilen 263–287) |
| **Kategorie** | weder setzen, verändern noch löschen |

**Exakte Wirkung:**

- Zeilen 266–274: `dist = bp.concreteMonthDistribution` wird nur für Dev-Logging gelesen.
- Zeile 278: `getMonthGridItemsFromValues(values, maxMonths)` – die Distribution wird dort gelesen, nicht verändert.

---

## 2. planToApplicationMerge.ts

### 2.1 mergePlanIntoPreparation – **setzen**

| Attribut | Wert |
|----------|------|
| **Datei** | `src/modules/documents/elterngeld/planToApplicationMerge.ts` |
| **Funktion** | `mergePlanIntoPreparation` |
| **Zeilen** | 51–108 |

**Exakte Wirkung:**

```ts
const concreteMonthDistribution = extractMonthDistribution(plan, maxMonth);
// ...
benefitPlan: {
  ...current.benefitPlan,
  model,
  parentAMonths: String(countA),
  parentBMonths: String(countB),
  partnershipBonus: hasPB,
  concreteMonthDistribution,  // Zeile 104
},
```

- `extractMonthDistribution(plan, maxMonth)` erzeugt ein Array von `{ month, modeA, modeB }` für Monate 1..maxMonth.
- `maxMonth = model === 'plus' ? 24 : 14` (Zeile 64) – `model` wird aus Plan abgeleitet (`hasPB || hasPlus ? 'plus' : 'basis'`).
- Die Distribution **ersetzt** die bisherige vollständig; es gibt keine Merge-Logik mit `current.benefitPlan.concreteMonthDistribution`.

**Aufrufer:**

- `ElterngeldWizardPage.tsx` Zeile 387: `onAdoptOptimization` → `setValues((prev) => mergePlanIntoPreparation(prev, plan))`
- `ElterngeldCalculationPage.tsx` Zeile 201: `handleAdoptOptimization` → `mergePlanIntoPreparation(prep, plan)` → `savePreparation(merged)`

---

## 3. applicationToCalculationPlan.ts

### 3.1 applicationToCalculationPlan – **lesen, Priorisierung**

| Attribut | Wert |
|----------|------|
| **Datei** | `src/modules/documents/elterngeld/applicationToCalculationPlan.ts` |
| **Funktion** | `applicationToCalculationPlan` |
| **Zeilen** | 109–234 |
| **Kategorie** | liest die Distribution; ändert sie nicht |

**Priorisierung zwischen model und Distribution:**

```ts
const model = app.benefitPlan.model;           // Zeile 113 – wird gelesen
const defaultMode = getDefaultMode(model);    // Zeile 114 – für Count-Pfad
const dist = app.benefitPlan.concreteMonthDistribution;  // Zeile 117

if (dist && dist.length > 0) {   // Zeile 118 – Entscheidung
  // DISTRIBUTION-PFAD (Zeilen 119–171)
  const { parentAMonths, parentBMonths } = createMonthsFromDistribution(
    dist, hasSecondParent, hoursA, hoursB
  );
  // model wird hier NICHT für die Monatsmodi verwendet
  // Einzige model-Nutzung: createMonths(0, 'none', model) für Dummy-Partner (Zeile 161)
  return { childBirthDate, parents, ... };
}

// COUNT-PFAD (Zeilen 173–234)
const countA = parseMonthCount(app.benefitPlan.parentAMonths);
// defaultMode und model werden für createMonths genutzt
```

**Belegbare Priorisierung:**

| Bedingung | Verhalten | model genutzt? |
|-----------|-----------|----------------|
| `dist && dist.length > 0` | Distribution-Pfad; Monatsmodi aus `modeA`/`modeB` | **Nein** (nur für Dummy-Partner) |
| sonst | Count-Pfad; `createMonths(countA, defaultMode, model, ...)` | **Ja** |

**createMonthsFromDistribution** (Zeilen 86–106): Erhält `model` nicht als Parameter; nutzt ausschließlich `modeA` und `modeB` aus der Distribution.

---

## 4. monthGridMappings.ts

### 4.1 getMonthGridItemsFromValues – **lesen**

| Attribut | Wert |
|----------|------|
| **Datei** | `src/modules/documents/elterngeld/monthGridMappings.ts` |
| **Funktion** | `getMonthGridItemsFromValues` |
| **Zeilen** | 77–101 |

**Exakte Wirkung:**

```ts
const dist = values.benefitPlan.concreteMonthDistribution;
if (dist && dist.length > 0) {
  return getMonthGridItemsFromDistribution(dist, values.benefitPlan.model, hasPartner, maxMonths);
}
return getMonthGridItemsFromCounts(...);  // Fallback
```

- Liest die Distribution, ändert sie nicht.
- Dieselbe Priorisierung wie in `applicationToCalculationPlan`: Distribution hat Vorrang; sonst Count-Logik.

### 4.2 getMonthGridItemsFromDistribution – **model nur für subLabel**

| Attribut | Wert |
|----------|------|
| **Datei** | `src/modules/documents/elterngeld/monthGridMappings.ts` |
| **Funktion** | `getMonthGridItemsFromDistribution` |
| **Zeilen** | 26–71 |

**Exakte Wirkung:**

- `state` und `label` kommen ausschließlich aus `modeA` und `modeB`.
- `model` wird nur auf Zeile 47 genutzt:
  ```ts
  subLabel = modeA === 'partnerBonus' || modeB === 'partnerBonus' ? 'Bonus' : model === 'plus' ? 'Plus' : 'Basis';
  ```
- Gilt nur für den Fall `hasA && hasB` und kein PartnerBonus – dann bestimmt `model` die Anzeige „Plus“ vs. „Basis“ für gemeinsame Monate.
- Die eigentliche Zuordnung (welcher Elternteil, welcher Modus) kommt vollständig aus der Distribution.

---

## 5. elterngeldPreparationStorage.ts

### 5.1 normalizeBenefitPlan – **verändern (beim Laden)**

| Attribut | Wert |
|----------|------|
| **Datei** | `src/modules/documents/elterngeld/infra/elterngeldPreparationStorage.ts` |
| **Funktion** | `normalizeBenefitPlan` |
| **Zeilen** | 75–93 |

**Exakte Wirkung:**

```ts
const distRaw = Array.isArray(o.concreteMonthDistribution) ? o.concreteMonthDistribution : [];
const concreteMonthDistribution = distRaw
  .map(normalizeMonthDistributionEntry)
  .filter((x): x is NonNullable<typeof x> => x != null)
  .sort((a, b) => a.month - b.month);
return {
  // ...
  ...(concreteMonthDistribution.length > 0 && { concreteMonthDistribution }),
};
```

- **Beim Laden:** Liest `concreteMonthDistribution` aus Rohdaten, normalisiert jeden Eintrag, sortiert nach Monat.
- Fügt sie dem benefitPlan nur hinzu, wenn `concreteMonthDistribution.length > 0`.
- **Beim Speichern:** `savePreparation` speichert `values`; ob die Distribution unverändert geschrieben wird, ist in dieser Funktion nicht ersichtlich – die Serialisierung erfolgt woanders.

**Kategorisierung:** Beim Laden wird die Distribution **transformiert** (normalisiert, sortiert); sie wird nicht gesetzt oder gelöscht im Sinne von State-Änderungen im Wizard.

---

## 6. types/elterngeldTypes.ts

### 6.1 ElterngeldBenefitPlan – **Typdefinition**

| Attribut | Wert |
|----------|------|
| **Datei** | `src/modules/documents/elterngeld/types/elterngeldTypes.ts` |
| **Zeilen** | 45–46 |

```ts
/** Optionale konkrete Verteilung aus übernommener Variante. Hat Vorrang vor Count-Logik. */
concreteMonthDistribution?: MonthDistributionEntry[];
```

- Nur Typdefinition; keine Änderung der Distribution.

---

## 7. Übersicht: setzen / verändern / löschen

| Kategorie | Stelle | Datei | Funktion |
|-----------|--------|-------|----------|
| **setzen** | Übernahme Optimierung | planToApplicationMerge.ts | mergePlanIntoPreparation |
| **löschen** | Zuweisung Monat | StepPlan.tsx | assignMonth |
| **löschen** | Bestätigung Dialog | StepPlan.tsx | handleConfirm |
| **verändern** | Beim Laden (Persistenz) | elterngeldPreparationStorage.ts | normalizeBenefitPlan |

---

## 8. Zusammenfassung Priorisierung in applicationToCalculationPlan

| Schritt | Code | Bedeutung |
|---------|------|-----------|
| 1 | `dist = app.benefitPlan.concreteMonthDistribution` | Distribution lesen |
| 2 | `if (dist && dist.length > 0)` | Einzige Prüfung: vorhanden und nicht leer |
| 3 | Distribution-Pfad | `createMonthsFromDistribution(dist, ...)` – model wird für Monatsmodi nicht verwendet |
| 4 | Count-Pfad | `createMonths(countA, defaultMode, model, ...)` – model wird voll genutzt |

**Es gibt keine Prüfung**, ob die Distribution mit dem aktuellen `model` konsistent ist. Die Distribution hat bei Vorhandensein **absoluten Vorrang** vor `model`.
