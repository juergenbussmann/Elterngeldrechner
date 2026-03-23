# Analyse: Unzulässiger Partnerschaftsbonus trotz >32h Teilzeit

**Kontext:** Partner arbeitet 40 Stunden. UI erkennt korrekt, dass kein Partnerschaftsbonus möglich ist. Der Optimizer erzeugt und zeigt trotzdem Varianten mit Partnerschaftsbonus an.

**Ziel:** Faktenbasierte Klärung, warum fachlich unzulässige Partnerschaftsbonus-Varianten im Optimizer als gültige Kandidaten durchgehen.

---

## 1. Regel für Partnerschaftsbonus (max. ≤ 32h)

### Fundstellen der 32h-Prüfung

| Datei | Funktion | Prüfung |
|-------|----------|---------|
| `calculationEngine.ts` | `calculateMonthlyElterngeld` (Zeilen ~98–106) | `hoursPerWeek > 32` → Hinzufügen einer **Warnung** (keine Ablehnung) |
| `partnerBonusValidation.ts` | `validatePartnerBonus` (Zeilen ~78–86, ~94–105) | Stunden außerhalb 24–32 → `aHoursOk`/`bHoursOk` false, `hasHourWarnings` true, **`isValid` = false** |

### Verwendete Daten

- `partnerBonusValidation.ts`: Liest `plan.parents[i].months[j].hoursPerWeek` für Monate mit `mode === 'partnerBonus'`.
- `calculationEngine.ts`: Nutzt `ParentMonthInput.hoursPerWeek` aus dem Plan für die monatliche Berechnung.

---

## 2. Datenfluss der Stunden

### Speicherung im Wizard-State

- `values.parentA.hoursPerWeek` / `values.parentB.hoursPerWeek`
- `values.parentA.plannedPartTime` / `values.parentB.plannedPartTime` (Boolean für Teilzeit)

### Umwandlung in Berechnungsplan

**Datei:** `applicationToCalculationPlan.ts`

- `hoursA = app.parentA.plannedPartTime ? app.parentA.hoursPerWeek : undefined`
- `hoursB = app.parentB.plannedPartTime ? app.parentB.hoursPerWeek : undefined`
- `createMonths(count, partnerMode, model, hours)` setzt pro Monat `hoursPerWeek: hours`

### Weitergabe an Optimizer

- `buildOptimizationResult(plan, result, goal)` erhält `plan` von `applicationToCalculationPlan(values)`.
- `plan.parents[i].months[j].hoursPerWeek` enthält die Benutzer-Stunden (z.B. 40).

### Ergebnis

**Ja** – die Stunden kommen im Optimizer an. Der Plan enthält `hoursPerWeek: 40` in den Monaten des Partners.

---

## 3. Erzeugung von partnerBonus-Kandidaten

### Relevante Funktionen in `elterngeldOptimization.ts`

| Funktion | Zeile | Verhalten |
|----------|-------|-----------|
| `addReferenceConfigCandidates` | ~469–566 | Erzeugt `bothPlusWithBonus`-Pläne via `createReferencePlan` mit **festem** `hoursForBonus = 28`. **Ignoriert Nutzer-Stunden.** |
| `addPartnerBonusOverlapCandidates` | ~1200–1260 | Kopiert Monate von Plan, verwendet `src.hoursPerWeek ?? 28` → **behält Nutzer-Stunden (40)**. |
| `tryAddPartnerBonus` | ~1475–1520 | Setzt `partnerBonus`-Monate, nutzt `parent.months[idx].hoursPerWeek ?? 28` → **behält Nutzer-Stunden (40)**. |

### Konkrete Erzeugungspfade für `strategyType: 'partnerBonus'`

1. **addReferenceConfigCandidates** mit Config `bothPlusWithBonus`: `strategyType: 'withPartTime'` (nicht `'partnerBonus'`), nutzt 28h.
2. **addPartnerBonusOverlapCandidates**: Fügt Kandidaten mit `strategyType: 'partnerBonus'` hinzu, behält Nutzer-Stunden.
3. **tryAddPartnerBonus** (bei `goal === 'partnerBonus'`): Fügt Kandidaten mit `strategyType: 'partnerBonus'` hinzu, behält Nutzer-Stunden.

---

## 4. Validierung dieser Kandidaten

### Prüfung bei Erzeugung

- **addReferenceConfigCandidates** (Zeilen 496–497, 554–555): `if (!res.validation.isValid) continue;`
- **addPartnerBonusOverlapCandidates**: Keine Prüfung von `res.validation.isValid` vor `addIfNew`.
- **tryAddPartnerBonus** (Zeilen 1037–1039): Keine Prüfung von `res.validation.isValid` vor `addIfNew`.

### Definition von `validation.isValid` in `calculationEngine.ts` (Zeile 296–298)

```ts
validation: {
  isValid: errors.length === 0,
  errors,
  warnings: globalWarnings,
},
```

- `errors`: nur aus frühen Plausibilitätsprüfungen (z.B. Grenze 14 Monate Basis).
- `partnerBonusValidation`: liefert `isValid: false` bei >32h, wird aber **nicht** in `errors` übernommen.
- Nur Warnings werden ergänzt (Zeilen 283–288).
- Bei Stunden >32h bleibt `errors.length === 0` → **`validation.isValid` = true**.

### Ergebnis

- Die 32h-Regel wird in `partnerBonusValidation` fachlich geprüft.
- Das Ergebnis dieser Prüfung (`isValid: false`) fließt **nicht** in `validation.isValid` ein.
- Der Optimizer behandelt solche Pläne daher als gültig.

---

## 5. Vergleich mit UI-Validierung

### UI: `PartnerBonusCheckDialog.tsx`

- Nutzt `validation` aus `calculatePlan(plan)` bzw. dem berechneten Ergebnis.
- Prüft `validation.isValid` und `warnings.some((w) => w.includes('24–32') || w.includes('Wochenstunden'))`.
- Zeigt korrekt „kein Partnerschaftsbonus möglich“, wenn Stunden außerhalb 24–32 liegen.

### Unterschied

- Die UI nutzt **dieselben** Validierungsdaten (`validation`, `warnings`) wie der Optimizer.
- Der Optimizer filtert aber **nicht** anhand von `validation.isValid` oder Partnerbonus-Warnungen.
- Zusätzlich: `validation.isValid` bleibt trotz `partnerBonusValidation.isValid === false` true, weil nur `errors` berücksichtigt werden.

---

## 6. Erster echter Bruchpunkt

**Datei:** `calculationEngine.ts`  
**Funktion:** `calculatePlan`  
**Zeilen:** 296–298

### Was passiert

`validation.isValid` wird ausschließlich aus `errors.length === 0` berechnet. `partnerBonusValidation.isValid` wird nur für Warnings genutzt, nicht für `errors` oder `validation.isValid`.

### Konsequenz

- Pläne mit >32h in Partnerbonus-Monaten erhalten weiterhin `validation.isValid: true`.
- `addPartnerBonusOverlapCandidates` und `tryAddPartnerBonus` prüfen `validation.isValid` gar nicht.
- Selbst wenn sie prüfen würden, würde eine solche Prüfung wegen des falschen `validation.isValid` nichts bewirken.

### Einordnung

**B – Regel wird im Optimizer nicht geprüft**

- Die 32h-Regel wird in `partnerBonusValidation` geprüft.
- Das Ergebnis wird aber nicht in `validation.isValid` übernommen.
- Im Optimizer existiert keine wirksame Filterung nach der 32h-Regel.
- Die Ursache liegt in der Berechnung von `validation.isValid` in `calculationEngine.ts`, nicht in fehlenden oder falschen Stunden.

---

## 7. Ergebnis

| Frage | Antwort |
|-------|---------|
| Wo wird die 32h-Regel geprüft? | `partnerBonusValidation.ts` (`validatePartnerBonus`) und `calculationEngine.ts` (`calculateMonthlyElterngeld`, nur als Warnung) |
| Gelangen die Stunden in den Optimizer? | **Ja** – über `applicationToCalculationPlan` in `plan.parents[*].months[*].hoursPerWeek` |
| Wird die Regel im Optimizer angewendet? | **Nein** – `partnerBonusValidation.isValid` fließt nicht in `validation.isValid` ein; Optimizer filtert nicht danach |
| Erste Bruchstelle | `calculationEngine.ts`, `calculatePlan`, Zeilen 296–298 |
| Einordnung | **B** – Regel wird im Optimizer nicht wirksam geprüft |

---

## Zusammenfassung

Die 32h-Regel wird in `partnerBonusValidation` fachlich korrekt ausgewertet, das Ergebnis (`isValid: false`) wird aber nicht in die gemeinsame `validation.isValid` übernommen. Dadurch erscheinen Partnerbonus-Pläne mit >32h weiterhin als gültig, und der Optimizer filtert sie nicht aus, da er sich auf `validation.isValid` verlässt und diese in diesem Fall unbrauchbar ist.
