# Diagnose: „Diese Variante übernehmen“ wirkt nicht auf Monatsübersicht

**Datum:** 2026-03-22  
**Kontext:** Elterngeldplaner, PWA  
**Auftrag:** Reine Ursachenanalyse – keine Umsetzung, nur Fakten.

---

## 1. Konkret ausgeführte Funktion beim Klick

### 1.1 Kontext des Buttons

Der Button „Diese Variante übernehmen“ erscheint nur im **ElterngeldWizardPage**-Flow:

- **Datei:** `ElterngeldWizardPage.tsx` Zeilen 377–401
- **Komponente:** `OptimizationOverlay` → `StepOptimizationBlock` (aus `StepCalculationResult.tsx`)
- **Einstieg:** Nutzer ist auf Schritt `plan` oder `summary`, klickt „Optimierung ansehen“ bzw. „Varianten vergleichen“, wählt eine Variante, klickt „Diese Variante übernehmen“

**Hinweis:** In `ElterngeldCalculationPage` wird `optimizationGoal` nie gesetzt (nur auf `undefined`), daher wird der Optimierungsblock mit „Diese Variante übernehmen“ dort gar nicht gerendert (siehe `OptimizationGoalDialog.tsx`: „Einziger gültiger Optimierungseinstieg: begleiteter Flow im Wizard“).

### 1.2 Aufrufkette beim Klick

| Stelle | Code | Funktion |
|--------|------|----------|
| Button | `StepCalculationResult.tsx` ca. 733, 959, 1258, 1264 | `onAdoptOptimization?.(plan)` bzw. `onAdoptOption(opt)` → `openAdoptDialogForOption` → Modal → `onConfirm` → `onAdoptOptimization?.(selectedOption.plan)` |
| OptimizationOverlay | `OptimizationOverlay.tsx` 100–102 | `onAdoptOptimization(p)` → `handleClose()` |
| ElterngeldWizardPage | `ElterngeldWizardPage.tsx` 386–389 | `onAdoptOptimization={(plan) => { setValues((prev) => mergePlanIntoPreparation(prev, plan)); setShowOptimizationOverlay(false); }}` |

**Konkret ausgeführte Funktion beim Klick:**

1. `mergePlanIntoPreparation(currentValues, optimizedPlan)` wird aufgerufen  
2. `setValues(mergedValues)` aktualisiert den State  
3. `setShowOptimizationOverlay(false)` schließt das Overlay  

---

## 2. State-Veränderung beim Klick

**Ja, State wird verändert.**

- **Hook:** `useState` in `ElterngeldWizardPage.tsx` Zeile 57: `const [values, setValues] = useState<ElterngeldApplication>(...)`
- **Aufruf:** `setValues((prev) => mergePlanIntoPreparation(prev, plan))`
- **Änderung:** `values` wird durch das Ergebnis von `mergePlanIntoPreparation` ersetzt.

In `planToApplicationMerge.ts` (Zeilen 40–70) werden u. a. überschrieben:

- `benefitPlan.parentAMonths` = `String(countA)`
- `benefitPlan.parentBMonths` = `String(countB)`
- `benefitPlan.model` = `'plus' | 'basis'`
- `benefitPlan.partnershipBonus` = boolean  
- sowie `child`, `parentA`, `parentB` (inkl. Einkommen, Teilzeit etc.).

`countA` und `countB` stammen von `countBelegteMonate(parent.months)` (Monate mit `mode !== 'none'`).

---

## 3. Welche Daten die Monats-Kacheln verwenden

### 3.1 Komponenten mit Monatsübersicht im Wizard

| Komponente | Datei | Verwendung |
|------------|-------|------------|
| StepPlan | `StepPlan.tsx` 356–366, 502–514 | Monats-Kacheln + `MonthSummary` |
| StepSummary | `StepSummary.tsx` 115–125, weiter unten | Monats-Kacheln analog |

### 3.2 Ableitung der Kachel-Daten

**StepPlan** (Zeilen 204–208, 356–366):

```ts
const countA = parseMonthCount(values.benefitPlan.parentAMonths);
const countB = values.applicantMode === 'both_parents' ? parseMonthCount(values.benefitPlan.parentBMonths) : 0;
const hasPartner = values.applicantMode === 'both_parents';
// ...
const items = getMonthGridItemsFromCounts(countA, countB, values.benefitPlan.model, values.benefitPlan.partnershipBonus, hasPartner, maxMonths);
```

**StepSummary** (Zeilen 111–125): identische Logik.

Die Monats-Kacheln hängen also ab von:

1. `values.benefitPlan.parentAMonths` (string → countA)
2. `values.benefitPlan.parentBMonths` (string → countB), aber nur wenn `values.applicantMode === 'both_parents'`
3. `values.benefitPlan.model`
4. `values.benefitPlan.partnershipBonus`
5. `values.applicantMode`
6. `maxMonths` (abgeleitet von `model`)

### 3.3 Interpretation in `getMonthGridItemsFromCounts`

`monthGridMappings.ts` Zeilen 34–36:

```ts
const motherHas = m <= parentAMonths;
const partnerHas = hasPartner && m <= parentBMonths;
```

Bedeutung:

- Mutter: Monate 1 bis `countA`
- Partner: Monate 1 bis `countB` (bei `hasPartner`)
- Keine Abbildung einer beliebigen Monatsverteilung, nur „erste N Monate pro Elternteil“.

---

## 4. Exakte Stelle der Datenfluss-Unterbrechung

### 4.1 Semantische Lücke: Counts statt Verteilung

`mergePlanIntoPreparation` speichert nur **Anzahlen**:

- `countA = countBelegteMonate(parentA.months)`
- `countB = countBelegteMonate(parentB.months)`

Beispiel Optimierungsplan:

- Mutter: Monate 1–6, 9–12 belegt (8 Monate) → `countA = 8`
- Partner: Monate 7–8 belegt (2 Monate) → `countB = 2`

`getMonthGridItemsFromCounts(8, 2, ...)` interpretiert:

- Mutter: Monate 1–8
- Partner: Monate 1–2

→ Monate 1–2 als „both“, 3–8 als „mother“, 9+ als „none“.

Die tatsächliche Verteilung (Mutter 1–6, Partner 7–8, Mutter 9–12) wird nicht abgebildet. Die Kacheln können damit **inhaltlich falsch** sein, selbst wenn `values` korrekt gesetzt wurde.

### 4.2 Fall: Keine sichtbare Änderung trotz Übernahme

Wenn Original- und Optimierungsplan dieselben Gesamtzahlen haben:

- z. B. beide: 12 Mutter-Monate, 2 Partner-Monate

dann liefert `mergePlanIntoPreparation`:

- `parentAMonths: "12"`, `parentBMonths: "2"`

identisch zum bisherigen `values.benefitPlan`. Die Monats-Kacheln werden mit denselben Inputs gerendert → **keine sichtbare Änderung**, obwohl die konkrete Monatsverteilung unterschiedlich sein kann.

### 4.3 Fall: `applicantMode` verhindert Übernahme des Partners

- `mergePlanIntoPreparation` ändert `applicantMode` nicht.
- Bei `applicantMode !== 'both_parents'` setzt StepPlan/StepSummary: `countB = 0` (`StepPlan.tsx` 206–208, `StepSummary.tsx` 113–114).
- Auch wenn der Optimierungsplan `parentB`-Monate vorsieht und `parentBMonths` gesetzt wird, werden diese bei `single_applicant` ignoriert → Partner-Monate erscheinen in der Monatsübersicht **nicht**.

### 4.4 Zusammenfassung der Abbruchstellen

| Stelle | Datei / Zeile | Beschreibung |
|-------|---------------|--------------|
| **Semantik** | `planToApplicationMerge.ts` 34–36, 66–67 | Reduktion der Monatsverteilung auf `countA`/`countB`; Verlust der konkreten Zuordnung Monat → Elternteil |
| **Datenmodell** | `elterngeldTypes.ts` (ElterngeldBenefitPlan) | `parentAMonths`/`parentBMonths` sind nur Zahlen, keine Monat-für-Monat-Struktur |
| **Rendering** | `monthGridMappings.ts` 34–36 | `motherHas = m <= parentAMonths`, `partnerHas = m <= parentBMonths` – feste Interpretation „erste N Monate“ |
| **ApplicantMode** | `StepPlan.tsx` 206–208, `StepSummary.tsx` 113–114 | `countB = 0` bei `applicantMode !== 'both_parents'`, unabhängig von `parentBMonths` |

---

## 5. Ergebnis: Ursache „keine visuelle Aktualisierung“

### 5.1 Technischer Ablauf

1. Klick auf „Diese Variante übernehmen“ → `onAdoptOptimization(plan)` wird ausgeführt.  
2. `mergePlanIntoPreparation(prev, plan)` wird berechnet und über `setValues` in den State geschrieben.  
3. `values` wird aktualisiert; StepPlan und StepSummary erhalten die neuen `values` über Props und rendern neu.  
4. Die Monats-Kacheln nutzen `getMonthGridItemsFromCounts(countA, countB, ...)` mit Werten aus `values.benefitPlan`.

### 5.2 Warum trotzdem „keine Wirkung“?

Die belegbare Ursache liegt nicht am fehlenden State-Update, sondern an der **Datenstruktur und Semantik**:

1. **Gleiche Counts:**  
   Wenn der optimierte Plan die gleichen Gesamtzahlen (countA/countB) und gleichen Modus/Bonus hat wie der bisherige, ändern sich die Inputs für `getMonthGridItemsFromCounts` nicht → **keine sichtbare Änderung**.

2. **Falsche/ungenaue Darstellung:**  
   Selbst bei unterschiedlichen Counts bildet das Count-Modell eine beliebige Monatsverteilung nur grob ab. Die Kacheln können von der tatsächlichen Optimierung abweichen.

3. **ApplicantMode:**  
   Bei `applicantMode !== 'both_parents'` werden Partner-Monate in der Monatsübersicht nicht berücksichtigt, unabhängig davon, was `mergePlanIntoPreparation` in `parentBMonths` schreibt.

---

## 6. Übersicht Code-Stellen

| Zweck | Datei | Zeilen |
|------|-------|--------|
| Button „Diese Variante übernehmen“ | `StepCalculationResult.tsx` | 733, 811, 885, 959, 1066, 1258, 1264, 1268 |
| Handler auf Wizard-Seite | `ElterngeldWizardPage.tsx` | 386–389 |
| Merge-Funktion | `planToApplicationMerge.ts` | 27–73 |
| Datenquelle Monats-Kacheln (StepPlan) | `StepPlan.tsx` | 204–208, 356–366, 502–514 |
| Datenquelle Monats-Kacheln (StepSummary) | `StepSummary.tsx` | 111–125 |
| Count → Grid-Items | `monthGridMappings.ts` | 24–71 |
| ApplicantMode-Check | `StepPlan.tsx`, `StepSummary.tsx` | 206–208, 113–114 |

---

*Analyse ausschließlich auf Basis des vorhandenen Codes. Keine Vermutungen, keine Fixes.*
