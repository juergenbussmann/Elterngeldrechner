# Render-Pfad des sichtbaren Overlay-Screens „Aufteilung prüfen“

**Stand:** Faktenbasiert, ausschließlich realer sichtbarer Pfad.

---

## 1. Welche Datei rendert den sichtbaren Screen?

**Datei:** `src/modules/documents/elterngeld/steps/OptimizationOverlay.tsx`

**Bedingung:** `view === 'strategy'` (nach Klick auf „Varianten vergleichen“)

**Struktur:**
```
OptimizationOverlay (view === 'strategy')
  └── Modal title="Aufteilung prüfen"
        └── div.elterngeld-optimization-overlay-content
              └── StepOptimizationBlock (aus StepCalculationResult.tsx)
```

---

## 2. Konkrete JSX-Stelle(n) des Zurück-Buttons

### Haupt-Stelle (immer sichtbar beim Öffnen)

**Datei:** `src/modules/documents/elterngeld/steps/OptimizationOverlay.tsx`  
**Zeilen:** ca. 98–107

**Ort:** Direkt am Anfang von `elterngeld-optimization-overlay-content`, **vor** `StepOptimizationBlock` – als erste sichtbare Aktion beim Öffnen von „Varianten vergleichen“.

**Code:**
```jsx
<div className="elterngeld-optimization-overlay__back-row">
  <Button type="button" variant="ghost" className="btn--softpill" onClick={() => setView('entry')}>
    ← Zurück zur Zielauswahl
  </Button>
</div>
```

**Grund:** Der Button sitzt im **aufrufenden Overlay**, nicht in der Kindkomponente. So ist er direkt im real sichtbaren Pfad und beim ersten Öffnen sichtbar, bevor der Nutzer scrollt.

### Zusätzliche Stelle (unten, bei den anderen Aktionen)

**Datei:** `src/modules/documents/elterngeld/steps/StepCalculationResult.tsx`  
**Zeilen:** 907–912

**Ort:** Innerhalb von `elterngeld-calculation__optimization-actions-secondary` – zusammen mit „Zur Monatsübersicht“ und „Optimierung schließen“.

**Durchreichung:** `OptimizationOverlay` übergibt `onBackToGoalSelection={() => setView('entry')}` an `StepOptimizationBlock`.

---

## 3. Datenquelle der sichtbaren Vorschläge

**Datei:** `src/modules/documents/elterngeld/steps/StepCalculationResult.tsx`  
**Zeilen:** 849–864

```jsx
<div className="elterngeld-calculation__suggestion-list" role="list">
  {step.stepOptions.map((opt, optIdx) => (
    <OptionCard key={opt.id} opt={opt} ... />
  ))}
</div>
```

**Datenquelle:** `step.stepOptions` aus `decisionSteps[currentStepIndex]`. Kein `slice`, kein `limit`, kein `maxItems` – alle Optionen werden gerendert.

**Abstammung von `stepOptions`:**

1. `buildStepDecisionContext(plan, result, opts)` → `stepDecisionFlow.ts`
2. `step3OptionsFinal` = `step3Ctx.options` aus `buildDecisionContext(step3ResultSet)`
3. `step3ResultSet.suggestions` = `step3Suggestions` (Auswahl in `stepDecisionFlow`)

---

## 4. Warum nur zwei Vorschläge sichtbar sind

**Begrenzung vor dem Render (exakte Stellen):**

| Stufe | Datei | Zeilen | Art |
|-------|-------|--------|-----|
| 1 | `stepDecisionFlow.ts` | 461–532 | `step3Suggestions`: Pro Ziel max. 1 Kandidat im ersten Durchlauf (Zeilen 472–497). Zweiter Durchlauf bis max. 6 (Zeilen 502–532). Strategie-Vielfalt bevorzugt – identische `strategyType` werden übersprungen. |
| 2 | `stepDecisionFlow.ts` | 548–556 | `step3OptionsFinal` = `step3Ctx.options` aus `buildDecisionContext`. Optional „Aktueller Plan“ wird vorangestellt. |
| 3 | `decisionContext.ts` | `buildDecisionContext` | Filter: `seenKeys`, `resultsAreEqual`, `resultsAreSemanticallyEquivalent`, `shouldShowVariant`, `isTrueDuplicate`. Reduziert die Anzahl weiter. |
| 4 | `elterngeldOptimization.ts` | `selectTop3` | Pro Ziel max. 3 Suggestions – limitiert die Eingabemenge für `stepDecisionFlow`. |

**Konkrete Ursache für nur zwei sichtbare Karten:**

- In `stepDecisionFlow.ts` Zeilen 472–497: Pro Ziel wird maximal ein Kandidat hinzugefügt. Wenn nur 2–3 Ziele (z. B. maxMoney, longerDuration, frontLoad) Pläne liefern und mehrere denselben `planFingerprint`/`strategyType` haben, bleiben oft nur 2 unterschiedliche Varianten übrig.
- Die Zeile `step.stepOptions.map(...)` in `StepCalculationResult.tsx` (849–864) rendert alle eingehenden Optionen – es gibt **kein** `slice` oder `limit` im Render. Die Begrenzung erfolgt ausschließlich **vor** dem Render in `buildStepDecisionContext` bzw. `buildDecisionContext`.

Ausführliche Analyse: `docs/URSACHENANALYSE-NUR-ZWEI-VORSCHLAEGE.md` (falls vorhanden)
