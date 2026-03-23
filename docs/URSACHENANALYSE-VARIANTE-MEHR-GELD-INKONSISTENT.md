# Ursachenanalyse: Variante als „mehr Geld insgesamt“ obwohl geringere Auszahlung

**Stand:** Faktenbasiert, nur Code-Analyse, keine Fixes.

---

## 1. Datenfelder der sichtbaren Varianten im Overlay

| Feld | Herkunft | Code-Stelle |
|------|----------|-------------|
| **householdTotal** | `opt.result.householdTotal` | `StepCalculationResult.tsx` Zeile 1265 (`elterngeld-calculation__suggestion-meta`) |
| **financialDelta** | `opt.impact.financialDelta` = `s.optimizedTotal - baseTotal` | `decisionContext.ts` Zeile 567 |
| **durationDelta** | `opt.impact.durationDelta` | `decisionContext.ts` Zeile 568 |
| **strategyType** | `mapStrategyType(s.strategyType)` aus Suggestion | `decisionContext.ts` Zeile 542 |
| **goal** (Herkunft) | `s.goal` – Ziel des Optimierungslaufs, aus dem die Suggestion stammt | `decisionContext.ts` Zeile 545 |
| **scenarioLabel** | `SCENARIO_SHORT_LABELS[s.goal] ?? SCENARIO_SHORT_LABELS[strategyType]` | `decisionContext.ts` Zeile 545 |
| **label** (Kartentitel) | `STRATEGY_LABELS[strategyType] ?? s.title` | `decisionContext.ts` Zeile 544 |
| **description** | `STEP3_STRATEGY_CONSEQUENCES[strategyType]` oder `s.explanation` | `decisionContext.ts` Zeilen 550–552 |
| **advantage** (Vorteilstext) | `getAdvantageTradeoff(s, baseResult, goal)` – **goal = resultSet.goal** | `decisionContext.ts` Zeile 537 |
| **tradeoff** | wie advantage | `decisionContext.ts` Zeile 537 |

---

## 2. Sortierung – Reihenfolge im UI

**Render:** `step.stepOptions.map((opt, optIdx) => <OptionCard ... />)`  
**Datei:** `StepCalculationResult.tsx` Zeilen 850–864.

**Es gibt keine Sortierung nach householdTotal.** Die Reihenfolge entspricht der Reihenfolge in `step.stepOptions`.

**Datenkette:**
- `step.stepOptions` = `step3OptionsFinal` = `step3Ctx.options` aus `buildDecisionContext(step3ResultSet)`
- `step3ResultSet.suggestions` = `step3Suggestions` aus `stepDecisionFlow.ts`
- `step3Suggestions` wird aufgebaut durch Iteration über `goalsOrdered` (Zeilen 474–507)

**Sortier-/Auswahl-Logik** (`stepDecisionFlow.ts`):
- `goalsOrdered` = Nutzerpriorität zuerst, dann `['maxMoney', 'longerDuration', 'frontLoad', 'partnerBonus']`
- Pro Ziel werden bis zu 2 Kandidaten in fester Reihenfolge ergänzt
- **Reihenfolge = Ziel-Reihenfolge, nicht householdTotal**

**Folge:** Die Variante mit der höchsten Gesamtauszahlung kann an beliebiger Position stehen (z. B. oben bei longerDuration, darunter maxMoney mit geringerem Total).

---

## 3. Herkunft der Texte

### Kartentitel (elterngeld-calculation__suggestion-title)
- **Code:** `decisionContext.ts` Zeile 544: `label = STRATEGY_LABELS[strategyType] ?? s.title`
- **Quelle:** `strategyType` der Suggestion (maxMoney, longerDuration, frontLoad usw.)
- **Beispiel:** maxMoney → „Ich möchte insgesamt möglichst viel Elterngeld bekommen“

### Szenario-Label „Mehr Geld insgesamt“ (elterngeld-calculation__suggestion-meta)
- **Code:** `decisionContext.ts` Zeile 545: `scenarioLabel = SCENARIO_SHORT_LABELS[s.goal] ?? SCENARIO_SHORT_LABELS[strategyType]`
- **Quelle:** `s.goal` (Herkunft der Suggestion aus dem Optimierungslauf)
- **Code-Stelle für „Mehr Geld insgesamt“:** `decisionContext.ts` Zeile 53: `maxMoney: 'Mehr Geld insgesamt'`

### Vorteilstext „Höhere Gesamtauszahlung“ (impactLines / fullSummary.advantage)
- **Code:** `decisionContext.ts` Zeile 537: `getAdvantageTradeoff(s, baseResult, goal)`
- **Hier:** `goal` = `resultSet.goal` (nicht `s.goal`)
- **Code-Stelle:** `decisionContext.ts` Zeilen 391–392:
  ```ts
  if (goal === 'maxMoney' && deltaTotal > 0) advantage = 'Höhere Gesamtauszahlung';
  if (goal === 'maxMoney' && deltaTotal < 0) tradeoff = 'Weniger Gesamtauszahlung';
  ```
- **step3ResultSet.goal** wird in `stepDecisionFlow.ts` Zeile 400 fest auf `'maxMoney'` gesetzt

**Folge:** Alle Varianten mit positivem deltaTotal erhalten den Vorteilstext „Höhere Gesamtauszahlung“, unabhängig von Herkunft oder tatsächlichem Rang.

### Beschreibung (z. B. „Meist höhere Gesamtauszahlung“)
- **Code:** `decisionContext.ts` Zeilen 122–126: `STEP3_STRATEGY_CONSEQUENCES[strategyType]`
- **Beispiel:** maxMoney → `'Meist höhere Gesamtauszahlung.'` – hängt nur von `strategyType` ab, nicht von tatsächlicher Auszahlung.

---

## 4. Ursache der Inkonsistenz

### 4.1 Feste Verwendung von resultSet.goal für advantage/tradeoff

**Datei:** `decisionContext.ts`  
**Zeilen:** 465–466, 537

- `const { goal, ... } = resultSet;` – `goal` kommt immer vom `OptimizationResultSet`.
- Für Schritt 3: `step3ResultSet.goal = 'maxMoney'` (`stepDecisionFlow.ts` Zeile 400), unabhängig vom Inhalt von `step3Suggestions`.
- `getAdvantageTradeoff(s, baseResult, goal)` verwendet damit für alle Suggestions stets `goal = 'maxMoney'`.
- Jede Variante mit `deltaTotal > 0` erhält `advantage = 'Höhere Gesamtauszahlung'`.
- Dadurch kann eine Variante mit geringerer Auszahlung denselben Vorteilstext bekommen wie die Variante mit der höchsten Auszahlung.

### 4.2 Labels und Szenario nach Herkunft, nicht nach tatsächlichem Rang

**Datei:** `decisionContext.ts`  
**Zeilen:** 544–545

- **label:** aus `STRATEGY_LABELS[strategyType]` – abhängig vom Optimierungslauf, aus dem die Suggestion stammt.
- **scenarioLabel:** aus `SCENARIO_SHORT_LABELS[s.goal]` – ebenfalls Herkunft, nicht Auszahlungsvergleich.
- Eine Suggestion aus dem **maxMoney**-Lauf erhält „Mehr Geld insgesamt“, auch wenn eine andere Variante (z. B. aus longerDuration) eine höhere Gesamtauszahlung hat.
- Das Label beschreibt die Herkunft, nicht den tatsächlichen Platz im Ranking.

### 4.3 Keine Sortierung nach Auszahlung

**Datei:** `stepDecisionFlow.ts`  
**Zeilen:** 474–507

- `step3Suggestions` wird nach Ziel-Reihenfolge (`goalsOrdered`) gefüllt.
- Es gibt keine Sortierung der finalen `stepOptions` nach `householdTotal` oder `financialDelta`.
- Die Variante mit der höchsten Gesamtauszahlung kann an beliebiger Position erscheinen.

---

## 5. Konkrete Code-Stellen der Inkonsistenz

| Problem | Datei | Zeilen | Beleg |
|--------|-------|--------|-------|
| **Vorteilstext für alle Varianten mit positivem Delta** | `decisionContext.ts` | 378–403, 537 | `getAdvantageTradeoff` nutzt `resultSet.goal` statt `s.goal` |
| **Fester goal im ResultSet** | `stepDecisionFlow.ts` | 400 | `step3ResultSet.goal = 'maxMoney'` trotz gemischter Suggestions |
| **Szenario-Label nach Herkunft** | `decisionContext.ts` | 545 | `scenarioLabel = SCENARIO_SHORT_LABELS[s.goal]` – Herkunft, nicht Rang |
| **Label nach Herkunft** | `decisionContext.ts` | 544 | `label = STRATEGY_LABELS[strategyType]` – Herkunft |
| **Keine Sortierung nach Auszahlung** | `stepDecisionFlow.ts` | 474–532 | Reihenfolge nur nach `goalsOrdered`, nicht nach `householdTotal` |

---

## 6. Szenario-Beispiel

Annahme:
- Variante A: aus longerDuration, `householdTotal` = 15.000 €, Delta = +2.000 €
- Variante B: aus maxMoney, `householdTotal` = 14.000 €, Delta = +1.000 €
- `goalsOrdered`: [longerDuration, maxMoney, ...]
- Nutzerpriorität: longerDuration

Dann:
1. Variante A steht oben (longerDuration zuerst).
2. Variante B steht darunter.
3. Variante B erhält „Mehr Geld insgesamt“ (s.goal = maxMoney).
4. Variante B erhält „Höhere Gesamtauszahlung“ (resultSet.goal = maxMoney, deltaTotal > 0).
5. Tatsächlich hat Variante A die höhere Auszahlung; Variante B wird sprachlich als „mehr Geld insgesamt“ dargestellt.

---

## 7. Kurzfassung

1. **Vorteilstext:** `getAdvantageTradeoff` nutzt `resultSet.goal = 'maxMoney'` für alle Suggestions, daher erhalten alle Varianten mit positivem Delta „Höhere Gesamtauszahlung“, auch die mit geringerer Auszahlung.
2. **Szenario-Label:** „Mehr Geld insgesamt“ kommt von `s.goal` (Herkunft) und beschreibt nicht den tatsächlichen Rang der Auszahlung.
3. **Reihenfolge:** Die Anordnung folgt der Ziel-Reihenfolge, nicht der Gesamtauszahlung.
