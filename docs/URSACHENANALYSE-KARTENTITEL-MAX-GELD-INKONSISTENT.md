# Ursachenanalyse: Zweite Card trägt „Ich möchte insgesamt möglichst viel Elterngeld bekommen“ trotz geringerem Mehrbetrag

**Stand:** Faktenbasiert, nur Code-Analyse, keine Fixes.

---

## 1. Relevante Feldzuordnung für die sichtbaren Cards

| Feld | Code-Stelle | Herkunft |
|------|-------------|----------|
| **Card-Titel** | `StepCalculationResult.tsx` Zeile 1160 | `opt.label` in `elterngeld-calculation__suggestion-title` |
| **label** | `decisionContext.ts` Zeile 546 | `STRATEGY_LABELS[strategyType] ?? s.title` |
| **strategyType** | `decisionContext.ts` Zeile 544 | `mapStrategyType(s.strategyType)` – aus der Suggestion |
| **financialDelta** | `decisionContext.ts` Zeile 567 | `s.optimizedTotal - baseTotal` |
| **scenarioLabel** | `decisionContext.ts` Zeilen 546, 584–595 | Ursprünglich aus `s.goal`; bei maxMoney und nicht höchster Auszahlung → „Fokus auf Gesamtauszahlung“ |
| **advantage** | `decisionContext.ts` Zeile 539 | `getAdvantageTradeoff(s, baseResult, s.goal)` |

---

## 2. Herkunft des Kartentitels „Ich möchte insgesamt möglichst viel Elterngeld bekommen“

**Textquelle:**  
`decisionContext.ts` Zeile 451: `STRATEGY_LABELS['maxMoney'] = 'Ich möchte insgesamt möglichst viel Elterngeld bekommen'`

**Zuweisung des Kartentitels:**  
`decisionContext.ts` Zeile 546: `const label = STRATEGY_LABELS[strategyType] ?? s.title;`

**Ablauf:**
1. `strategyType = mapStrategyType(s.strategyType)` (Zeile 544)
2. `label = STRATEGY_LABELS[strategyType] ?? s.title`
3. Bei `strategyType === 'maxMoney'` wird der Titel zu „Ich möchte insgesamt möglichst viel Elterngeld bekommen“.

**Abhängigkeiten:** Ausschließlich von `strategyType` bzw. `s.strategyType` (bzw. `s.goal`). Keine Abfrage von `householdTotal`, `financialDelta` oder Rang.

---

## 3. Unterschied von Kartentitel zu scenarioLabel und advantage

| Element | Korrektur nach Auszahlung? | Code-Stelle |
|---------|----------------------------|-------------|
| **scenarioLabel** | Ja – maxMoney-Varianten mit niedrigerer Auszahlung erhalten „Fokus auf Gesamtauszahlung“ | `decisionContext.ts` 584–595 |
| **advantage** | Ja – wird anhand von `s.goal` berechnet (nicht mehr `resultSet.goal`) | `decisionContext.ts` 539 |
| **label (Kartentitel)** | Nein – keine Auszahlungsprüfung, keine Anpassung | `decisionContext.ts` 546 |

**Folge:** scenarioLabel und advantage können bereits fachlich korrigiert sein; der Kartentitel hängt weiterhin nur von `strategyType` ab und wird nicht an den tatsächlichen Auszahlungsrang angepasst.

---

## 4. Reihenfolge vs. Titelzuweisung

**Reihenfolge:**  
In `stepDecisionFlow.ts` Zeilen 570–576: Sortierung nach Nutzerpriorität, dann nach `householdTotal` absteigend. Die Card mit der höchsten Auszahlung liegt oben.

**Titelzuweisung:**  
In `decisionContext.ts` Zeile 546: Der Titel kommt nur aus `STRATEGY_LABELS[strategyType]`, ohne Berücksichtigung von Reihenfolge oder Auszahlung.

**Ergebnis:** Die Reihenfolge ist korrekt; die Titelzuweisung ist nicht am tatsächlichen Auszahlungsrang orientiert. Eine Variante mit niedrigerer Auszahlung (z. B. zweite Card) kann trotzdem den Titel „Ich möchte insgesamt möglichst viel Elterngeld bekommen“ tragen, wenn sie `strategyType === 'maxMoney'` hat.

---

## 5. Beispielkonstellation (aus den beschriebenen Fakten)

| Card | financialDelta | strategyType (Herkunft) | Kartentitel | scenarioLabel (nach Korrektur) |
|------|----------------|-------------------------|-------------|-------------------------------|
| Erste (oben) | +3.620 € | z. B. longerDuration / frontLoad | z. B. „Ich möchte den Bezug möglichst lange strecken“ o. ä. | z. B. „Längere Bezugsdauer“ |
| Zweite (unten) | +630 € | maxMoney | „Ich möchte insgesamt möglichst viel Elterngeld bekommen“ | „Fokus auf Gesamtauszahlung“ |

---

## 6. Genau verantwortliche Code-Stelle

**Datei:** `src/modules/documents/elterngeld/calculation/decisionContext.ts`  
**Zeile:** 546

```ts
const label = STRATEGY_LABELS[strategyType] ?? s.title;
```

**Problem:**  
Der Kartentitel wird ausschließlich aus `strategyType` (bzw. `s.strategyType`) erzeugt. Es gibt weder:

- eine Prüfung, ob diese Variante die höchste Auszahlung hat, noch  
- eine Anpassung oder Umbenennung für maxMoney-Varianten mit niedrigerer Gesamtauszahlung.

Im Gegensatz dazu wird `scenarioLabel` in Zeilen 584–595 für maxMoney-Varianten angepasst, wenn sie nicht die höchste Auszahlung haben. Für `label` existiert diese Logik nicht.

---

## 7. Kurzfassung

1. **Reihenfolge:** Die erste Card zeigt tatsächlich den höheren Mehrbetrag (+3.620 €), die zweite den niedrigeren (+630 €). Die Sortierung entspricht dem fachlichen Rang.
2. **Titel:** Der zweite Kartentitel kommt von `STRATEGY_LABELS['maxMoney']`, weil die zweite Variante aus einem maxMoney-Optimierungslauf stammt (`strategyType === 'maxMoney'`).
3. **Lücke im Code:** Der Kartentitel wird nie an die tatsächliche Auszahlung oder den Rang angepasst – nur `scenarioLabel` wird dafür korrigiert.
4. **Konkrete Ursache:** `decisionContext.ts` Zeile 546 – dort fehlt eine Bedingung, die bei maxMoney-Varianten mit niedrigerer Auszahlung einen anderen Titel verwendet (analog zur scenarioLabel-Korrektur).
