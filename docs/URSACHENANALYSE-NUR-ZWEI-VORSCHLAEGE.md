# Ursachenanalyse: Warum werden trotz szenariobasierter Auswahl nur zwei ähnliche Vorschläge angezeigt?

**Stand:** Auf Basis des aktuellen Codes (ohne Vermutungen, ohne Fixes).

---

## 0. Runtime-Diagnose (DEV)

Im Entwicklungsmodus (`npm run dev`) wurden Diagnose-Logs ergänzt. In der Browser-Konsole erscheinen:

| Log-Prefix | Inhalt |
|------------|--------|
| `[stepDecisionFlow] Kandidaten pro Ziel` | Pro Ziel (maxMoney, longerDuration, frontLoad, partnerBonus): Anzahl valider Kandidaten, erste 5 mit strategyType, total, duration, planFingerprint-Ausschnitt |
| `[stepDecisionFlow] step3Suggestions` | Nach Deduplizierung in stepDecisionFlow: Anzahl und Liste (goal, strategyType, total, duration) |
| `[stepDecisionFlow] step3Ctx.options (nach buildDecisionContext)` | Anzahl Optionen nach buildDecisionContext (inkl. „Aktueller Plan“) |
| `[buildDecisionContext] Gefilterte Suggestions` | Welche Suggestions gefiltert wurden und warum: `seenKeys`, `resultsAreEqual`, `resultsAreSemanticallyEquivalent`, `shouldShowVariant`, `isTrueDuplicate` |

**Vorgehen zur faktenbasierten Analyse:**
1. PWA im Dev-Modus starten
2. Wizard durchlaufen bis „Varianten vergleichen“
3. Ziel wählen, „Varianten vergleichen“ klicken
4. Browser-Konsole öffnen (F12)
5. Logs auswerten:
   - `Kandidaten pro Ziel`: Sind pro Ziel genug Kandidaten da (count > 0)?
   - `step3Suggestions`: Wie viele nach stepDecisionFlow-Deduplizierung?
   - `Gefilterte Suggestions`: Welcher Filter entfernt welche Suggestion?
   - Wenn step3Suggestions z. B. 4 enthält, aber buildDecisionContext nur 2 Optionen liefert → Filter in buildDecisionContext ist Ursache

---

## 1. Datenfluss-Übersicht

```
buildOptimizationResult(plan, result, goal)
    → findCandidates → generateMutationCandidates (zielabhängig)
    → selectTop3(candidates, goal)  [max 3 Kandidaten, szenariobasiert]
    → candidateToSuggestion (pro Kandidat)
    → suggestions[]  (an OptimizationResultSet)

StepCalculationResult nutzt StepOptimizationBlock
    → buildStepDecisionContext (stepDecisionFlow)
        → Schritt 1: Verteilung (current, motherOnly, bothBalanced)
        → Schritt 2: Teilzeit (ohne/mit Partnerschaftsbonus) – wenn relevant
        → Schritt 3: Optimierungsziel (maxMoney, longerDuration, frontLoad, partnerBonus)
            → pro Ziel: buildOptimizationResult(plan, result, goal)
            → addIfBestForGoal: NUR 1 beste Variante pro Ziel
            → step3ResultSet.suggestions = bestPerGoal.values()
            → buildDecisionContext(step3ResultSet)
                → für jede suggestion: Filter (shouldShowVariant, resultsAreSemanticallyEquivalent, …)
                → options[] (an UI)
```

---

## 2. Wo werden Kandidaten erzeugt?

### 2.1 elterngeldOptimization.ts – generateMutationCandidates

**Datei:** `src/modules/documents/elterngeld/calculation/elterngeldOptimization.ts` (ca. Zeilen 991–1046)

| Goal          | Immer aufgerufen                           | Zusätzlich zielabhängig                  |
|---------------|--------------------------------------------|------------------------------------------|
| maxMoney      | addReferenceConfigCandidates, addAlternativeCandidates | addShiftBetweenParentsCandidates, addPlusToBasisCandidates |
| longerDuration| addReferenceConfigCandidates, addAlternativeCandidates | addBasisToPlusCandidates                  |
| partnerBonus  | addReferenceConfigCandidates, addAlternativeCandidates | addPartnerBonusOverlapCandidates, tryAddPartnerBonus |
| frontLoad     | addReferenceConfigCandidates, addAlternativeCandidates | addFrontLoadCandidates                    |

**addReferenceConfigCandidates** (Zeilen 473–568) liefert pro Szenario-Typ den besten Kandidaten:
- maxMoney, longerDuration, frontLoad, partnerBonus
- Plus Round-Robin für Diversität (Indizes 0, Mitte, maxLen-1)

**Kandidaten haben kein explizites Attribut `scenarioType`.** Ein Kandidat kann für mehrere Szenarien „bester“ sein (z.B. withPartTime für maxMoney und partnerBonus).

---

## 3. Kandidaten-Auswahl: selectTop3

**Datei:** `src/modules/documents/elterngeld/calculation/elterngeldOptimization.ts` (Zeilen 938–984)

### Deduplizierung (vor Szenario-Auswahl)

1. **planFingerprint** (Zeile 1048): `parent.months` → `"month:mode,..."` pro Eltern
2. **resultFingerprint** (Zeilen 911–918): `total-duration-bonus-strategy-frontLoad`
3. Kandidaten mit gleichem `planFingerprint` ODER gleichem `resultFingerprint` werden verworfen

### Szenariobasierte Auswahl

- `bestForScenario(deduped, scenario)` ermittelt pro Szenario den besten Kandidaten
- Reihenfolge: zuerst gewähltes Ziel, dann andere (maxMoney, longerDuration, frontLoad, partnerBonus)
- Pro Szenario max. 1 Kandidat, insgesamt max. MAX_SUGGESTIONS (= 3)
- Zusätzlich: bothBalanced wird explizit einbezogen, wenn noch Platz und noch keiner in result

**Folge:** Wenn z.B. withPartTime für maxMoney und partnerBonus jeweils bester ist, erscheint er nur einmal. Es können effektiv nur 2–3 unterschiedliche Kandidaten übrig bleiben.

---

## 4. Step-basierter Flow – Schritt 3

**Datei:** `src/modules/documents/elterngeld/calculation/stepDecisionFlow.ts` (Zeilen 398–450)

### Ablauf

1. Für jedes Ziel (`maxMoney`, `longerDuration`, `frontLoad`, evtl. `partnerBonus`) wird `buildOptimizationResult(currentPlan, currentResult, goal)` aufgerufen.
2. `addIfBestForGoal(s, goal)` behält pro Ziel genau eine Variante:
   - maxMoney: höchste `householdTotal`
   - longerDuration: größte Bezugsdauer
   - frontLoad: höchster `deltaValue` (FrontLoad-Score-Differenz)
   - partnerBonus: höchste Summe, bei Gleichstand mehr Bonus-Monate
3. `step3ResultSet.suggestions = [...bestPerGoal.values()]` → maximal 4 Einträge (einer pro Ziel).
4. `step3ResultSet.goal` ist fest auf `'maxMoney'` gesetzt (Zeile 401).

### Einschränkung durch „beste pro Ziel“

- Mehrere Szenarien können auf denselben Plan zeigen: z.B. withPartTime für maxMoney und partnerBonus.
- In diesem Fall: bestPerGoal enthält nur einen Eintrag mit diesem Plan (der jeweils zuletzt gesetzte überschreibt).
- Ergebnis: weniger als 4 unterschiedliche Vorschläge.

---

## 5. buildDecisionContext – Filter vor Anzeige

**Datei:** `src/modules/documents/elterngeld/calculation/decisionContext.ts` (Zeilen 486–534)

Jede Suggestion durchläuft:

| Prüfung                                   | Zeile | Aktion wenn true        |
|-------------------------------------------|-------|---------------------------|
| `seenKeys.has(key)`                       | 489   | skip                      |
| `resultsAreEqual(currentResult, s.result)` | 491 | skip                      |
| `resultsAreSemanticallyEquivalent(currentResult, s.result)` | 492 | skip |
| `!shouldShowVariant(s, currentResult, goal)` | 493 | skip                  |
| `isDuplicateOfExisting`                    | 494–497 | skip                   |

---

## 6. shouldShowVariant – zentrale Filterlogik

**Datei:** `src/modules/documents/elterngeld/steps/optimizationExplanation.ts` (Zeilen 170–190)

```ts
if (optimizedTotal >= currentTotal) return true;
if (optimizedDuration !== currentDuration) return true;

const advantage = getExplainableAdvantageWhenSameDurationLessTotal(...);
return advantage !== null;
```

### Bedeutung

- Zeigen: wenn mindestens eine Bedingung erfüllt ist:
  - höhere Summe, oder
  - andere Bezugsdauer, oder
  - ein erkennbarer Vorteil bei gleicher Dauer und weniger Geld (aus `getExplainableAdvantageWhenSameDurationLessTotal`).
- Verwerfen: bei gleicher Dauer, weniger Geld und keinem erkennbaren Vorteil.

### Wichtiger Kontext in Schritt 3

`buildDecisionContext` wird mit `step3ResultSet` aufgerufen, der `goal: 'maxMoney'` hat. Dadurch wird `shouldShowVariant(s, currentResult, 'maxMoney')` für alle Suggestions aufgerufen – auch für solche aus longerDuration, frontLoad, partnerBonus.

- Eine longerDuration-Variante mit mehr Monaten, weniger Geld: `optimizedDuration !== currentDuration` → gezeigt.
- Eine frontLoad-Variante mit gleicher Dauer, weniger Geld: hängt von `getExplainableAdvantageWhenSameDurationLessTotal` ab (z.B. höhere Zahlung in den ersten 6 Monaten).

---

## 7. resultsAreSemanticallyEquivalent – zusätzliche Deduplizierung

**Datei:** `src/modules/documents/elterngeld/calculation/decisionContext.ts` (Zeilen 144–168)

Zwei Ergebnisse gelten als äquivalent, wenn:

- |totalA − totalB| ≤ 2 €
- gleiche Bezugsdauer
- gleiche Anzahl Bonus-Monate
- gleiche Verteilung (Bezug pro Elternteil)
- gleiche kanonische Plan-Signatur (`getCanonicalPlanSignature`)

**Auswirkung:** Verschiedene Pläne mit fast gleichem Ergebnis (Summe, Dauer, Bonus, Verteilung) werden als Duplikat behandelt und einer davon wird nicht angezeigt.

---

## 8. Übersicht: Wo gehen Szenarien verloren?

| Ursache                            | Ort                                | Art              |
|------------------------------------|------------------------------------|------------------|
| Mehrere Szenarien → derselbe Plan  | selectTop3 / bestForScenario       | dedupliziert     |
| Nur 1 Variante pro Ziel            | stepDecisionFlow addIfBestForGoal   | bewusst reduziert|
| Szenario überschreibt anderes      | stepDecisionFlow bestPerGoal        | überschrieben    |
| Gleiche Dauer, weniger Geld, kein Vorteil | shouldShowVariant              | weggefiltert     |
| Ähnliches Ergebnis                 | resultsAreSemanticallyEquivalent   | dedupliziert     |
| Gleiches Ergebnis zu bestehendem   | isDuplicateOfExisting              | dedupliziert     |

---

## 9. Konkrete Verluststellen

### 9.1 Nicht erzeugt

- Nein: Für alle vier Ziele werden Kandidaten erzeugt (addReferenceConfigCandidates + zielabhängige Generatoren).

### 9.2 Dedupliziert (planFingerprint / resultFingerprint)

- **Datei:** `elterngeldOptimization.ts`, Zeilen 946–952  
- Gleiche Pläne oder gleiche Kennzahlen (total, duration, bonus, strategy, frontLoad) werden entfernt.

### 9.3 Ausgewählt, aber überschrieben in Schritt 3

- **Datei:** `stepDecisionFlow.ts`, Zeilen 416–431  
- `addIfBestForGoal` speichert pro Ziel nur einen Eintrag in `bestPerGoal`.  
- Wenn ein Plan für mehrere Ziele „bester“ ist (z.B. maxMoney und partnerBonus), bleibt nur der letzte Eintrag.

### 9.4 Weggefiltert (shouldShowVariant)

- **Datei:** `optimizationExplanation.ts`, Zeilen 170–190  
- Varianten mit gleicher Dauer und weniger Geld werden nur gezeigt, wenn ein erklärbarer Vorteil existiert.  
- Kann z.B. frontLoad-Varianten entfernen, wenn keine der definierten Vorteile vorliegt.

### 9.5 Dedupliziert (resultsAreSemanticallyEquivalent / isDuplicateOfExisting)

- **Datei:** `decisionContext.ts`, Zeilen 489–497  
- Ähnliche oder nahezu identische Ergebnisse werden als eine Option behandelt.

### 9.6 Nicht gerendert

- Die UI (StepOptimizationBlock, OptionCard) rendert alle Einträge in `options` aus `buildDecisionContext`.  
- Kein weiterer Filter in der Darstellung. Verluste entstehen ausschließlich vorher in der Auswahl- und Filterlogik.

---

## 10. Fazit

**Warum nur zwei ähnliche Vorschläge sichtbar sind:**

1. **Schritt 3 behält pro Ziel nur eine Variante** – dadurch kann sich die Anzahl schnell auf 2–3 reduzieren.
2. **Gleicher Plan für mehrere Ziele** (z.B. maxMoney und partnerBonus) → nur ein Eintrag in `bestPerGoal`.
3. **resultsAreSemanticallyEquivalent / isDuplicateOfExisting** entfernen Pläne mit sehr ähnlichen Kennzahlen.
4. **shouldShowVariant** filtert Varianten mit gleicher Dauer und weniger Geld, wenn kein erkennbarer Vorteil gefunden wird.

Die szenariobasierte Auswahl in `selectTop3` liefert pro Aufruf von `buildOptimizationResult` bis zu 3 verschiedene Szenarien. Im Step-Flow wird diese Vielfalt danach durch „beste pro Ziel“ und die Filter in `buildDecisionContext` wieder reduziert, sodass oft nur zwei erkennbar verschiedene Vorschläge (meist mit Fokus auf höhere Gesamtauszahlung) übrig bleiben.
