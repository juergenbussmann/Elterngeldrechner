# FAQ-Schema-Markup (JSON-LD)

**Ziel:** Strukturierte Daten für Knowledge-Artikel mit Frage-Inhalten.  
**Keine visuellen Änderungen.** Nur `<script type="application/ld+json">` im `<head>`.

## Quellen

- **Artikel-Titel mit ?** → Frage, Antwort = Intro + alle Sektionen
- **Sektions-Überschrift mit ?** → Frage, Antwort = body (+ bullets)

## Regeln

- Max. 5–8 Fragen pro Seite
- Nur echte Fragen (Text endet mit `?`)
- Keine künstlichen FAQ
- Antworten: Markdown-Links `[Text](/path)` werden zu reinem Text
- Schema nur auf Seiten mit FAQ-Inhalt

## Übersicht

| Seite | FAQ-Anzahl | Schema integriert |
|-------|------------|-------------------|
| **Phase-Seiten** | | |
| /phase/pregnancy (Schwangerschaft) | 5 | Ja |
| /phase/birth (Geburt) | 5 | Ja |
| **Knowledge-Artikel** | | |
| start-haeufigkeit-stillen | 1 | Ja |
| nutrition-muss-ich-anders-essen | 1 | Ja |
| nutrition-trinken-wie-viel | 1 | Ja |
| nutrition-bauch-zwickt | 1 | Ja |
| nutrition-nahrungsergaenzung | 1 | Ja |
| challenges-mastitis-verdacht | 1 | Ja |
| challenges-clusterfeeding | 1 | Ja |
| latch-flache-hohle-brustwarzen | 1 | Ja |
| birth-nabelschnur-uebergang | 1 | Ja |
| weaning-abstillen | 1 | Ja |

**Gesamt:** 2 Phase-Seiten + 10 Knowledge-Artikel mit FAQ-Schema.

## Technische Umsetzung

- **Datei:** `src/shared/lib/seo/faqSchema.ts`
- **Integration:** `useDocumentHead({ ..., jsonLd })` in `src/modules/knowledge/index.tsx`
- **Injection:** `useDocumentHead` fügt `<script type="application/ld+json">` bei Bedarf ein und entfernt es beim Unmount
