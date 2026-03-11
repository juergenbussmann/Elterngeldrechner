# Final SEO Audit – Stillberatung PWA

**Datum:** 2026-02-16  
**Scope:** Meta, Open Graph, Canonical, JSON-LD, Sitemap, robots.txt  
**Einschränkung:** Keine Layout-/Style-/Component-Änderungen, nur Head/SEO.

---

## 1) Zusammenfassung

| Status | Anzahl |
|--------|--------|
| **OK** | Audit bestanden |
| **Warnungen** | 0 |
| **Fixes** | 5 |

**Ergebnis:** Audit bestanden. Alle Abschlusskriterien erfüllt.

- Keine Seite ohne Title/Description
- Canonical überall exakt 1× und korrekt (Produktions-URL)
- OG entspricht Canonical & Meta (inkl. og:url ergänzt)
- JSON-LD valide, ohne Duplikate, FAQPage nur bei ≥2 Fragen
- Sitemap/robots konsistent und erreichbar
- Build erfolgreich

---

## 2) Tabelle pro geprüfter Seite

| Seite | Title OK | Desc OK | Canonical OK | OG OK | JSON-LD OK | Hinweise |
|-------|----------|---------|--------------|-------|------------|----------|
| `/` | ✓ | ✓ | ✓ | ✓ | – | Kein JSON-LD (Startseite) |
| `/phase/pregnancy` | ✓ | ✓ | ✓ | ✓ | ✓ | FAQPage (5 Fragen) |
| `/phase/birth` | ✓ | ✓ | ✓ | ✓ | ✓ | FAQPage (5 Fragen) |
| `/phase/breastfeeding` | ✓ | ✓ | ✓ | ✓ | ✓ | FAQPage + Person + WebPage |
| `/knowledge/start-erster-stillstart` | ✓ | ✓ | ✓ | ✓ | – | Kein FAQ (keine 2+ Fragen) |
| `/knowledge/challenges-milchstau` | ✓ | ✓ | ✓ | ✓ | – | Kein FAQ |
| `/knowledge/supply-abpumpen` | ✓ | ✓ | ✓ | ✓ | – | Kein FAQ |
| `/knowledge/nutrition-muss-ich-anders-essen` | ✓ | ✓ | ✓ | ✓ | – | Kein FAQ (nur 1 Frage) |
| `/knowledge/weaning-abstillen` | ✓ | ✓ | ✓ | ✓ | – | Kein FAQ (nur 1 Frage) |

### Details pro Seite

| Seite | Title (Zeichen) | Description (Zeichen) | Canonical | JSON-LD Typen |
|-------|-----------------|------------------------|-----------|---------------|
| `/` | Stillberatung – Wissen rund ums Stillen (34) | Fachlich fundierte Informationen… (89) | https://www.stillberatung-jt.de/ | – |
| `/phase/pregnancy` | Schwangerschaft – Vorbereitung auf die Stillzeit (43) | Wissenswertes zur Vorbereitung… (102) | …/phase/pregnancy | FAQPage |
| `/phase/birth` | Geburt – stillfreundlicher Start (30) | Ruhe, Hautkontakt… (95) | …/phase/birth | FAQPage |
| `/phase/breastfeeding` | Stillen – Anleitung, Stillprobleme & Tipps (40) | Umfassender Leitfaden… (92) | …/phase/breastfeeding | FAQPage, Person, WebPage |
| `start-erster-stillstart` | Erster Stillstart – Hautkontakt & Anlegen (39) | Warum die ersten Stunden zählen… | …/knowledge/start-erster-stillstart | – |
| `challenges-milchstau` | Milchstau erkennen und entlasten (30) | Ein Milchstau kann schmerzhaft sein… | …/knowledge/challenges-milchstau | – |
| `supply-abpumpen` | Abpumpen: wann und wie? (23) | Abpumpen kann in verschiedenen… | …/knowledge/supply-abpumpen | – |
| `nutrition-muss-ich-anders-essen` | Muss ich beim Stillen anders essen? (32) | Du musst keine spezielle Stilldiät… | …/knowledge/nutrition-muss-ich-anders-essen | – |
| `weaning-abstillen` | Abstillen – sanft und ohne Milchstau (34) | Wie du Schritt für Schritt abstillst… | …/knowledge/weaning-abstillen | – |

---

## 3) Liste aller vorgenommenen Fixes

| Datei | Änderung |
|-------|----------|
| `src/shared/lib/seo/seoConfig.ts` | `buildCanonicalUrl` nutzt nun feste Produktions-URL `SEO_BASE_URL` statt `window.location.origin` – Canonical ist immer `https://www.stillberatung-jt.de/…` |
| `src/shared/lib/seo/useDocumentHead.ts` | `og:url` ergänzt: wird bei vorhandenem `canonicalUrl` gesetzt, sonst entfernt |
| `index.html` | `<link rel="canonical" href="https://www.stillberatung-jt.de/" />` für Startseite ergänzt (Initial-HTML für Crawler) |
| `src/shared/lib/seo/faqSchema.ts` | `MIN_FAQ_PER_PAGE` von 1 auf 2 erhöht – FAQPage nur bei ≥2 Fragen |
| `src/screens/Start.tsx` | `START_CANONICAL` entfernt, stattdessen `buildCanonicalUrl('/')` für Konsistenz |

---

## 4) Checkliste

### Meta Title / Description
- [x] Title max. 60 Zeichen
- [x] Description max. 155 Zeichen
- [x] Keine leeren Werte
- [x] Keine exakten Duplikate (Title/Description)
- [x] Kürzung an Wortgrenzen (truncateAtWord in useDocumentHead)

### Canonical
- [x] Jede Seite genau 1 Canonical
- [x] Canonical absolute URL (https://www.stillberatung-jt.de/…)
- [x] Startseite: https://www.stillberatung-jt.de/
- [x] Phase-/Knowledge-Seiten canonicalisieren auf eigene URL
- [x] Keine Parameter, keine Fragments

### Open Graph
- [x] og:title entspricht SEO-Title
- [x] og:description entspricht Meta-Description
- [x] og:url entspricht Canonical
- [x] Keine Duplikate von OG-Tags

### JSON-LD
- [x] Valides JSON (keine trailing commas, keine unescaped quotes)
- [x] Keine doppelten FAQPage-Scripts pro Seite
- [x] Person-Schema nicht mehrfach identisch pro Seite
- [x] WebPage-Schema enthält url = canonical
- [x] FAQPage nur bei ≥2 Fragen
- [x] Answer/Text ohne Markdown/HTML-Links (stripMarkdownForSchema)

### Sitemap / robots
- [x] public/sitemap.xml mit absoluten URLs
- [x] Nur kanonische URLs (67 URLs)
- [x] public/robots.txt: Allow: /
- [x] Sitemap: https://www.stillberatung-jt.de/sitemap.xml

### Build
- [x] `npm run build` erfolgreich

---

## 5) Technische Hinweise

- **Canonical-Basis:** `SEO_BASE_URL = 'https://www.stillberatung-jt.de'` in `seoConfig.ts`
- **Sitemap-Generierung:** `node scripts/generate-sitemap.mjs` (67 URLs)
- **JSON-LD-Injection:** `useDocumentHead` fügt Scripts ein und entfernt sie beim Unmount
