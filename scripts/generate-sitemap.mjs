#!/usr/bin/env node
/**
 * Generates public/sitemap.xml from indexable routes (Elterngeld-Fokus).
 * Run: node scripts/generate-sitemap.mjs
 */

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BASE_URL = 'https://www.stillberatung-jt.de';

const today = new Date().toISOString().slice(0, 10);

const entries = [
  { loc: '/', priority: '1.0', changefreq: 'monthly' },
  { loc: '/documents/elterngeld', priority: '1.0', changefreq: 'monthly' },
  { loc: '/documents', priority: '0.8', changefreq: 'monthly' },
  { loc: '/settings', priority: '0.5', changefreq: 'monthly' },
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
