# Redaktions-Workflow – Strategische Entscheidung

Wenn Texte künftig redaktionell bearbeitet werden: Wo ist die Quelle der Wahrheit? Diese Entscheidung sollte vor dem Wachstum der Inhalte getroffen werden.

---

## Optionen im Überblick

| Option | Beschreibung | Master-Quelle |
|--------|--------------|---------------|
| **A) JSON als Master** | Texte leben in `src/modules/knowledge/content/de/*.json` | JSON-Dateien |
| **B) Word als Master** | Redaktion arbeitet in Word, Export nach JSON | Word-Dokumente |
| **C) CMS als Master** | Externes CMS (z.B. Strapi, Contentful) | CMS-API |

---

## Option A: JSON als Master (aktueller Stand)

**Ablauf:** Redaktion bearbeitet JSON-Dateien direkt (oder über ein einfaches Tool). Word-Export dient nur zur Prüfung/Freigabe.

| Vorteil | Nachteil |
|---------|----------|
| Einfache Versionierung (Git) | Redakteure brauchen JSON-Kenntnisse oder Tool |
| Keine Sync-Probleme | Kein WYSIWYG |
| CI/CD-fähig | |
| Offline-Editierung möglich | |

**Empfehlung für:** Technik-affine Redaktion, kleine Teams, klare Struktur.

---

## Option B: Word als Master

**Ablauf:** Redaktion bearbeitet Word. Ein Import-Script konvertiert Word → JSON (oder manuell übertragen).

| Vorteil | Nachteil |
|---------|----------|
| Vertrautes Tool für Redakteure | Import-Script nötig (Word→JSON ist aufwendig) |
| Änderungsverlauf in Word | Sync-Workflow komplex |
| WYSIWYG | Risiko von Abweichungen JSON ↔ Word |

**Empfehlung für:** Klassische Redaktion, die nur Word kennt. Erfordert technische Lösung für Roundtrip.

---

## Option C: CMS als Master

**Ablauf:** Inhalte werden in einem CMS gepflegt. Die PWA lädt zur Build-Zeit oder zur Laufzeit.

| Vorteil | Nachteil |
|---------|----------|
| Redaktion hat webbasiertes UI | Hosting, Kosten, Abhängigkeit |
| Mehrere Sprachen, Workflows | Overkill für kleine Inhaltsmengen |
| Rollback, Freigabe-Workflows | |

**Empfehlung für:** Größere Projekte, mehrere Redakteure, mehrsprachige Inhalte.

---

## Empfehlung für Stillberatung PWA

**Kurzfristig: Option A (JSON als Master)**

- Bereits umgesetzt.
- Inhalte sind überschaubar, Struktur ist klar.
- Word-Export dient als **Prüfdokument** und **Diff-Basis**, nicht als Bearbeitungsquelle.
- Änderungen erfolgen in den JSON-Dateien; danach erneuter Export für Abnahme.

**Mittelfristig prüfen:**

- Wenn Redaktion ohne Entwickler arbeiten soll: einfaches **JSON-Editor-Tool** oder **Admin-UI** bauen.
- Wenn Inhalte stark wachsen oder mehrsprachig werden: Option C (CMS) evaluieren.

---

## Nächste Schritte (bei Festlegung auf A)

1. Redaktionsanleitung: Wie bearbeite ich `content/de/**/*.json`?
2. Validierung: JSON-Schema oder Lint für Content-Dateien.
3. Export-Workflow: `npm run export:textdoc` vor Freigabe, Diff mit `export:textdoc:diff` bei Änderungen.
