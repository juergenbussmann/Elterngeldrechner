#!/usr/bin/env node
/**
 * Generates public/sitemap.xml from indexable routes and knowledge index.
 * Run: node scripts/generate-sitemap.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BASE_URL = 'https://www.stillberatung-jt.de';

const indexPath = join(ROOT, 'src/modules/knowledge/content/de/index.json');
const index = JSON.parse(readFileSync(indexPath, 'utf8'));
const knowledgeIds = index.items.map((item) => item.id);

const today = new Date().toISOString().slice(0, 10);

const entries = [
  { loc: '/', priority: '1.0', changefreq: 'monthly' },
  { loc: '/phase/breastfeeding', priority: '1.0', changefreq: 'monthly' },
  { loc: '/phase/pregnancy', priority: '0.8', changefreq: 'monthly' },
  { loc: '/phase/birth', priority: '0.8', changefreq: 'monthly' },
  ...knowledgeIds.map((id) => ({
    loc: `/knowledge/${id}`,
    priority: '0.6',
    changefreq: 'monthly',
  })),
];

const urlBlocks = entries
  .map(
    (e) => `  <url>
    <loc>${BASE_URL}${e.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`,
  )
  .join('\n');

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlBlocks}
</urlset>
`;

const publicDir = join(ROOT, 'public');
mkdirSync(publicDir, { recursive: true });
writeFileSync(join(publicDir, 'sitemap.xml'), sitemap, 'utf8');
console.log(`sitemap.xml written: ${entries.length} URLs`);
