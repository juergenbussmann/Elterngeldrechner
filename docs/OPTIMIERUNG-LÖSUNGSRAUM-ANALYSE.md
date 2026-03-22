# Optimierung – vollständiger Lösungsraum: Analyse und Validierung

**Stand:** Phasen 1 und 2 abgeschlossen. Keine Implementierung vorgenommen.

---

## Phase 1: Analyse der aktuellen Optimierungslogik

### 1.1 Einstieg und Datenbasis

- **Eingabe:** `buildOptimizationResult(plan, currentResult, goal)` erhält den **aktuellen Plan** als zentrale Eingabe.
- **Kandidatenerzeugung:** Alle Varianten entstehen durch `generateMutationCandidates(plan, currentResult, candidates, goal)`.
- **Grundprinzip:** Jede Kandidatenerzeugung startet mit `duplicatePlan(plan)` – einer Kopie des bestehenden Plans.
- **Monatsrahmen:** Der Plan enthält standardmäßig Monate 1–14 (`DEFAULT_MONTH_COUNT`). Es werden **keine neuen Monate** hinzugefügt.

---

### 1.2 Welche Parameter werden AKTUELL variiert?

| Parameter | Geprüft? | Wo / Wie | Einschränkungen |
|-----------|----------|----------|-----------------|
| **Monatsverteilung** (welcher Elternteil welchen Monat) | ✅ Ja | `addShiftBetweenParentsCandidates`, `createBothBalancedPlan`, `createBothFromSingleParentPlan` | Nur Monate, die im Plan bereits mit `mode !== 'none'` belegt sind |
| **Elternzuordnung** (ein vs. beide) | ✅ Ja | `createMotherOnlyPlan`, `createBothBalancedPlan` (inkl. Single-Parent-Fall) | Bedingt durch bestehende Monatsbelegung |
| **Bezugsart (Basis / Plus)** | ✅ Teilweise | `addPlusToBasisCandidates`, `addBasisToPlusCandidates`, `createWithoutPartTimePlan`, `tryAddPartnerBonus` | Pro Goal getrennt, keine kombinierten Strategien |
| **Partner-Overlap / Bonus** | ✅ Ja | `addPartnerBonusOverlapCandidates`, `tryAddPartnerBonus` | Nur wenn bereits ≥2 überlappende Plus-Monate ODER Plan hat Plus/Bonus |
| **Bezugsdauer** (Anzahl Monate) | ❌ Nein | – | Keine Erzeugung von Varianten mit mehr oder weniger Bezugsmonaten als im aktuellen Plan |

---

### 1.3 Welche Parameter werden NICHT verändert?

#### 1.3.1 Basis ↔ Plus – nicht systematisch kombiniert

- **`addBasisToPlusCandidates`:** Läuft nur für Goal `longerDuration`.
- **`addPlusToBasisCandidates`:** Läuft nur für Goals `maxMoney` und `frontLoad`.
- **Folge:** Es gibt keine gleichzeitige Prüfung von Basis↔Plus plus Verteilung plus Partner.
- **Beispiel:** Plan „12 Monate Mutter Basis“: `maxMoney` prüft kein Basis→Plus (keine Plus-Monate vorhanden), `longerDuration` prüft nur Basis→Plus, nicht die Elternverteilung.

#### 1.3.2 Ein-Eltern vs. Beide-Eltern – abhängig vom Plan

- **motherOnly:** Nur wenn Partner bereits Monate hat (`hasFatherMonths`).
- **bothBalanced:** Wird erzeugt (auch aus Single-Parent), aber die zugrunde liegende Monatsmenge bleibt unverändert.
- **Einschränkung:** Keine Varianten, bei denen der Partner Monate erhält, die er im Plan nicht hat – außer `createBothFromSingleParentPlan` (Split bestehender Monate) und `addPartnerBonusOverlapCandidates` (Kopieren von Plus-Monaten).

#### 1.3.3 Bezugsdauer – wird NICHT aktiv variiert

- Die Optimierung arbeitet ausschließlich mit Monaten, die im Plan bereits als Bezug gesetzt sind (`mode !== 'none'`).
- Es werden **keine** Varianten mit z.B. 14 statt 12 Monaten oder umgekehrt erzeugt.
- **Beispiel:** Bei „12 Monate Mutter Plus“ werden keine 14-Monats-Varianten (z.B. mit Plus-Verteilung) berechnet.

#### 1.3.4 Aktueller Plan als harte Einschränkung

- Jede Kandidatenerzeugung beginnt mit `duplicatePlan(plan)`.
- Die Menge der Bezugsmonate ist durch den aktuellen Plan festgelegt.
- Es existiert keine Logik, die z.B. „Was wäre bei 14 Monaten?“ unabhängig vom aktuellen Plan prüft.

---

### 1.4 Suchraum pro Goal (generateMutationCandidates)

| Goal | Aufgerufene Strategien | Stellschrauben |
|------|------------------------|----------------|
| **maxMoney** | `addAlternativeCandidates`, `addShiftBetweenParentsCandidates`, `addPlusToBasisCandidates` | Verteilung, Elternzuordnung, Plus→Basis |
| **longerDuration** | `addAlternativeCandidates`, `addBasisToPlusCandidates` | Basis→Plus (Verlängerung), keine anderen Strategien |
| **frontLoad** | `addAlternativeCandidates`, `addShiftCandidatesInDirectionForFrontLoad`, `addPlusToBasisCandidates` | Verteilung, Plus→Basis |
| **partnerBonus** | `addAlternativeCandidates`, `addPartnerBonusOverlapCandidates`, `tryAddPartnerBonus` | Overlap, Bonus, keine Basis↔Plus |

**Kritisch:** Pro Goal werden nur ein Teil der Stellschrauben genutzt. Es fehlt eine Kombination über Goals hinweg.

---

### 1.5 Weitere Filter und Blockaden

| Stelle | Wirkung |
|--------|---------|
| **addIfSensible** (in `addAlternativeCandidates`) | maxMoney: `householdTotal < currentTotal` → kein Hinzufügen. longerDuration: gleiche oder kürzere Dauer → kein Hinzufügen |
| **addShiftCandidatesInDirection** | Fügt nur hinzu, wenn `res.householdTotal > currentTotal` |
| **addPartnerBonusOverlapCandidates** | Arbeitet nur mit **Plus**-Monaten; Basis-Monate werden nicht zu Overlap/Bonus umgebaut |
| **tryAddPartnerBonus** | Benötigt bereits ≥2 überlappende Plus-Monate |
| **createWithoutPartTimePlan** | Nur wenn Plan bereits Plus/PartnerBonus enthält |
| **Step 2 (Teilzeit/Bonus)** | Wird übersprungen, wenn `a === 0 \|\| b === 0` – bei nur einem Elternteil keine PartnerBonus-Optionen |
| **Step 3 Filter** | `step1Choice === 'motherOnly' && optB > 0` → überspringen; `step1Choice === 'bothBalanced' && (optA === 0 \|\| optB === 0)` → überspringen |
| **filterImprovedCandidates** | Wird nicht zur Filterung vor `selectTop3` genutzt, nur für `improvedCount` |
| **selectTop3** | Max. 3 Kandidaten pro Goal, Deduplizierung nach `planFingerprint` und `resultFingerprint` |

---

### 1.6 stepDecisionFlow und buildStepDecisionContext

- **Step 1:** Nutzt nur `maxMoney`-Ergebnis. Optionen: `current`, `motherOnly` (falls `hasFatherMonths`), `bothBalanced`.
- **Step 2:** Nur wenn `isPartTimeStepRelevant` – entfällt bei ein-Eltern-Situationen.
- **Step 3:** `buildOptimizationResult(currentPlan, currentResult, goal)` für jedes Goal. `currentPlan`/`currentResult` kommen aus den vorherigen Schritten.
- **Folge:** Der Lösungsraum wird Schritt für Schritt eingeengt. Nach Step 1 ist die Elternzuordnung fest; danach wird nur noch innerhalb dieser Zuordnung optimiert.

---

## Phase 2: Validierung gegen Produktregeln

### R1 – Optimierung darf nicht am Ist-Zustand kleben

| Regel | Status | Begründung |
|-------|--------|------------|
| Aktueller Plan ist Ausgangspunkt | ⚠️ Teilweise | Plan ist Ausgangspunkt, wird aber zugleich als **harte Grenze** für Monatsmenge und Bezugsstruktur genutzt |
| Keine Einschränkung durch den Plan | ❌ Verletzt | Alle Kandidaten sind Mutationen des aktuellen Plans; es gibt keine „unabhängigen“ Alternativen mit anderer Monatszahl oder Bezugsdauer |

### R2 – Alle fachlich relevanten Stellschrauben müssen geprüft werden

| Stellschraube | Status | Begründung |
|---------------|--------|------------|
| Bezugsart (Basis / Plus) | ⚠️ Teilweise | Basis↔Plus wird geprüft, aber getrennt nach Goal und nicht kombiniert |
| Aufteilung zwischen Eltern | ✅ Ja | motherOnly, bothBalanced, Shift zwischen Eltern |
| Bezugsdauer | ❌ Nein | Keine aktive Variation der Bezugsdauer (keine zusätzlichen oder reduzierten Monate) |
| Paralleler Bezug (Bonus) | ⚠️ Teilweise | Nur wenn bereits Plus/Bonus-Struktur vorhanden; kein Aufbau aus reiner Basis-Struktur |

### R3 – Kombinationen müssen berücksichtigt werden

| Regel | Status | Begründung |
|-------|--------|------------|
| Kombinationen von Stellschrauben | ❌ Verletzt | Jedes Goal nutzt nur einen Teil der Strategien; es fehlt eine kombinierte Suche (z.B. Basis→Plus + beide Eltern + Bonus) |
| Mehrstufige Verbesserungen | ❌ Verletzt | Step 2 entfällt bei ein-Eltern-Plänen; damit fehlen Bonus-Optionen in typischen Single-Parent-Szenarien |

### R4 – Optimierung muss echte Alternativen liefern

| Regel | Status | Begründung |
|-------|--------|------------|
| Bessere Varianten anzeigen, wenn fachlich möglich | ⚠️ Risiko | Bei „nur Mutter Basis“ oder „nur Mutter Plus“ können sinnvolle Alternativen (z.B. Plus + beide Eltern, Bonus) fehlen |
| Kein falscher „nichts gefunden“-Fall | ⚠️ Risiko | Wenn alle Kandidaten durch Filter (z.B. addIfSensible, addShift) herausfallen, bleibt status `no_candidate` trotz theoretisch besserer Optionen |

### R5 – Nutzer muss Ursache verstehen

| Regel | Status | Begründung |
|-------|--------|------------|
| Klare Kommunikation bei Änderung der Ausgangslogik | ⚠️ Unklar | Es existieren `getSuggestionTitleAndExplanation` und `strategyType`-Labels; ob „Wechsel zu Plus“ oder „Einbeziehung beider Eltern“ ausreichend erklärt werden, ist kontextabhängig |

---

## Phase 3: Zusammenfassung und Handlungsbedarf

### Kernbefunde

1. **Plan als harte Grenze:** Die Optimierung arbeitet ausschließlich innerhalb der bestehenden Monatsbelegung. Keine Variation der Bezugsdauer.
2. **Stellschrauben pro Goal getrennt:** Basis↔Plus, Verteilung, Bonus werden nicht systematisch kombiniert.
3. **Filter auf Generationsebene:** Viele potenzielle Kandidaten werden bereits in `addIfSensible`, `addShiftCandidatesInDirection` usw. nicht hinzugefügt.
4. **Step-Struktur:** Step 2 entfällt bei ein-Eltern-Plänen; Bonus-Optionen fehlen dort.
5. **Keine „unabhängige“ Suche:** Es gibt keine Logik, die z.B. „Was wäre bei 14 Monaten Plus für beide?“ unabhängig vom aktuellen Plan prüft.

### Konkrete Lücken (Beispiele)

- **Plan: 12 Monate Mutter Basis**  
  - maxMoney: Plus→Basis greift nicht (keine Plus-Monate).  
  - longerDuration: Basis→Plus wird geprüft, aber ohne systematische Prüfung von „beide Eltern“ oder Bonus.  
  - partnerBonus: Ohne Plus-Struktur wird kein Bonus aufgebaut.

- **Plan: 12 Monate Mutter Plus**  
  - bothBalanced wird durch `createBothFromSingleParentPlan` erzeugt.  
  - partnerBonus: addPartnerBonusOverlapCandidates kopiert Plus-Monate zum Partner.  
  - Bezugsdauer: Keine 14-Monats-Varianten, falls gesetzlich möglich.

- **Plan: Reine Basis-Verteilung**  
  - createWithoutPartTimePlan greift nicht (kein Plus/Bonus).  
  - tryAddPartnerBonus greift nicht (kein Overlap).  
  - Es fehlt eine Strategie „von Basis zu Plus + Bonus“.

### Empfohlene Handlungsrichtungen (für spätere Umsetzung)

1. **Bezugsdauer variieren:** Kandidaten mit unterschiedlicher Bezugsdauer erzeugen (z.B. 12 vs. 14 Monate), wo fachlich zulässig.
2. **Basis↔Plus unabhängig von Goal:** Basis→Plus und Plus→Basis in allen relevanten Goals prüfen, nicht nur in `longerDuration` bzw. `maxMoney`/`frontLoad`.
3. **Kombinationen:** Strategien kombinieren (z.B. Basis→Plus + beide Eltern + Bonus-Kandidaten in einem Lauf).
4. **Filter lockern:** Bei strukturell wichtigen Alternativen (z.B. bothBalanced, Bonus) auch Varianten mit gleichem oder leicht schlechterem Total einbeziehen und ggf. erklären.
5. **Step 2 bei ein-Eltern-Plänen:** Prüfen, ob PartnerBonus-Optionen auch bei zunächst ein-Eltern-Plänen sinnvoll darstellbar sind (z.B. nach bothBalanced-Variante).
6. **Unabhängige Suchräume:** Optionale Prüfung von „Referenz-Konstellationen“ (z.B. 14 Monate, beide Plus), unabhängig vom exakten Ist-Plan, als zusätzlicher Suchstrang.

---

*Analyse abgeschlossen. Umsetzung folgt gemäß Anforderung erst nach Freigabe.*
