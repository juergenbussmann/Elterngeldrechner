# Design-System-Guidelines

**Stand:** 2026-02-16  
**Basis:** `docs/STYLESYSTEM-ANALYSE.md`  
**SSoT:** Startseite (`src/screens/Start.tsx`, `src/screens/start.css`)

Technische Ableitungsregeln für neue Seiten, Module und Komponenten. Keine neuen Styles erzeugen. Keine bestehenden Styles verändern.

---

## 1. Verbindliche Token-Nutzung

Alle neuen UI-Elemente **müssen** ausschließlich die bestehenden CSS-Variablen verwenden. Keine festen Werte (px, rem, hex) für Farben, Abstände, Radien oder Schatten.

### 1.1 Farben

| Verwendung | Erlaubte Tokens |
|------------|-----------------|
| Hintergrund (App) | `var(--color-background)`, `var(--color-surface)` |
| Oberflächen (Cards, Buttons) | `var(--ui-surface-1)`, `var(--ui-surface-2)`, `var(--pill-bg-top)`, `var(--pill-bg-bottom)` |
| Text | `var(--color-text-primary)`, `var(--color-text-secondary)`, `var(--text)`, `var(--muted)` |
| Rahmen | `var(--ui-border)`, `var(--pill-border)`, `var(--color-border)`, `var(--surface-border)` |
| Akzent/Focus | `var(--pill-focus)`, `var(--ui-focus)`, `var(--color-primary)` |
| Glass-Effekte | `var(--glass-bg)`, `var(--glass-border)`, `var(--glass-shadow)` |

### 1.2 Typografie

| Verwendung | Erlaubte Tokens |
|------------|-----------------|
| Schriftart | `var(--font-family-base)` |
| Schriftgrößen | `var(--font-size-xs)`, `var(--font-size-sm)`, `var(--font-size-md)`, `var(--font-size-lg)`, `var(--font-size-xl)` |
| Schriftstärken | `var(--font-weight-regular)`, `var(--font-weight-medium)`, `var(--font-weight-semibold)`, `var(--font-weight-bold)`, `var(--ui-font-weight-cta)` |
| Zeilenhöhe | `var(--line-height-normal)`, `var(--line-height-snug)` |

### 1.3 Regel

**Neue Feature-CSS darf nur Layout-Glue enthalten:** `display`, `flex`, `grid`, `gap`, `margin`, `padding`, `width`.  
Für `background`, `border`, `box-shadow`, `border-radius`, `color`, `font-size`, `font-weight` ausschließlich Tokens verwenden.

---

## 2. Card-Variante: Wann welche?

| Variante | Klasse | Verwendung |
|----------|--------|------------|
| **UI-Card** | `.ui-card` | Modul-Seiten (Notes, Checklisten, Termine, Kontakte, Dokumente), generische Content-Cards, Formulare |
| **TopicCard** | `.home-section__topic-card` | Phasen-Screens (Schwangerschaft, Geburt, Stillen), Themen-Kacheln, Tipp-des-Tages |

### 2.1 Entscheidungsregel

- **Phasen-Kontext** (Themen-Übersicht, Tipp des Tages) → `home-section__topic-card` (via `TopicCard`-Komponente)
- **Modul-Kontext** (Listen, Detail-Ansichten, Formulare) → `ui-card`

### 2.2 Nicht mischen

`home-screen`, `phase-screen`, `topic-screen` sind für bestehende spezifische Bereiche. Neue Features nutzen sie **nicht** als äußeren Wrapper, es sei denn, es wird explizit angegeben.

---

## 3. Erlaubte Shadow-Tokens

| Token | Verwendung |
|-------|------------|
| `var(--ui-shadow)` | Standard-Schatten für Cards, Buttons, Controls |
| `var(--ui-shadow-hover)` | Hover-Zustand |
| `var(--ui-shadow-active)` | Active/Pressed-Zustand |
| `var(--ui-inset)` | Inset-Highlight (oft kombiniert mit ui-shadow) |
| `var(--ui-inset-hover)` | Inset bei Hover |
| `var(--ui-inset-active)` | Inset bei Active |
| `var(--pill-shadow)` | Direkt für Pill-Buttons |
| `var(--pill-shadow-hover)` | Pill-Button Hover |
| `var(--pill-shadow-active)` | Pill-Button Active |
| `var(--pill-inset)` | Pill Inset |
| `var(--shadow-soft)` | Shell-Header, größere Flächen |
| `var(--shadow-sm)` | Dezente Schatten |
| `var(--shadow-md)` | Panels, Menüs |
| `var(--glass-shadow)` | Glass-Buttons, Glass-Oberflächen |

### 3.1 Kombinationen

- **Card/Button Default:** `var(--ui-shadow), var(--ui-inset)`
- **Card/Button Hover:** `var(--ui-shadow-hover), var(--ui-inset-hover)`
- **Card/Button Active:** `var(--ui-shadow-active), var(--ui-inset-active)`

---

## 4. Erlaubte Radius-Tokens

| Token | Wert | Verwendung |
|-------|------|------------|
| `var(--ui-radius-card)` | 18px | Cards, größere Flächen |
| `var(--ui-radius-control)` | 18px | Buttons, Inputs |
| `var(--ui-radius-control-sm)` | 10px | Kleinere Controls (z.B. Textarea) |
| `var(--ui-radius-pill)` | 999px | Pill-Buttons, Chips |
| `var(--pill-radius)` | 18px | Direkt für Pill-Styles |
| `var(--radius-soft)` | 18px | Glass-Buttons |
| `var(--radius-xs)` | 0.25rem | Sehr kleine Radien |
| `var(--radius-sm)` | 0.375rem | Kleine Radien |
| `var(--radius-md)` | 0.75rem | Mittlere Radien |
| `var(--radius-lg)` | 1rem | Größere Radien |
| `var(--radius-xl)` | 1.5rem | Große Radien |
| `var(--radius-pill)` | 9999px | Vollständige Pill-Form |

### 4.1 Empfehlung für neue Elemente

- **Cards:** `var(--ui-radius-card)` oder `var(--pill-radius)`
- **Buttons:** `var(--ui-radius-control)` oder `var(--ui-radius-pill)` für Pill-Buttons
- **Inputs:** `var(--ui-radius-control)` oder `var(--ui-radius-control-sm)`

---

## 5. Erlaubte Spacing-Tokens

| Token | Wert | Verwendung |
|-------|------|------------|
| `var(--ui-pad-card)` | 1rem | Card-Innenabstand |
| `var(--ui-pad-control)` | 0.85rem 1rem | Button/Input-Padding |
| `var(--pill-padding-y)` | 14px | Pill-Button vertikal |
| `var(--pill-padding-x)` | 16px | Pill-Button horizontal |
| `var(--spacing-xs)` | 0.25rem | Minimale Abstände |
| `var(--spacing-sm)` | 0.5rem | Kleine Abstände |
| `var(--spacing-md)` | 0.75rem | Mittlere Abstände |
| `var(--spacing-lg)` | 1rem | Große Abstände |
| `var(--spacing-xl)` | 1.5rem | Sehr große Abstände |
| `var(--footer-height)` | 64px | Footer-Höhe (Layout) |

### 5.1 Referenzwerte aus bestehendem Layout (nur als Orientierung)

- Section-Abstände: ca. `1.75rem`
- Content-Padding: `0 2rem`
- Grid-Gap: `0.9rem` bis `1.25rem`
- Header-Padding: `0 16px`

---

## 6. Verbotene Patterns

### 6.1 Farben

- ❌ Neue Hex-Werte (`#...`) außerhalb der Token-Dateien
- ❌ Neue `rgba()`-Werte für Farben
- ❌ Inline-Styles für `color`, `background`, `border-color`
- ❌ Hardcodierte Farben in Feature-CSS

### 6.2 Spacing & Layout

- ❌ Neue feste `px`-Werte für Abstände (außer in Token-Dateien)
- ❌ Beliebige `margin`/`padding`-Werte ohne Token-Referenz
- ❌ Neue Layout-Wrapper-Klassen wie `*-screen`, `*-page-wrapper` (nutze `module-page`)

### 6.3 Radien & Schatten

- ❌ Neue `border-radius`-Werte (z.B. `12px`, `14px`) ohne Token
- ❌ Neue `box-shadow`-Werte ohne Token
- ❌ Eigene Shadow-Definitionen

### 6.4 Typografie

- ❌ Neue `font-size`-Werte ohne Token
- ❌ Neue `font-weight`-Werte ohne Token (außer 400, 500, 600, 650, 700 aus Tokens)
- ❌ Neue `font-family` (außer `var(--font-family-base)`)

### 6.5 Komponenten

- ❌ Neue Card-Varianten (nur `.ui-card` oder `.home-section__topic-card`)
- ❌ Neue Button-Styles (nutze `.ui-btn`, `.btn--softpill`, `.glass-btn`)
- ❌ `home-screen` / `phase-screen` in neuen Screens (außer explizit vorgegeben)

### 6.6 Feature-CSS

- ❌ `background`, `border`, `box-shadow`, `border-radius`, `color`, `font-size`, `font-weight`, `line-height` in Feature-CSS (nur über Tokens oder bestehende Klassen)

---

## 7. Zusammenfassung

| Aspekt | Regel |
|--------|-------|
| **Token-Nutzung** | Verbindlich. Keine festen Werte für Design-Eigenschaften. |
| **Cards** | `.ui-card` für Module, `.home-section__topic-card` für Phasen-Themen. |
| **Shadows** | Nur `--ui-shadow*`, `--pill-shadow*`, `--shadow-soft`, `--shadow-sm`, `--shadow-md`, `--glass-shadow`. |
| **Radius** | Nur `--ui-radius-*`, `--pill-radius`, `--radius-*`. |
| **Spacing** | Nur `--ui-pad-*`, `--pill-padding-*`, `--spacing-*`. |
| **Verboten** | Neue px/rem/hex-Werte, neue Farben, neue Layout-Wrapper, Style-Neuerfindung. |
