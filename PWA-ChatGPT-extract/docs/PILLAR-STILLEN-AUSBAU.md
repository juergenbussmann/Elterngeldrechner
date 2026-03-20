# Pillar-Seite Stillen – Ausbau-Dokumentation

**Route:** `/phase/breastfeeding`  
**Stand:** Februar 2026

## Übersicht

Die Phase-Seite "Stillen" wurde zu einer SEO-starken Hauptpillar-Seite ausgebaut. Ergänzt wurden strukturierte Inhaltssektionen und ein FAQ-Block – ohne Änderung von Layout, Tokens oder Komponenten.

---

## Wortanzahl

| Bereich | Geschätzte Wörter |
|---------|-------------------|
| Pillar-Sektionen (6 H2) | ~1.100 |
| FAQ (6 Fragen + Antworten) | ~350 |
| **Neu hinzugefügt gesamt** | **~1.450** |
| + Bestehend (Tip, Thema-Karten) | ~500 |
| **Seite gesamt** | **~2.000** |

---

## Interne Links

| Ziel | Anzahl |
|------|--------|
| Pillar-Sektionen | 15 |
| FAQ-Antworten | 8 |
| **Summe interner Links** | **23** |

### Verlinkte Knowledge-Artikel

- `pregnancy-vorbereitung-geburt-stillzeit`
- `start-erster-stillstart`, `start-die-ersten-stunden`, `start-milcheinschuss`
- `start-haeufigkeit-stillen`, `challenges-clusterfeeding`
- `challenges-milchstau`, `challenges-mastitis-verdacht`, `challenges-wunde-brustwarzen`, `supply-mehr-milch`
- `supply-arbeitsrueckkehr`, `nutrition-muss-ich-anders-essen`, `start-nacht-2`
- `weaning-abstillen`
- `start-windeln-gewicht`, `supply-baby-trinkt-nicht-effektiv`
- `latch-schmerzen-haeufige-ursachen`
- `supply-milchbildung-verstehen`

---

## H2-Struktur (neu)

1. **Was bedeutet Stillen?** – Physiologie, Oxytocin & Prolaktin, Bindung & Regulation  
2. **Der Stillstart – die ersten Tage** – Erstes Anlegen, Hautkontakt, Milcheinschuss, Häufigkeit  
3. **Wie oft und wie lange sollte ich stillen?** – Bedarfsgerecht, Clusterfeeding, Wachstumsschübe  
4. **Häufige Stillprobleme** – Milchstau, Brustentzündung, wunde Brustwarzen, zu wenig Milch  
5. **Stillen im Alltag** – Schlaf & Nachtstillen, Rückkehr Beruf, Ernährung  
6. **Abstillen – ein natürlicher Übergang** – Zeitpunkt, sanfte Reduktion, emotionale Aspekte  
7. **Häufige Fragen zum Stillen** – 6 präzise FAQ mit Antworten  

---

## FAQ (6–8 Einträge)

| # | Frage |
|---|-------|
| 1 | Wie erkenne ich, ob mein Baby genug Milch bekommt? |
| 2 | Wie lange sollte eine Stillmahlzeit dauern? |
| 3 | Was tun bei Schmerzen beim Stillen? |
| 4 | Muss ich beim Stillen bestimmte Lebensmittel meiden? |
| 5 | Wann pendelt sich die Milchmenge ein? |
| 6 | Kann ich nach Bedarf stillen? |
| 7 | Was hilft beim ersten Anlegen? |
| 8 | Ist Clusterfeeding ein Zeichen für zu wenig Milch? |

**Anzahl FAQ:** 8  
**JSON-LD:** `buildFaqJsonLd` → FAQPage Schema aktiv

---

## Technische Umsetzung

- **Komponenten:** `SectionHeader`, `home-section`, `home-section__faq-item`, `parseTelLinks`
- **Pfade:** `/knowledge/{id}` (interne Links)
- **Styles:** Bestehend, keine neuen CSS-Klassen
- **Mobile:** Unverändert

---

## Stilvorgaben (umgesetzt)

- Neutral-informativ
- Subtile Fachkompetenz
- Keine Verkaufsformulierungen
- Keine direkte CTA
- Max. 3 interne Links pro FAQ-Antwort
- Natürliche Integration der Links im Fließtext
