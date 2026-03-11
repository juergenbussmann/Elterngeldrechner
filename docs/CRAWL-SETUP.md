# Crawl-Setup – Dokumentation

**Stand:** Februar 2026

## Übersicht

Komplettes Crawl-Setup für die PWA: sitemap.xml, robots.txt, Canonical-Audit.

---

## 1. sitemap.xml

**Datei:** `public/sitemap.xml`  
**Generierung:** `npm run generate:sitemap`

### Anzahl URLs

| Kategorie | Anzahl | Priorität |
|------------|--------|-----------|
| Startseite `/` | 1 | 1.0 |
| Stillen `/phase/breastfeeding` | 1 | 1.0 |
| Schwangerschaft `/phase/pregnancy` | 1 | 0.8 |
| Geburt `/phase/birth` | 1 | 0.8 |
| Knowledge-Artikel `/knowledge/{id}` | 63 | 0.6 |
| **Summe** | **67** | |

### Prioritätenverteilung

- **1.0:** Startseite, Stillen (Hauptpillar)
- **0.8:** Schwangerschaft, Geburt (Sub-Pillars)
- **0.6:** Knowledge-Artikel

### Regeln

- Nur kanonische URLs
- Keine Query-Parameter
- Keine Duplikate
- Absolute URLs: `https://www.stillberatung-jt.de`
- `<changefreq>`: monthly
- `<lastmod>`: dynamisch (Build-Datum)

---

## 2. robots.txt

**Datei:** `public/robots.txt`

### Inhalt

```
User-agent: *
Allow: /

Sitemap: https://www.stillberatung-jt.de/sitemap.xml
```

- Keine Disallow-Regeln
- Sitemap-URL absolut

---

## 3. Canonical-Prüfung

**Bericht:** `docs/CANONICAL-AUDIT.md`

- **Startseite:** Canonical gesetzt (Ja)
- **Canonical URL Startseite:** `https://www.stillberatung-jt.de/` (via `useDocumentHead`)
- Phase-Seiten: Canonical via `useDocumentHead` + `buildCanonicalUrl`
- Knowledge-Artikel: Canonical pro Artikel

---

## 4. Qualitätssicherung

- [x] sitemap.xml valide XML
- [x] robots.txt erreichbar (unter `/robots.txt` nach Build)
- [x] Keine 404 in Sitemap (alle IDs aus index.json)
- [x] Keine Query-Parameter in URLs
- [x] Build erfolgreich

---

## Regenerierung

Bei neuen Knowledge-Artikeln:

```bash
npm run generate:sitemap
```

Die Sitemap wird aus `src/modules/knowledge/content/de/index.json` generiert.
