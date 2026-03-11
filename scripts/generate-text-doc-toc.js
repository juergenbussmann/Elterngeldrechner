/**
 * Generiert docs/STILLBERATUNG-TEXTE-TOC.docx
 * Wie generate-text-doc.js, aber mit automatischem Inhaltsverzeichnis (TOC)
 * nach dem Titelblatt. Ebenen: H1 (Phasen) und H2 (Unterseiten).
 *
 * TOC ist ein Word-Feld – Nutzer muss in Word „Felder aktualisieren“ ausführen
 * (Rechtsklick auf TOC → Felder aktualisieren, oder Strg+A → F9).
 *
 * Track Changes: aktiv (trackRevisions: true)
 * updateFields: true – erforderlich für TOC-Aktualisierung in Word
 */

import {
  Document,
  Packer,
  Paragraph,
  TableOfContents,
  HeadingLevel,
} from 'docx';
import { writeFileSync, readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PREGNANCY_CATEGORY = 'pregnancy';
const BIRTH_CATEGORY = 'birth';
const BREASTFEEDING_CATEGORIES = new Set([
  'breastfeeding',
  'latch',
  'nutrition',
  'challenges',
  'start',
  'supply_pumping',
]);

function stripTelLinks(text) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\[([^\]]+)\]\(tel:[^)]+\)/g, '$1').trim();
}

function loadContent(basePath, contentFile) {
  try {
    const path = join(basePath, 'src', 'modules', 'knowledge', 'content', 'de', contentFile);
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

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

function contentToParagraphs(content, stripLinks = true) {
  const paras = [];
  const clean = (t) => (stripLinks ? stripTelLinks(String(t || '')) : String(t || ''));

  if (content.intro) {
    paras.push(new Paragraph({ text: clean(content.intro), spacing: { after: 120 } }));
  }

  for (const section of content.sections || []) {
    paras.push(
      new Paragraph({
        text: section.heading,
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
      })
    );
    paras.push(new Paragraph({ text: clean(section.body), spacing: { after: 120 } }));
    if (section.bullets && section.bullets.length > 0) {
      for (const b of section.bullets) {
        paras.push(
          new Paragraph({
            bullet: { level: 0 },
            text: clean(b),
            spacing: { after: 60 },
          })
        );
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

function tipsToParagraphs(tips) {
  const paras = [];
  for (const tip of tips) {
    paras.push(
      new Paragraph({
        text: tip.title,
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
      })
    );
    paras.push(new Paragraph({ text: tip.body, spacing: { after: 180 } }));
  }
  return paras;
}

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

  const titleParagraphs = [
    new Paragraph({
      text: 'Stillberatung PWA – Textdokumentation',
      heading: HeadingLevel.TITLE,
      alignment: 'center',
      spacing: { after: 240 },
    }),
    new Paragraph({
      text: 'Version mit Inhaltsverzeichnis',
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
      spacing: { after: 360 },
    }),
  ];

  const toc = new TableOfContents('Inhaltsverzeichnis', {
    hyperlink: true,
    headingStyleRange: '1-2',
  });

  const contentParagraphs = [];

  function addPhase(phaseTitle, phaseItems, extraContent = null) {
    contentParagraphs.push(
      new Paragraph({
        text: phaseTitle,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 240 },
        pageBreakBefore: contentParagraphs.length === 0,
      })
    );

    for (const item of phaseItems) {
      const content = item.contentFile
        ? (contentByFile[item.contentFile] ?? loadContent(basePath, item.contentFile))
        : null;
      if (!content) continue;

      contentParagraphs.push(
        new Paragraph({
          text: item.title,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 240, after: 120 },
        })
      );
      contentParagraphs.push(...contentToParagraphs(content));
    }

    if (extraContent) {
      contentParagraphs.push(...extraContent);
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

  const allChildren = [...titleParagraphs, toc, ...contentParagraphs];

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
  const outPath = join(basePath, 'docs', 'STILLBERATUNG-TEXTE-TOC.docx');
  writeFileSync(outPath, buf);

  const h1Count = 3;
  const h2Count =
    pregnancyItems.length + birthItems.length + breastfeedingItems.length + (tips.length > 0 ? 1 : 0);

  console.log('TOC eingefügt: ja (Ebenen 1–2, nach Titelblatt)');
  console.log('H1 (Phasen):', h1Count);
  console.log('H2 (Unterseiten):', h2Count);
  console.log('Erstellt:', outPath);
  console.log('Hinweis: In Word „Felder aktualisieren“ (Rechtsklick auf TOC → Felder aktualisieren) ausführen.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
