# Analyse: Inkonsistenz „Längere Bezugsdauer“ vs. angezeigte Monate

**Stand:** Faktenbasierte Code-Analyse, ohne Implementierung oder Fixes.

---

## 1. Einstiegspunkt Optimierungsziel „longerDuration“

**Datei:** `src/modules/documents/elterngeld/calculation/elterngeldOptimization.ts`

### Kandidatenerzeugung (Zeilen 1026–1029)

```ts
if (goal === 'longerDuration') {
  addBasisToPlusCandidates(plan, currentResult, candidates, addIfNew);
  return;
}
```

### Strategie `addBasisToPlusCandidates` (Zeilen 1074–1137)

- **Strategie:** Basis-Monate zu ElterngeldPlus umwandeln (max. 1 oder 2 Monate pro Kandidat)
- **Optimierungsmetrik:** `countBezugMonths(res)` – Anzahl distinkter Kalendermonate mit Bezug
- **Aufnahme-Bedingung:** `duration >= currentDuration` (Zeilen 1106–1108, 1125–1127)

```ts
const duration = countBezugMonths(res);
if (duration > currentDuration) durationImproved++;
if (duration >= currentDuration) {
  addIfNew({ plan: copy, result: res, strategyType: 'longerDuration' });
}
```

**Konsequenz:** Es werden auch Kandidaten aufgenommen, bei denen `duration === currentDuration`. Bei reiner Basis→Plus-Umwandlung bleibt die Anzahl belegter Monate oft unverändert.

### `candidateToSuggestion` für longerDuration (Zeilen 241–246)

```ts
case 'longerDuration':
  metricLabel = 'Bezugsdauer (Monate)';
  deltaValue = optimizedDuration - currentDuration;
  improved = deltaValue > 0;
  currentMetricValue = currentDuration;
  optimizedMetricValue = optimizedDuration;
  break;
```

- **Optimiert wird:** `countBezugMonths(result)` (Anzahl Monate)
- **„improved“:** nur bei `deltaValue > 0`, also bei tatsächlich mehr Monaten
- **Kandidat mit gleicher Dauer:** `improved = false`, `status = 'checked_but_not_better'`, bleibt aber `strategyType: 'longerDuration'`

---

## 2. Definition „Dauer“ im Optimizer

**Datei:** `elterngeldOptimization.ts`, Zeilen 1448–1456

```ts
function countBezugMonths(result: CalculationResult): number {
  const months = new Set<number>();
  for (const p of result.parents) {
    for (const r of p.monthlyResults) {
      if (r.mode !== 'none' || r.amount > 0) months.add(r.month);
    }
  }
  return months.size;
}
```

- **Definition:** Anzahl distinkter Kalendermonate mit Bezug (mode ≠ none ODER Betrag > 0)
- **Belegte Monate:** dieselbe Kennzahl – keine separate Zählung
- **Basis vs. Plus:** Beide zählen als ein Monat pro Kalendermonat; Umwandlung Basis→Plus ändert die Monatsanzahl in der Regel nicht

---

## 3. Übergang zur Anzeige

### Datenfluss

1. **Kandidat** → `candidateToSuggestion` → **OptimizationSuggestion**
   - `optimizedDurationMonths = countBezugMonths(result)`

2. **OptimizationSuggestion** → **stepDecisionFlow** `buildStepDecisionContext` → `stepOptions` (mit `buildDecisionContext`)

3. **buildDecisionContext** (decisionContext.ts, Zeilen 568–573):

```ts
impact: {
  financialDelta: s.optimizedTotal - baseTotal,
  durationDelta: s.optimizedDurationMonths - baseDuration,
  bonusDelta: ...,
}
```

### Entscheidungsoption (DecisionOption)

- `opt.impact.durationDelta` = Differenz Monate
- `opt.result` = CalculationResult (für Anzeige von „X Monate“)

---

## 4. UI-Komponente

**Datei:** `src/modules/documents/elterngeld/steps/StepCalculationResult.tsx`

### Darstellung „X Monate“

- Zeile 816 (Single-Option-View): `{countBezugMonths(opt.result)} Monate`
- Zeile 1256 (OptionCard meta): `{formatCurrency(opt.result.householdTotal)} · {countBezugMonths(opt.result)} Monate`

**Datenquelle:** `countBezugMonths(opt.result)` – dieselbe Kennzahl wie im Optimizer (distinkte belegte Kalendermonate).

---

## 5. Label-Logik

**Datei:** `src/modules/documents/elterngeld/calculation/decisionContext.ts`

### STRATEGY_LABELS (Zeilen 449–459)

```ts
const STRATEGY_LABELS: Record<string, string> = {
  longerDuration: 'Ich möchte den Bezug möglichst lange strecken',
  ...
};
```

### Verwendung (Zeilen 545–546)

```ts
const strategyType = mapStrategyType(s.strategyType);
const label = STRATEGY_LABELS[strategyType] ?? s.title;
```

- **Quelle des Labels:** ausschließlich `strategyType`
- **Nicht verwendet:** `deltaDuration`, `optimizedDurationMonths`, tatsächliche Daueränderung
- **Konsequenz:** Jeder Kandidat mit `strategyType === 'longerDuration'` erhält dieses Label – unabhängig davon, ob sich die Dauer gegenüber dem Ausgangsplan ändert

---

## 6. Vergleich Ist vs. Soll im Code

### Kann ein longerDuration-Kandidat mit unveränderter Dauer angezeigt werden?

**Ja.**

1. **addBasisToPlusCandidates** (Zeilen 1107, 1126): `duration >= currentDuration` – gleiche Dauer erlaubt.
2. **shouldShowVariant** (optimizationExplanation.ts, Zeilen 176–196):
   - `optimizedTotal >= currentTotal` → true (hier nicht, Basis→Plus hat weniger Geld)
   - `optimizedDuration !== currentDuration` → false bei gleicher Dauer
   - Bei gleicher Dauer und weniger Geld: `getExplainableAdvantageWhenSameDurationLessTotal`
   - Dort (Zeilen 134–135): `hasPlanChanges` liefert bei Basis→Plus `true` → `'Gleiche Dauer, aber anders über die Monate verteilt.'` → Variante wird angezeigt.
3. **stepDecisionFlow:** Kandidaten mit gleicher Dauer landen in `candidatesPerGoal.get('longerDuration')`, können in `step3Suggestions` aufgenommen werden (außer im „longerDuration reservieren“-Block, der nur `> currentDuration` zulässt).
4. **Ergebnis:** Eine Variante mit `strategyType: 'longerDuration'` kann erscheinen, obwohl `countBezugMonths` unverändert ist (z. B. weiterhin „14 Monate“).

### Erster Bruchpunkt

**Datei:** `src/modules/documents/elterngeld/calculation/elterngeldOptimization.ts`  
**Funktion:** `addBasisToPlusCandidates`  
**Zeilen:** 1106–1108 und 1125–1127

```ts
if (duration >= currentDuration) {
  addIfNew({ plan: copy, result: res, strategyType: 'longerDuration' });
}
```

Mit `>=` werden Kandidaten mit gleicher Dauer aufgenommen und als `longerDuration` gekennzeichnet. Das Label und das Ziel „Längere Bezugsdauer“ suggerieren eine längere Dauer, während die Anzeige gleich bleibt.

---

## 7. Ergebnis

### Zusammenfassung

| Frage | Antwort |
|-------|---------|
| **Welche Kennzahl wird optimiert?** | `countBezugMonths(result)` – Anzahl distinkter Kalendermonate mit Bezug |
| **Welche Kennzahl wird angezeigt?** | `countBezugMonths(opt.result)` – dieselbe Kennzahl |
| **Sind diese identisch?** | **Ja** |
| **Wo entsteht der erste Bruch?** | `elterngeldOptimization.ts`, Funktion `addBasisToPlusCandidates`, Zeilen 1107 und 1126 |
| **Einordnung** | **A: Falsche Klassifikation** |

### Klare Einordnung: A

**A. Falsche Klassifikation**

- Kandidaten mit unveränderter Dauer (`duration === currentDuration`) werden als `longerDuration` geführt.
- Die Aufnahme-Bedingung `duration >= currentDuration` statt `duration > currentDuration` lässt diese Fälle zu.
- Das Label „Ich möchte den Bezug möglichst lange strecken“ folgt aus `strategyType` und bezieht sich nicht auf die tatsächliche Daueränderung.

**Nicht B (falsche Anzeige):** Die Anzeige nutzt dieselbe Kennzahl wie der Optimizer.

**Nicht C (unterschiedliche Dauer-Definition):** Optimizer und UI verwenden dieselbe `countBezugMonths`-Logik.

---

## Zusätzliche Belege

### Szenario-basierte Kandidaten-Auswahl (elterngeldOptimization.ts, Zeilen 522–532)

Die Szenario-Logik prüft `duration > countBezugMonths(existing.result)` für longerDuration; in `addBasisToPlusCandidates` wird aber nur `duration >= currentDuration` geprüft, daher werden dort trotzdem Kandidaten mit gleicher Dauer hinzugefügt.

### stepDecisionFlow „longerDuration reservieren“ (Zeilen 477–491)

```ts
if (bestLonger && countBezugMonths(bestLonger.result) > currentDuration && ...) {
  step3Suggestions.push(bestLonger);
}
```

Dieser Block schließt Varianten mit gleicher Dauer aus. Solche können aber im regulären Durchlauf (Zeilen 494 ff.) über `candidatesPerGoal.get('longerDuration')` in die Suggestions gelangen.
