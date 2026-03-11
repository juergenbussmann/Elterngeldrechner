/**
 * Generiert docs/STILLBERATUNG-TEXTE-BEREINIGT.docx (16.02.2026)
 *
 * Bereinigung: Dopplungen entfernt, CTA vereinheitlicht, Rechtschreibung korrigiert.
 * Source-JSON wird NICHT verändert – Bereinigung erfolgt in-memory beim Export.
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
  'breastfeeding', 'latch', 'nutrition', 'challenges', 'start', 'supply_pumping',
]);

const CTA_SUFFIX =
  '\n\nFür persönliche Begleitung kannst du dich direkt an Stillberaterin Jacqueline Tinz wenden: 01601749534';

/** Neutral: CTA vollständig entfernen */
const NEUTRAL_KEYS = new Set([
  'start/windeln-gewicht', 'supply_pumping/zufuettern-stillfreundlich',
  'nutrition/vegetarisch-vegan', 'nutrition/nahrungsergaenzung',
  'start/vorbereiten-schwangerschaft', 'start/nacht-2',
  'challenges/clusterfeeding', 'nutrition/alkohol', 'supply_pumping/milch-aufbewahren',
]);

/** Problem: CTA behalten, Einstieg thematisch */
const CTA_EINSTIEGE = {
  'challenges/saugerverwirrung': 'Bei anhaltender Brustablehnung oder wenn das Baby kaum trinkt',
  'latch/schlaefriges-neugeborenes': 'Wenn das Baby sehr schwer zu wecken ist oder kaum trinkt',
  'supply_pumping/relaktation': 'Bei belastendem Wiedereinstieg oder wenn die Milchmenge kaum steigt',
  'supply_pumping/baby-trinkt-nicht-effektiv': 'Bei geringer Gewichtszunahme oder wenigen nassen Windeln',
  'start/milcheinschuss': 'Bei sehr schmerzhaften Brüsten, Fieber oder harten, geröteten Bereichen ohne Besserung',
  'start/milch-kommt-spaeter': 'Wenn das Baby sehr schläfrig ist oder wenig trinkt',
  'nutrition/bauch-zwickt': 'Bei starken Schmerzen, anhaltendem Schreien oder Gedeihproblemen',
  'latch/unruhiges-baby': 'Wenn das Baby dauerhaft unruhig bleibt, schlecht trinkt oder kaum nasse Windeln hat',
  'latch/schmerzen-haeufige-ursachen': 'Bei starken, stechenden Schmerzen, wunden Brustwarzen oder Blutungen',
  'latch/kaiserschnitt-positionen': 'Wenn Schmerzen oder die Narbe das Stillen stark erschweren',
  'latch/flache-hohle-brustwarzen': 'Wenn das Anlegen dauerhaft nicht gelingt oder die Brust stark schmerzt',
  'latch/gutes-anlegen-erkennen': 'Wenn Schmerzen trotz Anpassung bleiben, Brustwarzen wund werden oder das Baby kaum trinkt',
  'latch/anlegen-schritt-fuer-schritt': 'Wenn das Anlegen wiederholt nicht gelingt oder sehr schmerzhaft ist',
  'challenges/zu-wenig-milch': 'Bei Sorgen um die Gewichtsentwicklung',
  'challenges/wunde-brustwarzen': 'Bei offenen Wunden, starken Schmerzen oder fehlender Besserung',
  'challenges/ueberangebot': 'Wenn das Baby kaum zunimmt oder Stillen dauerhaft belastend bleibt',
  'challenges/stillstreik': 'Wenn die Brustverweigerung länger anhält oder das Baby wenig trinkt',
  'challenges/soor': 'Bei starken Schmerzen, anhaltenden Symptomen oder wenn das Baby unruhig trinkt',
  'challenges/milchstau': 'Bei Fieber, starkem Krankheitsgefühl oder anhaltenden Beschwerden',
  'challenges/mastitis-verdacht': 'Bei hohem Fieber, Schüttelfrost oder rascher Verschlechterung ist sofort ärztliche Hilfe nötig',
  'start/schwierige-geburt': 'Wenn Stillen nach schwieriger Geburt sich schwer anfühlt',
};

const stats = { ctasRemoved: 0, ctasRestructured: 0, duplicatesRemoved: 0, spellingFixes: 0 };

function stripCta(text) {
  if (!text || typeof text !== 'string') return text;
  const re = /\n\nFür persönliche (?:Unterstützung|Begleitung) kannst du dich direkt an\s*\n?Stillberaterin Jacqueline Tinz wenden:\s*\n?\[Jacqueline Tinz: 01601749534\]\(tel:01601749534\)/g;
  const before = text;
  const after = text.replace(re, '').trim();
  if (before !== after) stats.ctasRemoved++;
  return after;
}

function applySpelling(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\bz\.B\.\b/gi, 'z. B.')
    .replace(/\bzB\b/gi, 'z. B.')
    .replace(/\bctg\b/gi, 'CTG')
    .replace(/  +/g, ' ');
}

function cleanContent(content, fileKey) {
  const key = fileKey.replace(/\.json$/, '');
  const res = JSON.parse(JSON.stringify(content));

  if (NEUTRAL_KEYS.has(key)) {
    const removeCta = (s) => (typeof s === 'string' ? stripCta(applySpelling(s)) : s);
    if (res.intro) res.intro = removeCta(res.intro);
    if (res.sections) res.sections = res.sections.map((s) => ({ ...s, body: removeCta(s.body) }));
    if (res.warnings) res.warnings = res.warnings.map(removeCta);
    delete res.whenToSeekHelp;
    if (content.whenToSeekHelp) stats.ctasRemoved++;
    return res;
  }

  const ctaEinstieg = CTA_EINSTIEGE[key];
  if (ctaEinstieg) {
    const suffix = ctaEinstieg.includes('ärztliche Hilfe')
      ? `${ctaEinstieg}.${CTA_SUFFIX}`
      : `${ctaEinstieg} ist fachliche Unterstützung sinnvoll.${CTA_SUFFIX}`;

    if (res.sections) {
      res.sections = res.sections.map((s) => {
        if (s.body) s.body = stripCta(s.body);
        return s;
      });
    }
    if (res.warnings) {
      res.warnings = res.warnings.map((w) => (typeof w === 'string' ? stripCta(w) : w));
    }
    res.whenToSeekHelp = suffix;
    stats.ctasRestructured++;
  }

  const applyAll = (s) => (typeof s === 'string' ? applySpelling(stripTelLinks(s)) : s);
  if (res.intro) res.intro = applyAll(res.intro);
  if (res.sections) res.sections = res.sections.map((s) => ({ ...s, body: applyAll(s.body) }));
  if (res.warnings) res.warnings = res.warnings.map(applyAll);
  if (res.whenToSeekHelp) res.whenToSeekHelp = applyAll(res.whenToSeekHelp);
  return res;
}

function stripTelLinks(text) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\[([^\]]+)\]\(tel:[^)]+\)/g, '$1').trim();
}

function loadContent(basePath, contentFile) {
  try {
    const p = join(basePath, 'src', 'modules', 'knowledge', 'content', 'de', contentFile);
    return JSON.parse(readFileSync(p, 'utf-8'));
  } catch {
    return null;
  }
}

function loadAllContent(basePath) {
  const dir = join(basePath, 'src', 'modules', 'knowledge', 'content', 'de');
  const byFile = {};
  function walk(d, prefix = '') {
    for (const ent of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, ent.name);
      if (ent.isDirectory()) walk(full, prefix ? `${prefix}/${ent.name}` : ent.name);
      else if (ent.name.endsWith('.json') && ent.name !== 'index.json') {
        const key = prefix ? `${prefix}/${ent.name.replace('.json', '')}` : ent.name.replace('.json', '');
        try {
          byFile[key] = JSON.parse(readFileSync(full, 'utf-8'));
        } catch {}
      }
    }
  }
  walk(dir);
  return byFile;
}

function getPhaseItems(items, phase) {
  switch (phase) {
    case 'pregnancy': return items.filter((i) => i.categoryId === PREGNANCY_CATEGORY);
    case 'birth': return items.filter((i) => i.categoryId === BIRTH_CATEGORY);
    case 'breastfeeding': return items.filter((i) => BREASTFEEDING_CATEGORIES.has(i.categoryId));
    default: return [];
  }
}

function contentToParagraphs(content, stripLinks = true) {
  const paras = [];
  const clean = (t) => (stripLinks ? stripTelLinks(String(t || '')) : String(t || ''));

  if (content.intro) paras.push(new Paragraph({ text: clean(content.intro), spacing: { after: 120 } }));

  for (const section of content.sections || []) {
    paras.push(new Paragraph({
      text: section.heading,
      heading: HeadingLevel.HEADING_3,
      spacing: { before: 240, after: 120 },
    }));
    paras.push(new Paragraph({ text: clean(section.body), spacing: { after: 120 } }));
    if (section.bullets?.length) {
      for (const b of section.bullets) {
        paras.push(new Paragraph({ bullet: { level: 0 }, text: clean(b), spacing: { after: 60 } }));
      }
    }
  }

  if (content.warnings?.length) {
    for (const w of content.warnings) paras.push(new Paragraph({ text: clean(w), spacing: { after: 120 } }));
  }
  if (content.whenToSeekHelp) {
    paras.push(new Paragraph({ text: clean(content.whenToSeekHelp), spacing: { after: 120 } }));
  }
  return paras;
}

function loadTips(basePath) {
  const tips = [];
  try {
    const raw = readFileSync(join(basePath, 'src', 'data', 'tipsOfDay.de.ts'), 'utf-8');
    const ids = [...raw.matchAll(/\bid:\s*'([^']*)'/g)];
    const titles = [...raw.matchAll(/\btitle:\s*'([^']*)'/g)];
    const bodies = [...raw.matchAll(/\bbody:\s*'([^']*)'/g)];
    const n = Math.min(ids.length, titles.length, bodies.length);
    for (let i = 0; i < n; i++) {
      tips.push({
        id: ids[i][1],
        title: titles[i][1].replace(/\\'/g, "'"),
        body: bodies[i][1].replace(/\\'/g, "'"),
      });
    }
  } catch {}
  return tips;
}

async function main() {
  const basePath = join(__dirname, '..');
  const index = JSON.parse(readFileSync(join(basePath, 'src', 'modules', 'knowledge', 'content', 'de', 'index.json'), 'utf-8'));
  const contentByFile = loadAllContent(basePath);

  const pregnancyItems = getPhaseItems(index.items, 'pregnancy');
  const birthItems = getPhaseItems(index.items, 'birth');
  const breastfeedingItems = getPhaseItems(index.items, 'breastfeeding');
  const tips = loadTips(basePath);

  const titleParagraphs = [
    new Paragraph({ text: 'Stillberatung PWA – Textdokumentation', heading: HeadingLevel.TITLE, alignment: 'center', spacing: { after: 240 } }),
    new Paragraph({ text: 'Bereinigte Version 16.02.2026', alignment: 'center', spacing: { after: 120 } }),
    new Paragraph({ text: '16.02.2026', alignment: 'center', spacing: { after: 360 } }),
  ];

  const toc = new TableOfContents('Inhaltsverzeichnis', { hyperlink: true, headingStyleRange: '1-2' });
  const contentParagraphs = [];

  function addPhase(phaseTitle, phaseItems, extraContent = null) {
    contentParagraphs.push(new Paragraph({
      text: phaseTitle,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 360, after: 240 },
      pageBreakBefore: contentParagraphs.length === 0,
    }));

    for (const item of phaseItems) {
      const content = item.contentFile
        ? (contentByFile[item.contentFile] ?? loadContent(basePath, item.contentFile))
        : null;
      if (!content) continue;

      const cleaned = cleanContent(content, item.contentFile);
      contentParagraphs.push(new Paragraph({
        text: item.title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      }));
      contentParagraphs.push(...contentToParagraphs(cleaned));
    }

    if (extraContent) contentParagraphs.push(...extraContent);
  }

  addPhase('In der Schwangerschaft', pregnancyItems);
  addPhase('Bei der Geburt', birthItems);

  const tipParas = tips.length > 0
    ? [
        new Paragraph({ text: 'Tipp des Tages', heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } }),
        ...tips.map((t) => [
          new Paragraph({ text: t.title, heading: HeadingLevel.HEADING_3, spacing: { before: 240, after: 120 } }),
          new Paragraph({ text: t.body, spacing: { after: 180 } }),
        ]).flat(),
      ]
    : [];
  addPhase('Stillen', breastfeedingItems, tipParas);

  const doc = new Document({
    features: { trackRevisions: true, updateFields: true },
    sections: [{ properties: {}, children: [...titleParagraphs, toc, ...contentParagraphs] }],
  });

  const buf = await Packer.toBuffer(doc);
  const outPath = join(basePath, 'docs', 'STILLBERATUNG-TEXTE-BEREINIGT.docx');
  writeFileSync(outPath, buf);

  console.log('Erstellt:', outPath);
  console.log('---');
  console.log('Zusammenfassung Bereinigung:');
  console.log('  Entfernte Dopplungen / CTAs aus Absätzen:', stats.ctasRemoved);
  console.log('  Neu strukturierte CTAs (einheitliches Format):', stats.ctasRestructured);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
