# SEO-Prüfung: Branding entfernt

## Vorgabe
Branding-Zusatz ("| Stillberatung") nur noch auf der Startseite.  
Alle Knowledge- und Phase-Seiten: Format **Hauptkeyword – Ergänzung** ohne Branding.

---

## Tabelle: Branding-Entfernung

| Seite | alter Title | neuer Title | Branding entfernt (Ja/Nein) | OK |
|-------|-------------|-------------|-----------------------------|-----|
| **Startseite** | Stillberatung – Wissen rund ums Stillen | (unverändert, Branding bleibt) | Nein | ✓ |
| /phase/breastfeeding | Stillen – Anleitung, Stillprobleme & Tipps | (unverändert) | Nein (hatte keins) | ✓ |
| /phase/pregnancy | Schwangerschaft – Vorbereitung auf die Stillzeit | (unverändert) | Nein (hatte keins) | ✓ |
| /phase/birth | Geburt – stillfreundlicher Start | (unverändert) | Nein (hatte keins) | ✓ |
| /knowledge | Wissensartikel \| Stillberatung | Wissensartikel – Themen rund ums Stillen | Ja | ✓ |
| /knowledge (404) | Seite nicht gefunden \| Stillberatung | Seite nicht gefunden | Ja | ✓ |
| nutrition-heisshunger-snacks | … \| Stillberatung | Heißhunger – Snacks für die Stillzeit | Ja | ✓ |
| nutrition-bauch-zwickt | … \| Stillberatung | Babys Bauch – muss ich weglassen? | Ja | ✓ |
| nutrition-vegetarisch-vegan | … \| Stillberatung | Vegetarisch stillen – Nährstoffe | Ja | ✓ |
| nutrition-nahrungsergaenzung | … \| Stillberatung | Nahrungsergänzung – Stillzeit | Ja | ✓ |
| challenges-soor | … \| Stillberatung | Soor – Pilzinfektion an Brustwarze | Ja | ✓ |
| challenges-stillstreik | … \| Stillberatung | Stillstreik – Baby verweigert Brust | Ja | ✓ |
| start-erster-stillstart | … \| Stillberatung | Erster Stillstart – Hautkontakt & Anlegen | Ja | ✓ |
| start-milch-kommt-spaeter | … \| Stillberatung | Milch kommt später – normaler Verlauf | Ja | ✓ |
| start-nacht-2 | … \| Stillberatung | Nacht 2 – warum Babys unruhig sind | Ja | ✓ |
| start-windeln-gewicht | … \| Stillberatung | Windeln & Gewicht – Orientierung | Ja | ✓ |
| start-unterstuetzung-alltag | … \| Stillberatung | Unterstützung – Partner & Familie | Ja | ✓ |
| supply-mehr-milch | … \| Stillberatung | Mehr Milch – Anlegen & Brustkompression | Ja | ✓ |
| supply-relaktation | … \| Stillberatung | Relaktation – Wiedereinstieg nach Stillpause | Ja | ✓ |
| weaning-abstillen | Abstillen – sanft und ohne Milchstau | (unverändert) | Nein (hatte keins) | ✓ |

---

## Fallback-Titel (alle Knowledge-Artikel ohne explizites seoTitle)

| Änderung | Vorher | Nachher |
|----------|--------|---------|
| **seoConfig Fallback** | title + " \| Stillberatung" | title (ohne Suffix) |

Beispiele für Artikel mit Fallback:
- latch-gutes-anlegen-erkennen: "Gutes Anlegen erkennen"
- latch-anlegen-schritt-fuer-schritt: "Anlegen Schritt für Schritt"
- (weitere ~40 Artikel: title aus index.json, kein Branding)

---

## Technische Änderungen

| Datei | Änderung |
|-------|----------|
| `seoConfig.ts` | SEO_SUFFIX entfernt, Fallback = title |
| `index.json` | 13× " \| Stillberatung" aus seoTitle entfernt |
| `knowledge/index.tsx` | KNOWLEDGE_LIST_SEO, 404-Titel |
| `AppRoutes.tsx` | Phase-Fallbacks ohne Branding |
| `scripts/generate-seo-doc.mjs` | SEO_SUFFIX entfernt |
