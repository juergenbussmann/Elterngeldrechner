# Startseite – Analyse vor Neuaufbau

**Stand:** 2026-03-20  
**Auftrag:** Startseite stabil, sauber und responsive neu aufbauen – ohne Stilbruch.

---

## 1. Stylesystem – Extraktion

### 1.1 Farb-Tokens (verfügbar)

| Token | Quelle | Verwendung |
|-------|--------|------------|
| `--pill-bg-top`, `--pill-bg-bottom` | tokens.css | CTA-Button, Cards |
| `--pill-border`, `--pill-border-hover` | tokens.css | Rahmen |
| `--ui-surface-1`, `--ui-surface-2` | ui-tokens.css | Cards, Buttons |
| `--ui-border`, `--ui-shadow`, `--ui-inset` | ui-tokens.css | Oberflächen |
| `--color-text-primary` | layout.css / ThemeProvider | Text |
| `--glass-bg`, `--glass-border`, `--glass-shadow` | layout.css | Glass-Effekte |

**Startseite-spezifisch (SSoT laut STYLESYSTEM-ANALYSE):**
- `#4a2e1f` / `#4a2f1f` – Titel, Willkommen-Text (warmes Braun)
- Kein Token – bewusst für Landing-Optik

### 1.2 Spacing

| Token | Wert |
|-------|------|
| `--ui-pad-card` | 1rem |
| `--ui-pad-control` | 0.85rem 1rem |
| `--pill-padding-y` | 14px |
| `--pill-padding-x` | 16px |
| `--footer-height` | 64px |
| `--spacing-*` | xs/sm/md/lg/xl (ThemeProvider) |

### 1.3 Typografie

| Kontext | font-family | font-size |
|---------|-------------|-----------|
| Start-Titel | Georgia, Times New Roman | 1rem / 1.3rem |
| Willkommen h1 | Georgia | 28px |
| Willkommen-sub | Georgia | 16px |
| Willkommen-text | Georgia | 15px |

### 1.4 Radius / Shadows

| Token | Wert |
|-------|------|
| `--ui-radius-card` | 18px |
| `--pill-radius` | 18px |
| `--ui-shadow`, `--pill-shadow` | Pill-Shadow-Kette |

---

## 2. Card-System

| Komponente | Klasse | Verwendung |
|------------|--------|------------|
| **Card.tsx** | generisch | Padding-Logik; bei `ui-card`/`still-daily-checklist__card` nur padding |
| **TopicCard.tsx** | `home-section__topic-card` | Phasen-Screens (Schwangerschaft, Geburt, Stillen) |
| **Startseite** | `.start__button` | **Keine Card** – eigene Bild-Buttons (::before mit background-image) |

**Ergebnis:** Die 3 Einstiegskarten auf der Startseite sind **keine** TopicCards, sondern custom Buttons mit Hintergrundbildern. Design-System: TopicCard für Phasen-Themen; Start nutzt eigenes Pattern.

---

## 3. Startseite – Layoutstruktur (aktuell)

```
main.start (flex column, 100dvh, overflow: clip)
├── ::before (Baby-Bild, z-index 0)
├── .start__hero-content [data-glass]
│   ├── .start__hero-glass (backdrop-filter, conditional)
│   └── .start__hero-inner
│       ├── header.start__header
│       │   ├── img.start__logo
│       │   └── .start__title (2 spans)
│       └── .start__welcome
│           ├── h1
│           ├── p.start__welcome-sub
│           └── p.start__welcome-text
├── nav.start__buttons (3 Buttons, grid 3x1)
│   └── .start__button--pregnancy|birth|breastfeeding
└── .start__cta (optional, conditional)
```

### 3.1 Abhängigkeiten

- **layout.css:** `--hero-shift`, `--baby-shift`, `--footer-height`
- **tokens.css:** `--pill-bg-top`, `--pill-border` (CTA-Button)
- **Hooks:** `useHeroContrastGuard` (Glass bei Kontrast), `useHeroCompactGuard` (Compact bei Überlappung)

### 3.2 Potenzielle Regression-Ursachen

1. **Feste Pixelwerte:** 72px, 48px, 20px, 16px, 14px – keine Token
2. **Baby-Position:** `top: 360px` / `top: 210px` @ max-height 700px – kann auf kleinen Displays kollidieren
3. **Glass-Padding:** 16px 18px / 10px 12px (compact) – fest
4. **Kein width-Breakpoint:** Nur height-basierte Media Queries

---

## 4. Layout / Shell

| Aspekt | Verhalten |
|--------|-----------|
| **Route /** | `isHome` → `app-shell--chromeless` |
| **Header** | Ausgeblendet auf Home |
| **app-shell__main** | padding: 0, overflow: clip, height: 100% |
| **AppFooter** | Immer sichtbar (fixed bottom), außer bei Picker-Overlay |
| **BackgroundLayers** | Nur auf Nicht-Home-Seiten |

---

## 5. Responsive – aktuelle Breakpoints

| Query | Anpassung |
|-------|-----------|
| `max-height: 720px` | Glass-Mask-Fade |
| `max-height: 700px` | Baby top: 210px, --hero-shift/-baby-shift reduziert |
| `data-compact="on"` | Dynamisch via useHeroCompactGuard (Kacheln vs. Footer) |

**Fehlend:** Explizite width-Breakpoints für 360px, 390–430px, 480–600px.

---

## 6. Umsetzungs-Checkliste

- [ ] Hintergrund (Blur/Verlauf) – bestehend, prüfen
- [ ] Logo + Titel zentriert – bestehend
- [ ] Willkommen-Text – bestehend
- [ ] 3 Einstiegskarten (Buttons) – bestehend, stabilisieren
- [ ] Bottom Navigation – **unverändert**
- [ ] Tokens nutzen wo möglich (ohne Stilbruch)
- [ ] Responsive für 360/390–430/480–600px prüfen
- [ ] Keine globalen Styles beeinflussen
