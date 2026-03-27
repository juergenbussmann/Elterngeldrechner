#!/usr/bin/env node
/**
 * Style Guard – prüft geänderte Dateien auf App-Style-Verstöße.
 * Verwendet: npm run lint:style-guard
 *
 * @see docs/SSOT-AppStyle.md
 * @see docs/SSOT-DoDont.md
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WHITELIST = [
  'src/styles/ui-components.css',
  'src/styles/ui-tokens.css',
  'src/styles/tokens.css',
  'src/styles/layout.css',
  'src/styles/overrides-checklists-softpill.css', // Global overrides (SSoT)
  'src/shared/ui/ModuleLayout/moduleLayout.css',
  'src/screens/Start.tsx',
  'src/screens/start.css',
  'src/core/router/AppRoutes.tsx',
  'src/core/begleitungPlus/ui/BegleitungPlusUpsellPanel.css', // Legacy Panel
];

const SCREEN_WRAPPER_PATTERN = /(?:home-screen|phase-screen|topic-screen)/;
const FORBIDDEN_CSS_PATTERNS = [
  { pattern: /\bbackground\s*:/, name: 'background:' },
  { pattern: /\bbox-shadow\s*:/, name: 'box-shadow:' },
  { pattern: /\bborder-radius\s*:/, name: 'border-radius:' },
  { pattern: /\bfont-size\s*:/, name: 'font-size:' },
  { pattern: /\bcolor\s*:/, name: 'color:' },
  { pattern: /\bfont-weight\s*:/, name: 'font-weight:' },
];

function getChangedFiles() {
  try {
    const out = execSync('git diff --name-only HEAD', { encoding: 'utf-8' });
    return out.trim().split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

function isWhitelisted(file) {
  const normalized = file.replace(/\\/g, '/');
  return WHITELIST.some((w) => normalized.includes(w) || normalized === w);
}

function checkFile(file) {
  const errors = [];
  const normalized = file.replace(/\\/g, '/');

  if (isWhitelisted(file)) {
    return errors;
  }

  if (!fs.existsSync(file)) {
    return errors;
  }

  const content = fs.readFileSync(file, 'utf-8');

  if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
    if (SCREEN_WRAPPER_PATTERN.test(content) && content.includes('className')) {
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (line.includes('className') && SCREEN_WRAPPER_PATTERN.test(line)) {
          errors.push({
            file,
            line: i + 1,
            msg: `Vermeide home-screen/phase-screen/topic-screen in neuen Screens. Nutze ModulePage.`,
          });
        }
      });
    }
  }

  if (file.endsWith('.css') && !normalized.includes('ui-components') && !normalized.includes('ui-tokens') && !normalized.includes('tokens.css') && !normalized.includes('layout.css') && !normalized.includes('moduleLayout.css')) {
    FORBIDDEN_CSS_PATTERNS.forEach(({ pattern, name }) => {
      if (pattern.test(content)) {
        const lines = content.split('\n');
        lines.forEach((line, i) => {
          if (pattern.test(line)) {
            errors.push({
              file,
              line: i + 1,
              msg: `Feature-CSS darf kein ${name} enthalten. Nur Layout (display/flex/gap/margin).`,
            });
          }
        });
      }
    });
  }

  return errors;
}

function main() {
  const changed = getChangedFiles();
  const allErrors = [];

  changed.forEach((file) => {
    const errs = checkFile(file);
    allErrors.push(...errs);
  });

  if (allErrors.length > 0) {
    console.error('\n❌ Style Guard: Verstöße gefunden\n');
    allErrors.forEach(({ file, line, msg }) => {
      console.error(`  ${file}:${line} – ${msg}`);
    });
    console.error('\nSiehe docs/SSOT-AppStyle.md und docs/SSOT-DoDont.md\n');
    process.exit(1);
  }

  console.log('✓ Style Guard: Keine Verstöße');
}

main();
