# Globales UI-Designsystem (Bild 2 – Softpill/Beige)

## TEAMLEITER Output – SSoT Bild-2 Style → Tokens → Komponenten-Mapping

### 1. Fundstelle Bild-2 UI (Design-SSoT)

**Dateien + Klassen:**

| Element | Datei | Klassen |
|---------|-------|---------|
| **Notiz-Dialog** („Neue Notiz“, „Notizinhalt (optional)“, „Speichern“, „Abbrechen“) | `src/modules/notes/ui/NotesPage.tsx` | `.notes__composer`, `.notes__composer-card`, `.notes__composer-title`, `.notes__composer-body`, `.notes__composer-actions` |
| **Card/Modal Surface** | `src/modules/checklists/styles/softpill-cards.css` | `.screen-placeholder .still-daily-checklist__card` |
| **Input/Textarea Surface** | `src/modules/notes/ui/NotesPage.css` | `.notes__composer-title`, `.notes__composer-body`, `.note-item__inline-title`, `.note-item__inline-body` |
| **Buttons** | `src/modules/checklists/styles/softpill-buttons-in-cards.css`, `src/styles/layout.css` | `.btn--softpill`, `.screen-placeholder .still-daily-checklist__card button` |
| **Tokens-Quelle** | `src/styles/tokens.css` | `--pill-bg-top`, `--pill-border`, `--pill-shadow`, `--pill-inset`, etc. |

**Exakte Styles aus Bild-2:**

- **Container/Modal:** `background: rgba(255,255,255,0.65)`, `border: 1px solid rgba(255,255,255,0.55)`, `border-radius: 22px`, `box-shadow: 0 10px 24px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.55)`
- **Input/Textarea:** `border-radius: 14px` (Titel) / `10px` (Body), `border: 1px solid var(--color-border)`, `padding: 0.75rem 1rem` / `0.6rem 0.75rem`
- **Buttons:** `border-radius: 999px`, `background: linear-gradient(180deg, var(--pill-bg-top), var(--pill-bg-bottom))`, `border: 1px solid var(--pill-border)`, `box-shadow: var(--pill-shadow), var(--pill-inset)`, `padding: 0.85rem 1rem`

---

### 2. Token-Liste (`src/styles/ui-tokens.css`)

| Token | Wert (Light) | Herkunft |
|-------|--------------|----------|
| `--ui-surface-1` | rgba(255, 248, 240, 0.92) | pill-bg-top |
| `--ui-surface-2` | rgba(244, 233, 220, 0.88) | pill-bg-bottom |
| `--ui-border` | rgba(180, 150, 120, 0.25) | pill-border |
| `--ui-border-hover` | rgba(170, 135, 100, 0.35) | pill-border-hover |
| `--ui-border-focus` | rgba(160, 120, 85, 0.45) | pill-focus |
| `--ui-shadow` | 0 10px 24px rgba(140, 110, 80, 0.18) | pill-shadow |
| `--ui-shadow-hover` | 0 16px 34px rgba(140, 110, 80, 0.22) | pill-shadow-hover |
| `--ui-shadow-active` | 0 8px 18px rgba(120, 95, 70, 0.22) | pill-shadow-active |
| `--ui-inset` | inset 0 1px 0 rgba(255, 255, 255, 0.6) | pill-inset |
| `--ui-inset-hover` | inset 0 1px 0 rgba(255, 255, 255, 0.7) | pill-inset-hover |
| `--ui-inset-active` | inset 0 1px 0 rgba(255, 255, 255, 0.5) | pill-inset-active |
| `--ui-selected-border` | rgba(255, 255, 255, 0.75) | layout.css --softpill-selected-border |
| `--ui-selected-shadow` | 0 10px 24px rgba(0,0,0,0.1), inset..., 0 0 0 2px rgba(255,255,255,0.35) | layout.css --softpill-selected-shadow |
| `--ui-radius-card` | 22px | softpill-cards |
| `--ui-radius-pill` | 999px | btn--softpill |
| `--ui-radius-control` | 18px | pill-radius |
| `--ui-pad-card` | 1rem | spacing |
| `--ui-pad-control` | 0.85rem 1rem | pill-padding |
| `--ui-focus` | rgba(160, 120, 85, 0.45) | pill-focus |
| `--ui-focus-ring` | rgba(160, 120, 85, 0.16) | phase-search:focus |
| `--ui-font-weight-cta` | 650 | btn--softpill |

---

### 3. Basisklassen (`src/styles/ui-components.css`)

| Klasse | Beschreibung |
|--------|--------------|
| `.ui-card` | Card-Flächen wie Bild 2 |
| `.ui-control` | Inputs/Textareas |
| `.ui-btn` | Button-Basis |
| `.ui-btn--pill` | Pilliger Button |
| `.ui-btn--full` | Volle Breite |
| `.ui-btn--ghost` | Dezenter Button |
| `.ui-btn:disabled` / `.ui-btn--disabled` | Deaktivierter Zustand |
| `.ui-chip` | Paycards/Plan-Optionen |
| `.ui-chip--selected` | Ausgewählter Chip (outline/border/shadow, kein neuer Hintergrund) |

**Interactions:** hover (brightness/shadow), active (translateY), focus-visible (outline via --ui-focus).

---

### 4. Gemappte Komponenten

| Komponente | Mapping |
|------------|---------|
| **`<Button>`** | Standard: `ui-btn ui-btn--pill`; `variant="ghost"` → `ui-btn ui-btn--ghost`; `fullWidth` → `ui-btn--full`. Keine Inline-Styles mehr bei token-basiertem Look. |
| **`<TextInput>`** | Standard: `ui-control` (immer). Keine Theme-Inline-Styles. |
| **`<TextArea>`** | Standard: `ui-control` (immer). Keine Theme-Inline-Styles. |
| **`<Card>`** | Bei `className` mit `still-daily-checklist__card` oder `ui-card`: nur `padding`, keine visuellen Inline-Styles. Overrides in `overrides-checklists-softpill.css` liefern den Bild-2 Look. |

---

### 5. Diff BegleitungPlusUpsellPanel (Paycards)

**Änderungen:**

- Plan-Optionen nutzen bereits `ui-chip` und `ui-chip--selected`.
- Buttons: `className="btn--softpill"` entfernt – Button nutzt jetzt standardmäßig `ui-btn ui-btn--pill`.
- Keine konkurrierenden Klassen (`softpill-surface`, `btn--softpill`) mehr an den Paycard-Buttons.

**Datei:** `src/core/begleitungPlus/ui/BegleitungPlusUpsellPanel.tsx`

---

### 6. Globale Einbindung

**Reihenfolge in `AppRoot.tsx`:**

1. `tokens.css`
2. `ui-tokens.css`
3. `ui-components.css`
4. `dark-theme-overrides.css`
5. `layout.css`
6. `home-landing.css`
7. `overrides-checklists-softpill.css`

`ui-tokens` vor `ui-components`, `ui-components` vor Feature-CSS.

---

### 7. Audit – keine harten Fremdwerte

- **BegleitungPlusUpsellPanel / Upsell:** Keine `#`, `rgb(`, `rgba(`, `hsl(` in den relevanten Styles.
- **ui-components.css:** Alle hardcodierten Werte durch Tokens ersetzt (`--ui-focus-ring`, `--overlay-hover-subtle`).
- **ui-tokens.css:** Alle Werte aus Bild-2 / tokens.css / layout.css übernommen, keine neuen Farben definiert.

---

### 8. Validierung

- **Notiz-Dialog (Bild 2):** Unverändert – `NotesPage.tsx` und `NotesPage.css` nicht geändert.
- **Neue globale `.ui-*` Klassen:** Erzeugen denselben Look wie Bild 2.
- **Paycards:** Optik wie Bild-2 Buttons/Controls über `ui-chip` / `ui-chip--selected`.
- **Startseite:** Unverändert – `Start.tsx`, `start.css` nicht angefasst.
