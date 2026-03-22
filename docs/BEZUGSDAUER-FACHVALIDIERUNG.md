# Bezugsdauer – Fachliche Validierung

**Datum:** 22.03.2026  
**Ziel:** Nachweis, ob die aktuelle Bezugsdauer-Logik fachlich korrekt ist oder heuristisch.

---

## 1. Tatsächliche fachliche Dauergrenzen (BEEG §4)

### 1.1 Quellen

- **BEEG §4** (Bundeselterngeld- und Elternzeitgesetz): [sozialgesetzbuch-sgb.de/beeg/4](https://www.sozialgesetzbuch-sgb.de/beeg/4.html)
- **ELTERNGELD-CALCULATION-MVP.md**: Keine expliziten Dauer-Grenzen
- **partnerBonusValidation.ts**: 2–4 zusammenhängende Monate (Bonus)

### 1.2 BEEG §4 – Kernregeln

| Regel | BEEG §4 | Bedeutung |
|-------|---------|-----------|
| **Gemeinsamer Anspruch Basis** | 12 Monatsbeträge | Ohne Partnermonate |
| **Mit Partnermonaten** | 14 Monatsbeträge | Wenn anderer Elternteil mind. 2 Monate nimmt |
| **Pro Elternteil max** | 12 + max. 4 Partnerschaftsbonus | = 16 Monatsbeträge |
| **Basis Bezugszeitraum** | Bis Vollendung 14. Lebensmonat | Basis darf nur in LM 1–14 liegen |
| **Plus Bezugszeitraum** | Bis Vollendung 32. Lebensmonat | Plus ab LM 15 möglich, wenn durchgehend |
| **Umrechnung** | 1 Basis = 2 Plus | Plus: halber Betrag, doppelte Dauer |
| **Mindestbezug pro Elternteil** | 2 Lebensmonate | Wenn Elternteil überhaupt bezieht |
| **Partnerschaftsbonus** | 2–4 zusammenhängende Monate | Bereits im Code (partnerBonusValidation) |
| **Frühgeborene** | 13–16 Monatsbeträge | Je nach Frühheit (6–16 Wochen vorher) |

### 1.3 Abgeleitete fachliche Grenzen

| Konstellation | Min (Bezugsmonate) | Max (Bezugsmonate) | Begründung |
|---------------|--------------------|--------------------|------------|
| **Reines Basis** | 2 | 14 | BEEG: Basis bis LM 14; Mindestbezug 2 |
| **Basis + Partnermonate** | 2 | 14 | Gemeinsam 14 Monatsbeträge |
| **Plus** | 2 | 24 | 12 Basis-Äquivalente = 24 Plus-Monate; Bezug bis LM 32 |
| **Bonus** | 2 | 4 (Serie) | PartnerBonus: 2–4 zusammenhängend |

---

## 2. Bestehende Logik im Code

### 2.1 Optimierung (elterngeldOptimization.ts)

| Konstante/Variable | Wert | Zeile |
|--------------------|------|-------|
| `MIN_BEZUG_MONTHS` | 6 | 329 |
| `MAX_BEZUG_MONTHS` | 14 | 330 |
| `durationVariants` | `[current-2, current, current+2]` gefiltert 6–14 | 469–476 |

### 2.2 Andere Stellen im System

| Datei | Konstante/Logik | Wert | Kontext |
|-------|-----------------|------|---------|
| `defaultPlan.ts` | `DEFAULT_MONTH_COUNT` | 14 | Monatsgrid für Planung |
| `applicationToCalculationPlan.ts` | `MAX_BELEGUNG_BASIS` | 14 | Basis-Modell |
| `applicationToCalculationPlan.ts` | `MAX_BELEGUNG_PLUS` | 24 | Plus-Modell |
| `StepPlan.tsx` | `maxMonths` | `model === 'plus' ? 24 : 14` | UI-Monatsauswahl |
| `StepSummary.tsx` | `maxMonths` | `model === 'plus' ? 24 : 14` | UI |
| `partnerBonusValidation.ts` | `MIN_MONTHS`, `MAX_MONTHS` | 2, 4 | Bonus-Serie |
| `partnerBonusValidation.ts` | `validateParallelBasis` | Monate 1–12 | Basis-Parallelbezug |
| `types.ts` | ParentMonthInput.month | „1–14 typisch“ | Kommentar |
| `computeFrontLoadScore` | `maxMonth` | `Math.max(24, ...)` | Berücksichtigt Plus-Horizont |

### 2.3 Tests

| Test | Verwendete Dauer | Implizite Annahme |
|------|------------------|-------------------|
| `createPlan` | 14 Monate im Grid | DEFAULT_MONTH_COUNT |
| A1, B1, B2, D1, E1, F1 | 2–4 Monate belegt | Kurze Planszenarien |
| C1 | 12 Monate | „Optimal“-Szenario |
| H1, H2 | 4–6 Monate | bothBalanced |

---

## 3. Abgleich: Implementierung vs. BEEG

### 3.1 MIN_BEZUG_MONTHS = 6

| Aspekt | BEEG | Implementierung | Abweichung |
|--------|------|-----------------|------------|
| Mindestbezug | 2 Monate pro Elternteil | 6 Monate gesamt | **Ja** – 6 ist **nicht** im BEEG begründet. BEEG kennt nur „mind. 2 pro Elternteil“, keine untere Grenze für Gesamtbezugsdauer. 6 ist Heuristik. |

### 3.2 MAX_BEZUG_MONTHS = 14

| Aspekt | BEEG | Implementierung | Abweichung |
|--------|------|-----------------|------------|
| Basis-Maximum | 14 Lebensmonate | 14 | **Nein** – konsistent |
| Plus-Maximum | 24 LM (12 Basis-Äquiv.) | 14 | **Ja** – Die Optimierung begrenzt auf 14, obwohl Plus bis 24 LM sinnvoll ist. `StepPlan`/`applicationToCalculationPlan` nutzen 24 für Plus. |

### 3.3 durationVariants = [current−2, current, current+2]

| Aspekt | BEEG | Implementierung | Abweichung |
|--------|------|-----------------|------------|
| Variation | Keine Regel für „±2“ | Fixe Schrittweite 2 | **Ja** – Reine Heuristik. BEEG gibt keine Vorgabe für Suchschritte. |
| Vollständigkeit | Relevante Bereiche: 2–14 (Basis), 2–24 (Plus) | Nur lokale ±2 um current | **Ja** – Kein systematischer Suchraum. Z.B. current=4 liefert nur 2,4,6; 12 oder 14 werden nicht erprobt. |

---

## 4. Liste der Abweichungen

| # | Abweichung | Stelle | Auswirkung |
|---|------------|--------|------------|
| 1 | **MIN_BEZUG_MONTHS = 6** ohne BEEG-Bezug | elterngeldOptimization.ts:329 | Pläne mit 2–5 Monaten werden in Referenz-Konfigurationen ausgeschlossen. BEEG erlaubt mind. 2. |
| 2 | **MAX_BEZUG_MONTHS = 14** ignoriert Plus-Horizont | elterngeldOptimization.ts:330 | Plus-Pläne mit 15–24 Monaten werden nicht erzeugt, obwohl fachlich möglich (StepPlan: 24). |
| 3 | **±2-Variation** ist Heuristik | elterngeldOptimization.ts:469–476 | Kein Bezug zu BEEG. Suchraum hängt von current ab; z.B. 12 oder 14 werden bei current=4 nie probiert. |
| 4 | **Keine Modell-Unterscheidung** (Basis vs. Plus) | addReferenceConfigCandidates | Gleiche Grenzen 6–14 für Basis und Plus. Plus sollte bis 24 gehen können. |
| 5 | **Keine Bezugsart-abhängige Dauerlogik** | Gesamte Optimierung | BEEG unterscheidet Basis (bis LM 14) und Plus (bis LM 32). Die Optimierung differenziert nicht. |

---

## 5. Validierung gegen Regeln

| Regel | Status | Begründung |
|-------|--------|------------|
| **R1 – Fachliche Korrektheit vor Heuristik** | ❌ Verletzt | MIN=6, MAX=14, ±2 sind nicht aus BEEG ableitbar. |
| **R2 – Vollständiger Suchraum** | ❌ Verletzt | Nur current±2; z.B. 12 oder 14 bei kurzem Plan nicht systematisch geprüft. Plus-Bereich 15–24 fehlt. |
| **R3 – Konsistenz mit Bezugsart** | ❌ Verletzt | Basis und Plus nutzen dieselben Grenzen; Plus-spezifische 24-Monats-Option fehlt. |
| **R4 – Nachvollziehbarkeit** | ⚠️ Teilweise | 14 als Max ist für Basis nachvollziehbar; 6 und ±2 sind nicht fachlich begründbar. |

---

## 6. Klare Aussage

**→ Die aktuelle Dauerlogik ist heuristisch und fachlich unvollständig.**

### 6.1 Heuristiken

- **MIN_BEZUG_MONTHS = 6:** Ohne BEEG-Begründung; Mindestbezug im BEEG ist 2.
- **MAX_BEZUG_MONTHS = 14:** Nur für Basis korrekt; Plus wäre fachlich bis 24.
- **durationVariants = [current−2, current, current+2]:** Reine technische Schrittweite, keine fachliche Regel.

### 6.2 Fachlich richtige Orientierung

| Bezugsart | Min (fachlich) | Max (fachlich) |
|-----------|----------------|----------------|
| Basis | 2 | 14 |
| Plus | 2 | 24 |
| Bonus-Serie | 2 | 4 |

### 6.3 Systeminterne Inkonsistenz

- `StepPlan`/`StepSummary`/`applicationToCalculationPlan`: 14 (Basis) bzw. 24 (Plus)
- `elterngeldOptimization`: einheitlich 6–14 für alle Konfigurationen  
→ Die Optimierung hinkt der restlichen Fachlogik hinterher.

---

*Analyse abgeschlossen. Keine Implementierung vorgenommen.*
