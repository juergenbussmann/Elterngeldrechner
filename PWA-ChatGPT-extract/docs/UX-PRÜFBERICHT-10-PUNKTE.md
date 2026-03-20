# UX-Prüfbericht – 10 Punkte Umsetzung

**Stand:** Aktuelle PWA-Codebasis  
**Prüfdatum:** Technische Bestandsaufnahme

---

## 1. Zusammenfassung

### Vollständig korrekt umgesetzt
- **Punkt 2:** Haken/Aktivmarker rechts positioniert (elterngeld-select-btn__check)
- **Punkt 3:** Buttontext „Plan speichern – weiter zur Berechnung“ in StepSummary
- **Punkt 5:** Zahlenfelder Einkommen – IncomeInput mit leerem Feld, €-Hinweis (Berechnung)
- **Punkt 7:** Partnerbonus als Zusatzoption (Checkbox statt Hauptziel)
- **Punkt 8:** Doppelte Vorschläge gefiltert (resultFingerprint + planFingerprint)
- **Punkt 9:** Button „Zurück zur Optimierung“ in Nav und im Optimierungsblock

### Teilweise umgesetzt
- **Punkt 1:** Aktive Buttons – global in elterngeld-ui.css, aber Inkonsistenz bei elterngeld-plan__panel-btn (Padding für Check links statt rechts)
- **Punkt 4:** Dialog-Stil – Panel nutzt App-Tokens, aber elterngeld-plan__panel-check ist toter Code (links positioniert, wird nicht genutzt)
- **Punkt 6:** Farblogik – positiv/negativ in Suggestion-Deltas; Differenz-Block bei goal=partnerBonus evtl. falsche Metrik (deltaMonths statt deltaBonus)
- **Punkt 10:** Buttons im Ergebnisbereich – elterngeld-nav hat Zusatz-Styles, aber panel-close nutzt natives `<button>` statt Button-Komponente

### Fehlt / Restprobleme
- **Punkt 5:** Vorbereitung (Wizard) – StepEinkommen, StepEinkommenMutter, StepEinkommenPartner nutzen weiterhin TextInput type="text" für incomeBeforeBirth (kein IncomeInput, kein €-Hinweis). Anforderung bezog sich auf „Einkommen im Lebensmonat“ – das ist nur in der Berechnung. Einkommen vor Geburt in der Vorbereitung ist davon nicht betroffen.
- **Punkt 1:** elterngeld-plan__panel-btn hat `padding: 0.75rem 1rem 0.75rem 2.5rem` (links 2.5rem) – Check ist aber rechts. Sollte `padding: 0.75rem 2.5rem 0.75rem 1rem` sein.

---

## 2. Prüfung pro UX-Punkt

### Punkt 1: Aktive Buttons überall klar sichtbar

| Aspekt | Status |
|--------|--------|
| **Umsetzung** | Teilweise |
| **Betroffene Dateien** | elterngeld-ui.css, ElterngeldWizardPage.css |
| **Global** | ElterngeldSelectButton, elterngeld-tile, suggestion-card, panel-btn nutzen verstärkten Active-State |
| **Restprobleme** | • elterngeld-plan__panel-btn: Padding für Check links (2.5rem), Check ist aber rechts → falsches Layout<br>• elterngeld-plan__panel-check: Toter CSS-Code (links positioniert), wird von ElterngeldSelectButton nicht genutzt |
| **Konsistenz** | Nicht vollständig – Panel-Buttons in StepPlan (Vorbereitung) haben inkonsistentes Padding |

---

### Punkt 2: Haken / Aktivmarker an der richtigen Stelle

| Aspekt | Status |
|--------|--------|
| **Umsetzung** | Vollständig |
| **Betroffene Dateien** | elterngeld-ui.css, ElterngeldSelectButton.tsx |
| **Änderung** | elterngeld-select-btn__check: `right: 1rem`, Check im DOM nach dem Label |
| **Restprobleme** | Keine |
| **Konsistenz** | Global – alle ElterngeldSelectButton-Instanzen nutzen dieselbe Komponente |

---

### Punkt 3: Buttontext „Plan speichern – weiter zur Berechnung“

| Aspekt | Status |
|--------|--------|
| **Umsetzung** | Vollständig |
| **Betroffene Dateien** | StepSummary.tsx (Zeile 101) |
| **Kontext** | Vorbereitung (Wizard) – Ergebnis-Screen vor Navigation zur Berechnung |
| **Restprobleme** | Keine |
| **Konsistenz** | Einzige Stelle, korrekt umgesetzt |

---

### Punkt 4: Dialog-/Card-Stil an App-Stil angeglichen

| Aspekt | Status |
|--------|--------|
| **Umsetzung** | Teilweise |
| **Betroffene Dateien** | ElterngeldWizardPage.css (elterngeld-plan__panel, elterngeld-plan__panel-close) |
| **Änderungen** | Panel nutzt --pill-bg-top, --pill-border, --pill-radius, --pill-shadow; Schließen-Button mit App-Button-Stil |
| **Restprobleme** | • elterngeld-plan__panel-check: Toter Code, kann entfernt werden<br>• panel-close: Nutzt natives `<button>`, nicht Button-Komponente – aber Styling angeglichen |
| **Konsistenz** | Panel-Stil entspricht App-Cards; beide Panels (StepPlan, CalculationMonthPanel) nutzen dieselben Klassen |

---

### Punkt 5: Zahlenfelder für Einkommen korrigiert

| Aspekt | Status |
|--------|--------|
| **Umsetzung** | Vollständig (für Berechnung) |
| **Betroffene Dateien** | IncomeInput.tsx (neu), elterngeld-ui.css, CalculationMonthPanel.tsx, StepCalculationInput.tsx |
| **Abgedeckt** | • Einkommen vor Geburt (StepCalculationInput)<br>• Einkommen im Lebensmonat (CalculationMonthPanel) |
| **Nicht abgedeckt** | Vorbereitung: StepEinkommen, StepEinkommenMutter, StepEinkommenPartner – incomeBeforeBirth als string, TextInput type="text". Kein blockierender 0-Wert, da Textfeld. Anforderung bezog sich auf „Einkommen im Lebensmonat“ – nur Berechnung. |
| **Restprobleme** | Keine für den definierten Scope |
| **Konsistenz** | IncomeInput als zentrale Komponente für numerische Einkommensfelder in der Berechnung |

---

### Punkt 6: Farblogik der Optimierungsergebnisse

| Aspekt | Status |
|--------|--------|
| **Umsetzung** | Teilweise |
| **Betroffene Dateien** | StepCalculationResult.tsx, ElterngeldWizardPage.css |
| **Änderungen** | • suggestion-delta-line--positive: #166534 (dunkles Grün)<br>• suggestion-delta-line--negative: #b91c1c (Rot)<br>• optimization-differenz--positive/--negative für Differenz-Block |
| **Restprobleme** | • Bei goal=partnerBonus: Differenz-Farbe nutzt deltaMonths/deltaTotal. Verbesserung bei Partnerbonus kann aber über Bonus-Monate laufen – Metrik evtl. nicht passend. |
| **Konsistenz** | Suggestion-Deltas konsistent; Differenz-Block bei partnerBonus möglicherweise falsche Metrik |

---

### Punkt 7: Partnerbonus als Zusatzoption

| Aspekt | Status |
|--------|--------|
| **Umsetzung** | Vollständig |
| **Betroffene Dateien** | OptimizationGoalDialog.tsx |
| **Änderung** | Hauptziele: maxMoney, longerDuration. Checkbox „Zusätzlich: Partnerschaftsbonus prüfen“. Bei Check: goal=partnerBonus, sonst mainGoal. |
| **Restprobleme** | Keine |
| **Konsistenz** | UI klar; bestehende buildOptimizationResult-Logik unverändert |

---

### Punkt 8: Doppelte identische Vorschläge entfernt

| Aspekt | Status |
|--------|--------|
| **Umsetzung** | Vollständig |
| **Betroffene Dateien** | elterngeldOptimization.ts (selectTop3, resultFingerprint) |
| **Änderung** | Zusätzlich zu planFingerprint: resultFingerprint (total-duration-bonus). Beide Filter aktiv. |
| **Restprobleme** | Keine |
| **Konsistenz** | Duplikate werden konsistent ausgefiltert |

---

### Punkt 9: Button „Zurück zur Optimierung“

| Aspekt | Status |
|--------|--------|
| **Umsetzung** | Vollständig |
| **Betroffene Dateien** | ElterngeldCalculationPage.tsx, StepCalculationResult.tsx (OptimizationComparisonBlock) |
| **Vorkommen** | • Nav unter Ergebnis (wenn optimizationGoal gesetzt)<br>• Im Optimierungsblock (onBackToOptimization) |
| **Restprobleme** | Keine |
| **Konsistenz** | Beide Stellen öffnen den Optimierungsdialog |

---

### Punkt 10: Buttons in Tabellen-/Ergebnisbereichen

| Aspekt | Status |
|--------|--------|
| **Umsetzung** | Teilweise |
| **Betroffene Dateien** | ElterngeldWizardPage.css (elterngeld-nav) |
| **Änderungen** | elterngeld-nav .next-steps__button: min-height 48px, pill-padding, font-weight 600 |
| **Restprobleme** | • panel-close: Eigenes Styling, kein btn--softpill – optisch angeglichen, aber nicht dieselbe Komponente<br>• „Zurück zur Eingabe“ nutzt btn--softpill – konsistent |
| **Konsistenz** | Nav-Buttons konsistent; Panel-Close abweichend, aber optisch angepasst |

---

## 3. Zentrale Komponenten & Styles

### Verwendete globale Komponenten
- **ElterngeldSelectButton** – überall für Auswahlbuttons (StepPlan, StepElternArbeit, StepGeburtKind, CalculationMonthPanel, OptimizationGoalDialog, ElterngeldCalculationPage)
- **MonthTile / MonthGrid** – für Monatsansicht
- **IncomeInput** – für Einkommensfelder in der Berechnung (neu)
- **Button** (shared/ui) – für Aktionen
- **Card** (still-daily-checklist__card) – für Karten
- **TextInput** – für Text/Nummer (zusätzlich zu IncomeInput)

### Doppelte UI-Muster
- **elterngeld-plan__panel-check** – toter Code, wird nicht verwendet (ElterngeldSelectButton nutzt elterngeld-select-btn__check)
- **panel-btn vs. base select-btn** – panel-btn überschreibt Padding; Check-Position (rechts) und Padding (links 2.5rem) passen nicht zusammen

### Alte Styles zum Entfernen
- `.elterngeld-plan__panel-check` (Zeilen 334–341 in ElterngeldWizardPage.css) – ungenutzt

---

## 4. Fachlogik-Sicherheit

### Berechnungslogik unverändert
- **calculatePlan** – keine Änderungen
- **calculationEngine.ts** – keine Änderungen
- **elterngeldOptimization.ts** – nur Duplikatfilter (resultFingerprint) ergänzt, keine Änderung der Optimierungslogik

### Datenstruktur unverändert
- **ElterngeldApplication** – unverändert
- **elterngeldTypes** – unverändert
- **benefitPlan** – unverändert
- **ElterngeldCalculationPlan** – unverändert
- **applicationToCalculationPlan** – unverändert

### Keine neuen Fachfelder
- Keine neuen Felder in ElterngeldApplication, benefitPlan oder CalculationPlan
- IncomeInput ist reine UI-Komponente; Modellwert bleibt number (0 bei leer)

---

## 5. Konkrete Restarbeiten

| # | Datei | Änderung |
|---|-------|----------|
| 1 | ElterngeldWizardPage.css | `.elterngeld-plan__panel-btn` Padding anpassen: `padding: 0.75rem 2.5rem 0.75rem 1rem` (Check rechts) |
| 2 | ElterngeldWizardPage.css | `.elterngeld-plan__panel-check` entfernen (toter Code) |
| 3 | StepCalculationResult.tsx | Optional: Bei goal=partnerBonus Differenz-Farbe anhand deltaPartnerBonus statt deltaMonths/deltaTotal setzen (falls gewünscht) |

---

**Fazit:** 6 von 10 Punkten sind vollständig umgesetzt. 4 Punkte haben kleinere Restprobleme (Padding, toter Code, optionale Metrik-Anpassung). Fachlogik und Datenstruktur sind unverändert.
