# Ursachenanalyse: Warum keine Varianten mit längerer Bezugsdauer (z. B. 24 Monate) im Overlay erscheinen

**Stand:** Faktenbasiert, nur Code-Analyse, keine Fixes.

---

## 1. Kandidatenerzeugung pro Ziel

### 1.1 longerDuration – Datenquellen

**Datei:** `elterngeldOptimization.ts`  
**Funktion:** `generateMutationCandidates` (Zeilen 991–1017)

Für `goal === 'longerDuration'` werden nur zwei Quellen aufgerufen:

1. **addReferenceConfigCandidates** (Zeile 1004) – Referenz-Konfigurationen
2. **addAlternativeCandidates** (Zeile 1005)
3. **addBasisToPlusCandidates** (Zeile 1016)

### 1.2 addReferenceConfigCandidates – einzige Quelle für ~20–24 Monate

**Datei:** `elterngeldOptimization.ts` Zeilen 463–555

| Config | Voraussetzung | Dauerbereich |
|--------|---------------|--------------|
| motherOnlyBasis | immer | 2–14 Monate (DURATIONS_BASIS) |
| motherOnlyPlus | immer | 2–24 Monate (DURATIONS_PLUS) |
| bothBasis | `parentB && parentB.incomeBeforeNet > 0` | 2–14 Monate |
| bothPlus | wie oben | 2–24 Monate |
| bothPlusWithBonus | wie oben | 4–24 Monate |

**Längere Bezugsdauer (20–24 Monate)** kann nur von `motherOnlyPlus`, `bothPlus` bzw. `bothPlusWithBonus` stammen.

**Bestimmung des „besten“ Kandidaten pro Szenario** (Zeilen 499–525):

- `updateIfBetter('longerDuration', duration > 0)` – längste Dauer wird als bestes longerDuration-Szenario gewählt
- Round-Robin ergänzt Varianten mit Dauer an Index 0, 11, 22 (also 2, 13, 24 Monate)

**Abbruchbedingungen:**

- `createReferencePlan` liefert `null` (z. B. `parentA.incomeBeforeNet <= 0`, `!parentB` für both-Configs)
- `res.validation.isValid === false` (Zeilen 487, 545)

### 1.3 addBasisToPlusCandidates – nur moderate Verlängerung

**Datei:** `elterngeldOptimization.ts` Zeilen 1064–1127

- Verwendet nur Monate mit `mode === 'basis'`.
- Wenn keine Basis-Monate vorhanden sind: `basisEntries = []` → keine Kandidaten.
- Es werden nur 1 oder 2 Basis-Monate zu Plus umgewandelt.
- Ergebnis: moderate Verlängerung (z. B. 12 → 14 Monate), keine 20–24 Monate.

### 1.4 addAlternativeCandidates

**Datei:** `elterngeldOptimization.ts` Zeilen 610–668

- Baut Varianten aus dem aktuellen Plan (motherOnly, bothBalanced, withoutPartTime, withPartTime).
- Keine neuen Laufzeiten wie 20–24 Monate, eher ähnliche Dauer wie der Ist-Plan.

---

## 2. Filterung in stepDecisionFlow

**Datei:** `stepDecisionFlow.ts` Zeilen 419–426

```ts
if (step1Choice?.strategyType === 'motherOnly' && optB > 0) continue;
if (step1Choice?.strategyType === 'bothBalanced' && (optA === 0 || optB === 0)) continue;
```

| step1Choice.strategyType | Auswirkung |
|--------------------------|------------|
| motherOnly | Varianten mit Partner-Monaten (optB > 0) werden ausgeschlossen → `bothPlus`, `bothPlusWithBonus` fallen raus |
| bothBalanced | Varianten mit nur einem Elternteil (optA = 0 oder optB = 0) werden ausgeschlossen → `motherOnlyPlus` fällt raus |
| current | Keine Zusatzfilterung |

**Folge:** Abhängig von `step1Choice` bleiben entweder nur motherOnly-Varianten oder nur bothBalanced/withPartTime-Varianten erhalten – nie beide Typen gleichzeitig.

---

## 3. Auswahl in step3Suggestions

**Datei:** `stepDecisionFlow.ts` Zeilen 476–537

- Pro Ziel werden maximal 2 Kandidaten übernommen.
- Bevorzugt werden neue `strategyType`s (z. B. motherOnly vs. bothBalanced).
- Wenn maxMoney bereits bothBalanced liefert, kann longerDuration mit strategyType bothBalanced übersprungen werden (Zeilen 488–489).
- Gesamtlimit: 6 Varianten.

**Mögliche Effekte:**

- longerDuration-Varianten mit bereits vertretenem `strategyType` landen erst im Fallback-Loop.
- Wenn dort schon 6 Varianten erreicht sind, werden sie nicht mehr ergänzt.

---

## 4. Filterung in buildDecisionContext

**Datei:** `decisionContext.ts` Zeilen 508–534

- `seenKeys` (planFingerprint) – Duplikate nach Plan-Signatur
- `resultsAreEqual` – identische Ergebnisse
- `resultsAreSemanticallyEquivalent` – u. a. gleiche Dauer (`durA !== durB` → nicht äquivalent, Zeile 174)
- `shouldShowVariant` – Varianten mit höherem Total oder anderer Dauer werden grundsätzlich angezeigt (Zeile 186–187)

`resultsAreSemanticallyEquivalent` filtert keine Varianten mit abweichender Laufzeit, solange Total, Dauer oder Bonus differieren.

---

## 5. Mögliche Ursachen im Überblick

### A) Kandidaten werden nicht erzeugt

| Stelle | Bedingung |
|--------|-----------|
| `createReferencePlan` | `parentA.incomeBeforeNet <= 0` → `null` (Zeile 353) |
| `createReferencePlan` | both-Configs: `!parentB` oder `parentB.incomeBeforeNet <= 0` → `null` (Zeile 386) |
| `addReferenceConfigCandidates` | `!res.validation.isValid` → Kandidat wird verworfen (Zeilen 487, 545) |
| `addBasisToPlusCandidates` | Keine Monate mit `mode === 'basis'` → keine Kandidaten |

### B) Kandidaten werden erzeugt, aber verworfen

| Stelle | Bedingung |
|--------|-----------|
| stepDecisionFlow, Zeilen 423–425 | step1Choice = motherOnly → alle Varianten mit optB > 0 (bothPlus, bothPlusWithBonus) werden herausgefiltert |
| stepDecisionFlow, Zeilen 423–425 | step1Choice = bothBalanced → motherOnlyPlus (optB = 0) wird herausgefiltert |
| stepDecisionFlow, Zeilen 476–537 | longerDuration hat nur beide oder nur motherOnly, und die 6 Plätze sind durch andere Ziele bereits belegt |

### C) Strategie-Kollision im step3Suggestions-Loop

- longerDuration liefert z. B. bothBalanced (24 Monate).
- maxMoney oder partnerBonus liefern ebenfalls bothBalanced.
- Beim ersten Durchlauf (neue strategyTypes) wird bothBalanced für longerDuration übersprungen (Zeile 489).
- Im zweiten Durchlauf wird ein beliebiger distinct-Plan ergänzt – wenn die Reihenfolge oder das Limit ungünstig ist, kann die 24-Monats-Variante fehlen.

---

## 6. Typischer kritischer Pfad

1. **step1Choice = bothBalanced** (aktueller Plan mit beiden Eltern)
2. motherOnlyPlus (potenziell 24 Monate) hat `optB = 0` → wird durch den bothBalanced-Filter entfernt (Zeile 424).
3. Es bleiben nur bothPlus und bothPlusWithBonus für längere Dauer.
4. Wenn `!parentB` oder `parentB.incomeBeforeNet <= 0`, werden bothPlus/bothPlusWithBonus in `createReferencePlan` gar nicht erzeugt (Zeile 386) → keine langen both-Varianten.

Oder:

1. **step1Choice = motherOnly**
2. bothPlus und bothPlusWithBonus haben `optB > 0` → werden durch den motherOnly-Filter entfernt (Zeile 423).
3. Es bleiben nur motherOnlyPlus für längere Dauer.
4. motherOnlyPlus kann 24 Monate liefern, falls Referenz-Konfigurationen gültig sind und nicht durch `validation.isValid` fallen.

---

## 7. Konkrete Code-Stellen

| Thema | Datei | Zeilen |
|-------|-------|--------|
| Erzeugung langer Varianten (20–24 Monate) | `elterngeldOptimization.ts` | 463–555 (addReferenceConfigCandidates) |
| Bedingung für both-Configs | `elterngeldOptimization.ts` | 471–472, 386 |
| Validierungsfilter | `elterngeldOptimization.ts` | 487, 545 |
| Filter motherOnly (optB > 0) | `stepDecisionFlow.ts` | 423–424 |
| Filter bothBalanced (optA/optB = 0) | `stepDecisionFlow.ts` | 424–425 |
| Auswahl/Deduplizierung strategyType | `stepDecisionFlow.ts` | 482–506, 517–537 |
| addBasisToPlus (keine 24-Monats-Pläne) | `elterngeldOptimization.ts` | 1064–1127 |

---

## 8. Kurzfassung

- **Erzeugung:** Länger laufende Varianten (20–24 Monate) kommen ausschließlich aus `addReferenceConfigCandidates` (motherOnlyPlus, bothPlus, bothPlusWithBonus). `addBasisToPlusCandidates` erzeugt nur moderate Verlängerungen.
- **Wenn keine solchen Varianten ankommen, sind die wahrscheinlichsten Ursachen:**
  1. **step1Choice-Filter:** motherOnly schließt both-Varianten aus, bothBalanced schließt motherOnlyPlus aus.
  2. **createReferencePlan:** both-Configs werden nicht erzeugt, wenn kein Partner oder `incomeBeforeNet <= 0`.
  3. **Validierung:** `res.validation.isValid === false` verhindert die Übernahme der Referenz-Pläne.
- **Wenn Varianten erzeugt, aber nicht angezeigt werden:** Die step3Suggestions-Logik (max. 2 pro Ziel, max. 6 gesamt, Bevorzugung neuer strategyTypes) kann dazu führen, dass longerDuration-Kandidaten durch andere Ziele verdrängt werden.
