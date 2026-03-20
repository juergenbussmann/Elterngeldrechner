# Canonical Audit

**Stand:** Februar 2026  
**Basis-URL:** https://www.stillberatung-jt.de

## Prüfkriterien

- Jede Seite hat genau 1 `<link rel="canonical">`
- Canonical ist absolute URL
- Keine Self-Conflicts
- Keine Duplicate Canonicals
- Keine Phase-Seite zeigt auf andere Phase

---

## Indexierbare Seiten (Sitemap)

| Seite | Canonical | OK |
|-------|-----------|-----|
| `/` | `https://www.stillberatung-jt.de/` | ✓ |
| `/phase/pregnancy` | `{origin}/phase/pregnancy` | ✓ |
| `/phase/birth` | `{origin}/phase/birth` | ✓ |
| `/phase/breastfeeding` | `{origin}/phase/breastfeeding` | ✓ |
| `/knowledge/{id}` (63 Artikel) | `{origin}/knowledge/{id}` | ✓ |

---

## Technische Umsetzung

- **Startseite:** `useDocumentHead` mit `canonicalUrl: https://www.stillberatung-jt.de/`
- **Phase-Seiten:** `buildCanonicalUrl(path)` in `useDocumentHead` → absolute URL zur aktuellen Seite
- **Knowledge:** `buildCanonicalUrl(\`/knowledge/${topic.id}\`)` pro Artikel
- **Knowledge-Übersicht:** `buildCanonicalUrl('/knowledge')` wenn kein topicId
- **404 (Artikel nicht gefunden):** `canonicalUrl: undefined` → keine Canonical gesetzt

---

## Ergebnis

| Kriterium | Status |
|-----------|--------|
| Jede indexierbare Seite hat Canonical | ✓ |
| Canonical absolute URL | ✓ |
| Keine Self-Conflicts | ✓ |
| Keine Duplicate Canonicals | ✓ |
| Phase-Seiten zeigen auf sich selbst | ✓ |

---

## Hinweis Startseite

Die Startseite (`/`) setzt explizit `canonicalUrl: https://www.stillberatung-jt.de/` via `useDocumentHead`.
