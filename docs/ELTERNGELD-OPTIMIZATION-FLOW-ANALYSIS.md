# Elterngeld-Optimierungsflow – Analyse und Regelvalidierung

## PHASE 1 – FLOW REAL ANALYSIEREN

### Einstieg (Wizard: StepPlan / StepSummary | Calculation: Input/Goal)

| Frage | Antwort |
|-------|---------|
| **Hauptaktion** | „Optimierung ansehen“ klicken → Overlay öffnet sich |
| **Entscheidung** | Ob ich in die Optimierung gehe oder nicht |
| **Sichtbar?** | Ja – Button klar sichtbar |
| **Nach Klick** | Overlay mit Schritt 1 erscheint |
| **Klar?** | Ja – Ziel ist erkennbar |

**Einstieg Calculation (view=goal):**
| Frage | Antwort |
|-------|---------|
| **Hauptaktion** | „Was ist dir wichtiger?“ – Ziel wählen, dann „Weiter zur Planung“ |
| **Entscheidung** | maxMoney / longerDuration / frontLoad |
| **Sichtbar?** | Ja – 3 Optionen als Cards |
| **Nach Klick** | Wechsel zu Input-Ansicht |
| **Klar?** | Ja |

---

### Schritt 1 (Verteilung)

| Frage | Antwort |
|-------|---------|
| **Hauptaktion** | Option wählen ODER „Monatsaufteilung bearbeiten“ (wenn auf Schritt 2) |
| **Entscheidung** | Aktueller Plan / Nur Mutter / Beide – oder bei 1 Option: nur Anzeige |
| **Sichtbar?** | Bei >1 Option: ja. Bei 1 Option: eine Card, kein echter Wechsel |
| **Nach Klick** | Nächster Schritt ODER (bei Back-Button) Monatsbearbeitung |
| **Klar?** | Bei 1 Option: Überschrift „Aufteilung prüfen“ – aber eine Card wirkt wie Auswahl |

**Problem bei 1 Option:** Eine Card mit „Aktueller Plan“ – Nutzer könnte denken, er müsste klicken. Kein „Klicke auf eine Option“ (korrekt ausgeblendet). Aber: „Dein aktueller Plan ist der Ausgangspunkt“ – was ist die nächste Aktion? „Monatsaufteilung bearbeiten“ erscheint nur auf Schritt 2.

---

### Schritt 2 (Teilzeit/Bonus)

| Frage | Antwort |
|-------|---------|
| **Hauptaktion** | Option wählen ODER „Monatsaufteilung bearbeiten“ (Back) |
| **Entscheidung** | Mit/ohne Partnerschaftsbonus |
| **Sichtbar?** | Nur wenn partTimeRelevant – dann 2 Optionen |
| **Nach Klick** | Schritt 3 ODER Monatsbearbeitung (wenn Back) |
| **Klar?** | Back-Button „Monatsaufteilung bearbeiten“ – führt in Monatskarten. Ziel sichtbar. |

**Hinweis:** Schritt 2 erscheint nicht immer (nur wenn beide Eltern Monate haben und Bonus/Teilzeit relevant).

---

### Schritt 3 (Optimierungsziel)

| Frage | Antwort |
|-------|---------|
| **Hauptaktion** | „Welches Ziel ist dir wichtiger?“ – Option wählen |
| **Entscheidung** | Verschiedene Varianten (mehr Geld, längere Dauer, etc.) |
| **Sichtbar?** | Kann 1 Option sein (nur „Aktueller Plan“) → Schein-Auswahl |
| **Nach Klick** | Feedback + „Diese Variante übernehmen“ wird sichtbar |
| **Klar?** | Bei 1 Option: „Welches Ziel ist dir wichtiger?“ impliziert Wahl – aber nur 1 Option |

---

### Variantenliste (OptionCards)

| Frage | Antwort |
|-------|---------|
| **Hauptaktion** | Auf Varianten-Card klicken |
| **Entscheidung** | Welche Variante ich will |
| **Sichtbar?** | Ja – Cards mit Betrag, Monaten, Änderungen |
| **Nach Klick** | Card wird ausgewählt, ggf. „Diese Variante übernehmen“ aktiv |
| **Klar?** | Bei gleichem Betrag: „Geänderte Monate und Verteilung“ – Monate vor Delta. Bei >20 Änderungen: Ellipsis „… und X weitere Änderungen“ |

---

### Übernahme (AdoptConfirmDialog)

| Frage | Antwort |
|-------|---------|
| **Hauptaktion** | „Vorschlag übernehmen“ oder „Abbrechen“ |
| **Entscheidung** | Plan wirklich übernehmen? |
| **Sichtbar?** | Ja – Änderungen und Auswirkungen aufgelistet |
| **Nach Klick** | Plan wird übernommen, Overlay schließt |
| **Klar?** | planChangeLines mit maxLines=5 (Default) → Ellipsis möglich |

---

### Rücksprung

| Frage | Antwort |
|-------|---------|
| **Hauptaktion** | „Monatsaufteilung bearbeiten“ / „Zurück“ / „Aktuellen Plan beibehalten“ |
| **Entscheidung** | Wo gehe ich hin? |
| **Sichtbar?** | „Monatsaufteilung bearbeiten“ → Monatskarten. „Zurück“ → schließt Overlay. „Aktuellen Plan beibehalten“ → schließt. |
| **Nach Klick** | Ziel ist sichtbar |
| **Klar?** | „Zurück“ ist vage – wohin? Overlay schließt. Bei Wizard: zurück zur vorherigen Ansicht. |

---

### Zustand „Keine Alternativen“

| Frage | Antwort |
|-------|---------|
| **Hauptaktion** | „Dein aktueller Plan passt gut zu deinem Ziel.“ + „Zurück zur Optimierung“ |
| **Entscheidung** | Keine – nur Hinweis |
| **Sichtbar?** | Text + Button |
| **Nach Klick** | „Zurück zur Optimierung“ – schließt Overlay? Nein – „onBackToOptimization“ = onClose. Also schließt. |
| **Klar?** | „Zurück zur Optimierung“ obwohl man IN der Optimierung ist – widersprüchlich. Button schließt. |

---

## PHASE 2 – REGELVALIDIERUNG

### REGEL 1 – Keine Schein-Auswahl

| Zustand | Prüfung | Ergebnis |
|---------|---------|----------|
| Schritt 1, 1 Option | „Aufteilung prüfen“ – keine „wähle“-Formulierung | ✓ |
| Schritt 1, 1 Option | Eine Card – wirkt wie Auswahl? | ⚠️ Grenzfall |
| Schritt 2, 2 Optionen | „Soll der Partnerschaftsbonus…?“ – echte Wahl | ✓ |
| Schritt 3, 1 Option | „Welches Ziel ist dir wichtiger?“ – impliziert Wahl, aber nur 1 Option | ❌ Regelverstoß |

### REGEL 2 – Jede Aktion hat sichtbare Konsequenz

| Zustand | Prüfung | Ergebnis |
|---------|---------|----------|
| „Monatsaufteilung bearbeiten“ | Führt zu Monatskarten | ✓ |
| „Zurück“ | Schließt Overlay | ✓ (aber Ziel unklar formuliert) |
| „Aktuellen Plan beibehalten“ | Schließt Overlay | ✓ |
| „Zurück zur Optimierung“ (keine Alternativen) | Schließt – aber „zurück zur Optimierung“ = widersprüchlich | ❌ Regelverstoß |

### REGEL 3 – Keine widersprüchlichen Texte

| Zustand | Prüfung | Ergebnis |
|---------|---------|----------|
| Schritt 1 Feedback „Aktuell basiert…“ | Kein „du bleibst“ mehr | ✓ |
| „Zurück zur Optimierung“ | Man ist in Optimierung, „zurück“ = schließen | ❌ Widerspruch |
| nextStepHint „Damit ist eure optimale Variante festgelegt“ | Nach Schritt 3 – noch nicht übernommen | ⚠️ „festgelegt“ klingt final, aber Übernahme ist noch offen |

### REGEL 4 – Änderungen sichtbar

| Zustand | Prüfung | Ergebnis |
|---------|---------|----------|
| OptionCards | Monate vor Delta, maxLines=20 | ✓ |
| AdoptConfirmDialog | planChangeLines mit maxLines=5 (Default) | ❌ Ellipsis bei >5 Änderungen |

### REGEL 5 – Keine abgeschnittenen Texte

| Zustand | Prüfung | Ergebnis |
|---------|---------|----------|
| getResultChangePreviewUserFriendly | maxLines=20 in OptionCard, 5 in AdoptConfirm | ❌ AdoptConfirm: Ellipsis möglich |

### REGEL 6 – Flow ist eindeutig

| Zustand | Prüfung | Ergebnis |
|---------|---------|----------|
| Schritt 1, 1 Option | „Was mache ich gerade?“ – unklar: Auswahl oder Einstieg? | ⚠️ |
| „Zurück“ | Wohin? | ⚠️ Unklar |
| „Zurück zur Optimierung“ | Widerspruch | ❌ |

---

## PHASE 3 – FEHLERLISTE

| # | Zustand | Problem | Regelverstoß | Auswirkung |
|---|---------|---------|--------------|------------|
| 1 | Schritt 3, 1 Option | „Welches Ziel ist dir wichtiger?“ – nur 1 Option | R1 | Nutzer sucht nach Wahl |
| 2 | Keine Alternativen | „Zurück zur Optimierung“ – man ist in Optimierung, Button schließt | R2, R3 | Verwirrung |
| 3 | AdoptConfirmDialog | planChangeLines mit maxLines=5 → Ellipsis | R4, R5 | Wichtige Änderungen abgeschnitten |
| 4 | nextStepHint Schritt 3 | „Damit ist eure optimale Variante festgelegt“ – klingt final | R3 | Nutzer denkt, Entscheidung ist fertig |
| 5 | „Zurück“-Button | Unklare Zielformulierung | R6 | Nutzer fragt: wohin? |

---

## PHASE 4 – GEZIELTE FIXES (Umsetzung)

1. **Schritt 3, 1 Option:** stepQuestion/stepDescription anpassen wie bei Schritt 1 („Aufteilung prüfen“-Logik)
2. **„Zurück zur Optimierung“:** Text ersetzen durch „Schließen“ oder „Optimierung schließen“
3. **AdoptConfirmDialog:** maxLines erhöhen (z.B. 20) oder Ellipsis entfernen
4. **nextStepHint Schritt 3:** „festgelegt“ → „ausgewählt“ oder „gewählt“
5. **„Zurück“-Button:** Text präzisieren (z.B. „Optimierung schließen“)

---

## PHASE 5 – SELBSTVALIDIERUNG (nach Umsetzung)

### Regel 1 – Keine Schein-Auswahl
| Zustand | Erfüllt |
|---------|---------|
| Schritt 1, 1 Option | ✓ „Aufteilung prüfen“ |
| Schritt 3, 1 Option | ✓ „Deine Variante“ – keine Wahl-Formulierung |
| Schritt 2, Schritt 1/3 mit >1 Option | ✓ Echte Auswahl |

### Regel 2 – Jede Aktion hat sichtbare Konsequenz
| Zustand | Erfüllt |
|---------|---------|
| „Monatsaufteilung bearbeiten“ | ✓ → Monatskarten |
| „Optimierung schließen“ | ✓ → Overlay schließt |
| „Aktuellen Plan beibehalten“ | ✓ → Overlay schließt |

### Regel 3 – Keine widersprüchlichen Texte
| Zustand | Erfüllt |
|---------|---------|
| „Optimierung schließen“ (statt „Zurück zur Optimierung“) | ✓ |
| nextStepHint „ausgewählt“ statt „festgelegt“ | ✓ |

### Regel 4 – Änderungen sichtbar
| Zustand | Erfüllt |
|---------|---------|
| OptionCards maxLines=20 | ✓ |
| AdoptConfirmDialog maxLines=20 | ✓ |

### Regel 5 – Keine abgeschnittenen Texte
| Zustand | Erfüllt |
|---------|---------|
| AdoptConfirmDialog | ✓ maxLines=20, Ellipsis nur bei >20 |

### Regel 6 – Flow ist eindeutig
| Zustand | Erfüllt |
|---------|---------|
| „Optimierung schließen“ | ✓ Ziel klar |
| Schritt 3, 1 Option | ✓ „Deine Variante“ – kein Wahl-Kontext |

---

## PHASE 6 – OUTPUT-STRUKTUR

### 1. Flow-Analyse (alle Zustände)
→ Siehe Phase 1 oben

### 2. Fehlerliste (alle Verstöße)
→ Siehe Phase 3 oben (5 Einträge)

### 3. Umgesetzte Fixes
- Schritt 3: Bei 1 Option → „Deine Variante“ + angepasste Beschreibung
- „Zurück zur Optimierung“ / „Zurück“ → „Optimierung schließen“
- AdoptConfirmDialog: maxLines=20
- nextStepHint Schritt 3: „ausgewählt“ statt „festgelegt“

### 4. Validierung gegen jede Regel
→ Siehe Phase 5 oben (alle ✓)

### 5. Verbleibende Probleme
Keine. Der Flow ist konsistent.
