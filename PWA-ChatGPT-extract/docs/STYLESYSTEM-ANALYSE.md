# Stylesystem-Analyse der bestehenden PWA

**Stand:** 2026-02-16  
**SSoT:** Startseite (`src/screens/Start.tsx`, `src/screens/start.css`)  
**Auftrag:** Nur Analyse, keine Änderungen.

---

## 1. Farb-Tokens

### 1.1 Startseite (start.css) – SSoT

| Token | Wert | Verwendung |
|-------|------|------------|
| Textfarbe | `#4a2e1f` / `#4a2f1f` | `.start__title`, `.start__welcome` |
| Font | `"Georgia", "Times New Roman", serif` | Startseite-Titel |

### 1.2 layout.css – :root

| Token | Wert |
|-------|------|
| `--color-primary` | `#2563eb` |
| `--color-background` | `#f4f4f5` |
| `--color-surface` | `#ffffff` |
| `--color-text-primary` | `#0f172a` |
| `--color-text-secondary` | `#475569` |
| `--color-border` | `#e4e4e7` |
| `--color-success` | `#22c55e` |
| `--color-warning` | `#f59e0b` |
| `--color-error` | `#ef4444` |
| `--surface` | `rgba(255, 248, 242, 0.9)` |
| `--surface-border` | `rgba(120, 85, 60, 0.22)` |
| `--text` | `var(--color-text-primary)` |
| `--muted` | `var(--color-text-secondary)` |

### 1.3 Glass-Tokens (layout.css)

| Token | Wert |
|-------|------|
| `--glass-bg` | `rgba(255, 248, 242, 0.85)` |
| `--glass-border` | `rgba(120, 85, 60, 0.18)` |
| `--glass-blur` | `12px` |
| `--glass-shadow` | `0 8px 32px rgba(0, 0, 0, 0.12)` |

### 1.4 Pill-Tokens (tokens.css) – Basis für ui-*

| Token | Light | Dark |
|-------|-------|------|
| `--pill-bg-top` | `rgba(255, 248, 240, 0.92)` | `rgba(60, 48, 40, 0.88)` |
| `--pill-bg-bottom` | `rgba(244, 233, 220, 0.88)` | `rgba(48, 38, 32, 0.92)` |
| `--pill-bg-top-hover` | `rgba(255, 250, 244, 0.96)` | `rgba(70, 56, 46, 0.92)` |
| `--pill-bg-bottom-hover` | `rgba(248, 238, 226, 0.92)` | `rgba(58, 46, 38, 0.96)` |
| `--pill-border` | `rgba(180, 150, 120, 0.25)` | `rgba(200, 170, 140, 0.2)` |
| `--pill-border-hover` | `rgba(170, 135, 100, 0.35)` | `rgba(220, 190, 160, 0.28)` |
| `--pill-focus` | `rgba(160, 120, 85, 0.45)` | `rgba(220, 190, 160, 0.45)` |

### 1.5 ThemeProvider (themes.ts) – dynamisch auf document.documentElement

| Token | Light | Dark |
|-------|-------|------|
| `--color-primary` | `#D48C8C` (APP_BRAND) | `#B36A6A` |
| `--color-background` | `#FDFBF7` | `#0f172a` |
| `--color-surface` | `#ffffff` | `#1e293b` |
| `--color-text-primary` | `#1c1b19` | `#f1f5f9` |
| `--color-text-secondary` | `#6b7280` | `#94a3b8` |
| `--color-border` | `#e4e4e7` | `#334155` |

### 1.6 Dark-Theme-Overrides (dark-theme-overrides.css)

| Token | Wert |
|-------|------|
| `--theme-bg` | `#0f172a` |
| `--theme-surface` | `#1e293b` |
| `--theme-text` | `#f1f5f9` |
| `--theme-muted` | `#94a3b8` |
| `--theme-border` | `#334155` |
| `--theme-glass-bg` | `rgba(30, 41, 59, 0.88)` |
| `--theme-glass-border` | `rgba(51, 65, 85, 0.6)` |
| `--theme-glass-shadow` | `0 8px 32px rgba(0, 0, 0, 0.45)` |

---

## 2. Spacing-Tokens

### 2.1 Startseite (start.css)

| Kontext | Wert |
|---------|------|
| `.start__header` padding-top | `72px` |
| `.start__title` margin-top | `2px` |
| `.start__welcome` margin-top | `4px` |
| `.start__welcome` padding | `0 20px` |
| `.start__buttons` gap | `14px` |
| `.start__buttons` padding | `0 16px 16px` |

### 2.2 layout.css

| Token/Kontext | Wert |
|---------------|------|
| `--footer-height` | `64px` |
| `.content-area` padding | `0 2rem` |
| `.glass-btn` padding | `0.875rem 1.25rem` |
| `.glass-btn` gap | `0.5rem` |
| `.app-shell__header` padding | `0 16px` |
| `.app-shell__main` padding | `0.75rem 1rem 0` |
| `.home-screen` gap | `1.25rem` |
| `.home-section` margin-top | `1.75rem` |
| `.home-section__cards` gap | `0.9rem` |
| `.home-section__topic-card` padding | `0.8rem 0.7rem` |

### 2.3 tokens.css (Pill)

| Token | Wert |
|-------|------|
| `--pill-padding-y` | `14px` |
| `--pill-padding-x` | `16px` |

### 2.4 ui-tokens.css

| Token | Wert |
|-------|------|
| `--ui-pad-card` | `1rem` |
| `--ui-pad-control` | `0.85rem 1rem` |

### 2.5 ThemeProvider (themes.ts) – Spacing

| Token | Wert |
|-------|------|
| `--spacing-xs` | `0.25rem` |
| `--spacing-sm` | `0.5rem` |
| `--spacing-md` | `0.75rem` |
| `--spacing-lg` | `1rem` |
| `--spacing-xl` | `1.5rem` |

---

## 3. Typografie-Tokens

### 3.1 Startseite (start.css) – SSoT

| Element | font-size | font-weight | line-height | font-family |
|---------|-----------|-------------|-------------|-------------|
| `.start__title span:first-child` | `1rem` | (default) | `1.25` | Georgia, Times New Roman |
| `.start__title span:last-child` | `1.3rem` | `600` | `1.25` | Georgia |
| `.start__welcome h1` | `28px` | (default) | - | Georgia |
| `.start__welcome-sub` | `16px` | `500` | - | Georgia |
| `.start__welcome-text` | `15px` | `500` | `1.5` | Georgia |

### 3.2 layout.css (body)

| Token | Wert |
|-------|------|
| `--font-family-base` | `Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` |

### 3.3 ui-tokens.css

| Token | Wert |
|-------|------|
| `--ui-font-weight-cta` | `650` |

### 3.4 ThemeProvider (themes.ts) – Typography

| Token | Wert |
|-------|------|
| `--font-size-xs` | `0.75rem` |
| `--font-size-sm` | `0.875rem` |
| `--font-size-md` | `1rem` |
| `--font-size-lg` | `1.125rem` |
| `--font-size-xl` | `1.25rem` |
| `--font-weight-regular` | `400` |
| `--font-weight-medium` | `500` |
| `--font-weight-semibold` | `600` |
| `--font-weight-bold` | `700` |
| `--line-height-normal` | `1.5` |
| `--line-height-snug` | `1.4` |

### 3.5 Verwendete Werte in layout.css (Beispiele)

| Kontext | font-size | font-weight |
|---------|-----------|-------------|
| `.glass-btn` | `0.95rem` | `600` |
| `.app-shell__header-center h1` | `1.1rem` | `600` |
| `.home-screen__greeting-text h1, h2` | `1.5rem` | `600` |
| `.home-section__topic-card-title` | `0.92rem` | `600` |
| `.home-section__topic-card-description` | `0.8rem` | - |
| `.btn--softpill` | - | `650` |
| `.phase-search__title` | `0.95rem` | `650` |

---

## 4. Border-Radius-System

### 4.1 layout.css

| Token/Kontext | Wert |
|---------------|------|
| `--radius-soft` | `18px` |
| `.glass-btn` | `var(--radius-soft)` |

### 4.2 tokens.css

| Token | Wert |
|-------|------|
| `--pill-radius` | `18px` |

### 4.3 ui-tokens.css

| Token | Wert |
|-------|------|
| `--ui-radius-card` | `var(--pill-radius)` → 18px |
| `--ui-radius-pill` | `999px` |
| `--ui-radius-control` | `var(--pill-radius)` → 18px |
| `--ui-radius-control-sm` | `10px` |

### 4.4 layout.css (TopicCard)

| Kontext | Wert |
|---------|------|
| `.home-section__topic-card` | `1.1rem` |
| `.phase-search .home-screen__search-input input` | `14px` |
| `.phase-search__results` | `16px` |
| `.phase-search__item` | `14px` |
| `.next-steps__card` | `1.75rem` |
| `.home-section__knowledge-card` | `1.75rem` |
| `.btn--soft` | `999px` |

### 4.5 ThemeProvider (themes.ts)

| Token | Wert |
|-------|------|
| `--radius-xs` | `0.25rem` |
| `--radius-sm` | `0.375rem` |
| `--radius-md` | `0.75rem` |
| `--radius-lg` | `1rem` |
| `--radius-xl` | `1.5rem` |
| `--radius-pill` | `9999px` |

---

## 5. Shadow-System

### 5.1 layout.css

| Token | Wert |
|-------|------|
| `--shadow-soft` | `0 18px 40px rgba(0, 0, 0, 0.16)` |
| `--shadow-sm` | `0 1px 2px rgba(15, 23, 42, 0.06)` |
| `--shadow-md` | `0 4px 10px rgba(15, 23, 42, 0.1)` |
| `--glass-shadow` | `0 8px 32px rgba(0, 0, 0, 0.12)` |

### 5.2 tokens.css (Pill)

| Token | Wert (Light) |
|-------|--------------|
| `--pill-shadow` | `0 12px 28px rgba(140, 110, 80, 0.18)` |
| `--pill-shadow-hover` | `0 16px 34px rgba(140, 110, 80, 0.22)` |
| `--pill-shadow-active` | `0 8px 18px rgba(120, 95, 70, 0.22)` |
| `--pill-inset` | `inset 0 1px 0 rgba(255, 255, 255, 0.6)` |
| `--pill-inset-hover` | `inset 0 1px 0 rgba(255, 255, 255, 0.7)` |
| `--pill-inset-active` | `inset 0 1px 0 rgba(255, 255, 255, 0.5)` |

### 5.3 ui-tokens.css (delegiert an pill)

| Token | Quelle |
|-------|--------|
| `--ui-shadow` | `var(--pill-shadow)` |
| `--ui-shadow-hover` | `var(--pill-shadow-hover)` |
| `--ui-shadow-active` | `var(--pill-shadow-active)` |
| `--ui-inset` | `var(--pill-inset)` |
| `--ui-inset-hover` | `var(--pill-inset-hover)` |
| `--ui-inset-active` | `var(--pill-inset-active)` |

### 5.4 TopicCard (layout.css)

| State | Wert |
|-------|------|
| Default | `0 6px 18px rgba(0, 0, 0, 0.08)`, `inset 0 1px 0 rgba(255, 255, 255, 0.6)` |
| Hover | `0 10px 26px rgba(0, 0, 0, 0.12)`, `inset 0 1px 0 rgba(255, 255, 255, 0.7)` |

---

## 6. Card-Komponente

### 6.1 Zwei Card-Varianten

| Variante | Klasse | Datei | Verwendung |
|----------|--------|-------|------------|
| **UI-Card** | `.ui-card` | ui-components.css | Modul-Seiten, Notes, Checklisten |
| **TopicCard** | `.home-section__topic-card` | layout.css | Phasen-Screens, Themen-Kacheln |

---

### 6.2 .ui-card (ui-components.css)

**Struktur:**
- Wrapper: `div` mit Klasse `ui-card`
- Nutzt ausschließlich CSS-Variablen (keine festen Werte)

**Eigenschaften:**

| Eigenschaft | Wert |
|-------------|------|
| **Background** | `linear-gradient(180deg, var(--ui-surface-1), var(--ui-surface-2))` |
| **Border** | `1px solid var(--ui-border)` |
| **Border-Radius** | `var(--ui-radius-card)` → 18px |
| **Box-Shadow** | `var(--ui-shadow), var(--ui-inset)` |
| **Padding** | `var(--ui-pad-card)` → 1rem |
| **Transition** | `box-shadow 160ms ease, border-color 160ms ease, transform 160ms ease` |

**Hover-Verhalten:**
- `box-shadow: var(--ui-shadow-hover), var(--ui-inset-hover)`
- `border-color: var(--ui-border-hover)`
- Kein `transform` (im Gegensatz zu Buttons)

**Active-Verhalten:**
- `box-shadow: var(--ui-shadow-active), var(--ui-inset-active)`

**Token-Kette:**
- `--ui-surface-1` → `--pill-bg-top`
- `--ui-surface-2` → `--pill-bg-bottom`
- `--ui-border` → `--pill-border`
- `--ui-shadow` → `--pill-shadow`
- `--ui-inset` → `--pill-inset`

---

### 6.3 .home-section__topic-card (layout.css)

**Struktur:**
- Wrapper: `Card`-Komponente mit `className="home-section__topic-card"`
- Innere Elemente: `.topic-card__icon`, `.home-section__topic-card-title`, `.home-section__topic-card-description`

**Eigenschaften:**

| Eigenschaft | Wert |
|-------------|------|
| **Background** | `linear-gradient(180deg, #f6efe7 0%, #efe6dc 100%)` |
| **Border** | `1px solid rgba(120, 85, 60, 0.15)` |
| **Border-Radius** | `1.1rem` |
| **Box-Shadow** | `0 6px 18px rgba(0, 0, 0, 0.08)`, `inset 0 1px 0 rgba(255, 255, 255, 0.6)` |
| **Padding** | `0.8rem 0.7rem` |
| **Min-Height** | `5.4rem` |
| **Transition** | `transform 0.15s ease, box-shadow 0.15s ease` |

**Hover-Verhalten:**
- `transform: translateY(-1px)`
- `box-shadow: 0 10px 26px rgba(0, 0, 0, 0.12)`, `inset 0 1px 0 rgba(255, 255, 255, 0.7)`

**Dark Mode:**
- Background: `linear-gradient(180deg, #2b241d 0%, #231d18 100%)`
- Border: `rgba(255, 255, 255, 0.08)`
- Shadow: `0 8px 24px rgba(0, 0, 0, 0.35)`

**Hinweis:** TopicCard überschreibt die Card-Komponente visuell vollständig via CSS. Die Card.tsx-Komponente erkennt `home-section__topic-card` und setzt nur `padding: spacing.lg`; alle anderen Styles kommen aus layout.css.

---

### 6.4 Card.tsx (shared/ui/Card.tsx)

**Logik:**
- Wenn `className` enthält `still-daily-checklist__card` oder `ui-card` → token-basiert: nur `padding: spacing.lg`
- Sonst → theme-basiert: `backgroundColor`, `borderRadius`, `padding`, `boxShadow`, `border` aus `theme.components.card`

**Theme card-Tokens (themes.ts):**
- Light: `background: #ffffff`, `border: #e4e4e7`, `shadow: 0 1px 2px rgba(15, 23, 42, 0.06)`
- Dark: `background: #1e293b`, `border: #334155`, `shadow: 0 4px 12px rgba(0, 0, 0, 0.4)`

---

## 7. CSS-Import-Reihenfolge (AppRoot.tsx)

1. `tokens.css` (Pill-Basis)
2. `ui-tokens.css` (ui-* aus pill)
3. `ui-components.css` (.ui-card, .ui-btn, .ui-control, .ui-chip)
4. `dark-theme-overrides.css`
5. `layout.css` (Shell, TopicCard, Glass, etc.)
6. `home-landing.css`
7. `overrides-checklists-softpill.css`

---

## 8. Zusammenfassung für neue Seiten/Module

| Aspekt | Referenz |
|--------|----------|
| **Farben** | `--pill-*`, `--ui-*`, `--color-*` aus tokens.css, ui-tokens.css, layout.css |
| **Spacing** | `--ui-pad-card`, `--ui-pad-control`, `--pill-padding-*`, `--spacing-*` |
| **Typografie** | `--font-family-base`, `--font-size-*`, `--font-weight-*`, `--ui-font-weight-cta` |
| **Radius** | `--pill-radius` (18px), `--ui-radius-card`, `--ui-radius-control`, `--ui-radius-pill` |
| **Shadows** | `--pill-shadow`, `--pill-shadow-hover`, `--pill-inset`, `--ui-shadow` |
| **Card** | `.ui-card` für Modul-Seiten; `.home-section__topic-card` für Phasen-Themen |
| **Buttons** | `.ui-btn`, `.btn--softpill`, `.glass-btn` |

**Regel:** Keine neuen Tokens oder Styles erfinden. Ausschließlich die extrahierten Tokens und Klassen verwenden.
