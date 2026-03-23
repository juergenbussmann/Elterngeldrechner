# Diagnose: Optimierung „Längere Bezugsdauer“ zeigt unplausibel geringe Gesamtauszahlung bei Basiselterngeld

**Datum:** 2026-03-22  
**Kontext:** Elterngeldplaner, PWA  
**Auftrag:** Reine Ursachenanalyse – keine Umsetzung, nur Fakten.

---

## 1. Beteiligte Funktionen und Datenflüsse

### 1.1 Berechnung Gesamtauszahlung

| Funktion | Datei | Rolle |
|----------|-------|-------|
| `calculateMonthlyElterngeld` | `calculationEngine.ts` 94–170 | Berechnet Betrag pro Monat (Basis/Plus/PartnerBonus) |
| `calculatePlan` | `calculationEngine.ts` 176–314 | Summiert Monatsbeträge → `householdTotal` |
| `countBezugMonths` | `elterngeldOptimization.ts` 1430–1438 | Zählt eindeutige Bezugsmonate für Dauer |

### 1.2 Optimierungsvarianten

| Funktion | Datei | Rolle |
|----------|-------|-------|
| `buildOptimizationResult` | `elterngeldOptimization.ts` 108–180 | Startet Optimierung für Ziel `longerDuration` |
| `findCandidates` | `elterngeldOptimization.ts` 553–580 | Sammelt Kandidaten |
| `generateMutationCandidates` | `elterngeldOptimization.ts` 985–1039 | Füllt Kandidaten je Ziel |
| `addReferenceConfigCandidates` | `elterngeldOptimization.ts` 472–530 | Erzeugt Referenzpläne (motherOnlyPlus 2–24, bothPlus 2–24, …) |
| `addBasisToPlusCandidates` | `elterngeldOptimization.ts` 1057–1119 | Wandelt Basis-Monate in Plus um |
| `createReferencePlan` | `elterngeldOptimization.ts` 357–465 | Baut Plan aus Metadaten (Einkommen, Modus, Monatsanzahl) |
| `filterImprovedCandidates` | `elterngeldOptimization.ts` 863–885 | Filtert nach `duration > baseDuration` |
| `selectTop3` | `elterngeldOptimization.ts` 930–977 | Wählt bis zu 3 Vorschläge, sortiert nach Dauer dann Gesamtsumme |

### 1.3 Aufruf für `longerDuration`

In `generateMutationCandidates` (Zeile 1008–1011):

```ts
if (goal === 'longerDuration') {
  addBasisToPlusCandidates(plan, currentResult, candidates, addIfNew);
  return;
}
```

Vorher werden aber immer aufgerufen (Zeilen 1000–1001):

```ts
addReferenceConfigCandidates(plan, currentResult, candidates, goal, addIfNew);
addAlternativeCandidates(plan, currentResult, candidates, goal, addIfNew);
```

Für `longerDuration` laufen also:
1. `addReferenceConfigCandidates` – erzeugt Referenzpläne mit 2–24 Monaten
2. `addAlternativeCandidates` – z.B. motherOnly, bothBalanced
3. `addBasisToPlusCandidates` – wandelt Basis- in Plus-Monate um

---

## 2. Rechenweg aktueller Plan (Basiselterngeld)

### 2.1 Monatsberechnung Basis

`calculationEngine.ts` 124–129:

```ts
if (input.type === 'basis') {
  baseAmount = loss * replacementRate;
  baseAmount = clamp(baseAmount, MIN_BASIS, MAX_BASIS);  // 300–1800
}
```

- `loss = incomeBeforeNet - incomeDuringNet` (bei `incomeDuringNet = 0` → `incomeBeforeNet`)
- Basis: ca. 65–67 % Ersatzrate, Deckel 300–1800 €/Monat

### 2.2 Monatsberechnung Plus

`calculationEngine.ts` 129–141:

```ts
} else if (input.type === 'plus' || input.type === 'partnerBonus') {
  const baseFromLoss = loss * replacementRate;
  let plusAmount = Math.min(baseFromLoss / 2, maxPlus);   // maxPlus = theoreticalBaseClamp / 2
  baseAmount = Math.max(MIN_PLUS, plusAmount);            // 150–900
  baseAmount = Math.min(MAX_PLUS, baseAmount);
}
```

- Plus-Betrag ≈ Hälfte des Basis-Betrags (min 150, max 900 €)

### 2.3 Gesamtauszahlung

`calculationEngine.ts` 291:

```ts
const householdTotal = parents.reduce((sum, p) => sum + p.total, 0);
```

`total` pro Elternteil = Summe der `monthlyResults.amount`.

---

## 3. Rechenweg Optimierungsvariante „längere Bezugsdauer“

### 3.1 Kandidaten für `longerDuration`

1. **addReferenceConfigCandidates**  
   - `config` u.a.: `motherOnlyPlus`, `bothPlus`, `bothPlusWithBonus`  
   - `getDurationsForConfig('motherOnlyPlus')` → `DURATIONS_PLUS` = 2–24  
   - Bei `longerDuration`: Indizes umgekehrt (Zeile 507), also längste Dauer zuerst  
   - `createReferencePlan(plan, 'motherOnlyPlus', 24)` erzeugt: Mutter 1–24 mit `mode: 'plus'`

2. **addBasisToPlusCandidates**  
   - Wandelt einzelne Basis-Monate in Plus um  
   - Anzahl Monate bleibt gleich, Gesamtbetrag sinkt (Plus ≈ ½ Basis)

### 3.2 Vergleich Basis vs Plus

| Typ | Pro Monat (Beispiel) | Max. Monate |
|-----|----------------------|-------------|
| Basis | ca. 300–1800 € | 14 |
| Plus | ca. 150–900 € | 24 |

**Beispiel: Einkommen 2500 €**

- Basis: ~1300 €/Monat, 14 Monate → ca. 18 200 €
- Plus: ~650 €/Monat, 24 Monate → ca. 15 600 €

---

## 4. Zwischenwerte – typische Konstellation

### 4.1 Aktueller Plan: 14 Basis-Monate (Mutter)

- Monate 1–14: `mode: 'basis'`
- Pro Monat: ca. 1300 € (abhängig von Ersatzrate)
- Summe: 14 × 1300 ≈ 18 200 €
- Dauer: 14 Monate

### 4.2 Optimierungsvariante: 24 Plus-Monate

- Monate 1–24: `mode: 'plus'` (createReferencePlan)
- Pro Monat: ca. 650 €
- Summe: 24 × 650 ≈ 15 600 €
- Dauer: 24 Monate

### 4.3 Ergebnisvergleich

| | Aktueller Plan | Optimierungsvariante |
|--|----------------|----------------------|
| Dauer | 14 Monate | 24 Monate |
| Gesamtauszahlung | ca. 18 200 € | ca. 15 600 € |

Damit ist ** längere Dauer und gleichzeitig niedrigere Gesamtauszahlung** rechnerisch konsistent mit der Implementierung.

---

## 5. Konsistenz der Bewertung

### 5.1 Basis vs Plus vs Partnerschaftsbonus

- Basis: `loss * Ersatzrate`, Deckel 300–1800  
- Plus: ≈ Basis / 2, Deckel 150–900  
- Partnerschaftsbonus: gleiche Logik wie Plus (Zeile 129)

Für `longerDuration` werden vor allem Plus-Varianten erzeugt; die Umrechnung Plus = etwa die Hälfte von Basis ist im Code korrekt abgebildet.

### 5.2 Datenbasis für aktuellen Plan und Variante

- Aktueller Plan: `plan` + `currentResult` aus `calculatePlan(plan)`
- Varianten: `createReferencePlan(plan, config, totalMonths)` mit Einkommen aus `plan`
- Beide nutzen dieselbe `calculatePlan`-Logik

---

## 6. Exakte Stelle der Ursache

Die geringere Gesamtauszahlung bei längerer Bezugsdauer entsteht an folgenden Stellen:

### 6.1 Kandidatenerzeugung

**Datei:** `elterngeldOptimization.ts`

- **addReferenceConfigCandidates** (Zeilen 472–530):  
  Erzeugt `motherOnlyPlus` und `bothPlus` mit 2–24 Monaten `mode: 'plus'`.

- **createReferencePlan** (Zeilen 371–395):  
  Setzt für `motherOnlyPlus` und `bothPlus` explizit `mode: 'plus'` (Zeilen 368, 405–406).

### 6.2 Bewertung und Filterung

- **filterImprovedCandidates** (Zeile 877):  
  Für `longerDuration` nur: `countBezugMonths(c.result) > baseDuration`  
  → Es wird nicht geprüft, ob die Gesamtauszahlung sinnvoll ist.

- **selectTop3** (Zeilen 952–956):  
  Sortierung bei `longerDuration`: zuerst nach Dauer (absteigend), dann nach Gesamtsumme (absteigend).  
  Eine Variante mit 24 Monaten Plus und niedrigerer Summe wird daher bevorzugt, weil sie mehr Monate hat.

### 6.3 Fachlicher Zusammenhang

Ursache ist die gesetzliche Regelung (BEEG):

- Basiselterngeld: max. 14 Monate, höherer Betrag pro Monat
- ElterngeldPlus: max. 24 Monate, etwa halber Betrag pro Monat

Bei voll ausgeschöpftem Basisanspruch (14 Monate) und einem Vergleich mit der „längeren Bezugsdauer“-Optimierung (24 Plus-Monate) ist es mathematisch möglich, dass mehr Monate und trotzdem weniger Gesamtauszahlung herauskommen.

**Konkrete Code-Stelle:**

`elterngeldOptimization.ts` 495–496 in `addIfImproved`:

```ts
? duration > currentDuration   // Längere Dauer = „verbessert“
```

Es gibt keine zusätzliche Bedingung wie z.B. `total >= currentTotal * 0.95` (wie bei `frontLoad` in Zeile 500).

---

## 7. Kurzüberblick

| Aspekt | Befund |
|--------|--------|
| Rechenlogik | Basis und Plus werden korrekt berechnet. |
| Datenbasis | Aktueller Plan und Varianten nutzen dieselbe `calculatePlan`-Logik. |
| Kandidatenerzeugung | `addReferenceConfigCandidates` erzeugt Plus-Varianten mit bis zu 24 Monaten. |
| Verbesserungskriterium | Für `longerDuration` zählt nur `duration > currentDuration`. |
| Ergebnis | Bei 14 Basis-Monaten vs. 24 Plus-Monaten kann längere Dauer mit niedrigerer Gesamtauszahlung einhergehen. |

---

*Analyse ausschließlich auf Basis des vorhandenen Codes. Keine Vermutungen. Keine Fixes.*
