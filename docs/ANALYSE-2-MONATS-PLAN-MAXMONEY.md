# Ursachenanalyse: Warum wird ein 2-Monats-Plan für „Insgesamt mehr Geld“ vorgeschlagen?

**Stand:** Faktenbasierte Code-Analyse, ohne Implementierung oder Fixes.

---

## 1. Einstiegspunkt `maxMoney`

**Datei:** `src/modules/documents/elterngeld/calculation/elterngeldOptimization.ts`

### Ablauf (Zeilen 108–144)

```
buildOptimizationResult(plan, result, 'maxMoney')
  → findCandidates(plan, result, 'maxMoney')
  → generateMutationCandidates(plan, result, candidates, 'maxMoney')
  → selectTop3(candidates, 'maxMoney')
  → candidateToSuggestion (pro Kandidat)
  → Filter: MIN_IMPROVEMENT_EUR (nur bei maxMoney/partnerBonus)
```

### Kandidatentypen für `maxMoney` (generateMutationCandidates, Zeilen 1016–1024)

| Funktion | Kandidatentyp |
|----------|----------------|
| `addReferenceConfigCandidates` | motherOnlyBasis, motherOnlyPlus, bothBasis, bothPlus, bothPlusWithBonus – verschiedene Monatszahlen (2–14 bzw. 2–24) |
| `addAlternativeCandidates` | motherOnly, bothBalanced, withoutPartTime, withPartTime |
| `addShiftBetweenParentsCandidates` | Monate zwischen Eltern verschieben (nur bei höherem householdTotal) |
| `addPlusToBasisCandidates` | Plus-Monate zu Basis umwandeln (nur bei höherem householdTotal) |

---

## 2. Herkunft des 2-Monats-Kandidaten

### Pfad 1: Reference-Kandidaten (round-robin)

**Datei:** `elterngeldOptimization.ts`  
**Funktion:** `addReferenceConfigCandidates`  
**Zeilen:** 541–565

```ts
const indices = [0, Math.floor(maxLen / 2), maxLen - 1];
for (const i of indices) {
  for (const config of configs) {
    const totalMonths = durations[i];  // i=0 → totalMonths=2 (DURATIONS_BASIS[0])
    const refPlan = createReferencePlan(plan, config, totalMonths);
    // ...
    addIfNew({ plan: refPlan, result: res, strategyType });
  }
}
```

**`DURATIONS_BASIS`** (Zeile 333): `[2, 3, 4, …, 14]` → Index 0 = **2 Monate**.

**`createReferencePlan`** für `bothBasis` und `totalMonths=2` (Zeilen 397–421):
- `targetPerParent = Math.ceil(2/2) = 1`
- Mutter: Monat 1 Basis
- Partner: Monat 2 Basis

Damit entsteht ein Plan mit genau zwei Bezugsmonaten (Mutter 1 Basis, Partner 2 Basis).

### Pfad 2: Alternative-Kandidaten (createBothBalancedPlan)

**Funktion:** `createBothBalancedPlan` (Zeilen 787–858)  
**Trigger:** `addAlternativeCandidates` (Zeilen 654–657), wenn nur Mutter Monate hat.

Wenn der Nutzerplan nur zwei Bezugsmonate hat, wird ein 2-Monats-Plan erzeugt (z. B. 1+1 über beide Eltern).

### Erste Erzeugungsstelle

**Datei:** `elterngeldOptimization.ts`  
**Funktion:** `addReferenceConfigCandidates`  
**Zeilen:** 541–565, Round-Robin mit `indices[0] = 0` → `totalMonths = 2`  
**Bedingung:** Konfiguration `bothBasis` (und ggf. andere) mit `totalMonths = 2` wird explizit erzeugt.

---

## 3. Zulassungslogik

### Vorhandene Prüfungen

| Prüfung | Stelle | Inhalt |
|---------|--------|--------|
| `res.validation.isValid` | addReferenceConfigCandidates, Zeilen 496–497, 554–555 | Nur formale Validierung (BEEG etc.) |
| `seen.has(fp)` (planFingerprint) | addIfNew in generateMutationCandidates | Deduplizierung nach Plan |
| `s.optimizedTotal <= currentTotal \|\| s.optimizedTotal - currentTotal > MIN_IMPROVEMENT_EUR` | buildOptimizationResult, Zeilen 147–150 | Filter für maxMoney/partnerBonus, nur bei kleinem Zuwachs |

### Nicht vorhandene Prüfungen

- Keine Mindestanzahl Bezugsmonate
- Keine Prüfung auf Plausibilität der Verteilung für maxMoney
- Keine Ausschlusslogik für extreme Dauerreduktion im Vergleich zum Ausgangsplan
- Keine Mindestdauer für „Insgesamt mehr Geld“

---

## 4. Ranking / Auswahl

**Funktion:** `selectTop3` (Zeilen 950–994)

### Ablauf für `goal === 'maxMoney'`

```ts
const scenarioOrder = ['maxMoney', 'longerDuration', 'frontLoad', 'partnerBonus'];
for (const scenario of scenarioOrder) {
  const best = bestForScenario(deduped, scenario);
  if (best && !added.has(best)) {
    result.push(best);
    added.add(best);
  }
}
// Zusätzlich: bothBalanced-Boost, falls noch kein bothBalanced
```

### `bestForScenario` für `frontLoad` (Zeilen 932–945)

```ts
if (scenario === 'frontLoad') return frontLoad > computeFrontLoadScore(best.result) ? c : best;
```

`computeFrontLoadScore` (Zeilen 900–917): Gewichtung `amount * (maxMonth - month + 1)` – frühe Monate haben höheres Gewicht.

### Konsequenz

- Für `maxMoney` werden nicht nur maxMoney-, sondern auch longerDuration- und **frontLoad**-Kandidaten berücksichtigt.
- Ein 2-Monats-Basis-Plan mit hohem Einkommen konzentriert viel Betrag auf Monat 1 und 2.
- Dadurch kann er den FrontLoad-Score gewinnen und als „best für frontLoad“ in die maxMoney-Top-3 aufgenommen werden, obwohl er fachlich nicht zu „Insgesamt mehr Geld“ passt.

### Sortierung für `maxMoney` selbst

- `bestForScenario(deduped, 'maxMoney')` wählt den Kandidaten mit dem höchsten `householdTotal`.
- Der 2-Monats-Plan erscheint typischerweise nicht als maxMoney-Bester, sondern über den **frontLoad**-Slot.

---

## 5. Vergleich mit aktuellem Nutzerplan

**Relevante Stellen:**

- `candidateToSuggestion` (Zeilen 216–293): Vergleich nur über `optimizedTotal` und `currentTotal`; keine Berücksichtigung der Bezugsdauer.
- Filter (Zeilen 147–150): `s.optimizedTotal <= currentTotal || s.optimizedTotal - currentTotal > MIN_IMPROVEMENT_EUR` – nur Geldsumme, keine Dauer.
- `shouldShowVariant` (optimizationExplanation.ts, Zeilen 176–196): `optimizedTotal >= currentTotal` → Anzeige; `optimizedDuration !== currentDuration` → Anzeige. Es gibt keine Mindestdauer.

**Ergebnis:**  
Ein 2-Monats-Plan kann als Verbesserung erscheinen, wenn z. B.  
- `optimizedTotal >= currentTotal` (z. B. höhere Basis-Beträge) oder  
- `optimizedDuration !== currentDuration` gilt.  
Die Bezugsdauer wird nicht als Schutz gegen starke Reduktion (z. B. 14 → 2 Monate) genutzt.

---

## 6. Anzeige-Pfad

```
candidate → selectTop3 → suggestion → buildDecisionContext → DecisionOption → OptionCard/Overlay
```

- Keine zusätzliche Validierung oder Filterung zwischen Optimizer und Overlay.
- Alles, was in `suggestions` landet, wird über `buildDecisionContext` zu Optionen und in der UI angezeigt.
- `shouldShowVariant` filtert nur bei gleicher Dauer und weniger Geld; bei unterschiedlicher Dauer oder höherem Geld wird angezeigt.

---

## 7. Erster echter Bruchpunkt

**Datei:** `src/modules/documents/elterngeld/calculation/elterngeldOptimization.ts`  
**Funktion:** `selectTop3`  
**Zeilen:** 974–981

```ts
for (const scenario of scenarioOrder) {
  if (result.length >= MAX_SUGGESTIONS) break;
  const best = bestForScenario(deduped, scenario);
  if (best && !added.has(best)) {
    result.push(best);
    added.add(best);
  }
}
```

Für `goal === 'maxMoney'` enthält `scenarioOrder` u. a. `'frontLoad'`.  
`bestForScenario(deduped, 'frontLoad')` kann einen 2-Monats-Plan als besten FrontLoad-Kandidaten wählen.  
Dieser wird dann in die maxMoney-Suggestions aufgenommen.

**Einordnung:** **C – falsches Ranking**  
Der 2-Monats-Plan wird über den FrontLoad-Slot in die Vorschläge für „Insgesamt mehr Geld“ aufgenommen, obwohl er für dieses Ziel fachlich ungeeignet ist.

### Vorbedingung

Der 2-Monats-Plan muss zuvor als Kandidat existieren – erzeugt durch `addReferenceConfigCandidates` (Round-Robin mit Index 0) bzw. `createBothBalancedPlan`. Die Entscheidung, ihn als maxMoney-Vorschlag anzuzeigen, fällt aber erst in `selectTop3`.

---

## 8. Regression-Schutz in der Analyse

| Thema | Betroffene Stelle | Bezug zum 2-Monats-Plan |
|-------|-------------------|-------------------------|
| model vs. concreteMonthDistribution | StepPlan, Planung | Kein direkter Bezug |
| Idempotenz / planFingerprint | generateMutationCandidates, addIfNew | Unverändert, keine Änderung nötig |
| longerDuration-Klassifikation | addBasisToPlusCandidates (`>` statt `>=`) | Unverändert, kein Bezug |
| CTA-Dopplung | Overlay | Unverändert, kein Bezug |
| addReferenceConfigCandidates | Erzeugt den 2-Monats-Kandidaten | Nur Quelle des Kandidaten, nicht der Anzeigeentscheidung |
| createReferencePlan / createBothBalancedPlan | Erzeugen 2-Monats-Pläne | Unverändert laut Vorgabe |

Ein Fix sollte in `selectTop3` oder in der Auswahl-/Anzeigelogik für maxMoney ansetzen, ohne diese bestehenden Bereiche anzupassen.

---

## Kurzfassung

| Aspekt | Befund |
|--------|--------|
| Erzeugung 2-Monats-Plan | `addReferenceConfigCandidates` (Round-Robin Index 0) und ggf. `createBothBalancedPlan` |
| Zulassung | Nur `validation.isValid`; keine Mindestdauer oder maxMoney-spezifische Prüfung |
| Ranking | `selectTop3` fügt den besten FrontLoad-Kandidaten zu maxMoney-Suggestions hinzu; 2-Monats-Plan kann hier gewinnen |
| Anzeige | Keine weitere Prüfung zwischen Optimizer und UI |
| Erster Bruchpunkt | `selectTop3` (Zeilen 974–981): FrontLoad-Slot für maxMoney-Vorschläge |
| Einordnung | C: Falsches Ranking – Szenario-Diversität führt zur Aufnahme eines fachlich unpassenden Plans |
