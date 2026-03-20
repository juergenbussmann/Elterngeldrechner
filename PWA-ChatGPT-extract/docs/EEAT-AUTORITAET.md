# E-E-A-T Autorisierung – Seite Stillen

**Route:** `/phase/breastfeeding`  
**Stand:** Februar 2026

## Übersicht

Die Stillen-Pillar-Seite wurde um strukturierte Person-Daten und externe Verknüpfung ergänzt. Ziel: Autorität der Inhalte absichern. Keine sichtbare Layoutänderung, keine Werbeblöcke.

---

## Schritt 1 – Sichtbare Autorenzuordnung

### Position

**Direkt unter dem Abschnitt „Fachliche Einordnung“**, vor der NextStepsSection.

### Überschrift

„Autorin“

### Text

> Die Inhalte dieser Seite werden fachlich verantwortet von Jacqueline Tinz, Stillberaterin. Weitere Informationen zur Person und zu ihrer Arbeit finden Sie unter: www.stillberatung-jt.de

### Verlinkung

- URL als normaler Textlink: `https://www.stillberatung-jt.de`
- Anzeigetext: `www.stillberatung-jt.de`
- `rel="noopener noreferrer"`
- Keine CTA, keine Werbesprache

---

## Schritt 2 – schema.org JSON-LD

### Person

```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Jacqueline Tinz",
  "jobTitle": "Stillberaterin",
  "url": "https://www.stillberatung-jt.de",
  "sameAs": ["https://www.stillberatung-jt.de"]
}
```

### WebPage (mit author)

```json
{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "<seoTitle>",
  "url": "<canonicalUrl>",
  "author": {
    "@type": "Person",
    "name": "Jacqueline Tinz"
  }
}
```

### Implementierung

- **Datei:** `src/shared/lib/seo/authorSchema.ts`
- **Funktionen:** `buildPersonJsonLd()`, `buildWebPageWithAuthorJsonLd(name, url)`
- **Seite:** Nur `/phase/breastfeeding` – FAQPage, Person, WebPage als separate Scripts

---

## Schritt 3 – useDocumentHead Erweiterung

### Änderung

- `jsonLd` akzeptiert nun `object | object[] | null`
- Einzelnes Objekt wird intern als Array mit einem Element behandelt
- Pro Schema ein eigenes `<script type="application/ld+json">`
- Beim Routing: alte Scripts werden entfernt, neue hinzugefügt
- Keine Duplikate (jedes Schema nur einmal pro Seite)

---

## Bestätigung

- **Keine Review-Markups:** ✓
- **Keine Sternebewertungen:** ✓
- **Nur Person und Autorenschaft:** ✓
- **JSON valide:** ✓
- **Keine Duplikate:** ✓
- **Keine HTML im JSON:** ✓
- **Keine Layoutänderung:** ✓
- **Mobile unverändert:** ✓
