# Diagnose: 24-Monats-Variante – Übernahme bis Monatsübersicht

**Auftrag:** Exakter Trace der 24-Monats-Variante („Mit Partnerschaftsbonus“) von Auswahl bis gerenderter Monatsübersicht.

**Keine Änderungen.** Nur Fakten aus dem Code.

---

## Teil 1 – Variante vor Übernahme

### 1.1 Konkrete Variante

| Attribut | Wert |
|----------|------|
| Titel | „Mit Partnerschaftsbonus“ |
| Dauer | 24 Monate |
| strategyType | `withPartTime` |
| goal | `longerDuration` |
| Auszahlung | ~13.248 € |

### 1.2 Planstruktur (aus elterngeldOptimization.ts)

Die 24-Monats-Variante entsteht durch `createReferencePlan(plan, 'bothPlusWithBonus', 24)`.

**Quelle:** `elterngeldOptimization.ts`, Zeilen 415–449

```
parentA.months:
  Monate 1–4:  mode = 'partnerBonus', hoursPerWeek = 28
  Monate 5–24: mode = 'plus', hoursPerWeek = 28

parentB.months:
  Monate 1–4:  mode = 'partnerBonus', hoursPerWeek = 28
  (parentB hat keine Einträge für Monate 5–24)
```

**Konkrete Monatsverteilung (abgeleitet aus Plan):**

| Monat | Elternteil A (Mutter) | Elternteil B (Vater) |
|-------|----------------------|----------------------|
| 1–4   | partnerBonus         | partnerBonus         |
| 5–24  | plus                 | none                 |

**duration:** 24 (einzigartige Bezugsmonate über beide Eltern)

**strategyType:** `withPartTime`

**concreteMonthDistribution:** existiert im Plan nicht – wird erst in `mergePlanIntoPreparation` aus dem Plan erzeugt.

---

## Teil 2 – Übernahme (Klick „Diese Variante übernehmen“)

### 2.1 Aufrufkette

1. **OptimizationOverlay** → `onAdoptOptimization(p)` (Zeile 109–111)
2. **ElterngeldWizardPage** (Zeile 386–388):
   ```ts
   onAdoptOptimization={(plan) => {
     setValues((prev) => mergePlanIntoPreparation(prev, plan));
     setShowOptimizationOverlay(false);
   }}
   ```
3. `plan` = `opt.plan` der gewählten DecisionOption („Mit Partnerschaftsbonus“)

### 2.2 In den Merge-Prozess gehende Daten

**Eingabe:**

- `current`: aktuelles `values` (ElterngeldApplication aus Wizard-State)
- `plan`: ElterngeldCalculationPlan der 24-Monats-Variante (siehe Teil 1)

**Quelle:** `planToApplicationMerge.ts`, `mergePlanIntoPreparation` (Zeilen 51–108)

### 2.3 mergePlanIntoPreparation – Ablauf

1. **countA / countB:** `countBelegteMonate(parent.months)`  
   - parentA: 24 Einträge mit mode ≠ 'none'  
   - parentB: 4 Einträge mit mode ≠ 'none'  
   → countA = 24, countB = 4

2. **model:** `hasPB || hasPlus` → `true` → `model = 'plus'`

3. **maxMonth:** `model === 'plus' ? 24 : 14` → **24**

4. **extractMonthDistribution(plan, 24):**
   - `byMonthA` = Map aus parentA.months (24 Einträge)
   - `byMonthB` = Map aus parentB.months (4 Einträge)
   - Für m = 1..24: `modeA = byMonthA.get(m) ?? 'none'`, `modeB = byMonthB.get(m) ?? 'none'`
   - Ergebnis: 24 `MonthDistributionEntry` mit Monaten 1–24

5. **benefitPlan:**
   - `model`: 'plus'
   - `parentAMonths`: "24"
   - `parentBMonths`: "4"
   - `partnershipBonus`: true
   - `concreteMonthDistribution`: 24 Einträge (1–24, siehe Tabelle oben)

6. **applicantMode:** `hasPartnerMonths` → countB > 0 → `'both_parents'`

---

## Teil 3 – Zustand nach Übernahme

### 3.1 State direkt nach mergePlanIntoPreparation

**benefitPlan:**
- model: 'plus'
- parentAMonths: "24"
- parentBMonths: "4"
- partnershipBonus: true
- concreteMonthDistribution: Array mit 24 Einträgen

**applicantMode:** 'both_parents'

**parentAMonths / parentBMonths:** siehe oben (String-Zähler)

### 3.2 concreteMonthDistribution

- Vollständig vorhanden: 24 Einträge für Monate 1–24  
- Keine Verarbeitung in `mergePlanIntoPreparation`, die Länge reduziert

---

## Teil 4 – Monatsübersicht (Render)

### 4.1 Aufruf

**StepPlan.tsx**, Zeilen 204–266:

```ts
const maxMonths = values.benefitPlan.model === 'plus' ? 24 : 14;
const items = useMemo(
  () => getMonthGridItemsFromValues(values, maxMonths),
  [values, maxMonths]
);
```

### 4.2 getMonthGridItemsFromValues

**Quelle:** `monthGridMappings.ts`, Zeilen 75–98

- `dist = values.benefitPlan.concreteMonthDistribution`
- Wenn `dist && dist.length > 0`:
  → `getMonthGridItemsFromDistribution(dist, model, hasPartner, maxMonths)`
- Sonst: Fallback auf `getMonthGridItemsFromCounts` (parentAMonths, parentBMonths, …)

### 4.3 getMonthGridItemsFromDistribution

**Quelle:** `monthGridMappings.ts`, Zeilen 26–68

- `byMonth = new Map(distribution.map(d => [d.month, d]))`
- Für m = 1 bis maxMonths (24): `entry = byMonth.get(m) ?? { month, modeA: 'none', modeB: 'none' }`
- Pro Monat wird state/label/subLabel aus modeA/modeB ermittelt

**Erwartete Darstellung (bei korrekter concreteMonthDistribution):**

| Monat | state | label | subLabel |
|-------|-------|-------|----------|
| 1–4   | both  | Beide | Bonus    |
| 5–24  | mother| Mutter| Plus     |

---

## Teil 5 – Abweichung / Prüfstellen

### 5.1 Mögliche Bruchstellen im Datenfluss

| Stelle | Datei | Zeile | Risiko |
|--------|-------|-------|--------|
| extractMonthDistribution | planToApplicationMerge.ts | 29–45 | Nur wenn parentB.months Monate 5–24 nicht enthält → modeB = 'none' für 5–24. Das ist erwünscht und korrekt. |
| mergePlanIntoPreparation | planToApplicationMerge.ts | 51–108 | maxMonth = 24 nur bei model 'plus' – wird aus Plan ermittelt, für 24‑Monats-Variante immer plus. |
| getMonthGridItemsFromValues | monthGridMappings.ts | 75–98 | Fallback auf Count-Logik nur wenn `!dist || dist.length === 0`. Bei gültiger Übernahme ist dist gesetzt. |
| elterngeldPreparationStorage | infra/elterngeldPreparationStorage.ts | 81–91 | Bei `normalizeBenefitPlan` wird `concreteMonthDistribution` nur übernommen, wenn `distRaw` ein Array ist. Kein Aufruf im direkten Übernahme-Pfad. |
| StepPlan assignMonth | StepPlan.tsx | 217 | `clearDistribution = { ...bp, concreteMonthDistribution: undefined }` – manuelles Bearbeiten setzt concreteMonthDistribution auf undefined und fällt auf Count-Logik zurück. Nicht Teil der Übernahme. |

### 5.2 Persistenz (Speicherung)

- Wizard speichert `values` (z. B. in `elterngeldPreparationStorage`).
- `normalizeBenefitPlan` (Zeile 91): `...(concreteMonthDistribution.length > 0 && { concreteMonthDistribution })`
- Bei 24 Einträgen: concreteMonthDistribution wird mitgespeichert und beim Laden wieder gesetzt.

### 5.3 Zusammenfassung der Ablaufkette

```
Plan (24 Monate, bothPlusWithBonus)
  → mergePlanIntoPreparation
    → extractMonthDistribution(plan, 24) → 24 Einträge
    → benefitPlan.concreteMonthDistribution = 24 Einträge
  → setValues(merged)
  → StepPlan: getMonthGridItemsFromValues(values, 24)
    → dist vorhanden → getMonthGridItemsFromDistribution
    → 24 MonthGridItems
```

---

## Ergebnis

**Ablauf im Code:** Die Übernahme und Darstellung sind konsistent implementiert: `extractMonthDistribution` erzeugt 24 Einträge, `mergePlanIntoPreparation` schreibt sie in `benefitPlan.concreteMonthDistribution`, und `getMonthGridItemsFromValues` nutzt diese für die Monatsübersicht.

**Falls eine Abweichung in der UI auftritt**, mögliche Ursachen außerhalb dieses Pfads:

1. Anderer Kontext: `values` vor der Übernahme (z. B. andere applicantMode, parentB) beeinflusst das Merge.
2. Speicherung/Laden: Nach Reload könnte eine alte oder gefilterte Version der Vorbereitung geladen werden.
3. Unterschiedliche Pages: `ElterngeldCalculationPage` nutzt `handleAdoptOptimization` ohne `mergePlanIntoPreparation` und arbeitet nur mit Plan/Result-State – keine Vorbereitung, keine Monatsübersicht über `getMonthGridItemsFromValues`.

**Empfehlung für eine faktische Verifikation:** Ein Test, der explizit `mergePlanIntoPreparation` mit der 24‑Monats-Variante aufruft und prüft, dass `concreteMonthDistribution.length === 24` und `getMonthGridItemsFromValues(merged, 24)` 24 Items liefert.
