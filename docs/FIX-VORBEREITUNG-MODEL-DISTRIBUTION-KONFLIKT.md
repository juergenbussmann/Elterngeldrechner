# Fix-Vorbereitung: Konflikt benefitPlan.model ↔ benefitPlan.concreteMonthDistribution

**Stand:** Reine Analyse. Keine Implementierung. Keine Entscheidungen.

**Kontext:** Route `/documents/elterngeld`, Wizard. Bekannter Ist-Zustand: Umschalten (Basis/Plus/Gemischt) setzt nur `model`; bei gesetzter `concreteMonthDistribution` ignoriert `applicationToCalculationPlan` das `model` vollständig.

---

## 1. Alle Stellen, die concreteMonthDistribution verändern

### 1.1 Gesetzt (erzeugt/geschrieben)

| Stelle | Datei | Funktion | Code-Beleg |
|--------|------|----------|------------|
| Übernahme Optimierung | `planToApplicationMerge.ts` | `mergePlanIntoPreparation` | Zeilen 65, 104: `concreteMonthDistribution = extractMonthDistribution(plan, maxMonth)`; wird in `benefitPlan` geschrieben |

**Details mergePlanIntoPreparation:**
- Eingabe: `current: ElterngeldApplication`, `plan: ElterngeldCalculationPlan`
- `model` wird aus Plan abgeleitet: `hasPB \|\| hasPlus ? 'plus' : 'basis'` (Zeile 61)
- `maxMonth = model === 'plus' ? 24 : 14`
- `extractMonthDistribution(plan, maxMonth)` erzeugt Array mit Einträgen `{ month, modeA, modeB }`
- **Ersetzung:** Die bestehende Distribution wird vollständig ersetzt durch die neue aus dem Plan

**Aufrufer:**
- `ElterngeldWizardPage.tsx` Zeile 386–388: `onAdoptOptimization={(plan) => setValues((prev) => mergePlanIntoPreparation(prev, plan))}`
- `ElterngeldCalculationPage.tsx` Zeilen 201–202: `handleAdoptOptimization` → `mergePlanIntoPreparation(prep, plan)` → `savePreparation(merged)`

---

### 1.2 Gelöscht / zurückgesetzt (auf undefined)

| Stelle | Datei | Funktion | Code-Beleg |
|--------|------|----------|------------|
| Zuweisung einzelner Monate | `StepPlan.tsx` | `assignMonth` | Zeile 217: `const clearDistribution = { ...bp, concreteMonthDistribution: undefined };` – wird in alle vier Zweige (mother/partner/both/none) übernommen |
| Bestätigung Monats-Dialog | `StepPlan.tsx` | `handleConfirm` | Zeile 303: `let newBp = { ...bp, model: selectedModelInDialog, concreteMonthDistribution: undefined };` |

**Details assignMonth:**
- Aufgerufen bei Klick auf Mutter/Partner/Beide/Kein Bezug im Monats-Panel (Zeilen 628–632)
- `clearDistribution` wird in `benefitPlan` verwendet; zusätzlich werden `parentAMonths`, `parentBMonths`, `partnershipBonus` je nach `who` gesetzt
- **Ergebnis:** Distribution wird komplett entfernt; State wechselt auf Count-Logik

**Details handleConfirm:**
- Aufgerufen bei Klick auf „Übernehmen“ im Monats-Panel (Zeile 722)
- `newBp` startet mit `concreteMonthDistribution: undefined`
- Wenn `selectedApplyRange` und `currentState` gesetzt: `parentAMonths`, `parentBMonths`, `partnershipBonus` werden je nach Range angepasst
- Es wird **keine** neue Distribution aus dem Grid erzeugt – nur Counts werden gesetzt
- **Ergebnis:** Distribution wird gelöscht; State bleibt count-basiert

---

### 1.3 Gelesen / persistiert (keine Änderung der Semantik)

| Stelle | Datei | Funktion | Aktion |
|--------|------|----------|--------|
| Persistenz | `elterngeldPreparationStorage.ts` | `normalizeBenefitPlan` | Zeilen 81–91: Liest `concreteMonthDistribution` aus Rohdaten, normalisiert Einträge, fügt sie nur bei `length > 0` dem benefitPlan hinzu |

**Nicht eindeutig im Code:** Ob `savePreparation` die Distribution unverändert speichert oder transformiert – die Normalisierung betrifft nur das Laden.

---

## 2. Semantik der Distribution

### 2.1 Fachliche Bedeutung

- **elterngeldTypes.ts** Zeile 45–46: `/** Optionale konkrete Verteilung aus übernommener Variante. Hat Vorrang vor Count-Logik. */`
- **monthGridMappings.ts** Zeile 75: `Verwendet primär concreteMonthDistribution (übernommene Variante), Fallback: Count-Logik`

**Belegbar:** Die Distribution repräsentiert die monatliche Zuordnung (modeA, modeB) aus einer übernommenen Optimierungsvariante.

### 2.2 Wann gilt sie als maßgeblich?

- **applicationToCalculationPlan.ts** Zeilen 117–118:
  ```ts
  const dist = app.benefitPlan.concreteMonthDistribution;
  if (dist && dist.length > 0) {
  ```
- **monthGridMappings.ts** Zeilen 81–83:
  ```ts
  const dist = values.benefitPlan.concreteMonthDistribution;
  if (dist && dist.length > 0) {
  ```

**Belegbar:** Maßgeblich ist allein `dist && dist.length > 0`. Es gibt keine weitere Prüfung (z. B. Konsistenz mit `model`).

### 2.3 Implizite Regeln zum Verwerfen

Im Code existiert **keine** Logik, die die Distribution verwirft, wenn sich `model` ändert. Auch keine Kommentare dazu.

### 2.4 Differenzierung der Logik

- Es gibt nur eine binäre Verzweigung: `if (dist && dist.length > 0)` → Distribution-Pfad, sonst → Count-Pfad.
- Keine Graduierung oder Konflikterkennung zwischen `model` und Distribution.

---

## 3. Beziehung model ↔ Distribution im bestehenden Code

### 3.1 model → Distribution ableiten

- **Belegbar:** `mergePlanIntoPreparation` leitet `model` aus dem Plan ab (`hasPB || hasPlus ? 'plus' : 'basis'`) und setzt zusammen mit der Distribution. Es gibt keine Ableitung von `model` allein zur Distribution.

### 3.2 Distribution invalidieren bei Model-Änderung

- **Belegbar:** Keine Stelle setzt oder prüft `concreteMonthDistribution`, wenn sich `model` ändert.
- `update('model', …)` ändert nur `benefitPlan.model` und lässt die Distribution unverändert.

### 3.3 Gemeinsame Nutzung von model und Distribution

- **monthGridMappings.ts** Zeilen 84–88: `getMonthGridItemsFromDistribution(dist, values.benefitPlan.model, hasPartner, maxMonths)` – `model` wird nur für die Anzeige des `subLabel` verwendet (Zeile 47: „Plus“ vs. „Basis“ bei `state === 'both'` ohne Bonus), nicht für die Modi.
- **applicationToCalculationPlan.ts** Zeilen 117–171: Im Distribution-Pfad wird `model` für die Monatsmodi **nicht** genutzt; nur bei fehlendem zweitem Elternteil: `createMonths(0, 'none', model)` (Zeile 161).

---

## 4. Vergleich der bestehenden Reset-Mechanismen

### 4.1 assignMonth

| Aspekt | Verhalten |
|--------|-----------|
| Auslöser | Klick auf Mutter/Partner/Beide/Kein Bezug |
| Kontext | Monats-Panel offen, ein Monat ausgewählt |
| Änderung | `concreteMonthDistribution: undefined` + Setzen von `parentAMonths`, `parentBMonths`, `partnershipBonus` |
| Nach dem Reset | Count-Logik greift; `model` bleibt; `maxMonths` weiterhin abhängig von `model` |

**Code:** StepPlan.tsx Zeilen 212–261

### 4.2 handleConfirm

| Aspekt | Verhalten |
|--------|-----------|
| Auslöser | Klick auf „Übernehmen“ im Monats-Panel |
| Kontext | Monats-Panel offen, optional „Folgemonate übernehmen“ gewählt |
| Änderung | `concreteMonthDistribution: undefined`, `model: selectedModelInDialog`, optional Anpassung von Counts über Range |
| Unterschied zu assignMonth | Setzt auch `model` aus dem Dialog (`selectedModelInDialog`) |

**Code:** StepPlan.tsx Zeilen 301–355

### 4.3 update('model', …)

| Aspekt | Verhalten |
|--------|-----------|
| Auslöser | Klick auf Basis/Plus/Gemischt außerhalb des Panels |
| Kontext | Kein Monats-Panel |
| Änderung | Nur `benefitPlan.model` |
| Verhalten bzgl. Distribution | Keine Änderung |

**Code:** StepPlan.tsx Zeilen 186–194, 468

### 4.4 Strukturelle Nähe zum Model-Umschalt

- **handleConfirm** ist dem Model-Umschalt am nächsten: Er ändert explizit `model` und setzt gleichzeitig `concreteMonthDistribution: undefined`.
- **assignMonth** ändert `model` nicht, entfernt aber die Distribution.
- **update('model', …)** ändert `model`, ohne die Distribution zu berühren.

---

## 5. Technische Einhängepunkte für einen Fix (nur identifizieren)

### 5.1 Option A: In update('model', …) / StepPlan

| Aspekt | Beschreibung |
|--------|--------------|
| Ort | StepPlan.tsx, `update` oder der onClick-Handler für die Model-Buttons |
| Idee | Beim Ändern von `model` zusätzlich `concreteMonthDistribution: undefined` setzen |
| Vorteile | Lokale Änderung; klare Verantwortung; analog zu handleConfirm |
| Nachteile | `update` ist generisch (field/value); würde Sonderfall für `model` erfordern |
| Auswirkung Datenfluss | `values` enthält keine Distribution mehr → `applicationToCalculationPlan` nutzt Count-Pfad; alle von `values` abhängigen Memos (liveResult, planForOptimization) werden neu berechnet |

### 5.2 Option B: Im State-Setter / ElterngeldWizardPage

| Aspekt | Beschreibung |
|--------|--------------|
| Ort | ElterngeldWizardPage, z. B. Wrapper um `setValues`, der bei `benefitPlan.model`-Änderung die Distribution löscht |
| Idee | Zentrale Stelle für alle `values`-Updates |
| Vorteile | Einheitliche Behandlung aller Model-Änderungen, unabhängig von der Herkunft |
| Nachteile | Erfordert Änderung des Update-Mechanismus; alle Stellen, die `setValues` aufrufen, laufen über diese Logik |
| Auswirkung | Analog zu A |

**Nicht eindeutig im Code:** Ob es weitere Stellen gibt, die `model` ohne `setValues` ändern (z. B. über Ref).

### 5.3 Option C: In applicationToCalculationPlan

| Aspekt | Beschreibung |
|--------|--------------|
| Ort | applicationToCalculationPlan.ts, vor dem Distribution-Pfad |
| Idee | Wenn `model` sich von der Distribution „unterscheidet“, Distribution ignorieren oder anpassen |
| Vorteile | Keine Änderung der State-Struktur; alle Aufrufer profitieren |
| Nachteile | „Konsistenz“ zwischen `model` und Distribution müsste definiert werden; keine Änderung von `values`; `getMonthGridItemsFromValues` müsste ggf. analog angepasst werden |
| Auswirkung | Bei Ignorieren der Distribution: Count-Pfad würde genutzt; parentAMonths/parentBMonths müssten aussagekräftig sein |

**Nicht eindeutig im Code:** Ob `model` und Distribution fachlich immer kompatibel sein müssen oder ob ein partielles Mismatch erlaubt ist.

### 5.4 Option D: Beim Setzen der Distribution (mergePlanIntoPreparation)

| Aspekt | Beschreibung |
|--------|--------------|
| Ort | planToApplicationMerge.ts |
| Idee | Beim Übernehmen sicherstellen, dass `model` zur Distribution passt (bereits der Fall: `model` wird aus Plan abgeleitet) |
| Relevanz | Behebt nicht den Konflikt beim späteren Model-Umschalt durch den Nutzer |

---

## 6. Risikoanalyse (rein technisch)

### 6.1 Abhängigkeiten von concreteMonthDistribution

| Feature | Datei/Funktion | Abhängigkeit |
|---------|----------------|--------------|
| Berechnung | `applicationToCalculationPlan` | Verwendet Distribution exklusiv für Monatsmodi, wenn vorhanden |
| Monats-Grid (Wizard) | `getMonthGridItemsFromValues` | Nutzt Distribution für Grid-Items; Fallback auf Count-Logik bei fehlender/leerer Distribution |
| StepSummary | `getMonthGridItemsFromValues` | Wie Monats-Grid |
| Persistenz | `normalizeBenefitPlan` | Speichert/lädt Distribution, wenn Länge > 0 |

### 6.2 Wirkung: Distribution wird gelöscht

| Betroffenes Feature | Verhalten |
|---------------------|-----------|
| applicationToCalculationPlan | Wechsel in Count-Pfad; nutzt `parentAMonths`, `parentBMonths`, `model` |
| getMonthGridItemsFromValues | Wechsel in `getMonthGridItemsFromCounts` |
| Risiko | Count-Werte müssen konsistent sein. Nach `assignMonth`/`handleConfirm` werden sie explizit gesetzt. Nach einem reinen Model-Fix (nur Distribution löschen) bleiben die bisherigen Counts erhalten. |
| Kritisch, wenn | Counts und alte Distribution nicht übereinstimmen (z. B. nach Übernahme einer 24-Monats-Variante und Wechsel auf Basis: parentAMonths könnte „24“ sein, aber Basis erlaubt nur 14). |

### 6.3 Wirkung: Distribution wird überschrieben

| Szenario | Aktuell nicht vorhanden | Würde bedeuten |
|----------|---------------------------|----------------|
| Model-basierte Neuberechnung der Distribution | Keine Logik im Code | Distribution aus Counts + neuem `model` ableiten; komplexer als Reset |

### 6.4 Monats-Grid

- Bei gelöschter Distribution: `getMonthGridItemsFromCounts(parentAMonths, parentBMonths, model, partnershipBonus, hasPartner, maxMonths)`.
- `parentAMonths`/`parentBMonths` kommen aus `values.benefitPlan`; sie bleiben bei reiner Distribution-Löschung unverändert.
- **Risiko:** Nach Übernahme (z. B. 24 Monate Plus) und Wechsel zu Basis ohne Count-Anpassung: `maxMonths = 14`, Counts könnten 24/4 etc. sein → Darstellung könnte von der Berechnung abweichen.

### 6.5 Variantenübernahme

- `mergePlanIntoPreparation` setzt Distribution aus dem Plan.
- Eine spätere Löschung der Distribution ändert den Übernahmevorgang nicht; sie betrifft nur den Zustand danach.

### 6.6 Persistenz

- `normalizeBenefitPlan`: Bei `concreteMonthDistribution.length === 0` wird das Feld nicht in den normalisierten benefitPlan übernommen (`...(concreteMonthDistribution.length > 0 && { concreteMonthDistribution })`).
- **Belegbar:** Leere Distribution wird beim Speichern effektiv weggelassen.

### 6.7 Zusammenfassung Risiken

| Maßnahme | Risiko | Bedingung |
|----------|--------|-----------|
| Distribution bei Model-Umschalt löschen | Count-/MaxMonths-Inkonsistenz | Wenn nach Übernahme (z. B. 24 Monate) auf Basis gewechselt wird und Counts nicht angepasst werden |
| Distribution bei Model-Umschalt löschen | Verlust der feinen Monatsplanung | Nutzer verliert die übernommene Verteilung; Rückfall auf Count-Modell |

**Technischer Befund:** `createMonths` in applicationToCalculationPlan.ts (Zeile 39) verwendet `belegteMonate = Math.min(count, maxBelegung)`; bei `model === 'basis'` ist `maxBelegung = 14`. Höhere Counts werden also intern begrenzt. Das Monats-Grid verwendet `maxMonths` (14 oder 24) für die Anzahl der angezeigten Kacheln. Eine Count-Anpassung bei Model-Wechsel ist damit nicht zwingend für die Korrektheit der Berechnung, könnte aber für die Konsistenz der Anzeige (z. B. parentAMonths-String) relevant sein.
