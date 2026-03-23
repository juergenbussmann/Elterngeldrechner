# Diagnose: Wizard-Values bis zu den MonthGridItems

**Betroffener Pfad:** `/documents/elterngeld` → `ElterngeldWizardPage` → `StepPlan` → `MonthGrid`

---

## 1. Relevante values vor StepPlan

**Hinweis:** Reale Runtime-Werte können ohne Codeänderung (z.B. Diagnose-Logging) oder manuelles Auslesen durch den Nutzer nicht erfasst werden. Im Folgenden wird der Datenfluss anhand des Codes beschrieben.

### 1.1 Herkunft der values

- **State:** `ElterngeldWizardPage`, Zeile 57–69: `useState<ElterngeldApplication>(() => {...})`
- **Initial:** `loadPreparation()` oder `INITIAL_ELTERNGELD_APPLICATION`
- **Nach Übernahme:** `setValues((prev) => mergePlanIntoPreparation(prev, plan))` (Zeile 386–387)
- **Kein Reload in der Session:** Nach Adopt bleiben die Werte aus `mergePlanIntoPreparation` im React-State, bis zum nächsten Seitenwechsel oder Reload

### 1.2 An StepPlan übergebene Props

- `values` – das `ElterngeldApplication` aus dem Wizard-State
- `onChange` – `setValues`

---

## 2. Konkrete Felder in values

| Feld | Bedeutung |
|------|-----------|
| `values.benefitPlan.model` | `'basis'` oder `'plus'` |
| `values.benefitPlan.parentAMonths` | String (z.B. `"24"`) |
| `values.benefitPlan.parentBMonths` | String (z.B. `"4"`) |
| `values.benefitPlan.concreteMonthDistribution` | `MonthDistributionEntry[]` oder `undefined` |
| `values.applicantMode` | `'single_applicant'` \| `'both_parents'` \| `'single_parent'` |

### 2.1 concreteMonthDistribution – erwartete Struktur

```ts
interface MonthDistributionEntry {
  month: number;
  modeA: MonthModeForDistribution;  // 'none' | 'basis' | 'plus' | 'partnerBonus'
  modeB: MonthModeForDistribution;
}
```

**Typische Merkmale:**
- Anzahl Einträge: 24 bei `model === 'plus'`, 14 bei `model === 'basis'`
- Monate 1–24 bzw. 1–14
- Keine doppelten Monate
- `modeA`/`modeB` in `['none','basis','plus','partnerBonus']`

**Fehlerquellen:**
- Lücken: fehlende Monate
- Doppelte Monate
- Ungültige Modi (werden in `normalizeMonthDistributionEntry` zu `'none'` oder führen zum Herausfiltern)

---

## 3. getMonthGridItemsFromValues(values, maxMonths)

**Quelle:** `monthGridMappings.ts`, Zeilen 75–99

### 3.1 maxMonths in StepPlan

```ts
// StepPlan.tsx, Zeile 204
const maxMonths = values.benefitPlan.model === 'plus' ? 24 : 14;
```

### 3.2 Verzweigung in getMonthGridItemsFromValues

```ts
const dist = values.benefitPlan.concreteMonthDistribution;
const hasPartner = values.applicantMode === 'both_parents';

if (dist && dist.length > 0) {
  return getMonthGridItemsFromDistribution(dist, model, hasPartner, maxMonths);
}
return getMonthGridItemsFromCounts(countA, countB, model, partnershipBonus, hasPartner, maxMonths);
```

**Fallback-Bedingung:**  
Verwendung der Count-Logik genau dann, wenn  
`!dist || dist.length === 0`.

---

## 4. getMonthGridItemsFromDistribution – Logik

**Quelle:** `monthGridMappings.ts`, Zeilen 26–68

- `byMonth = new Map(distribution.map(d => [d.month, d]))`
- Für `m = 1..maxMonths`:
  - `entry = byMonth.get(m) ?? { month: m, modeA: 'none', modeB: 'none' }`
  - `hasA = entry.modeA !== 'none'`
  - `hasB = hasPartner && entry.modeB !== 'none'`
  - Mapping:
    - `hasA && hasB` → `state: 'both'`, subLabel: Bonus wenn partnerBonus, sonst Plus/Basis
    - `hasA` → `state: 'mother'`, subLabel: MODE_LABELS[modeA]
    - `hasB` → `state: 'partner'`, subLabel: MODE_LABELS[modeB]
    - sonst → `state: 'none'`

**MODE_LABELS:** none→'–', basis→'Basis', plus→'Plus', partnerBonus→'Bonus'

---

## 5. getMonthGridItemsFromCounts – Fallback-Logik

**Quelle:** `monthGridMappings.ts`, Zeilen 102–150

- Nutzt `parentAMonths`, `parentBMonths` als Zahlen
- `motherHas = m <= parentAMonths`, `partnerHas = hasPartner && m <= parentBMonths`
- Keine konkrete Monatsverteilung, nur Block-Zuordnung (Mutter 1–countA, Partner 1–countB)

---

## 6. MonthGrid – Darstellung der Items

**Quelle:** `MonthGrid.tsx`, Zeilen 29–87

- Erhält `items: MonthGridItem[]`
- Mapped 1:1 zu `MonthTile` mit `variant={state}`, `label`, `subLabel`
- Keine weitere Umrechnung der `items`

---

## 7. Mögliche Abweichungsstellen

| # | Stelle | Beschreibung |
|---|--------|--------------|
| 1 | `concreteMonthDistribution` fehlt | `dist` ist `undefined` oder leer → Fallback auf Count-Logik |
| 2 | `concreteMonthDistribution` falsch | Falsche Modi, fehlende oder doppelte Monate durch Merge oder Normalisierung |
| 3 | `getMonthGridItemsFromValues` interpretiert falsch | `hasPartner`, `model` oder `maxMonths` stimmen nicht mit den Daten überein |
| 4 | MonthGrid rendert anders | Unwahrscheinlich, da 1:1-Weitergabe an `MonthTile` |

---

## 8. Erfassung der realen Werte

Um im fehlerhaften Fall die tatsächlichen Daten zu prüfen, müsste vor dem Render in `StepPlan` protokolliert werden:

- `values.benefitPlan.model`
- `values.benefitPlan.parentAMonths`
- `values.benefitPlan.parentBMonths`
- `values.benefitPlan.concreteMonthDistribution` (Länge und Inhalt)
- `values.applicantMode`
- Ergebnis von `getMonthGridItemsFromValues(values, maxMonths)`

Ohne zusätzliches Diagnose-Logging oder manuelles Auslesen im Browser sind diese Werte nicht zugänglich.
