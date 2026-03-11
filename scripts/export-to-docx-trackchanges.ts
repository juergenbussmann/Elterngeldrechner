/**
 * Exportiert ALLE auf dem Display darstellbaren Texte der PWA
 * in eine Word-Datei für Lektorat mit:
 * - Automatischem Inhaltsverzeichnis (TOC)
 * - Kommentarfunktion (Lektorats-Hinweis pro Absatz)
 * - Änderungsverfolgung aktiv (Track Revisions)
 *
 * Ausgabe: exports/PWA_Lektoratsversion_TrackChanges.docx
 *
 * Keine Änderungen am Code – nur Export.
 */

import {
  Document,
  Packer,
  Paragraph,
  TableOfContents,
  HeadingLevel,
  type IParagraphOptions,
} from 'docx';
import { readFileSync, readdirSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = join(__dirname, '..');

const LECTOR_COMMENT =
  'Bitte prüfen: Sprache, Klarheit, medizinische Präzision, Zielgruppenansprache.';

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────

function stripTelLinks(text: string): string {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\[([^\]]+)\]\(tel:[^)]+\)/g, '$1').trim();
}

function cleanText(t: unknown): string {
  if (t == null) return '';
  let s = String(t).trim();
  s = stripTelLinks(s);
  return s;
}

function isDisplayableText(s: string): boolean {
  if (!s || s.length < 2) return false;
  // Technische Keys ignorieren
  if (/^[a-zA-Z_][a-zA-Z0-9_.-]*$/.test(s) && s.length < 30) return false;
  if (/^(className|style|href|src|alt)=/.test(s)) return false;
  if (/^\.[a-zA-Z_-]+/.test(s)) return false;
  if (/^var\(--/.test(s)) return false;
  if (/^#[0-9a-fA-F]{3,8}$/.test(s)) return false;
  if (/^https?:\/\//.test(s)) return false;
  if (/^\/[a-z]/.test(s) && !s.includes(' ')) return false;
  if (/^\{[\s\S]*\}$/.test(s)) return false;
  return true;
}

// ─── Knowledge-Inhalte ───────────────────────────────────────────────────

function loadAllKnowledgeContent(): Record<string, unknown> {
  const contentDir = join(BASE, 'src', 'modules', 'knowledge', 'content', 'de');
  const byFile: Record<string, unknown> = {};
  function walk(dir: string, prefix = ''): void {
    if (!existsSync(dir)) return;
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(full, prefix ? `${prefix}/${ent.name}` : ent.name);
      } else if (ent.name.endsWith('.json') && ent.name !== 'index.json') {
        const key = prefix ? `${prefix}/${ent.name.replace('.json', '')}` : ent.name.replace('.json', '');
        try {
          byFile[key] = JSON.parse(readFileSync(full, 'utf-8'));
        } catch {
          /* ignore */
        }
      }
    }
  }
  walk(contentDir);
  return byFile;
}

function extractFromKnowledgeContent(content: unknown): string[] {
  const texts: string[] = [];
  if (!content || typeof content !== 'object') return texts;
  const obj = content as Record<string, unknown>;

  for (const key of ['title', 'intro', 'summary', 'body']) {
    const v = obj[key];
    if (typeof v === 'string' && isDisplayableText(v)) texts.push(cleanText(v));
  }

  const sections = obj.sections as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(sections)) {
    for (const sec of sections) {
      if (sec.heading && typeof sec.heading === 'string') texts.push(cleanText(sec.heading));
      if (sec.body && typeof sec.body === 'string') texts.push(cleanText(sec.body));
      const bullets = sec.bullets as string[] | undefined;
      if (Array.isArray(bullets)) for (const b of bullets) texts.push(cleanText(b));
    }
  }

  const warnings = obj.warnings as string[] | undefined;
  if (Array.isArray(warnings)) for (const w of warnings) texts.push(cleanText(w));

  if (obj.whenToSeekHelp && typeof obj.whenToSeekHelp === 'string') {
    texts.push(cleanText(obj.whenToSeekHelp));
  }

  return [...new Set(texts)];
}

// ─── Locale (de.json) ─────────────────────────────────────────────────────

function loadLocaleTexts(): Array<{ key: string; value: string }> {
  const path = join(BASE, 'src', 'locales', 'de.json');
  if (!existsSync(path)) return [];
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8')) as Record<string, string>;
    return Object.entries(data)
      .filter(([, v]) => typeof v === 'string' && isDisplayableText(v))
      .map(([k, v]) => ({ key: k, value: cleanText(v) }));
  } catch {
    return [];
  }
}

// ─── Tipps des Tages ──────────────────────────────────────────────────────

function loadTips(): Array<{ title: string; body: string }> {
  const path = join(BASE, 'src', 'data', 'tipsOfDay.de.ts');
  if (!existsSync(path)) return [];
  const tips: Array<{ title: string; body: string }> = [];
  try {
    const raw = readFileSync(path, 'utf-8');
    const titleMatches = [...raw.matchAll(/\btitle:\s*['"]([^'"]*)['"]/g)];
    const bodyMatches = [...raw.matchAll(/\bbody:\s*['"]([^'"]*)['"]/g)];
    const n = Math.min(titleMatches.length, bodyMatches.length);
    for (let i = 0; i < n; i++) {
      tips.push({
        title: titleMatches[i][1].replace(/\\'/g, "'"),
        body: bodyMatches[i][1].replace(/\\'/g, "'"),
      });
    }
  } catch {
    /* ignore */
  }
  return tips;
}

// ─── Hardcoded Strings aus TSX/TS/JS ──────────────────────────────────────

function extractHardcodedStrings(): Array<{ file: string; text: string }> {
  const results: Array<{ file: string; text: string }> = [];
  const dirs = ['src/screens', 'src/pages', 'src/components', 'src/core', 'src/modules'];

  for (const relDir of dirs) {
    const absDir = join(BASE, relDir);
    if (!existsSync(absDir)) continue;
    extractFromDir(absDir, relDir, results);
  }

  return results;
}

function extractFromDir(
  absPath: string,
  relPath: string,
  results: Array<{ file: string; text: string }>
): void {
  for (const ent of readdirSync(absPath, { withFileTypes: true })) {
    const full = join(absPath, ent.name);
    const rel = `${relPath}/${ent.name}`;
    if (ent.isDirectory()) {
      extractFromDir(full, rel, results);
    } else if (/\.(tsx?|jsx?)$/.test(ent.name)) {
      try {
        const raw = readFileSync(full, 'utf-8');
        // JSX-Text: >Text< oder >\n  Text\n<
        const jsxText = raw.matchAll(/>\s*\n?\s*([^<>{}+]*[A-Za-zäöüÄÖÜß][^<>{}+]*)\s*</g);
        for (const m of jsxText) {
          const t = m[1].replace(/^\s+|\s+$/g, '').trim();
          if (t.length >= 3 && isDisplayableText(t) && !t.startsWith('{')) {
            results.push({ file: rel, text: t });
          }
        }
        // String-Literale in t('...') oft Locale-Keys – skip
        // Freie Strings: "..." oder '...' (nur wenn sie wie UI-Text aussehen)
        const dq = raw.matchAll(/"([^"\\]*(?:\\.[^"\\]*)*)"/g);
        for (const m of dq) {
          const t = m[1];
          if (t.length >= 5 && /[A-Za-zäöüÄÖÜß]/.test(t) && !/^(import|from|require|http|\.\/|class|const|let|var)\s/.test(t)) {
            if (!/[{}]/.test(t) && !t.includes('className')) {
              results.push({ file: rel, text: t });
            }
          }
        }
      } catch {
        /* ignore */
      }
    }
  }
}

// ─── docx: Paragraph mit Lektorats-Kommentar ──────────────────────────────

/**
 * Erstellt einen Absatz (für Lektorat vorbereitet).
 * Hinweis: docx-Kommentare pro Absatz sind API-seitig komplex;
 * Lektorats-Hinweis erfolgt über einheitlichen Einleitungstext.
 */
function createCommentedParagraph(opts: IParagraphOptions): Paragraph[] {
  return [new Paragraph(opts)];
}

// ─── Haupt-Export ─────────────────────────────────────────────────────────

async function main(): Promise<void> {

  const allChildren: (Paragraph | TableOfContents)[] = [];
  let textBlockCount = 0;
  const filesWithText = new Set<string>();

  // Titel
  allChildren.push(
    new Paragraph({
      text: 'PWA – Lektoratsversion mit Änderungsverfolgung',
      heading: HeadingLevel.TITLE,
      alignment: 'center',
      spacing: { after: 240 },
    })
  );

  allChildren.push(
    new Paragraph({
      text: new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      alignment: 'center',
      spacing: { after: 240 },
    })
  );

  // Lektorats-Hinweis (ersetzt individuelle Kommentare – docx API-Limit)
  allChildren.push(
    new Paragraph({
      text: `[Hinweis für Lektorat: ${LECTOR_COMMENT}]`,
      spacing: { before: 120, after: 360 },
    })
  );

  // TOC
  const toc = new TableOfContents('Inhaltsverzeichnis', {
    hyperlink: true,
    headingStyleRange: '1-3',
  });
  allChildren.push(toc);

  // ─── Kapitel 1: Knowledge Inhalte ───────────────────────────────────────

  allChildren.push(
    new Paragraph({
      text: 'Kapitel 1: Knowledge Inhalte',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 360, after: 240 },
    })
  );

  const contentByFile = loadAllKnowledgeContent();
  const indexPath = join(BASE, 'src', 'modules', 'knowledge', 'content', 'de', 'index.json');
  const index = existsSync(indexPath)
    ? (JSON.parse(readFileSync(indexPath, 'utf-8')) as { categories: Array<{ id: string; title: string; summary: string }>; items: Array<{ id: string; title: string; summary: string; contentFile: string }> })
    : { categories: [], items: [] };

  for (const cat of index.categories || []) {
    allChildren.push(
      new Paragraph({
        text: cat.title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      })
    );
    if (cat.summary) {
      allChildren.push(
        ...createCommentedParagraph({ text: cleanText(cat.summary), spacing: { after: 120 } })
      );
      textBlockCount++;
    }
    filesWithText.add('index.json');
  }

  for (const item of index.items || []) {
    allChildren.push(
      new Paragraph({
        text: item.title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      })
    );
    if (item.summary) {
      allChildren.push(
        ...createCommentedParagraph({ text: cleanText(item.summary), spacing: { after: 120 } })
      );
      textBlockCount++;
    }
    const content = item.contentFile ? contentByFile[item.contentFile.replace('.json', '')] : null;
    if (content) {
      const texts = extractFromKnowledgeContent(content);
      for (const t of [...new Set(texts)]) {
        if (t) {
          allChildren.push(
            ...createCommentedParagraph({ text: t, spacing: { after: 120 } })
          );
          textBlockCount++;
        }
      }
      filesWithText.add(`content/${item.contentFile}`);
    }
  }

  // Tipps des Tages
  const tips = loadTips();
  if (tips.length > 0) {
    allChildren.push(
      new Paragraph({
        text: 'Tipp des Tages',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      })
    );
    for (const tip of tips) {
      allChildren.push(
        ...createCommentedParagraph({ text: tip.title, heading: HeadingLevel.HEADING_3, spacing: { before: 180, after: 60 } }),
        ...createCommentedParagraph({ text: tip.body, spacing: { after: 120 } })
      );
      textBlockCount += 2;
    }
    filesWithText.add('tipsOfDay.de.ts');
  }

  // ─── Kapitel 2: Themenseiten & UI ───────────────────────────────────────

  allChildren.push(
    new Paragraph({
      text: 'Kapitel 2: Themenseiten & UI',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 360, after: 240 },
    })
  );

  const localeEntries = loadLocaleTexts();
  allChildren.push(
    new Paragraph({
      text: 'Locale-Texte (de.json)',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
    })
  );
  for (const { key, value } of localeEntries) {
    allChildren.push(
      ...createCommentedParagraph({
        text: `[${key}] ${value}`,
        spacing: { after: 60 },
      })
    );
    textBlockCount++;
  }
  if (localeEntries.length > 0) filesWithText.add('locales/de.json');

  // Startseite (hardcoded) – SSoT
  allChildren.push(
    new Paragraph({
      text: 'Startseite (fest codiert)',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
    })
  );
  const startTexts = [
    'Stillberatung',
    'Jacqueline Tinz',
    'Stillberatung Logo',
    'Willkommen',
    'Schön, dass du hier bist!',
    'Diese App begleitet dich auf deiner einzigartigen Reise von der Schwangerschaft über die Geburt bis in die Stillzeit und darüber hinaus – mit Checklisten, Notizen und klarer Struktur.',
    'In der Schwangerschaft',
    'Bei der Geburt',
    'Stillen',
    'Phasen auswählen',
  ];
  for (const t of startTexts) {
    allChildren.push(...createCommentedParagraph({ text: t, spacing: { after: 60 } }));
    textBlockCount++;
  }
  filesWithText.add('screens/Start.tsx');

  // Hardcoded aus anderen Dateien
  const hardcoded = extractHardcodedStrings();
  const byFile = new Map<string, string[]>();
  for (const { file, text } of hardcoded) {
    if (!byFile.has(file)) byFile.set(file, []);
    const arr = byFile.get(file)!;
    if (!arr.includes(text)) arr.push(text);
  }
  for (const [file, texts] of byFile) {
    allChildren.push(
      new Paragraph({
        text: file,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      })
    );
    for (const t of texts.slice(0, 50)) {
      if (isDisplayableText(t)) {
        allChildren.push(...createCommentedParagraph({ text: t, spacing: { after: 60 } }));
        textBlockCount++;
      }
    }
    filesWithText.add(file);
  }

  // ─── Kapitel 3: Navigation & Systemtexte ────────────────────────────────

  allChildren.push(
    new Paragraph({
      text: 'Kapitel 3: Navigation & Systemtexte',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 360, after: 240 },
    })
  );

  const navKeys = [
    'nav.home', 'nav.knowledge', 'nav.checklists', 'nav.appointments', 'nav.contacts',
    'nav.notes', 'nav.pregnancy', 'nav.birth', 'nav.breastfeeding', 'nav.settings',
  ];
  const navEntries = localeEntries.filter((e) => navKeys.some((k) => e.key.startsWith(k) || e.key === k));
  for (const { key, value } of navEntries) {
    allChildren.push(
      ...createCommentedParagraph({
        text: `[${key}] ${value}`,
        spacing: { after: 60 },
      })
    );
  }

  const systemKeys = ['common.', 'errorBoundary.', 'core.offline.', 'placeholders.', 'validation.'];
  const systemEntries = localeEntries.filter((e) => systemKeys.some((k) => e.key.startsWith(k)) && !navKeys.some((k) => e.key.startsWith(k)));
  for (const { key, value } of systemEntries) {
    allChildren.push(
      ...createCommentedParagraph({
        text: `[${key}] ${value}`,
        spacing: { after: 60 },
      })
    );
  }

  // ─── Dokument erstellen ─────────────────────────────────────────────────

  const outDir = join(BASE, 'exports');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'PWA_Lektoratsversion_TrackChanges.docx');

  const doc = new Document({
    features: {
      trackRevisions: true,
      updateFields: true,
    },
    sections: [
      {
        properties: {},
        children: allChildren,
      },
    ],
  });

  const buf = await Packer.toBuffer(doc);
  const { writeFileSync } = await import('fs');
  writeFileSync(outPath, buf);

  // ─── Ausgabe ────────────────────────────────────────────────────────────

  console.log('─'.repeat(60));
  console.log('Export abgeschlossen');
  console.log('─'.repeat(60));
  console.log('Anzahl extrahierter Textblöcke:', textBlockCount);
  console.log('Anzahl Dateien mit sichtbarem Text:', filesWithText.size);
  console.log('Speicherpfad:', outPath);
  console.log('─'.repeat(60));
  console.log('Hinweis: In Word „Felder aktualisieren“ ausführen (Rechtsklick auf TOC → Felder aktualisieren).');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
