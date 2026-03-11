#!/usr/bin/env node
/**
 * Generates docs/SEO-META-UEBERSICHT.md from index.json and seoConfig.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const MAX_TITLE = 60;
const MAX_DESC = 155;

function truncateAtWord(text, maxLen) {
  if (text.length <= maxLen) return text;
  const truncated = text.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace <= maxLen * 0.7) return truncated.trim();
  return truncated.slice(0, lastSpace).trim();
}

function getKnowledgeSeo(item) {
  const title = item.seoTitle?.trim() || item.title;
  let desc = item.seoDescription?.trim();
  if (!desc) {
    desc = item.summary.trim().replace(/\s+/g, ' ');
  }
  desc = truncateAtWord(desc, MAX_DESC);
  return { seoTitle: truncateAtWord(title, MAX_TITLE), seoDescription: desc };
}

function checkLengths(title, desc) {
  const titleOk = title.length <= MAX_TITLE;
  const descOk = desc.length <= MAX_DESC;
  return { titleOk, descOk, titleLen: title.length, descLen: desc.length };
}

const phaseSeo = {
  breastfeeding: {
    seoTitle: 'Stillen – Anleitung, Stillprobleme & Tipps',
    seoDescription: 'Umfassender Leitfaden rund ums Stillen: Stillstart, Stillprobleme, Milchmenge, Abstillen und mehr.',
  },
  pregnancy: {
    seoTitle: 'Schwangerschaft – Vorbereitung auf die Stillzeit',
    seoDescription: 'Wissenswertes zur Vorbereitung aufs Stillen in der Schwangerschaft. Körper, Ernährung und mentale Vorbereitung.',
  },
  birth: {
    seoTitle: 'Geburt – stillfreundlicher Start',
    seoDescription: 'Ruhe, Hautkontakt und stillfreundliche Entscheidungen bei der Geburt. Oxytocin und erster Stillstart.',
  },
};

const knowledgeListSeo = {
  title: 'Wissensartikel – Themen rund ums Stillen',
  description: 'Stillartikel zu Anlegen, Stillproblemen, Milchbildung, Ernährung und Abstillen. Fachlich fundiert und verständlich.',
};

const defaultSeo = {
  title: 'Stillberatung – Wissen rund ums Stillen',
  description: 'Fachlich fundierte Informationen rund ums Stillen: Stillstart, Stillprobleme, Milchmenge und Abstillen.',
};

function main() {
  const indexPath = join(ROOT, 'src', 'modules', 'knowledge', 'content', 'de', 'index.json');
  const index = JSON.parse(readFileSync(indexPath, 'utf-8'));

  const lines = [
    '# SEO Meta-Übersicht',
    '',
    '## Qualitätsregeln',
    '- **Title:** max. 60 Zeichen',
    '- **Description:** max. 155 Zeichen',
    '- Keine abgeschnittenen Wörter',
    '- Umlaute korrekt',
    '',
    '---',
    '',
    '## Phase-Seiten',
    '',
    '| Seite | seoTitle | seoDescription | Title OK | Desc OK |',
    '|-------|----------|-----------------|----------|---------|',
  ];

  for (const [phaseId, seo] of Object.entries(phaseSeo)) {
    const c = checkLengths(seo.seoTitle, seo.seoDescription);
    const esc = (s) => String(s).replace(/\|/g, '&#124;');
    lines.push(
      `| /phase/${phaseId} | ${esc(seo.seoTitle)} | ${esc(seo.seoDescription)} | ${c.titleOk ? '✓' : '✗'} (${c.titleLen}) | ${c.descOk ? '✓' : '✗'} (${c.descLen}) |`
    );
  }

  lines.push('', '## Wissensbereich', '', '| Seite | seoTitle | seoDescription | Title OK | Desc OK |', '|-------|----------|-----------------|----------|---------|');

  const listCheck = checkLengths(knowledgeListSeo.title, knowledgeListSeo.description);
  const esc = (s) => String(s).replace(/\|/g, '&#124;');
  lines.push(`| /knowledge | ${esc(knowledgeListSeo.title)} | ${esc(knowledgeListSeo.description)} | ${listCheck.titleOk ? '✓' : '✗'} (${listCheck.titleLen}) | ${listCheck.descOk ? '✓' : '✗'} (${listCheck.descLen}) |`);

  for (const item of index.items) {
    const { seoTitle, seoDescription } = getKnowledgeSeo(item);
    const c = checkLengths(seoTitle, seoDescription);
    const shortDesc = seoDescription.length > 80 ? seoDescription.slice(0, 77) + '...' : seoDescription;
    const esc = (s) => String(s).replace(/\|/g, '&#124;');
    lines.push(
      `| /knowledge/${item.id} | ${esc(seoTitle)} | ${esc(shortDesc)} | ${c.titleOk ? '✓' : '✗'} (${c.titleLen}) | ${c.descOk ? '✓' : '✗'} (${c.descLen}) |`
    );
  }

  lines.push('', '## Startseite (unverändert, SSoT)', '', '| Seite | seoTitle | seoDescription | Länge OK |', '|-------|----------|-----------------|----------|', `| / | ${defaultSeo.title} | ${defaultSeo.description} | ✓ |`);

  const outPath = join(ROOT, 'docs', 'SEO-META-UEBERSICHT.md');
  writeFileSync(outPath, lines.join('\n'), 'utf-8');
  console.log('Wrote', outPath);
}

main();
