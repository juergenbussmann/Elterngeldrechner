/**
 * Generiert docs/STILLBERATUNG-TEXTE-REVISION_YYYY-MM-DD.docx
 * Extrahiert alle redaktionellen Texte aus den drei Phasen-Screens.
 * Mit aktiviertem Änderungsverlauf (Track Changes).
 *
 * Optionen (Umgebungsvariablen):
 *   EXPORT_ALT=1     Vor dem Schreiben: aktuelle Revision als _ALT.docx sichern
 *   EXPORT_NEU=1     Dateiname mit _NEU statt Datum (für Diff-Workflow)
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { writeFileSync, readFileSync, existsSync, copyFileSync, statSync } from 'fs';
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PREGNANCY_CATEGORY = 'pregnancy';
const BIRTH_CATEGORY = 'birth';
const BREASTFEEDING_CATEGORIES = new Set([
  'breastfeeding', 'latch', 'nutrition', 'challenges', 'start', 'supply_pumping',
]);

/** Tel-Links zu reinem Text: [Text](tel:xxx) -> Text */
function stripTelLinks(text) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\[([^\]]+)\]\(tel:[^)]+\)/g, '$1').trim();
}

/** Content aus JSON laden */
function loadContent(basePath, contentFile) {
  try {
    const path = join(basePath, 'src', 'modules', 'knowledge', 'content', 'de', contentFile);
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Alle JSON-Content-Dateien laden (ohne index.json) */
function loadAllContent(basePath) {
  const contentDir = join(basePath, 'src', 'modules', 'knowledge', 'content', 'de');
  const byFile = {};
  function walk(dir, prefix = '') {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(full, prefix ? `${prefix}/${ent.name}` : ent.name);
      } else if (ent.name.endsWith('.json') && ent.name !== 'index.json') {
        const key = prefix ? `${prefix}/${ent.name.replace('.json', '')}` : ent.name.replace('.json', '');
        try {
          byFile[key] = JSON.parse(readFileSync(full, 'utf-8'));
        } catch {}
      }
    }
  }
  walk(contentDir);
  return byFile;
}

/** Phasen-Topics filtern */
function getPhaseItems(items, phase) {
  switch (phase) {
    case 'pregnancy':
      return items.filter((i) => i.categoryId === PREGNANCY_CATEGORY);
    case 'birth':
      return items.filter((i) => i.categoryId === BIRTH_CATEGORY);
    case 'breastfeeding':
      return items.filter((i) => BREASTFEEDING_CATEGORIES.has(i.categoryId));
    default:
      return [];
  }
}

/** Content zu docx-Paragraphen */
function contentToParagraphs(content, stripLinks = true) {
  const paras = [];
  const clean = (t) => (stripLinks ? stripTelLinks(String(t || '')) : String(t || ''));

  if (content.intro) {
    paras.push(new Paragraph({ text: clean(content.intro), spacing: { after: 120 } }));
  }

  for (const section of content.sections || []) {
    paras.push(new Paragraph({
      text: section.heading,
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 240, after: 120 },
    }));
    paras.push(new Paragraph({ text: clean(section.body), spacing: { after: 120 } }));
    if (section.bullets && section.bullets.length > 0) {
      for (const b of section.bullets) {
        paras.push(new Paragraph({
          bullet: { level: 0 },
          text: clean(b),
          spacing: { after: 60 },
        }));
      }
    }
  }

  if (content.warnings && content.warnings.length > 0) {
    for (const w of content.warnings) {
      paras.push(new Paragraph({ text: clean(w), spacing: { after: 120 } }));
    }
  }

  if (content.whenToSeekHelp) {
    paras.push(new Paragraph({ text: clean(content.whenToSeekHelp), spacing: { after: 120 } }));
  }

  return paras;
}

/** Tipp des Tages: alle Tips als Abschnitte */
function tipsToParagraphs(tips) {
  const paras = [];
  for (const tip of tips) {
    paras.push(new Paragraph({
      text: tip.title,
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 240, after: 120 },
    }));
    paras.push(new Paragraph({ text: tip.body, spacing: { after: 180 } }));
  }
  return paras;
}

/** Tips aus tipsOfDay.de.ts parsen */
function loadTips(basePath) {
  const tipsPath = join(basePath, 'src', 'data', 'tipsOfDay.de.ts');
  const tips = [];
  try {
    const raw = readFileSync(tipsPath, 'utf-8');
    const idMatches = [...raw.matchAll(/\bid:\s*'([^']*)'/g)];
    const titleMatches = [...raw.matchAll(/\btitle:\s*'([^']*)'/g)];
    const bodyMatches = [...raw.matchAll(/\bbody:\s*'([^']*)'/g)];
    const n = Math.min(idMatches.length, titleMatches.length, bodyMatches.length);
    for (let i = 0; i < n; i++) {
      tips.push({
        id: idMatches[i][1],
        title: titleMatches[i][1].replace(/\\'/g, "'"),
        body: bodyMatches[i][1].replace(/\\'/g, "'"),
      });
    }
  } catch {}
  return tips;
}

async function main() {
  const basePath = join(__dirname, '..');
  const contentIndexPath = join(basePath, 'src', 'modules', 'knowledge', 'content', 'de', 'index.json');
  const index = JSON.parse(readFileSync(contentIndexPath, 'utf-8'));
  const { items } = index;

  const contentByFile = loadAllContent(basePath);

  const pregnancyItems = getPhaseItems(items, 'pregnancy');
  const birthItems = getPhaseItems(items, 'birth');
  const breastfeedingItems = getPhaseItems(items, 'breastfeeding');
  const tips = loadTips(basePath);

  const allParagraphs = [];

  allParagraphs.push(
    new Paragraph({
      text: 'Stillberatung PWA – Textdokumentation',
      heading: HeadingLevel.TITLE,
      alignment: 'center',
      spacing: { after: 240 },
    }),
    new Paragraph({
      text: 'Version mit Änderungsverlauf',
      alignment: 'center',
      spacing: { after: 120 },
    }),
    new Paragraph({
      text: new Date().toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      alignment: 'center',
      spacing: { after: 480 },
    })
  );

  function addPhase(phaseTitle, phaseItems, extraContent = null) {
    allParagraphs.push(
      new Paragraph({
        text: phaseTitle,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 240 },
      })
    );

    for (const item of phaseItems) {
      const content = item.contentFile
        ? (contentByFile[item.contentFile] ?? loadContent(basePath, item.contentFile))
        : null;
      if (!content) continue;

      allParagraphs.push(
        new Paragraph({
          text: item.title,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        })
      );
      allParagraphs.push(...contentToParagraphs(content));
    }

    if (extraContent) {
      allParagraphs.push(...extraContent);
    }
  }

  addPhase('In der Schwangerschaft', pregnancyItems);
  addPhase('Bei der Geburt', birthItems);

  const tipParas =
    tips.length > 0
      ? [
          new Paragraph({
            text: 'Tipp des Tages',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 },
          }),
          ...tipsToParagraphs(tips),
        ]
      : [];
  addPhase('Stillen', breastfeedingItems, tipParas);

  const doc = new Document({
    features: { trackRevisions: true },
    sections: [
      {
        properties: {},
        children: allParagraphs,
      },
    ],
  });

  const buf = await Packer.toBuffer(doc);
  const docsDir = join(basePath, 'docs');
  const useNeu = process.env.EXPORT_NEU === '1';
  const dateStr = new Date().toISOString().slice(0, 10);
  const baseName = 'STILLBERATUNG-TEXTE-REVISION';
  const fileName = useNeu ? `${baseName}_NEU.docx` : `${baseName}_${dateStr}.docx`;
  const outPath = join(docsDir, fileName);

  if (process.env.EXPORT_ALT === '1') {
    const altPath = join(docsDir, `${baseName}_ALT.docx`);
    try {
      const candidates = readdirSync(docsDir)
        .filter((f) => f.startsWith(baseName) && f.endsWith('.docx') && !f.includes('_ALT'))
        .map((f) => {
          const fp = join(docsDir, f);
          return existsSync(fp) ? { name: f, mtime: statSync(fp).mtime } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.mtime - a.mtime);
      if (candidates.length > 0) {
        copyFileSync(join(docsDir, candidates[0].name), altPath);
        console.log('ALT gesichert:', altPath, '(von', candidates[0].name + ')');
      }
    } catch (e) {
      console.warn('EXPORT_ALT: Konnte vorherige Version nicht sichern:', e.message);
    }
  }

  writeFileSync(outPath, buf);

  const subpageCount =
    pregnancyItems.length + birthItems.length + breastfeedingItems.length + (tips.length > 0 ? 1 : 0);
  const textCount = allParagraphs.length;

  console.log('Erstellt:', outPath);
  console.log('Phasen: 3');
  console.log('Unterseiten:', subpageCount);
  console.log('Textabschnitte:', textCount);
  console.log('Änderungsverlauf: aktiv (trackRevisions: true)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
