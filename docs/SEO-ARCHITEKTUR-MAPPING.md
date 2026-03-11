# SEO-Architektur-Mapping – Stillberatung PWA

**Erstellt:** Analyse-Dokumentation (keine Code-Änderungen)  
**Ziel:** Bestehende App-Architektur auf SEO-Pillar-System mappen  
**Einschränkung:** Keine visuellen Änderungen, kein Refactoring, nur Strategie

---

## SCHRITT 1 – Bestandsaufnahme

### 1.1 Phasen

| Phase-ID       | Phase-Titel   | URL                    |
|----------------|---------------|------------------------|
| pregnancy      | In der Schwangerschaft | /phase/pregnancy |
| birth          | Bei der Geburt | /phase/birth          |
| breastfeeding  | Stillen       | /phase/breastfeeding   |

### 1.2 Alle Kategorien, Artikel und URLs

| Phase       | Kategorie-ID | Kategorie-Titel           | Artikel-ID                         | Artikel-Titel                              | Aktuelle URL                        |
|-------------|--------------|---------------------------|------------------------------------|--------------------------------------------|--------------------------------------|
| pregnancy   | pregnancy    | In der Schwangerschaft    | pregnancy-koerper-veraenderungen   | Körper & Veränderungen                      | /knowledge/pregnancy-koerper-veraenderungen |
| pregnancy   | pregnancy    | In der Schwangerschaft    | pregnancy-ernaehrung-naehrstoffe   | Ernährung & Nährstoffe                      | /knowledge/pregnancy-ernaehrung-naehrstoffe |
| pregnancy   | pregnancy    | In der Schwangerschaft    | pregnancy-bewegung-aktivitaet      | Bewegung & Aktivität                        | /knowledge/pregnancy-bewegung-aktivitaet    |
| pregnancy   | pregnancy    | In der Schwangerschaft    | pregnancy-mentale-gesundheit-bindung | Mentale Gesundheit & Bindung              | /knowledge/pregnancy-mentale-gesundheit-bindung |
| pregnancy   | pregnancy    | In der Schwangerschaft    | pregnancy-vorsorge-entscheidungen | Vorsorge & Entscheidungen                   | /knowledge/pregnancy-vorsorge-entscheidungen |
| pregnancy   | pregnancy    | In der Schwangerschaft    | pregnancy-vorbereitung-geburt-stillzeit | Vorbereitung auf Geburt & Stillzeit   | /knowledge/pregnancy-vorbereitung-geburt-stillzeit |
| birth       | birth        | Bei der Geburt            | birth-ruhe-geburtsverlauf          | Ruhe & Geburtsverlauf                       | /knowledge/birth-ruhe-geburtsverlauf |
| birth       | birth        | Bei der Geburt            | birth-nabelschnur-uebergang        | Die Nabelschnur & der erste Übergang        | /knowledge/birth-nabelschnur-uebergang |
| birth       | birth        | Bei der Geburt            | birth-nachgeburt-verstehen         | Die Nachgeburt verstehen                    | /knowledge/birth-nachgeburt-verstehen |
| birth       | birth        | Bei der Geburt            | birth-interventionen-entscheidungen| Interventionen & Entscheidungen             | /knowledge/birth-interventionen-entscheidungen |
| birth       | birth        | Bei der Geburt            | birth-oxytocin-bindung-stillstart | Oxytocin, frühe Bindung & Stillstart         | /knowledge/birth-oxytocin-bindung-stillstart |
| birth       | birth        | Bei der Geburt            | birth-erste-zeit-nach-geburt       | Die erste Zeit nach der Geburt              | /knowledge/birth-erste-zeit-nach-geburt |
| breastfeeding| latch       | Anlage-Techniken          | latch-gutes-anlegen-erkennen       | Gutes Anlegen erkennen                      | /knowledge/latch-gutes-anlegen-erkennen |
| breastfeeding| latch       | Anlage-Techniken          | latch-anlegen-schritt-fuer-schritt | Anlegen Schritt für Schritt                | /knowledge/latch-anlegen-schritt-fuer-schritt |
| breastfeeding| latch       | Anlage-Techniken          | latch-stillpositionen-ueberblick   | Stillpositionen im Überblick                | /knowledge/latch-stillpositionen-ueberblick |
| breastfeeding| latch       | Anlage-Techniken          | latch-schmerzen-haeufige-ursachen  | Schmerzen beim Stillen: häufige Ursachen    | /knowledge/latch-schmerzen-haeufige-ursachen |
| breastfeeding| latch       | Anlage-Techniken          | latch-unruhiges-baby               | Unruhiges Baby beim Stillen                 | /knowledge/latch-unruhiges-baby |
| breastfeeding| latch       | Anlage-Techniken          | latch-kaiserschnitt-positionen     | Stillen nach Kaiserschnitt: Positionen      | /knowledge/latch-kaiserschnitt-positionen |
| breastfeeding| latch       | Anlage-Techniken          | latch-flache-hohle-brustwarzen     | Flache oder hohle Brustwarzen              | /knowledge/latch-flache-hohle-brustwarzen |
| breastfeeding| latch       | Anlage-Techniken          | latch-schlaefriges-neugeborenes    | Schläfriges Neugeborenes                    | /knowledge/latch-schlaefriges-neugeborenes |
| breastfeeding| nutrition   | Ernährung für Dich        | nutrition-muss-ich-anders-essen    | Muss ich beim Stillen anders essen?         | /knowledge/nutrition-muss-ich-anders-essen |
| breastfeeding| nutrition   | Ernährung für Dich        | nutrition-trinken-wie-viel         | Trinken beim Stillen: wie viel ist genug?   | /knowledge/nutrition-trinken-wie-viel |
| breastfeeding| nutrition   | Ernährung für Dich        | nutrition-heisshunger-snacks       | Heißhunger & Energie: schnelle stillfreundliche Snacks | /knowledge/nutrition-heisshunger-snacks |
| breastfeeding| nutrition   | Ernährung für Dich        | nutrition-koffein                  | Koffein in der Stillzeit                    | /knowledge/nutrition-koffein |
| breastfeeding| nutrition   | Ernährung für Dich        | nutrition-alkohol                  | Alkohol & Stillen: realistische Orientierung| /knowledge/nutrition-alkohol |
| breastfeeding| nutrition   | Ernährung für Dich        | nutrition-bauch-zwickt             | Wenn Babys Bauch zwickt: muss ich etwas weglassen? | /knowledge/nutrition-bauch-zwickt |
| breastfeeding| nutrition   | Ernährung für Dich        | nutrition-vegetarisch-vegan       | Vegetarisch/vegan stillen: wichtige Nährstoffe | /knowledge/nutrition-vegetarisch-vegan |
| breastfeeding| nutrition   | Ernährung für Dich        | nutrition-nahrungsergaenzung       | Nahrungsergänzung in der Stillzeit          | /knowledge/nutrition-nahrungsergaenzung |
| breastfeeding| challenges  | Häufige Herausforderungen | challenges-wunde-brustwarzen       | Wunde Brustwarzen: erste Hilfe              | /knowledge/challenges-wunde-brustwarzen |
| breastfeeding| challenges  | Häufige Herausforderungen | challenges-milchstau               | Milchstau erkennen und entlasten           | /knowledge/challenges-milchstau |
| breastfeeding| challenges  | Häufige Herausforderungen | challenges-mastitis-verdacht       | Mastitis-Verdacht: wann ärztliche Hilfe?    | /knowledge/challenges-mastitis-verdacht |
| breastfeeding| challenges  | Häufige Herausforderungen | challenges-zu-viel-milch           | Zu viel Milch / starker Milchspendereflex   | /knowledge/challenges-zu-viel-milch |
| breastfeeding| challenges  | Häufige Herausforderungen | challenges-zu-wenig-milch          | Zu wenig Milch? Was wirklich zählt          | /knowledge/challenges-zu-wenig-milch |
| breastfeeding| challenges  | Häufige Herausforderungen | challenges-clusterfeeding          | Clusterfeeding: normal oder Grund zur Sorge? | /knowledge/challenges-clusterfeeding |
| breastfeeding| challenges  | Häufige Herausforderungen | challenges-immer-an-die-brust      | Baby will „immer“ an die Brust              | /knowledge/challenges-immer-an-die-brust |
| breastfeeding| challenges  | Häufige Herausforderungen | challenges-baby-beisst            | Baby beißt in die Brust                     | /knowledge/challenges-baby-beisst |
| breastfeeding| challenges  | Häufige Herausforderungen | challenges-soor                    | Soor (Pilzinfektion) an Brustwarze oder im Mund | /knowledge/challenges-soor |
| breastfeeding| challenges  | Häufige Herausforderungen | challenges-stillstreik             | Stillstreik: wenn das Baby die Brust verweigert | /knowledge/challenges-stillstreik |
| breastfeeding| challenges  | Häufige Herausforderungen | challenges-saugerverwirrung        | Saugverwirrung: sanfter Weg zurück zur Brust| /knowledge/challenges-saugerverwirrung |
| breastfeeding| start       | Vorbereitung & Stillstart | start-in-der-schwangerschaft       | In der Schwangerschaft vorbereiten         | /knowledge/start-in-der-schwangerschaft |
| breastfeeding| start       | Vorbereitung & Stillstart | start-die-ersten-stunden          | Die ersten Stunden nach der Geburt          | /knowledge/start-die-ersten-stunden |
| breastfeeding| start       | Vorbereitung & Stillstart | start-die-ersten-tage              | Die ersten Tage: häufige Fragen             | /knowledge/start-die-ersten-tage |
| breastfeeding| start       | Vorbereitung & Stillstart | start-erster-stillstart            | Der erste Stillstart: Hautkontakt & erstes Anlegen | /knowledge/start-erster-stillstart |
| breastfeeding| start       | Vorbereitung & Stillstart | start-kolostrum                    | Kolostrum: warum es so wertvoll ist         | /knowledge/start-kolostrum |
| breastfeeding| start       | Vorbereitung & Stillstart | start-milcheinschuss               | Milcheinschuss                              | /knowledge/start-milcheinschuss |
| breastfeeding| start       | Vorbereitung & Stillstart | start-milch-kommt-spaeter          | Wenn die Milch „später kommt“: normaler Verlauf | /knowledge/start-milch-kommt-spaeter |
| breastfeeding| start       | Vorbereitung & Stillstart | start-haeufigkeit-stillen          | Wie oft soll ich stillen?                   | /knowledge/start-haeufigkeit-stillen |
| breastfeeding| start       | Vorbereitung & Stillstart | start-nacht-2                      | Nacht 2: warum Babys plötzlich so unruhig sind | /knowledge/start-nacht-2 |
| breastfeeding| start       | Vorbereitung & Stillstart | start-wachstumsschuebe             | Wachstumsschübe & häufigeres Stillen        | /knowledge/start-wachstumsschuebe |
| breastfeeding| start       | Vorbereitung & Stillstart | start-schwierige-geburt            | Stillen nach schwieriger Geburt             | /knowledge/start-schwierige-geburt |
| breastfeeding| start       | Vorbereitung & Stillstart | start-windeln-gewicht              | Windeln & Gewicht: grobe Orientierung       | /knowledge/start-windeln-gewicht |
| breastfeeding| start       | Vorbereitung & Stillstart | start-unterstuetzung-alltag        | Unterstützung im Alltag: was Partner/Familie tun können | /knowledge/start-unterstuetzung-alltag |
| breastfeeding| supply_pumping | Milchbildung & Abpumpen | supply-milchbildung-verstehen      | Milchbildung verstehen: Angebot & Nachfrage| /knowledge/supply-milchbildung-verstehen |
| breastfeeding| supply_pumping | Milchbildung & Abpumpen | supply-mehr-milch                   | Mehr Milch: häufiges Anlegen & Brustkompression | /knowledge/supply-mehr-milch |
| breastfeeding| supply_pumping | Milchbildung & Abpumpen | supply-abpumpen                     | Abpumpen: wann und wie?                     | /knowledge/supply-abpumpen |
| breastfeeding| supply_pumping | Milchbildung & Abpumpen | supply-handentleeren               | Handentleeren                               | /knowledge/supply-handentleeren |
| breastfeeding| supply_pumping | Milchbildung & Abpumpen | supply-pump-routine                | Pump-Routine für Anfänger:innen             | /knowledge/supply-pump-routine |
| breastfeeding| supply_pumping | Milchbildung & Abpumpen | supply-milch-aufbewahren           | Milch aufbewahren: Grundregeln             | /knowledge/supply-milch-aufbewahren |
| breastfeeding| supply_pumping | Milchbildung & Abpumpen | supply-arbeitsrueckkehr            | Stillen & Rückkehr in den Beruf             | /knowledge/supply-arbeitsrueckkehr |
| breastfeeding| supply_pumping | Milchbildung & Abpumpen | supply-zufuettern-stillfreundlich   | Zufüttern stillfreundlich gestalten         | /knowledge/supply-zufuettern-stillfreundlich |
| breastfeeding| supply_pumping | Milchbildung & Abpumpen | supply-baby-trinkt-nicht-effektiv   | Wenn Baby nicht effektiv trinkt             | /knowledge/supply-baby-trinkt-nicht-effektiv |
| breastfeeding| supply_pumping | Milchbildung & Abpumpen | supply-relaktation                 | Wiedereinstieg nach Pause / Relaktation     | /knowledge/supply-relaktation |
| breastfeeding| weaning     | Abstillen                 | weaning-abstillen                  | Abstillen: sanft und bedürfnisorientiert    | /knowledge/weaning-abstillen |

### 1.3 Interne Verlinkungen (Bestand)

| Quelle                    | Ziel                         | Typ                      |
|---------------------------|------------------------------|--------------------------|
| Artikel-Detail „Weiter“   | Nächster Artikel in Phase    | In-Content-Navigation    |
| Artikel-Detail „Weiter“   | Phase-Übersicht (letzter Art.)| In-Content-Navigation   |
| NextStepsSection          | /checklists, /appointments …  | CTA-Links                |
| whenToSeekHelp (einige)   | Tel-Link Stillberaterin      | In-Content               |
| **Keine**                 | Cross-Links zwischen Artikeln | –                        |
| **Keine**                 | Pillar-Seite „Stillen“       | –                        |
| **Keine**                 | Cluster-Übersichten          | –                        |

**Fazit:** Interne thematische Verlinkung zwischen Artikeln existiert derzeit nicht.

---

## SCHRITT 2 – SEO-Zuordnung

### Pillar-Struktur

**Haupt-Pillar:** STILLEN

**Sub-Pillars (Cluster):**
- Stillstart & Grundlagen
- Stillprobleme
- Milchmenge & Abpumpen
- Schlaf & Stillen
- Abstillen
- Langzeitstillen

### Mapping-Tabelle

| Bestehende Kategorie | SEO-Pillar | SEO-Cluster | Priorität |
|----------------------|------------|-------------|-----------|
| latch                 | Stillen    | Stillstart & Grundlagen | 🔥 Hoch |
| start                 | Stillen    | Stillstart & Grundlagen | 🔥 Hoch |
| challenges            | Stillen    | Stillprobleme           | 🔥 Hoch |
| supply_pumping        | Stillen    | Milchmenge & Abpumpen   | 🔥 Hoch |
| weaning               | Stillen    | Abstillen               | 🔥 Hoch |
| nutrition             | Stillen    | Stillstart & Grundlagen | ⚠ Mittel |
| pregnancy             | – (Vor-Stillen) | Kontext Schwangerschaft | ⏳ Später |
| birth                 | – (Vor-Stillen) | Kontext Geburt          | ⏳ Später |

**Hinweis:** Schlaf & Stillen, Langzeitstillen haben aktuell **keine dedizierten Kategorien**. Einzelne Artikel (z.B. start-nacht-2, challenges-immer-an-die-brust) könnten später zugeordnet werden.

---

## SCHRITT 3 – Interne Verlinkungsstrategie

### Pflicht-Link-Matrix (Pro Artikel)

**Regel:** Jeder Artikel muss verlinken auf:
1. Haupt-Pillar „Stillen“
2. 2 thematisch passende Cluster

#### Kategorie-basiert (Kurz)

| Artikel-Kategorie | Link zu Pillar | Link zu Cluster 1 | Link zu Cluster 2 |
|-------------------|----------------|-------------------|-------------------|
| latch-* | /stillen | Stillstart & Grundlagen | Stillprobleme |
| start-* | /stillen | Stillstart & Grundlagen | Milchmenge (wo relevant) |
| challenges-* | /stillen | Stillprobleme | Stillstart / Milchmenge |
| supply-* | /stillen | Milchmenge & Abpumpen | Stillstart |
| weaning-* | /stillen | Abstillen | Stillprobleme (Milchstau) |
| nutrition-* | /stillen | Stillstart & Grundlagen | Milchmenge |

#### Detail-Matrix (Auswahl wichtiger Artikel)

| Artikel | Pillar | Cluster 1 | Cluster 2 |
|---------|--------|-----------|-----------|
| latch-gutes-anlegen-erkennen | /stillen | Stillstart | Stillprobleme |
| latch-schmerzen-haeufige-ursachen | /stillen | Stillprobleme | Stillstart |
| challenges-wunde-brustwarzen | /stillen | Stillprobleme | Stillstart |
| challenges-milchstau | /stillen | Stillprobleme | Abstillen |
| challenges-mastitis-verdacht | /stillen | Stillprobleme | – |
| supply-milchbildung-verstehen | /stillen | Milchmenge | Stillstart |
| supply-abpumpen | /stillen | Milchmenge | Stillstart |
| weaning-abstillen | /stillen | Abstillen | Stillprobleme |
| start-die-ersten-stunden | /stillen | Stillstart | – |
| start-nacht-2 | /stillen | Stillstart | Schlaf & Stillen |

### Beispiel-Zuordnungen (Detail)

| Artikel | Cluster 1 | Cluster 2 | Begründung |
|---------|-----------|-----------|------------|
| challenges-milchstau | Stillprobleme | Abstillen | Milchstau-Risiko beim Abstillen |
| weaning-abstillen | Abstillen | Stillprobleme | Milchstau-Vermeidung |
| latch-schmerzen-haeufige-ursachen | Stillstart | Stillprobleme | Anlegen ↔ Schmerzen |
| supply-mehr-milch | Milchmenge | Stillstart | Anlegen fördert Milchbildung |
| start-nacht-2 | Stillstart | Schlaf & Stillen | Nachtstillen |

---

## SCHRITT 4 – URL-Strategie (nur Planung)

### Empfohlene SEO-URLs

| Bestehende Route | Empfohlene SEO-URL | Hinweis |
|------------------|-------------------|---------|
| /phase/breastfeeding | /stillen | Pillar-Hauptseite |
| /knowledge | /stillen/themen | Cluster-Übersicht |
| (neu) | /stillen/stillstart | Sub-Pillar Stillstart |
| (neu) | /stillen/stillprobleme | Sub-Pillar Stillprobleme |
| (neu) | /stillen/milchmenge-abpumpen | Sub-Pillar Milchmenge |
| (neu) | /stillen/schlaf-nachtstillen | Sub-Pillar Schlaf (künftig) |
| (neu) | /stillen/abstillen | Sub-Pillar Abstillen |
| (neu) | /stillen/langzeitstillen | Sub-Pillar Langzeit (künftig) |
| /knowledge/challenges-milchstau | /stillen/milchstau | Slug-optimiert |
| /knowledge/weaning-abstillen | /stillen/abstillen/sanft-abstillen | Cluster/Detail |
| /knowledge/latch-gutes-anlegen-erkennen | /stillen/anlegen-erkennen | Beispiel |

### URL-Format (Vorschlag)

```
/stillen/                          → Pillar
/stillen/stillprobleme/            → Cluster
/stillen/milchstau/                → Einzelthema (kurzer Slug)
/stillen/abstillen/                → Cluster Abstillen
/stillen/abstillen/sanft/          → Detail-Artikel
```

**Wichtig:** Keine Implementierung in dieser Phase – nur Dokumentation für spätere Umsetzung.

---

## SCHRITT 5 – Meta-Title-Strategie

### Pillar- und Sub-Pillar-Seiten

| Seite | Meta-Title (max 60 Z.) | Meta-Description (max 155 Z.) | Hauptkeyword |
|-------|------------------------|------------------------------|--------------|
| Pillar Stillen | Stillen: Ratgeber von Stillstart bis Abstillen | Stillberatung für jede Phase: Anlegen, Milchmenge, Stillprobleme & sanftes Abstillen. Erfahrung & Wissen von Jacqueline Tinz. | Stillen |
| Stillstart & Grundlagen | Stillstart: Anlegen, Kolostrum & erste Tage | Alles zum Stillstart: richtiges Anlegen, Kolostrum, erste Stunden & Tage. Sanft und bedürfnisorientiert durch die ersten Wochen. | Stillstart |
| Stillprobleme | Stillprobleme: Schmerzen, Milchstau, wunde Brustwarzen | Hilfe bei Stillproblemen: wunde Brustwarzen, Milchstau, Mastitis, Saugverwirrung. Praxisnahe Tipps von der Stillberaterin. | Stillprobleme |
| Milchmenge & Abpumpen | Milchmenge & Abpumpen: Tipps für die Stillzeit | Milchbildung fördern, Abpumpen, Aufbewahrung & Rückkehr in den Beruf. Klar und alltagstauglich. | Milchmenge |
| Schlaf & Stillen | Nachtstillen & Schlaf: Tipps für stillende Mütter | Wie Nachtstillen und Schlaf zusammengehen. Sanfte Wege für mehr Ruhe – ohne Druck. | Nachtstillen |
| Abstillen | Abstillen: Sanft und bedürfnisorientiert | Sanft abstillen mit Plan: Schritt für Schritt, Brustgesundheit, Nachtabstillen. Individuelle Begleitung möglich. | Abstillen |
| Langzeitstillen | Langzeitstillen: Begleitung ab dem 1. Jahr | Stillen über das erste Jahr hinaus. Ernährung, Grenzen, Bindung – fachkundige Begleitung. | Langzeitstillen |

---

## SCHRITT 6 – Priorisierung

### 🔥 Hoch priorisiert (Autoritätsaufbau)

- **latch** (Anlage-Techniken): Kern-Know-how, hohe Suchintention
- **start** (Stillstart): Einstiegsthema, hohes Volumen
- **challenges** (Stillprobleme): Problemlösungs-Suchen, kommerziell relevant
- **supply_pumping** (Milchmenge & Abpumpen): Berufsrückkehr, Alltag
- **weaning** (Abstillen): Etablierte Nische, gut abgedeckt

### ⚠ Mittel priorisiert

- **nutrition**: Wichtig, aber häufig abgedeckt; Differenzierung über Qualität
- **Schwangerschaft/Geburt**: Kontext für Stillen, Traffic-Potenzial

### ⏳ Später

- **Schlaf & Stillen**: Eigenes Cluster ausbauen (start-nacht-2, challenges-immer-an-die-brust als Basis)
- **Langzeitstillen**: Neues Cluster, wenn Content ergänzt wird
- **URL-Migration**: Erst nach Content-Stabilisierung

---

## Zusammenfassung

### 1) Architektur-Bewertung

| Aspekt | Status | Bewertung |
|--------|--------|-----------|
| Content-Tiefe Stillen | Gut | 52 Artikel im Stillen-Bereich |
| Phasen-Struktur | Nutzerorientiert | pregnancy/birth/breastfeeding logisch |
| URL-Struktur | Technisch | /knowledge/:id – nicht SEO-optimiert |
| Interne Verlinkung | Schwach | Keine thematischen Cross-Links |
| Cluster-Abbildung | Teilweise | 5 von 6 Clustern haben Basis-Content |

### 2) SEO-Stärken

- **Umfang:** Breite Abdeckung von Stillthemen (Anlegen, Ernährung, Probleme, Milch, Abstillen)
- **Qualität:** Fachlich fundierte Texte, Stillberaterin als Autorität
- **Struktur:** Klare Kategorien, gut durchsuchbar
- **Mobile-first:** PWA-Optimierung für Smartphone-Nutzung
- **Abstillen:** Neuer Content bereits integriert

### 3) SEO-Schwächen

- **URLs:** Keine semantischen Slugs (/knowledge/latch-gutes-anlegen-erkennen vs. /stillen/anlegen)
- **Interne Verlinkung:** Keine Pillar-/Cluster-Links, kein Link-Juice-Flow
- **Meta-Daten:** Vermutlich generisch (PWA-Kontext prüfen)
- **Cluster-Seiten:** Keine dedizierten Sub-Pillar-Seiten (Übersichten pro Cluster)
- **Schlaf/Langzeit:** Noch keine eigenständigen Cluster

### 4) Empfohlene Reihenfolge für Umsetzung

1. **Meta-Titel & Descriptions** – schneller Gewinn, keine URL-Änderung  
2. **Interne Verlinkung** – „Weiterlesen“-Blöcke mit Pillar- + 2 Cluster-Links pro Artikel  
3. **Cluster-Übersichtsseiten** – z.B. /stillen/stillprobleme als Hub  
4. **URL-Optimierung** – nur mit 301-Redirects und sorgfältiger Migration  
5. **Content für Schlaf & Langzeitstillen** – wenn strategisch gewünscht  

---

*Dokument erstellt als reine Analyse. Keine Änderungen am Layout, an Komponenten oder am Code vorgenommen.*
