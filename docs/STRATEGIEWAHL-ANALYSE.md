# Strategiewahl-Screen – Analyse & Validierung

## PHASE 1 – ANALYSE

### Ort des Screens
- **OptimizationOverlay** mit `view='strategy'` → **StepOptimizationBlock** mit `skipToStrategyStep`, `hideDiscardButton`, `hideBackButton`
- Datenquelle: **stepDecisionFlow.ts** → Schritt 3 (`kind: 'optimization'`)

### Angezeigte Optionen
| strategyType | Label (GOAL_LABELS) |
|--------------|---------------------|
| maxMoney | Mehr Gesamtauszahlung |
| longerDuration | Längere Bezugsdauer |
| frontLoad | Am Anfang mehr Geld |
| current | Aktueller Plan (falls keine Alternativen) |

### Fälle mit nur 1 Option
**JA.** Wenn `step3Options.length === 0` (keine Alternativen zu currentResult):
- `step3OptionsFinal = [step3Ctx.options[0]]` → genau 1 Option
- `step3HasRealChoice = false`

### Verwendete Texte

**Bei mehreren Optionen:**
- stepQuestion: „Welches Ziel ist dir wichtiger?“
- stepDescription: „Optimiere innerhalb deiner gewählten Aufteilung.“

**Bei nur 1 Option:**
- stepQuestion: „Deine Variante“
- stepDescription: „Dein aktueller Plan ist bereits gut zu deinem gewählten Modell. Du kannst ihn übernehmen oder die Monatsaufteilung anpassen.“
- nextStepHint: „Du kannst diese Variante übernehmen oder die Monatsaufteilung anpassen.“

### Buttons
- „Diese Variante übernehmen“ (primär, wenn `canAdopt`)
- „Optimierung schließen“ (sekundär)
- Kein Zurück-Button (hideBackButton)
- Kein „Aktuellen Plan beibehalten“ (hideDiscardButton)

### Navigation zu Monats-UI
- **Nein** – `onNavigateToMonthEditing` wird im Overlay nicht übergeben.
- **ABER:** stepDescription bei 1 Option erwähnt explizit „Monatsaufteilung anpassen“.

### Monatsdetails in den Optionen
- **OptionCard** zeigt `planChangeLines` = `getResultChangePreviewUserFriendly()`:
  - z.B. „Monat 3–5 wird zu ElterngeldPlus mit beiden Eltern“
  - „Geänderte Monate und Verteilung“ / „Was wird geändert“
- **R3-Verletzung:** Monats-Level-Details werden angezeigt.

### Implizite Vorauswahl
- `step3Selected = Math.max(0, Math.min(preSelected[2] ?? 0, ...))` → immer ≥ 0
- Beim Skip: `selectedOptionPerStep = [0, 0]` → erste Option ist vorausgewählt
- **R5-Verletzung:** Eine Option wird als bereits gewählt dargestellt.

---

## PHASE 2 – VALIDIERUNG GEGEN REGELN

### R1 – Keine Schein-Auswahl
| Regel | Status | Befund |
|-------|--------|--------|
| Bei nur 1 Option: Kein „Was ist dir wichtiger?“ | ✅ | Es wird „Deine Variante“ gezeigt |
| Bei nur 1 Option: Kein Auswahl-Screen | ❌ | Es wird trotzdem 1 Option als klickbare Card angezeigt → Schein-Auswahl |

### R2 – Jede Option muss sich unterscheiden
| Regel | Status | Befund |
|-------|--------|--------|
| Sichtbarer Unterschied (Geld/Dauer/Verteilung) | ⚠️ | impact (Delta) wird angezeigt; planChangeLines zeigen Monatsdetails statt Ziel-Ebene |

### R3 – Keine Vermischung mit Monatslogik
| Regel | Status | Befund |
|-------|--------|--------|
| Keine Monatsänderungen zeigen | ❌ | planChangeLines: „Monat X–Y wird zu …“ |
| Keine Monatskarten | ✅ | Keine Monatskarten |
| Nur Ziel-Ebene | ❌ | stepDescription bei 1 Option: „Monatsaufteilung anpassen“ |

### R4 – Klare Entscheidungsfrage
| Regel | Status | Befund |
|-------|--------|--------|
| „Was ist dir wichtiger?“ oder sinngemäß | ✅ | Bei mehreren Optionen: „Welches Ziel ist dir wichtiger?“ |
| Keine technische Sprache | ✅ | Labels sind nutzerfreundlich |

### R5 – Keine impliziten Entscheidungen
| Regel | Status | Befund |
|-------|--------|--------|
| Keine automatische Übernahme | ✅ | Keine Auto-Übernahme |
| Keine Option als bereits gewählt darstellen | ❌ | Erste Option ist immer vorausgewählt (selectedOptionIndex ≥ 0) |

### R6 – Button-Logik eindeutig
| Regel | Status | Befund |
|-------|--------|--------|
| Klick auf Option = Auswahl | ✅ | OptionCard ist klickbar |
| Führt zur Variantenliste | ⚠️ | Nach Auswahl: „Diese Variante übernehmen“ – keine explizite „Variantenliste“ |
| Keine andere Nebenwirkung | ✅ | Keine |

---

## ZUSAMMENFASSUNG DER VERLETZUNGEN

1. **R1:** Bei nur 1 Option wird ein Auswahl-Screen mit 1 Option gezeigt (Schein-Auswahl).
2. **R3:** Monatsdetails in OptionCards (planChangeLines); stepDescription erwähnt „Monatsaufteilung anpassen“.
3. **R5:** Erste Option ist automatisch vorausgewählt.

---

## PHASE 3 – UMSETZUNGSEMPFEHLUNGEN

### FALL 1: Mehrere Strategien (step3HasRealChoice)
- Keine Vorauswahl: `selectedOptionIndex = -1` bis Nutzer klickt.
- OptionCards ohne Monatsdetails: Nur Ziel-Ebene (Geld, Dauer, Verteilung) – keine planChangeLines mit „Monat X–Y“.
- Klare Frage beibehalten: „Welches Ziel ist dir wichtiger?“

### FALL 2: Nur eine Strategie sinnvoll
- **Kein** Auswahl-Screen mit 1 Option.
- Stattdessen: Hinweis „Für eure Situation gibt es aktuell nur eine sinnvolle Variante.“ + kurze Erklärung.
- Button: „Variante ansehen“ (führt zur Variantendarstellung/Übernahme).

### Technische Änderungen
1. **stepDecisionFlow.ts:** Bei nur 1 Option anderen Pfad (kein Step mit 1 Option).
2. **StepOptimizationBlock:** Prop `hideMonthDetailsInStrategyStep` oder spezieller Render für Strategie-Step ohne planChangeLines.
3. **Vorauswahl:** Bei skipToStrategyStep `selectedOptionIndex = -1` setzen, bis Nutzer wählt.
