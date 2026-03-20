# Content Import Checklist – 16.02.2026

Vorbereitung für manuellen Einzel-Import (Modus A). Quelle: `docs/STILLBERATUNG-TEXTE-BEREINIGT.docx`.

**Regeln:** SSoT/Startseite unverändert. Kein Layout/CSS/Token. Nur Textwerte.

---

## Textquellen (SSoT unverändert)

| Aspekt | Details |
|--------|---------|
| **UI-Labels (i18n)** | `src/locales/de.json`, `src/locales/en.json` |
| **Render-Pattern** | `t('key')` via `useI18n()` aus `src/shared/lib/i18n` |
| **i18n-Host** | `src/core/i18n/i18nHost.ts` (initI18n, registerBundle) |

| Aspekt | Details |
|--------|---------|
| **Knowledge-Content** | `src/modules/knowledge/content/de/` |
| **Index** | `index.json` – definiert `items[]` mit `id`, `title`, `summary`, `contentFile` |
| **Pro Artikel** | `{category}/{file}.json` – enthält `title`, `intro`, `sections[]` (heading, body, bullets) |
| **Render-Pattern** | `topic.title` / `topic.summary` aus Index; `content.intro`, `content.sections[].heading`, `content.sections[].body`, `content.sections[].bullets` aus Content-JSON. Tel-Links: `parseTelLinks()` |
| **Hinweise** | Titel = `index.json` item.title (nicht content.title). Body-Texte nur in Content-JSON. Keine i18n-Keys für Artikel-Inhalte. |

---

## Phase: In der Schwangerschaft

**Route zur Phase:** `/phase/pregnancy` (PregnancyPhaseScreen)  
**Navigation zu Unterseiten:** Klick auf Thema → `/knowledge/:topicId` (KnowledgeScreen)

| Unterseite (Docx H2) | Route | Datei | Textquelle/Keys | Status |
| --- | --- | --- | --- | --- |
| Körper & Veränderungen | /knowledge/pregnancy-koerper-veraenderungen | src/modules/knowledge/content/de/pregnancy/koerper-veraenderungen.json | index.json (title, summary) + contentFile (intro, sections[].heading, sections[].body) | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Ernährung & Nährstoffe | /knowledge/pregnancy-ernaehrung-naehrstoffe | src/modules/knowledge/content/de/pregnancy/ernaehrung-naehrstoffe.json | index.json (title, summary) + contentFile (intro, sections) | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Bewegung & Aktivität | /knowledge/pregnancy-bewegung-aktivitaet | src/modules/knowledge/content/de/pregnancy/bewegung-aktivitaet.json | index.json (title, summary) + contentFile (intro, sections) | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Mentale Gesundheit & Bindung | /knowledge/pregnancy-mentale-gesundheit-bindung | src/modules/knowledge/content/de/pregnancy/mentale-gesundheit-bindung.json | index.json (title, summary) + contentFile (intro, sections) | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Vorsorge & Entscheidungen | /knowledge/pregnancy-vorsorge-entscheidungen | src/modules/knowledge/content/de/pregnancy/vorsorge-entscheidungen.json | index.json (title, summary) + contentFile (intro, sections) | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Vorbereitung auf Geburt & Stillzeit | /knowledge/pregnancy-vorbereitung-geburt-stillzeit | src/modules/knowledge/content/de/pregnancy/vorbereitung-geburt-stillzeit.json | index.json (title, summary) + contentFile (intro, sections) | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |

---

## Phase: Bei der Geburt

**Route zur Phase:** `/phase/birth` (BirthPhaseScreen)  
**Navigation zu Unterseiten:** Klick auf Thema → `/knowledge/:topicId` (KnowledgeScreen)

| Unterseite (Docx H2) | Route | Datei | Textquelle/Keys | Status |
| --- | --- | --- | --- | --- |
| Ruhe & Geburtsverlauf | /knowledge/birth-ruhe-geburtsverlauf | src/modules/knowledge/content/de/birth/ruhe-geburtsverlauf.json | index.json (title, summary) + contentFile (intro, sections) | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Die Nabelschnur & der erste Übergang | /knowledge/birth-nabelschnur-uebergang | src/modules/knowledge/content/de/birth/nabelschnur-uebergang.json | index.json (title, summary) + contentFile (intro, sections) | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Die Nachgeburt verstehen | /knowledge/birth-nachgeburt-verstehen | src/modules/knowledge/content/de/birth/nachgeburt-verstehen.json | index.json (title, summary) + contentFile (intro, sections) | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Interventionen & Entscheidungen | /knowledge/birth-interventionen-entscheidungen | src/modules/knowledge/content/de/birth/interventionen-entscheidungen.json | index.json (title, summary) + contentFile (intro, sections) | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Oxytocin, frühe Bindung & Stillstart | /knowledge/birth-oxytocin-bindung-stillstart | src/modules/knowledge/content/de/birth/oxytocin-bindung-stillstart.json | index.json (title, summary) + contentFile (intro, sections) | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Die erste Zeit nach der Geburt | /knowledge/birth-erste-zeit-nach-geburt | src/modules/knowledge/content/de/birth/erste-zeit-nach-geburt.json | index.json (title, summary) + contentFile (intro, sections) | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |

---

## Phase: Stillen (Block 1)

**Route zur Phase:** `/phase/breastfeeding` bzw. Thema über Startseite/Phase  
**Navigation zu Unterseiten:** Klick auf Thema → `/knowledge/:topicId` (KnowledgeScreen)

| Unterseite (Docx H2) | Route | Datei | Status |
| --- | --- | --- | --- |
| Gutes Anlegen erkennen | /knowledge/latch-gutes-anlegen-erkennen | latch/gutes-anlegen-erkennen.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Anlegen Schritt für Schritt | /knowledge/latch-anlegen-schritt-fuer-schritt | latch/anlegen-schritt-fuer-schritt.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Stillpositionen im Überblick | /knowledge/latch-stillpositionen-ueberblick | latch/stillpositionen-ueberblick.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Schmerzen beim Stillen: häufige Ursachen | /knowledge/latch-schmerzen-haeufige-ursachen | latch/schmerzen-haeufige-ursachen.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Unruhiges Baby beim Stillen | /knowledge/latch-unruhiges-baby | latch/unruhiges-baby.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Stillen nach Kaiserschnitt: Positionen | /knowledge/latch-kaiserschnitt-positionen | latch/kaiserschnitt-positionen.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Flache oder hohle Brustwarzen | /knowledge/latch-flache-hohle-brustwarzen | latch/flache-hohle-brustwarzen.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Schläfriges Neugeborenes | /knowledge/latch-schlaefriges-neugeborenes | latch/schlaefriges-neugeborenes.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Muss ich beim Stillen anders essen? | /knowledge/nutrition-muss-ich-anders-essen | nutrition/muss-ich-anders-essen.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Trinken beim Stillen: wie viel ist genug? | /knowledge/nutrition-trinken-wie-viel | nutrition/trinken-wie-viel.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |

---

## Phase: Stillen (Block 2)

| Unterseite (Docx H2) | Route | Datei | Status |
| --- | --- | --- | --- |
| Heißhunger & Energie: schnelle stillfreundliche Snacks | /knowledge/nutrition-heisshunger-snacks | nutrition/heisshunger-snacks.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Koffein in der Stillzeit | /knowledge/nutrition-koffein | nutrition/koffein.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Alkohol & Stillen: realistische Orientierung | /knowledge/nutrition-alkohol | nutrition/alkohol.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Wenn Babys Bauch zwickt: muss ich etwas weglassen? | /knowledge/nutrition-bauch-zwickt | nutrition/bauch-zwickt.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Vegetarisch/vegan stillen: wichtige Nährstoffe | /knowledge/nutrition-vegetarisch-vegan | nutrition/vegetarisch-vegan.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Nahrungsergänzung in der Stillzeit: was ist sinnvoll? | /knowledge/nutrition-nahrungsergaenzung | nutrition/nahrungsergaenzung.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Wunde Brustwarzen: erste Hilfe | /knowledge/challenges-wunde-brustwarzen | challenges/wunde-brustwarzen.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Milchstau erkennen und entlasten | /knowledge/challenges-milchstau | challenges/milchstau.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Mastitis-Verdacht: wann ärztliche Hilfe? | /knowledge/challenges-mastitis-verdacht | challenges/mastitis-verdacht.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Zu viel Milch / starker Milchspendereflex | /knowledge/challenges-ueberangebot | challenges/ueberangebot.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |

---

## Phase: Stillen (Block 3)

| Unterseite (Docx H2) | Route | Datei | Status |
| --- | --- | --- | --- |
| Zu wenig Milch? Was wirklich zählt | /knowledge/challenges-zu-wenig-milch | challenges/zu-wenig-milch.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Clusterfeeding: normal oder Grund zur Sorge? | /knowledge/challenges-clusterfeeding | challenges/clusterfeeding.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Baby will „immer" an die Brust | /knowledge/challenges-immer-an-die-brust | challenges/immer-an-die-brust.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Baby beißt in die Brust | /knowledge/challenges-baby-beisst | challenges/baby-beisst.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Soor (Pilzinfektion) an Brustwarze oder im Mund | /knowledge/challenges-soor | challenges/soor.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Stillstreik: wenn das Baby die Brust verweigert | /knowledge/challenges-stillstreik | challenges/stillstreik.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Saugverwirrung: sanfter Weg zurück zur Brust | /knowledge/challenges-saugerverwirrung | challenges/saugerverwirrung.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| In der Schwangerschaft vorbereiten | /knowledge/start-vorbereiten-schwangerschaft | start/vorbereiten-schwangerschaft.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Die ersten Stunden nach der Geburt | /knowledge/start-die-ersten-stunden | start/die-ersten-stunden.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Die ersten Tage: häufige Fragen | /knowledge/start-die-ersten-tage | start/die-ersten-tage.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |

---

## Phase: Stillen (Block 4)

| Unterseite (Docx H2) | Route | Datei | Status |
| --- | --- | --- | --- |
| Der erste Stillstart: Hautkontakt & erstes Anlegen | /knowledge/start-erster-stillstart | start/erster-stillstart.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Kolostrum: warum es so wertvoll ist | /knowledge/start-kolostrum | start/kolostrum.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Milcheinschuss | /knowledge/start-milcheinschuss | start/milcheinschuss.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Wenn die Milch „später kommt“: normaler Verlauf | /knowledge/start-milch-kommt-spaeter | start/milch-kommt-spaeter.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Wie oft soll ich stillen? | /knowledge/start-haeufigkeit-stillen | start/haeufigkeit-stillen.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Nacht 2: warum Babys plötzlich so unruhig sind | /knowledge/start-nacht-2 | start/nacht-2.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Wachstumsschübe & häufigeres Stillen | /knowledge/start-wachstumsschuebe | start/wachstumsschuebe.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Stillen nach schwieriger Geburt | /knowledge/start-schwierige-geburt | start/schwierige-geburt.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Windeln & Gewicht: grobe Orientierung (ohne Zahlenfetisch) | /knowledge/start-windeln-gewicht | start/windeln-gewicht.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Unterstützung im Alltag: was Partner/Familie tun können | /knowledge/start-unterstuetzung-alltag | start/unterstuetzung-alltag.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Milchbildung verstehen: Angebot & Nachfrage | /knowledge/supply-milchbildung-verstehen | supply_pumping/milchbildung-verstehen.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Mehr Milch: häufiges Anlegen & Brustkompression | /knowledge/supply-mehr-milch | supply_pumping/mehr-milch.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Abpumpen: wann und wie? | /knowledge/supply-abpumpen | supply_pumping/abpumpen-wann.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Handentleeren | /knowledge/supply-handentleeren | supply_pumping/handentleeren.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Pump-Routine für Anfänger:innen | /knowledge/supply-pump-routine | supply_pumping/pump-routine.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Milch aufbewahren: Grundregeln | /knowledge/supply-milch-aufbewahren | supply_pumping/milch-aufbewahren.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Stillen & Rückkehr in den Beruf | /knowledge/supply-arbeitsrueckkehr | supply_pumping/arbeitsrueckkehr.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Zufüttern stillfreundlich gestalten | /knowledge/supply-zufuettern-stillfreundlich | supply_pumping/zufuettern-stillfreundlich.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Wenn Baby nicht effektiv trinkt | /knowledge/supply-baby-trinkt-nicht-effektiv | supply_pumping/baby-trinkt-nicht-effektiv.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Wiedereinstieg nach Pause / Relaktation: Überblick | /knowledge/supply-relaktation | supply_pumping/relaktation.json | DONE – imported from STILLBERATUNG-TEXTE-BEREINIGT.docx |
| Tipp des Tages (25 Tipps) | – | src/data/tipsOfDay.de.ts | DONE – geprüft, bereits bereinigt |

---

*Erstellt aus Analyse von src/modules/knowledge, AppRoutes, getPhaseTopics. Keine Inhalte geändert.*
