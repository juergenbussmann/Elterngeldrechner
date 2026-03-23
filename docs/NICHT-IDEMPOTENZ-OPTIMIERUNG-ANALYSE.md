# Analyse: Nicht-Idempotenz der Optimierung (Ziel „insgesamt möglichst viel Geld“)

**Stand:** Faktenbasierte Code-Analyse. Keine Implementierung, keine Fixes.

---

## 1. Ausgangszustand definieren

### Vollständiger State (values) vor dem ersten Optimierungslauf

**Typischer Fall (Count-Pfad):**
```
benefitPlan: {
  model: 'basis' | 'plus',
  parentAMonths: string,    // z.B. "14"
  parentBMonths: string,    // z.B. "0" oder "10"
  partnershipBonus: boolean,
  concreteMonthDistribution?: undefined   // nicht gesetzt
}
```

**Relevante Felder für die Optimierung:**
- `benefitPlan.model` → bestimmt `defaultMode` (basis/plus/partnerBonus)
- `benefitPlan.parentAMonths`, `benefitPlan.parentBMonths` → Monatsanzahlen (Count-Pfad)
- `benefitPlan.concreteMonthDistribution` → falls gesetzt: Distribution-Pfad (Vorrang)
- `benefitPlan.partnershipBonus` → bei Count-Pfad: Partner-Modus
- `parentA.incomeBeforeBirth`, `parentB.incomeBeforeBirth`
- `parentA.plannedPartTime`, `parentA.hoursPerWeek`
- `child.birthDate` → beeinflusst `hasMaternityBenefit` für LM 1–2

### Zwei Kontexte (Calculation Page vs. Wizard)

| Kontext | Eingabe Lauf 1 | Eingabe Lauf 2 (nach Übernahme) |
|---------|----------------|----------------------------------|
| **ElterngeldCalculationPage** | `plan` (aus Vorbereitung oder `applicationToCalculationPlan`) | `plan` = übernommener Plan (direkt im State) |
| **ElterngeldWizardPage / StepPlan** | `values` → `applicationToCalculationPlan(values)` → `plan` | `values` = `mergePlanIntoPreparation(prev, plan)` → erneut `applicationToCalculationPlan` |

---

## 2. Datenfluss erster Lauf

### Pfad

```
values (oder plan)
  → applicationToCalculationPlan(values)  [wenn values]
  → plan (ElterngeldCalculationPlan)
  → calculatePlan(plan) → currentResult
  → buildOptimizationResult(plan, currentResult, 'maxMoney')
    → findCandidates → generateMutationCandidates
      → addReferenceConfigCandidates(plan, ...)
      → addAlternativeCandidates(plan, ...)
      → addShiftBetweenParentsCandidates(...)
      → addPlusToBasisCandidates(...)
    → selectTop3
    → filter: optimizedTotal - currentTotal > MIN_IMPROVEMENT_EUR (bei maxMoney)
  → suggestions[]
```

### Exakter Input der Optimierung

- `plan`: ElterngeldCalculationPlan (aus Count- oder Distribution-Pfad)
- `currentResult`: `calculatePlan(plan)`
- `goal`: `'maxMoney'`

### Erzeugte Varianten (maxMoney)

- **addReferenceConfigCandidates**: Pläne aus `createReferencePlan(plan, config, totalMonths)` mit:
  - `motherOnlyBasis`, `motherOnlyPlus`, `bothBasis`, `bothPlus`, `bothPlusWithBonus`
  - Feste Aufteilung pro Config (z.B. bothPlusWithBonus: Überlappung LM 1–4, Rest bei A)
- **addAlternativeCandidates**: `createMotherOnlyPlan`, `createBothBalancedPlan`, `createWithoutPartTimePlan`, `tryAddPartnerBonus`
- **addShiftBetweenParentsCandidates**, **addPlusToBasisCandidates**

### Übernahme

Nutzer wählt eine Variante → `onAdoptOptimization(plan)`.

---

## 3. Rückschreibepfad „Variante übernehmen“

### mergePlanIntoPreparation (planToApplicationMerge.ts)

**Eingabe:** `current: ElterngeldApplication`, `plan: ElterngeldCalculationPlan`

**Berechnungen:**
- `countA` = `countBelegteMonate(parentA.months)`
- `countB` = `countBelegteMonate(parentB.months)`
- `model` = `hasPB || hasPlus ? 'plus' : 'basis'`
- `maxMonth` = `model === 'plus' ? 24 : 14`
- `concreteMonthDistribution` = `extractMonthDistribution(plan, maxMonth)` (Monate 1..maxMonth)

**Rückgabe:**
```
benefitPlan: {
  ...current.benefitPlan,
  model,                        // neu aus Plan abgeleitet
  parentAMonths: String(countA), // überschrieben
  parentBMonths: String(countB), // überschrieben
  partnershipBonus: hasPB,
  concreteMonthDistribution     // neu gesetzt
}
```

### Konkrete Änderungen

| Feld | Vor Übernahme | Nach Übernahme |
|------|----------------|----------------|
| `concreteMonthDistribution` | `undefined` | exakte Monatsverteilung (1..maxMonth) |
| `model` | z.B. `'basis'` | `'plus'` falls Plus/Bonus im Plan |
| `parentAMonths` | z.B. `"14"` | `String(countA)` (aus Plan) |
| `parentBMonths` | z.B. `"0"` | `String(countB)` |
| `partnershipBonus` | z.B. `false` | aus Plan abgeleitet |

**Kern:** Nach Übernahme wird der **Distribution-Pfad** aktiv; `concreteMonthDistribution` hat Vorrang vor den Counts.

---

## 4. Zweiter Lauf – Eingangsdaten vergleichen

### Calculation Page (plan nur im State)

- **Vor Lauf 1:** plan aus Vorbereitung
- **Vor Lauf 2:** `plan` = übernommener Plan

Hier fließen keine `values` über `mergePlanIntoPreparation`. Der Plan wird direkt übernommen.

### Wizard / StepPlan (values mit merge)

- **Vor Lauf 1:** `values` ohne `concreteMonthDistribution` → **Count-Pfad**
- **Vor Lauf 2:** `values` mit `concreteMonthDistribution` → **Distribution-Pfad**

### Unterschiede

| Aspekt | Lauf 1 | Lauf 2 |
|--------|--------|--------|
| Pfad in `applicationToCalculationPlan` | Count (falls dist leer) | Distribution (dist gesetzt) |
| Monatsaufteilung | `createMonths(count, mode, …)` | `createMonthsFromDistribution(dist, …)` |
| Modus je Monat | einheitlich (defaultMode) | pro Monat aus `concreteMonthDistribution` |

**Roundtrip:** `plan` → `extractMonthDistribution` → `concreteMonthDistribution` → `createMonthsFromDistribution` sollte denselben Plan reproduzieren. Die Distribution-Logik ist symmetrisch.

---

## 5. Berechnungspfad vergleichen

### applicationToCalculationPlan (applicationToCalculationPlan.ts, Zeile 117–170 vs. 173–224)

```ts
const dist = app.benefitPlan.concreteMonthDistribution;
if (dist && dist.length > 0) {
  // DISTRIBUTION-Pfad: createMonthsFromDistribution
} else {
  // COUNT-Pfad: createMonths(countA, defaultMode, ...), createMonths(countB, ...)
}
```

| Lauf | concreteMonthDistribution | Pfad |
|------|---------------------------|------|
| 1 (Wizard, vor Übernahme) | `undefined` oder leer | COUNT |
| 2 (Wizard, nach Übernahme) | gesetzt (1..24) | DISTRIBUTION |
| 1 + 2 (Calculation Page) | irrelevant (plan direkt) | – |

Beim Wizard wechselt der Pfad zwischen Lauf 1 und 2. Der Roundtrip ist aber verlustfrei, der resultierende Plan ist derselbe.

---

## 6. Drift innerhalb der Berechnung

### createReferencePlan (elterngeldOptimization.ts, Zeile 356–462)

**Feststellung:** Die Monatsstruktur wird **nicht** aus dem aktuellen Plan übernommen, sondern neu aufgebaut:

```ts
const months = Array.from({ length: totalMonths }, (_, i) => i + 1);
// ...
if (config === 'bothPlusWithBonus' && totalMonths >= 4) {
  const overlapCount = Math.min(4, Math.floor(totalMonths / 2));
  const overlapMonths = months.slice(0, overlapCount);   // fest: LM 1–4
  const restA = months.slice(overlapCount, totalMonths);
  // ...
}
```

- Überlappung für `bothPlusWithBonus` ist immer LM 1–`overlapCount` (typisch 1–4).
- Der übernommene Plan kann eine andere Überlappung haben (z.B. LM 3–6).
- Dadurch erzeugt `createReferencePlan` einen **anderen** Plan als der übernommene.

### addAlternativeCandidates – createBothBalancedPlan (Zeile 787–875)

- Verwendet `duplicatePlan(plan)` und verteilt die Monate neu.
- `targetPerParent = Math.ceil(total / 2)`.
- Die Reihenfolge der Einträge in `allMonths` (parentA vor parentB) beeinflusst die Zuordnung.
- Ergebnis: 50/50-Verteilung kann von der übernommenen Variante abweichen.

### calculateMonthlyElterngeld (calculationEngine.ts, Zeile 94–169)

- `amount = Math.round(amount)` pro Monat.
- Kleine Abweichungen in der Aufteilung können durch Rundung zu anderen Gesamtsummen führen.

---

## 7. Ergebnisvergleich

### Gesamtbetrag

`householdTotal = parents.reduce((sum, p) => sum + p.total, 0)` mit `p.total = sum(r.amount)` pro Elternteil.

### Wo die Differenz entsteht

1. Unterschiedliche Monatsverteilung (welche Monate Plus/Bonus/Basis)
2. Unterschiedliche Zuordnung zu Eltern (createBothBalancedPlan)
3. Rundung: `Math.round(baseAmount)` pro Monat in `calculateMonthlyElterngeld`
4. Mutterschaft: `hasMaternityBenefit` für LM 1–2 beeinflusst Darstellung/Hinweise, nicht die Berechnung

---

## 8. Erster echter Bruchpunkt

### Datei und Funktion

**`elterngeldOptimization.ts` → `addReferenceConfigCandidates` (ab Zeile 473)**

konkret: `createReferencePlan(plan, config, totalMonths)` (Zeile 356–462).

### Begründung

1. `addReferenceConfigCandidates` erzeugt Pläne über `createReferencePlan` mit **festen Mustern**, z.B.:
   - bothPlusWithBonus: Überlappung LM 1–4, Rest bei A
   - bothPlus: 50/50 nach Monatsanzahl
2. Der übernommene Plan kann von `createBothBalancedPlan`, `tryAddPartnerBonus`, `addShiftBetweenParentsCandidates` etc. stammen und damit eine andere Aufteilung haben.
3. Beim zweiten Lauf ist der aktuelle Plan der übernommene Plan.
4. `createReferencePlan` nutzt nur `incomeBeforeNet`, `childBirthDate` usw., nicht die konkrete Monatsverteilung.
5. Es entstehen **andere Kandidaten** als der aktuelle Plan.
6. Wenn einer dieser Kandidaten ein höheres `householdTotal` liefert (z.B. durch andere Überlappung oder Rundung), wird er vorgeschlagen.

**Zusatz:** `addAlternativeCandidates` → `createBothBalancedPlan` baut aus dem aktuellen Plan eine neue 50/50-Variante. Diese kann ebenfalls höher sein als der aktuelle Plan und dadurch Nicht-Idempotenz auslösen.

---

## 9. Klare Begründung: warum die Optimierung nicht idempotent ist

**Die Kandidatenerzeugung berücksichtigt den aktuellen Plan nicht als „bereits optimalen“ Ausgangspunkt.**

- `addReferenceConfigCandidates` und `addAlternativeCandidates` erzeugen **alternative** Pläne mit vorgegebenen Mustern.
- Diese Muster sind von der übernommenen Verteilung unabhängig.
- Ein so erzeugter Kandidat kann ein höheres `householdTotal` haben als der übernommene Plan.
- Der zweite Lauf schlägt dann eine „bessere“ Variante vor, obwohl fachlich derselbe Plan zugrunde liegt.

**Erster Bruchpunkt:**  
`src/modules/documents/elterngeld/calculation/elterngeldOptimization.ts`, Funktion `createReferencePlan` (Zeile 356–462), aufgerufen von `addReferenceConfigCandidates`.

---

## 10. Kurzfassung

| Aspekt | Ergebnis |
|--------|----------|
| **State vor Lauf 1** | values mit Count-Pfad oder plan direkt |
| **State vor Lauf 2** | values mit concreteMonthDistribution (Wizard) oder plan = übernommener Plan (Calculation) |
| **Unterschiede** | Pfadwechsel Count → Distribution (Wizard); plan-übergreifend: Kandidaten unabhängig vom aktuellen Plan |
| **Berechnungspfad** | Lauf 1: COUNT; Lauf 2: DISTRIBUTION (Wizard); Rundung in `calculateMonthlyElterngeld` |
| **Erste Abweichungsstelle** | `elterngeldOptimization.ts`, `createReferencePlan` (Zeile 356–462) |
| **Grund für Nicht-Idempotenz** | Kandidatenerzeugung mit festen Mustern, die den übernommenen Plan nicht als fixierten Optimalzustand ansehen; alternativ kann `createBothBalancedPlan` eine höherwertige Verteilung produzieren |
