# Nachweis: Datenquellen im Übernahme-Flow (AdoptConfirmDialog)

**Datum:** 22.03.2026  
**Ziel:** Beleg, ob es im Übernahme-Flow nur **eine Quelle der Wahrheit** gibt.

---

## 1. Alle Öffnungspfade des Confirm-Dialogs

### 1.1 StepOptimizationBlock (einzige live genutzte Komponente)

| # | Zeile | Funktion / Trigger | Bedingung |
|---|-------|-------------------|-----------|
| 1 | 677–686 | `openAdoptDialog` | Footer-Button „Diese Variante übernehmen“; `selectedOption?.impact` und `strategyType !== 'current'` |
| 2 | 689–698 | `openAdoptDialogForOption(opt)` | Übernahme-Button in OptionCard (Zeile 812) oder via `onAdoptOption` (Zeile 847) für `opt.strategyType !== 'current'` |

**Beleg:** `setShowAdoptConfirm(true)` wird nur in diesen beiden Callbacks aufgerufen (Zeilen 686, 698). Es gibt keine weiteren Stellen.

### 1.2 OptimizationComparisonBlock (nicht gerendert)

| # | Zeile | Trigger |
|---|-------|---------|
| 3 | 1067 | Footer-Button „Diese Variante übernehmen“ |

**Beleg:** `OptimizationComparisonBlock` wird im Hauptprojekt **nicht** gerendert. Grep findet keine Verwendung von `<OptimizationComparisonBlock`. Die Komponente existiert nur als Dead Code.

---

## 2. Datenübergabe beim Öffnen des Dialogs

### 2.1 Pfad 1: `openAdoptDialog` (Zeilen 677–686)

```typescript
setAdoptDialogOption({
  plan: selectedOption.plan,
  result: selectedOption.result,
  financialDelta: selectedOption.impact.financialDelta,
  durationDelta: selectedOption.impact.durationDelta,
});
setShowAdoptConfirm(true);
```

- **Quelle:** `selectedOption` (aktuelle Option aus `decisionSteps`)
- **adoptDialogOption:** wird gesetzt; Felder: `plan`, `result`, `financialDelta`, `durationDelta`

### 2.2 Pfad 2: `openAdoptDialogForOption(opt)` (Zeilen 689–698)

```typescript
setAdoptDialogOption({
  plan: opt.plan,
  result: opt.result,
  financialDelta: opt.impact.financialDelta,
  durationDelta: opt.impact.durationDelta,
});
setShowAdoptConfirm(true);
```

- **Quelle:** `opt` (Argument, die gewählte DecisionOption)
- **adoptDialogOption:** wird gesetzt; Felder: `plan`, `result`, `financialDelta`, `durationDelta`

---

## 3. Alle Datenquellen im AdoptConfirmDialog (StepOptimizationBlock)

| Feld | Primäre Quelle | Fallback | Code-Stelle |
|------|----------------|----------|-------------|
| **plan** (onConfirm) | `adoptDialogOption?.plan` | `finalResolvedPlan` | Zeile 729 |
| **result** (optimizedResult) | `adoptDialogOption?.result` | `finalResolvedResult` | Zeile 738 |
| **deltaTotal** | `adoptDialogOption?.financialDelta` | `0` | Zeile 741 |
| **deltaDuration** | `adoptDialogOption?.durationDelta` | `0` | Zeile 742 |
| **currentResult** | `stepContext.derivedPlanAfterStep[i]?.result` oder `result` | – | Zeilen 733–737 |

---

## 4. Herkunft jeder Datenquelle

### 4.1 plan (für onAdoptOptimization)

| Quelle | Herkunft | Verwendet wenn |
|--------|----------|----------------|
| `adoptDialogOption.plan` | `selectedOption.plan` / `opt.plan` beim Öffnen | `adoptDialogOption` gesetzt und `adoptDialogOption.plan` truthy |
| `finalResolvedPlan` | `stepContext.finalResolvedPlan` (aus `buildStepDecisionContext`) | `adoptDialogOption?.plan` ist `null` oder `undefined` |

### 4.2 result (optimizedResult)

| Quelle | Herkunft | Verwendet wenn |
|--------|----------|----------------|
| `adoptDialogOption.result` | `selectedOption.result` / `opt.result` | `adoptDialogOption` gesetzt und `adoptDialogOption.result` truthy |
| `finalResolvedResult` | `stepContext.finalResolvedResult` | `adoptDialogOption?.result` ist `null` oder `undefined` |

### 4.3 deltaTotal / deltaDuration

| Quelle | Herkunft | Verwendet wenn |
|--------|----------|----------------|
| `adoptDialogOption.financialDelta` | `selectedOption.impact.financialDelta` / `opt.impact.financialDelta` | `adoptDialogOption` gesetzt |
| `0` | Literal | Fallback bei `adoptDialogOption` null/undefined |

---

## 5. Verwendung von `finalResolvedPlan` im normalen Übernahme-Flow

### 5.1 Wird `finalResolvedPlan` genutzt?

**Ja, als Fallback im Code.** Ausdruck in Zeile 729:

```typescript
const plan = adoptDialogOption?.plan ?? finalResolvedPlan;
```

### 5.2 Wann greift der Fallback in der Praxis?

Der Fallback greift nur, wenn `adoptDialogOption?.plan` falsy ist.

**Szenario A – beide Öffnungspfade:**  
`openAdoptDialog` und `openAdoptDialogForOption` setzen `adoptDialogOption` mit `plan` **vor** `setShowAdoptConfirm(true)`. `DecisionOption.plan` ist laut Interface (decisionContext.ts, Zeile 69) required: `plan: ElterngeldCalculationPlan`.

**Szenario B – onConfirm:**  
Beim Klick auf „Vorschlag übernehmen“ wird `onConfirm()` vor `onClose()` ausgeführt (Zeilen 572–574). `adoptDialogOption` wird erst in `closeAdoptDialog` auf `null` gesetzt, also nach dem Confirm-Klick. Zwischen Öffnen und Klick wird `adoptDialogOption` nicht anderweitig zurückgesetzt.

**Codepfad-Beleg:**  
Es gibt keinen Einstieg, der den Dialog öffnet, ohne vorher `adoptDialogOption` zu setzen. `setShowAdoptConfirm(true)` wird ausschließlich in `openAdoptDialog` und `openAdoptDialogForOption` aufgerufen, und beide rufen zuvor `setAdoptDialogOption` auf.

**Fazit:** Unter den aktuellen Codepfaden wird `finalResolvedPlan` im normalen Übernahme-Flow **nicht** verwendet. Der Fallback ist funktional toter Code, bleibt aber als zweite konzeptionelle Datenquelle im Quelltext bestehen.

---

## 6. Validation gegen die Regeln

| Regel | Status | Beleg |
|-------|--------|-------|
| **R1 – Eine Quelle der Wahrheit** | Verletzt | Es existieren zwei Quellen im Code: `adoptDialogOption` und `finalResolvedPlan` (bzw. `finalResolvedResult`). |
| **R2 – Kein stiller Fallback** | Erfüllt | Der Fallback wird im normalen Flow nicht genutzt. Damit ist R2 erfüllt. |
| **R3 – Nachweis statt Annahme** | Erfüllt | Alle Aussagen sind auf konkrete Codepfade und Stellen (Zeilen) gestützt. |
| **R4 – Vollständigkeit** | Erfüllt | `OptimizationComparisonBlock` ist im Hauptprojekt nicht gerendert; es gibt keine versteckten alternativen Einstiege für den Übernahme-Flow. |

---

## 7. Klare Aussage

**Es existieren mehrere Datenquellen (im Sinne des Quellcodes).**

- Es gibt **zwei** konzeptionelle Quellen für `plan` und `result`:  
  - `adoptDialogOption` (primär)  
  - `finalResolvedPlan` / `finalResolvedResult` (Fallback)
- **Im tatsächlichen Ablauf** wird nur `adoptDialogOption` genutzt.
- Der Fallback zu `finalResolvedPlan` / `finalResolvedResult` ist im aktuellen System **nicht erreichbar**, stellt aber eine zweite Quelle im Code dar und verletzt damit R1 („Eine Quelle der Wahrheit“).

---

## 8. Exakte Stellen bei mehreren Quellen

| Datenquelle | Datei | Zeile | Kontext |
|-------------|-------|-------|---------|
| Fallback `finalResolvedPlan` | `StepCalculationResult.tsx` | 729 | `const plan = adoptDialogOption?.plan ?? finalResolvedPlan;` |
| Fallback `finalResolvedResult` | `StepCalculationResult.tsx` | 738 | `optimizedResult={adoptDialogOption?.result ?? finalResolvedResult}` |
| Definition `finalResolvedPlan` | `stepDecisionFlow.ts` | 50, 502 | `finalResolvedPlan: ElterngeldCalculationPlan` |
| Definition `finalResolvedResult` | `stepDecisionFlow.ts` | 51, 503 | `finalResolvedResult: CalculationResult` |

---

## 9. Zusammenfassung

- **Öffnungspfade:** Es gibt zwei relevante Pfade im aktiven Code: `openAdoptDialog` und `openAdoptDialogForOption`. Beide setzen `adoptDialogOption` vor dem Öffnen des Dialogs.
- **OptimizationComparisonBlock:** Komponente mit eigenem Dialog ist im Hauptprojekt nicht eingebunden (Dead Code).
- **Datenquellen:** Im Code sind zwei Quellen vorhanden (`adoptDialogOption` und `finalResolvedPlan`/`finalResolvedResult`), praktisch greift jedoch nur `adoptDialogOption`.
- **Regel R1:** Der Quellcode enthält weiterhin mehrere Datenquellen; R1 ist daher nicht vollständig erfüllt.
