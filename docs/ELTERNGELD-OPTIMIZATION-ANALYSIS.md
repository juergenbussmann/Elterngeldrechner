# Elterngeld-Optimierungsmodul – Analysebericht

**Stand:** Aktuelle PWA-Codebasis  
**Nur Analyse – keine Änderungen an Berechnungslogik**

---

## 1. Aktuelle Optimierungsziele

### Aktiv im System (mit implementierter Strategielogik)

| Ziel | Label | Strategielogik | UI sichtbar |
|------|-------|----------------|-------------|
| **maxMoney** | Mehr Gesamtauszahlung | ✓ `addShiftBetweenParentsCandidates`, `addPlusToBasisCandidates` | ✓ Hauptziel |
| **longerDuration** | Längere Bezugsdauer | ✓ `addBasisToPlusCandidates` | ✓ Hauptziel |
| **partnerBonus** | Partnerschaftsbonus prüfen | ✓ `addPartnerBonusOverlapCandidates`, `tryAddPartnerBonus` | ✓ Checkbox „Zusätzlich“ |

### Anzahl aktiver Optimierungsziele: **3**

---

## 2. Früher vorhandene Strategien

### 2.1 „Mehr Geld am Anfang“ (frontLoad)

| Aspekt | Status |
|--------|--------|
| **Im Code vorhanden** | ✓ Ja – als Typ und Label |
| **Strategielogik implementiert** | ✗ Nein |
| **Im UI sichtbar** | ✗ Nein |
| **Vollständig entfernt** | ✗ Nein – Funktionsreste vorhanden |

**Details:**
- `OptimizationGoal` enthält `'frontLoad'`
- `GOAL_LABELS['frontLoad']` = `'Höhere Zahlungen am Anfang'`
- `UNSUPPORTED_GOALS` enthält `'frontLoad'`
- `buildOptimizationResult` gibt bei `frontLoad` sofort `{ goal, status: 'unsupported' }` zurück
- `generateMutationCandidates` hat **keinen** Zweig für `frontLoad` – keine Kandidatenerzeugung
- `OptimizationGoalDialog` zeigt `frontLoad` nicht an (`MAIN_GOAL_OPTIONS` enthält nur `maxMoney` und `longerDuration`)

### 2.2 „Gleichmäßige Auszahlung“ (balanced)

| Aspekt | Status |
|--------|--------|
| **Im Code vorhanden** | ✓ Ja – als Typ und Label |
| **Strategielogik implementiert** | ✗ Nein |
| **Im UI sichtbar** | ✗ Nein |
| **Vollständig entfernt** | ✗ Nein – Funktionsreste vorhanden |

**Details:**
- `OptimizationGoal` enthält `'balanced'`
- `GOAL_LABELS['balanced']` = `'Gleichmäßigere monatliche Zahlungen'`
- `UNSUPPORTED_GOALS` enthält `'balanced'`
- `buildOptimizationResult` gibt bei `balanced` sofort `{ goal, status: 'unsupported' }` zurück
- `generateMutationCandidates` hat **keinen** Zweig für `balanced` – keine Kandidatenerzeugung
- `OptimizationGoalDialog` zeigt `balanced` nicht an

---

## 3. Gefundene Codefragmente

### 3.1 Typdefinition und Labels

| Datei | Zeilen | Inhalt |
|-------|--------|--------|
| `elterngeldOptimization.ts` | 18–23 | `OptimizationGoal`-Typ mit `frontLoad`, `balanced` |
| `elterngeldOptimization.ts` | 92–97 | `GOAL_LABELS` mit Labels für alle 5 Ziele |
| `OptimizationGoalDialog.tsx` | 13–18 | `OptimizationGoal`-Typ (dupliziert) |

### 3.2 Deaktivierung / Unsupported

| Datei | Zeilen | Inhalt |
|-------|--------|--------|
| `elterngeldOptimization.ts` | 99–101 | `UNSUPPORTED_GOALS: ['frontLoad', 'balanced']` |
| `elterngeldOptimization.ts` | 114–119 | Früher Abbruch in `buildOptimizationResult` bei unsupported goals |
| `OptimizationGoalDialog.tsx` | 52–53 | `if (UNSUPPORTED_GOALS.includes(goalToRun)) return` – verhindert Bestätigung |
| `StepCalculationResult.tsx` | 1017 | `!UNSUPPORTED_GOALS.includes(optimizationGoal)` – Anzeige nur für unterstützte Ziele |

### 3.3 Kandidatenerzeugung (nur unterstützte Ziele)

| Datei | Zeilen | Funktion | Beschreibung |
|-------|--------|----------|--------------|
| `elterngeldOptimization.ts` | 442–478 | `generateMutationCandidates` | Nur Zweige für `maxMoney`, `longerDuration`, `partnerBonus` – **keine** für `frontLoad` oder `balanced` |
| `elterngeldOptimization.ts` | 385–434 | `selectTop3` | Sortierung nur für maxMoney, longerDuration, partnerBonus – default-Fall für andere |
| `elterngeldOptimization.ts` | 357–373 | `filterImprovedCandidates` | Filter nur für maxMoney, longerDuration, partnerBonus |

### 3.4 UI – sichtbare Optionen

| Datei | Zeilen | Inhalt |
|-------|--------|--------|
| `OptimizationGoalDialog.tsx` | 20–35 | `MAIN_GOAL_OPTIONS` – nur `maxMoney` und `longerDuration` |
| `OptimizationGoalDialog.tsx` | 84–94 | Checkbox für `partnerBonus` als Zusatzoption |

**Ergebnis:** `frontLoad` und `balanced` sind im Dialog **nicht** als wählbare Optionen vorhanden.

---

## 4. Empfehlung: Wiederaktivierung der Strategien

### 4.1 Voraussetzungen (ohne Änderung der Berechnungslogik)

- `calculatePlan`, `applicationToCalculationPlan`, `partnerBonusValidation`, `validatePartnerBonus` und das Datenmodell bleiben unverändert.
- Die Optimierung arbeitet ausschließlich über **Plan-Mutationen** (Monatszuordnungen, Basis/Plus-Modi) und ruft `calculatePlan` auf. Keine Änderung der Berechnungsformeln.

### 4.2 Schritte zur Wiederaktivierung

#### A) Strategielogik implementieren

1. **frontLoad (Höhere Zahlungen am Anfang)**
   - Neue Funktion z. B. `addFrontLoadCandidates` in `elterngeldOptimization.ts`
   - Idee: Kandidaten erzeugen, bei denen Monate mit höheren Beträgen möglichst früh liegen (z. B. Basis-Monate des höherverdienenden Elternteils in frühe Lebensmonate verschieben)
   - Metrik: z. B. gewichtete Summe (frühe Monate höher gewichtet) oder NPV-ähnliche Bewertung
   - In `generateMutationCandidates` einen neuen Zweig `if (goal === 'frontLoad')` ergänzen
   - In `filterImprovedCandidates` und `selectTop3` einen Fall für `frontLoad` ergänzen
   - In `candidateToSuggestion` und `getSuggestionTitleAndExplanation` einen Fall für `frontLoad` ergänzen

2. **balanced (Gleichmäßigere monatliche Zahlungen)**
   - Neue Funktion z. B. `addBalancedCandidates` in `elterngeldOptimization.ts`
   - Idee: Kandidaten erzeugen, die die Varianz der monatlichen Haushaltsbeträge minimieren (z. B. durch Umverteilung Basis/Plus oder Verschiebung zwischen Eltern)
   - Metrik: z. B. Standardabweichung oder Spannweite der monatlichen Beträge
   - Gleiche Integrationspunkte wie bei frontLoad

#### B) UNSUPPORTED_GOALS anpassen

- `frontLoad` und `balanced` aus `UNSUPPORTED_GOALS` entfernen, sobald die Strategielogik implementiert ist.

#### C) UI erweitern

- `MAIN_GOAL_OPTIONS` in `OptimizationGoalDialog.tsx` um `frontLoad` und `balanced` ergänzen (analog zu maxMoney/longerDuration).
- Optional: `OptimizationSuggestion` und `OptimizationResultSet` um die neuen `goal`-Werte erweitern, falls die Typen derzeit auf die drei aktiven Ziele beschränkt sind.

### 4.3 Risiken und Hinweise

- **Keine Berechnungslogik anfassen:** Alle Änderungen nur in `elterngeldOptimization.ts` und im UI.
- **Metrik-Definition:** Für frontLoad und balanced muss klar definiert werden, was „besser“ bedeutet (z. B. Formel für frontLoad-Metrik, Varianz/Spannweite für balanced).
- **Tests:** `elterngeldOptimization.test.ts` um Szenarien für die neuen Ziele ergänzen.

---

## 5. Zusammenfassung

| Strategie | Im Typ/Label | Strategielogik | UI | Status |
|-----------|--------------|----------------|-----|--------|
| maxMoney | ✓ | ✓ | ✓ | Aktiv |
| longerDuration | ✓ | ✓ | ✓ | Aktiv |
| partnerBonus | ✓ | ✓ | ✓ | Aktiv |
| **frontLoad** | ✓ | ✗ | ✗ | Nur Reste, deaktiviert |
| **balanced** | ✓ | ✗ | ✗ | Nur Reste, deaktiviert |

**Fazit:** Die Strategien „Mehr Geld am Anfang“ und „Gleichmäßige Auszahlung“ sind im Typ- und Label-System noch vorhanden, wurden aber nie vollständig implementiert bzw. sind bewusst deaktiviert. Es gibt keine Strategielogik und keine UI-Optionen dafür. Die Wiederaktivierung erfordert die Implementierung neuer Kandidatenerzeugungs- und Bewertungslogik in `elterngeldOptimization.ts` sowie die Erweiterung des Optimierungsdialogs.
