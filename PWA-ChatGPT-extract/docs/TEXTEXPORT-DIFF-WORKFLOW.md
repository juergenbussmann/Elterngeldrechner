# Textexport – Diff-Workflow

Für spätere Textänderungen: Export ALT, Export NEU, automatische Vergleichsversion. Erspart manuelle Word-Vergleiche.

---

## Dateinamen

| Datei | Bedeutung |
|-------|-----------|
| `STILLBERATUNG-TEXTE-REVISION_YYYY-MM-DD.docx` | Täglicher Export mit Datums-Suffix |
| `STILLBERATUNG-TEXTE-REVISION_ALT.docx` | Sichere Kopie der vorherigen Version (für Diff) |
| `STILLBERATUNG-TEXTE-REVISION_NEU.docx` | Aktueller Export (für Diff) |
| `STILLBERATUNG-TEXTE-TOC.docx` | Export mit Inhaltsverzeichnis (H1/H2) |

---

## Befehle

| Befehl | Aktion |
|--------|--------|
| `npm run export:textdoc` | Erzeugt `STILLBERATUNG-TEXTE-REVISION_YYYY-MM-DD.docx` |
| `npm run export:textdoc:diff` | 1) Kopiert neueste Version → `_ALT.docx`<br>2) Erzeugt `_NEU.docx` |
| `npm run export:textdoc:toc` | Erzeugt `STILLBERATUNG-TEXTE-TOC.docx` mit Inhaltsverzeichnis (H1/H2) |

---

## Diff-Workflow (bei redaktionellen Änderungen)

### Vorbereitung

1. **ALT sichern:** Vor Änderungen an den JSON-Inhalten einmal `npm run export:textdoc` ausführen → erzeugt z.B. `_2026-02-16.docx`.
2. **Texte bearbeiten:** Änderungen in `src/modules/knowledge/content/de/**/*.json` vornehmen.
3. **NEU exportieren:** `npm run export:textdoc:diff` ausführen.
   - Vorherige Version wird als `_ALT.docx` gesichert.
   - Neue Version wird als `_NEU.docx` erzeugt.

### Automatische Vergleichsversion (Word)

1. Word öffnen.
2. **Überprüfen** → **Dokumente vergleichen** → **Dokumente kombinieren**.
3. Ursprüngliches Dokument: `STILLBERATUNG-TEXTE-REVISION_ALT.docx`
4. Überarbeitetes Dokument: `STILLBERATUNG-TEXTE-REVISION_NEU.docx`
5. Word erzeugt eine Version mit allen Änderungen markiert (Änderungsverlauf).

### Alternative: Datierten Export behalten

Statt `_NEU` kann auch der normale Export verwendet werden:

- `npm run export:textdoc` → `_2026-02-17.docx`
- Word vergleichen: `_2026-02-16.docx` (ALT) vs. `_2026-02-17.docx` (NEU)

---

## Umgebungsvariablen (optional)

| Variable | Wirkung |
|----------|---------|
| `EXPORT_ALT=1` | Vor dem Schreiben: neueste vorhandene Version als `_ALT.docx` sichern |
| `EXPORT_NEU=1` | Dateiname `_NEU.docx` statt Datum (für Diff-Paar ALT/NEU) |

Beispiel (PowerShell):

```powershell
$env:EXPORT_ALT="1"; $env:EXPORT_NEU="1"; node scripts/generate-text-doc.js
```
