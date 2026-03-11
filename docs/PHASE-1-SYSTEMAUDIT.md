# Phase 1 – Systemaudit (READ-ONLY)

**Projekt:** Stillberatung PWA  
**Datum:** 2026-02-17  
**Status:** Abgeschlossen

---

## STEP 0 — PROJEKT-ÜBERSICHT

### 1) Projektstruktur (Top-Level + wichtige src/ Ordner)

```
stillberatung-pwa-2026-02-10-1826-main/
├── index.html
├── package.json
├── vite.config.ts
├── public/
│   ├── brand/           # Logo, landing-bg.png, baby-fade.png, Button-Assets
│   ├── manifest.webmanifest
│   ├── robots.txt
│   └── sitemap.xml
├── src/
│   ├── main.tsx         # Entry Point
│   ├── core/            # AppShell, Router, Theme, Phase, Panels, Header, Footer
│   ├── screens/         # Start.tsx (SSoT), BegleitungPlusScreen, Demo
│   ├── components/     # NextStepsSection, PhaseSearch, layout/
│   ├── shared/          # ui/ (Card, Button, SectionHeader), lib/
│   ├── modules/         # knowledge, checklists, appointments, contacts, notes, documents
│   ├── styles/          # tokens.css, ui-tokens.css, layout.css, ui-components.css, etc.
│   ├── config/          # appConfig, navigation, panels
│   ├── pages/           # Testseite
│   └── utils/           # search
├── scripts/
└── docs/
```

### 2) Framework/Stack

| Kategorie | Technologie |
|-----------|-------------|
| Build | Vite 5.4 |
| UI | React 18.3 |
| Routing | React Router DOM 6.30 |
| Sprache | TypeScript 5.6 |
| PWA | vite-plugin-pwa |
| Styling | Vanilla CSS (kein Tailwind, kein PostCSS, keine UI-Lib) |
| Drag&Drop | @dnd-kit |
| Suche | fuse.js |

### 3) Startseite (SSoT)

| Aspekt | Wert |
|--------|------|
| Route | `/` (index: true) |
| Komponente | `src/screens/Start.tsx` |
| Layout-Wrapper | `AppShell` mit `app-shell--chromeless` (kein Header, kein Footer) |
| Direkte Children | `main.start` → `start__header`, `start__welcome`, `start__buttons` |

**Startseiten-Struktur:**
- `start__header`: Logo (`/brand/Logo-ohne-Schrift.png`) + Titel (Stillberatung / Jacqueline Tinz)
- `start__welcome`: h1 "Willkommen", Subtext, Intro-Text
- `start__buttons`: 3 Buttons (pregnancy, birth, breastfeeding) – Bild-Buttons, keine Card/Button-Komponente

### 4) Routing-Mechanismus

- **Datei:** `src/core/router/AppRoutes.tsx`
- **Methode:** `useRoutes()` (React Router)
- **Struktur:** `AppShell` als Layout mit `Outlet`, `index: true` → `<Start />`
- **Weitere Routen:** `/phase/pregnancy`, `/phase/birth`, `/phase/breastfeeding`, `/begleitung-plus`, `/demo`, `/testseite`, `/settings/*`, `/offline`, Module-Routen

---

## STEP 1 — STYLE-ENTRYPOINTS

### Globale CSS-Imports (AppRoot.tsx, Zeilen 9–15)

| Reihenfolge | Datei | Art |
|-------------|-------|-----|
| 1 | `src/styles/tokens.css` | Pill/Softpill Design-Tokens |
| 2 | `src/styles/ui-tokens.css` | UI-Tokens (--ui-surface-*, --ui-border, etc.) |
| 3 | `src/styles/ui-components.css` | .ui-card, .ui-btn, .ui-control, .ui-chip |
| 4 | `src/styles/dark-theme-overrides.css` | Dark-Mode Overrides |
| 5 | `src/styles/layout.css` | App-Shell, Footer, Home-Sections, Topic-Cards, Buttons |
| 6 | `src/styles/home-landing.css` | .home, .home-bg, .home-content (alternative Landing) |
| 7 | `src/styles/overrides-checklists-softpill.css` | Screen-placeholder Overrides |

### Komponenten-spezifische CSS-Imports

| Komponente | CSS-Datei(en) |
|------------|---------------|
| Start.tsx | `./start.css` (src/screens/start.css) |
| AppRoutes.tsx | `./AppRoutes.css` |
| Checklists | ChecklistsScreen.css, softpill-buttons-in-cards.css, softpill-cards.css |
| Module (appointments, contacts, notes, etc.) | Jeweils eigene CSS + softpill-* |
| PhaseOnboardingPanel | PhaseOnboardingPanel.css |
| BegleitungPlus | begleitungPlusScreen.css, BegleitungPlusUpsellPanel.css, etc. |

### Theme/Token-Quellen

| Quelle | Typ | Beschreibung |
|--------|-----|--------------|
| `src/core/theme/themes.ts` | JS (ThemeProvider) | lightDefault, darkDefault – Farben, Typo, Spacing, Radii, Shadows, components |
| `src/core/theme/ThemeProvider.tsx` | JS | Schreibt CSS-Variablen auf `:root` (--color-*, --font-*, --spacing-*, etc.) |
| `src/styles/tokens.css` | CSS :root | --pill-* (Softpill-Buttons/Cards) |
| `src/styles/ui-tokens.css` | CSS :root | --ui-* (abgeleitet von --pill-*) |
| `src/styles/layout.css` | CSS :root | --hero-shift, --baby-shift, --footer-height, --color-*, --surface, --glass-* |
| `src/styles/dark-theme-overrides.css` | CSS [data-color-scheme='dark'] | --theme-* Overrides |

### Keine

- Tailwind
- PostCSS (außer Vite-Standard)
- MUI, Chakra, shadcn
- Styled-components / Emotion

---

## STEP 2 — TOKENS EXTRAHIERT

### 1) TOKENS (Tabelle)

| category | token-name/meaning | value | source-file:line(s) | usage |
|---------|--------------------|-------|--------------------|-------|
| **Farben** | | | | |
| | --color-primary | #2563eb (layout) / #D48C8C (themes) | layout.css:179, themes.ts:56, appConfig:44 | Tel-Links, Brand |
| | --color-background | #f4f4f5 (layout) / #FDFBF7 (themes) | layout.css:180, themes.ts:58 | body |
| | --color-surface | #ffffff | layout.css:181, themes.ts:59 | |
| | --color-text-primary | #0f172a | layout.css:182, themes.ts:60 | |
| | --color-text-secondary | #475569 | layout.css:183, themes.ts:61 | |
| | --color-border | #e4e4e7 | layout.css:184 | |
| | --color-success/warning/error | #22c55e, #f59e0b, #ef4444 | layout.css:185-187 | |
| | --surface | rgba(255,248,242,0.9) | layout.css:42 | App-Shell |
| | --surface-border | rgba(120,85,60,0.22) | layout.css:43 | |
| | --text | var(--color-text-primary) | layout.css:44 | |
| | --muted | var(--color-text-secondary) | layout.css:45 | |
| | --glass-bg | rgba(255,248,242,0.85) | layout.css:55 | |
| | --glass-border | rgba(120,85,60,0.18) | layout.css:56 | |
| | --glass-blur | 12px | layout.css:57 | |
| | --glass-shadow | 0 8px 32px rgba(0,0,0,0.12) | layout.css:58 | |
| **Pill (Softpill)** | | | | |
| | --pill-bg-top | rgba(255,248,240,0.92) | tokens.css:6 | |
| | --pill-bg-bottom | rgba(244,233,220,0.88) | tokens.css:7 | |
| | --pill-bg-top-hover | rgba(255,250,244,0.96) | tokens.css:8 | |
| | --pill-bg-bottom-hover | rgba(248,238,226,0.92) | tokens.css:9 | |
| | --pill-border | rgba(180,150,120,0.25) | tokens.css:10 | |
| | --pill-border-hover | rgba(170,135,100,0.35) | tokens.css:11 | |
| | --pill-shadow | 0 12px 28px rgba(140,110,80,0.18) | tokens.css:12 | |
| | --pill-shadow-hover | 0 16px 34px rgba(140,110,80,0.22) | tokens.css:13 | |
| | --pill-shadow-active | 0 8px 18px rgba(120,95,70,0.22) | tokens.css:14 | |
| | --pill-inset | inset 0 1px 0 rgba(255,255,255,0.6) | tokens.css:15 | |
| | --pill-inset-hover/active | … | tokens.css:16-17 | |
| | --pill-radius | 18px | tokens.css:18 | |
| | --pill-padding-y/x | 14px, 16px | tokens.css:19-20 | |
| | --pill-focus | rgba(160,120,85,0.45) | tokens.css:21 | |
| **UI (abgeleitet)** | | | | |
| | --ui-surface-1/2 | var(--pill-bg-top/bottom) | ui-tokens.css:10-11 | |
| | --ui-border | var(--pill-border) | ui-tokens.css:16 | |
| | --ui-shadow | var(--pill-shadow) | ui-tokens.css:20 | |
| | --ui-radius-card | var(--pill-radius) | ui-tokens.css:33 | |
| | --ui-radius-pill | 999px | ui-tokens.css:34 | |
| | --ui-pad-card | 1rem | ui-tokens.css:39 | |
| | --ui-pad-control | 0.85rem 1rem | ui-tokens.css:40 | |
| | --ui-focus-ring | rgba(160,120,85,0.16) | ui-tokens.css:44 | |
| | --ui-font-weight-cta | 650 | ui-tokens.css:47 | |
| **Layout** | | | | |
| | --hero-shift | -32px | layout.css:18 | Start-Logo/Willkommen |
| | --baby-shift | -24px | layout.css:19 | Baby-Bild |
| | --footer-height | 64px | layout.css:36 | |
| | --shadow-soft | 0 18px 40px rgba(0,0,0,0.16) | layout.css:46 | |
| | --radius-soft | 18px | layout.css:47 | |
| **Typografie** | | | | |
| | --font-family-base | Inter, system-ui, … | layout.css:191, themes.ts:10 | |
| | --font-size-xs/sm/md/lg/xl | 0.75rem … 1.25rem | ThemeProvider → :root | |
| | --font-weight-regular/medium/semibold/bold | 400, 500, 600, 700 | themes.ts:22-25 | |
| | --line-height-normal/snug | 1.5, 1.4 | themes.ts:25-27 | |
| **Spacing** | | | | |
| | --spacing-xs/sm/md/lg/xl | 0.25rem … 1.5rem | themes.ts:31-36 | |
| | baseTypography.fontSizes | xs: 0.75rem, sm: 0.875rem, md: 1rem, lg: 1.125rem, xl: 1.25rem | themes.ts:12-18 | |
| **Radii** | | | | |
| | --radius-xs/sm/md/lg/xl/pill | 0.25rem … 9999px | themes.ts:39-45 | |
| **Shadows** | | | | |
| | --shadow-sm | 0 1px 2px rgba(15,23,42,0.06) | layout.css:189, themes.ts:48 | |
| | --shadow-md | 0 4px 10px rgba(15,23,42,0.1) | layout.css:190, themes.ts:49 | |
| **Breakpoints** | | | | |
| | 640px | min-width | layout.css:671 (home-section__cards 2col) | |
| | 768px | min-width | layout.css:658, 1002 (home-screen__cards 3col, settings) | |
| | 920px | min-width | AppRoutes.css:29 (home-section__cards 3col) | |
| | 520px | min-width | AppRoutes.css:23 (home-section__cards 2col) | |
| | 700px | max-height | start.css:159, layout.css:28 (Start-Responsive) | |
| | 1024 | DESKTOP_MIN_WIDTH | AppRoot.tsx:18 (Desktop-Block) | |
| **Z-Index** | | | | |
| | 0 | bg-blur, bg-focus, shade | layout.css:216 | |
| | 1 | app-shell | layout.css:301 | |
| | 2 | start__header, start__welcome | start.css:42,73 | |
| | 10 | app-shell__header, app-shell__footer, start__buttons | layout.css:319, 391, start.css:111 | |
| | 12 | actions-menu-overlay | layout.css:322 | |
| | 15 | panel-host | layout.css:1028 | |
| | 20 | notifications-host | layout.css:972 | |

### 2) Token Coverage

| Bereich | Zentral definiert | Hardcode / verstreut |
|---------|-------------------|----------------------|
| Farben | themes.ts, tokens.css, ui-tokens.css, layout.css :root | start.css: #4a2e1f, #4a2f1f; layout.css: diverse rgba() |
| Typografie | themes.ts, ThemeProvider | start.css: 28px, 16px, 15px, 1rem, 1.3rem |
| Spacing | themes.ts, ui-tokens | layout.css: 1.75rem, 0.9rem, 1rem, 0.75rem, etc. |
| Radii | themes.ts, --pill-radius, --ui-radius-* | layout.css: 1.1rem, 1.75rem, 22px |
| Shadows | tokens.css, themes.ts | layout.css: topic-card, softpill-surface |
| Breakpoints | Keine zentrale Definition | 520, 640, 700, 768, 920, 1024 verstreut |

---

## STEP 3 — LAYOUT-SYSTEM

### Layout Blueprint

| Aspekt | Wert | Quelle |
|--------|------|--------|
| **Container max-width** | 960px (Footer-Nav) | layout.css:411 |
| **Page padding (mobile)** | 0.75rem 1rem (app-shell__main) | layout.css:364 |
| **Page padding (desktop)** | Gleich | layout.css:364 |
| **Startseite padding** | 0 (chromeless), start__buttons: 0 16px 16px | start.css:113 |
| **Section spacing** | home-screen: gap 1.25rem; home-section: margin-top 1.75rem | layout.css:437, 668 |
| **Grid pattern** | home-section__cards: 1col → 2col @520px → 3col @920px | AppRoutes.css, layout.css |
| **Flex pattern** | start: flex column; start__buttons: grid 3col | start.css:12, 107 |

### Startseite-spezifisch (SSoT)

| Aspekt | Wert | Quelle |
|--------|------|--------|
| Höhe | 100dvh | start.css:10 |
| Overflow | clip | start.css:14 |
| Padding-bottom | calc(var(--footer-height) + env(safe-area-inset-bottom)) | start.css:21 |
| Header padding-top | 72px | start.css:40 |
| Button grid | 3 columns, gap 14px | start.css:107-108 |
| Button padding | 0 16px 16px | start.css:113 |

### Responsive

| Breakpoint | Änderung |
|------------|----------|
| max-height: 700px | --hero-shift: -18px, --baby-shift: -14px; start::before top: 210px |
| min-width: 520px | home-section__cards 2 Spalten |
| min-width: 640px | home-section__cards 2 Spalten (layout.css) |
| min-width: 768px | home-screen__cards 3 Spalten; settings 2col |
| min-width: 920px | home-section__cards 3 Spalten |
| 1024px+ | Desktop-Block-Screen (kein App-Inhalt) |

---

## STEP 4 — CARD-KOMPONENTE

### Primäre Card-Komponente

**Datei:** `src/shared/ui/Card.tsx`

**Verhalten:**
- Wenn `className` enthält `still-daily-checklist__card` oder `ui-card`: nutzt nur `padding: spacing.lg`, keine Inline-Styles für Background/Border/Shadow.
- Sonst: nutzt Theme-Tokens (card.background, radii.md, card.shadow, card.border).

**Theme card (themes.ts):**
- background: #ffffff
- border: #e4e4e7
- shadow: baseShadows.sm

### Card-Patterns auf der Startseite

**Die Startseite verwendet KEINE Card-Komponente.** Sie nutzt:
- `start__header`, `start__logo`, `start__title`
- `start__welcome` (h1, p)
- `start__buttons` mit `start__button` (Bild-Buttons)

### Card-Pattern auf Phasen-Seiten (nicht Startseite)

**Topic-Cards** (z.B. PregnancyPhaseScreen, BirthPhaseScreen, BreastfeedingPhaseScreen):
- Komponente: `<Card className="home-section__topic-card" style={topicCardStyle}>`
- Styles aus `layout.css` (.home-section__topic-card):
  - background: linear-gradient(180deg, #f6efe7, #efe6dc)
  - border: 1px solid rgba(120,85,60,0.15)
  - border-radius: 1.1rem
  - padding: 0.8rem 0.7rem
  - box-shadow: 0 6px 18px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)
  - min-height: 5.4rem
  - hover: translateY(-1px), stärkerer Schatten

**AppRoutes.tsx** setzt zusätzlich `--topic-card-bg` via `useTopicCardStyle()` (Theme-basiert).

### Weitere Card-Varianten

| Variante | Klasse | Quelle |
|----------|--------|--------|
| ui-card | .ui-card | ui-components.css:22-43 |
| softpill-surface | .softpill-surface | layout.css:66-74 |
| softpill-cards | .screen-placeholder .card | softpill-cards.css |
| next-steps__card | .next-steps__card | layout.css:714 |

### Card Blueprint (für Phase 2)

- **Basis:** Card.tsx mit Theme-Tokens ODER .ui-card mit --ui-* Tokens
- **Topic-Card:** Card + home-section__topic-card + optional topicCardStyle (--topic-card-bg)
- **Softpill:** linear-gradient(pill-bg-top, pill-bg-bottom), pill-border, pill-shadow, pill-inset, pill-radius

---

## STEP 5 — BUTTON-SYSTEM

### Button-Komponente

**Datei:** `src/shared/ui/Button.tsx`

**Varianten:** `primary` | `secondary` | `ghost`

**Regression Guard:** Bei `btn--softpill`, `ui-btn`, `ui-chip` werden KEINE Inline-Styles gesetzt – Styles kommen aus CSS.

### Button-Klassen / Varianten

| Klasse | Quelle | Verwendung |
|--------|--------|------------|
| .btn--softpill | layout.css:762-811 | NextStepsSection, Settings, Checklisten |
| .ui-btn | ui-components.css:82-126 | Token-basierte Buttons |
| .ui-btn--pill | ui-components.css:129 | border-radius: 999px |
| .ui-btn--ghost | ui-components.css:137-146 | Footer-Nav (inaktiv) |
| .ui-btn--full | ui-components.css:132 | fullWidth |
| .glass-btn | layout.css:89-136 | Alternative Glass-Optik |
| .btn--soft | layout.css:741-776 | Weiche Variante |
| .start__button | start.css:117-157 | Startseite – Bild-Buttons (kein Text) |

### Startseiten-Buttons

- **Kein** Button.tsx, **keine** btn--softpill/ui-btn
- Native `<button className="start__button start__button--pregnancy|birth|breastfeeding">`
- Transparent, aspect-ratio 1:1, Hintergrund über ::before mit Bild-URLs

### Button Blueprint

- **Primary/Secondary/Ghost:** Theme components.button[variant]
- **Softpill:** .btn--softpill + tokens.css (--pill-*)
- **UI-Button:** .ui-btn + ui-tokens.css
- **Focus:** outline 2px solid var(--pill-focus) / var(--ui-focus)
- **Disabled:** opacity 0.6, cursor not-allowed (ui-btn)

---

## STEP 6 — NAV/HEADER/FOOTER

### Shell-Komponenten

| Komponente | Pfad | Rolle |
|------------|------|-------|
| AppShell | src/core/AppShell.tsx | Layout-Wrapper mit Header, Main, Footer, Panels |
| AppFooter | src/core/AppFooter.tsx | Fixed Footer mit Tab-Navigation |
| Header (inline) | AppShell.tsx (Zeilen 206-226) | app-shell__header mit BackButton, Title, PhaseLabel, HeaderActionsBar, HeaderActionsMenu |
| BackButton | src/core/header/BackButton.tsx | Zurück-Button |
| PhaseLabel | src/core/header/PhaseLabel.tsx | Phasen-Badge |
| HeaderActionsBar | src/core/header/HeaderActionsBar.tsx | Icon-Buttons (Notifications, Settings) |
| HeaderActionsMenu | src/core/header/HeaderActionsMenu.tsx | Overflow-Menü |
| BackgroundLayers | src/core/background/BackgroundLayers.tsx | bg-blur, bg-focus, shade (nicht auf Startseite) |
| PanelHost | src/core/panels/PanelHost.tsx | Bottom-Sheet, Left-Panel |

### Startseiten-Spezialfall

- `isHome` → `app-shell--chromeless`: **kein Header, kein Footer**
- `app-shell__main` hat dann `padding: 0`, `min-height: 100dvh`, `overflow: clip`
- BackgroundLayers rendert auf `/` nichts (eigener Start-Hintergrund)

### Footer

- Fixed, z-index 10
- app-shell__footer-nav: max-width 960px, space-around
- Nav-Items: Button mit variant secondary (aktiv) / ghost (inaktiv)
- Icons über getIcon() in AppFooter

---

## STEP 7 — AUDIT-REPORT (Frozen System Contract)

### Frozen System Contract für Phase 2

#### Tokens, die genutzt werden dürfen

| Kategorie | Tokens |
|-----------|--------|
| Farben | --color-primary, --color-background, --color-surface, --color-text-primary, --color-text-secondary, --color-border, --surface, --surface-border, --text, --muted |
| Pill/Softpill | --pill-bg-top, --pill-bg-bottom, --pill-border, --pill-shadow, --pill-inset, --pill-radius, --pill-padding-y, --pill-padding-x, --pill-focus |
| UI | --ui-surface-1, --ui-surface-2, --ui-border, --ui-shadow, --ui-inset, --ui-radius-card, --ui-radius-pill, --ui-pad-card, --ui-pad-control |
| Layout | --footer-height, --hero-shift, --baby-shift |
| Typo | --font-family-base, --font-size-*, --font-weight-*, --line-height-* |
| Spacing | --spacing-xs bis --spacing-xl |

#### Basis-Komponenten

| Komponente | Verwendung |
|------------|------------|
| Card | shared/ui/Card.tsx – mit Theme ODER .ui-card |
| Button | shared/ui/Button.tsx – primary/secondary/ghost ODER .btn--softpill / .ui-btn |
| SectionHeader | shared/ui/SectionHeader.tsx |
| Container | .content-area, .app-shell__main (kein dedizierter Container) |

#### Layout-Regeln (ableitbar)

1. **Container:** max-width 960px für Footer-Nav; sonst kein globaler Content-Container
2. **Section-Abstände:** gap 1.25rem (home-screen), margin-top 1.75rem (home-section)
3. **Grid:** 1col → 2col @520px → 3col @920px für Card-Grids
4. **Startseite:** 100dvh, overflow: clip, chromeless, eigene Hintergrund-Assets

#### Offene Fragen / Unklarheiten

1. **Doppelte Token-Definitionen:** --color-primary in layout.css (#2563eb) vs. themes.ts (brandPrimary #D48C8C) – ThemeProvider überschreibt, aber layout.css wird vor Theme geladen
2. **home-landing.css:** Wird importiert, aber Start.tsx nutzt start.css; HomeLanding.tsx importiert start.css – möglicherweise Legacy/Alternative
3. **section-header:** Keine expliziten Basis-Styles gefunden – nur phase-screen Overrides
4. **Breakpoints:** Keine zentrale Definition; 520, 640, 768, 920, 1024 verstreut

#### Auffälligkeiten (ohne Änderung)

- Startseite nutzt Hardcode-Farben (#4a2e1f, #4a2f1f) statt Token
- Zwei Start-CSS-Varianten: start.css (screens) vs. home-landing.css
- DESKTOP_MIN_WIDTH 1024 blockiert Desktop-Nutzung komplett

---

**Ende Phase 1 – Systemaudit**
