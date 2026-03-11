#!/usr/bin/env node
/**
 * new-screen – erzeugt neue Screen-Datei + CSS im App-Style.
 * Nutzung: npm run new:screen -- --name FooBar --path /foo-bar
 *
 * @see docs/SSOT-AppStyle.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function parseArgs() {
  const args = process.argv.slice(2);
  const name = args.find((a) => a.startsWith('--name='))?.split('=')[1] ?? args[args.indexOf('--name') + 1];
  const routePath = args.find((a) => a.startsWith('--path='))?.split('=')[1] ?? args[args.indexOf('--path') + 1];
  if (!name || !routePath) {
    console.error('Usage: npm run new:screen -- --name <PascalCaseName> --path <route-path>');
    console.error('Example: npm run new:screen -- --name BegleitungPlusSettings --path /begleitung-plus/settings');
    process.exit(1);
  }
  return { name, routePath };
}

function toKebab(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function toCamel(str) {
  return str
    .split('-')
    .map((s, i) => (i === 0 ? s.toLowerCase() : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()))
    .join('');
}

function getFeatureFromPath(routePath) {
  const segments = routePath.replace(/^\//, '').split('/').filter(Boolean);
  const first = segments[0] || 'app';
  return toCamel(first);
}

function getScreenTemplate(name, kebabName, scope, feature) {
  const cssImportPath = `../core/${feature}/ui/${kebabName}-screen.css`;
  return `import React from 'react';
import { useI18n } from '../shared/lib/i18n';
import { useNavigation } from '../shared/lib/navigation/useNavigation';
import { ModulePage } from '../shared/ui/ModuleLayout';
import { Button } from '../shared/ui/Button';
import '${cssImportPath}';

export default function ${name}Screen() {
  const { t } = useI18n();
  const { goBack } = useNavigation();

  return (
    <ModulePage data-ui-scope="${scope}">
      <header className="${scope}__header">
        <h2 className="topics-menu-panel__title">${name}</h2>
        <p>Beschreibung hier.</p>
      </header>

      <section className="${scope}__section" aria-label="Aktionen">
        <div className="${scope}__actions">
          <Button type="button" variant="primary" fullWidth>
            Aktion
          </Button>
          <Button type="button" variant="secondary" fullWidth onClick={() => goBack()}>
            Zurück
          </Button>
        </div>
      </section>
    </ModulePage>
  );
}
`;
}

function getCssTemplate(scope) {
  return `/* ${scope}-screen – nur Layout-Glue.
   Keine background, border, shadow, radius, color, font-size. */

[data-ui-scope="${scope}"] .${scope}__header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

[data-ui-scope="${scope}"] .${scope}__actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
`;
}

function main() {
  const { name, routePath } = parseArgs();
  const screenName = name.endsWith('Screen') ? name : `${name}Screen`;
  const baseName = screenName.replace(/Screen$/, '');
  const kebabName = toKebab(baseName);
  const scope = kebabName;
  const feature = getFeatureFromPath(routePath);

  const screenPath = path.join(ROOT, 'src', 'screens', `${baseName}Screen.tsx`);
  const cssDir = path.join(ROOT, 'src', 'core', feature, 'ui');
  const cssPath = path.join(cssDir, `${kebabName}-screen.css`);

  if (fs.existsSync(screenPath)) {
    console.error(`Fehler: ${screenPath} existiert bereits.`);
    process.exit(1);
  }
  if (fs.existsSync(cssPath)) {
    console.error(`Fehler: ${cssPath} existiert bereits.`);
    process.exit(1);
  }

  fs.mkdirSync(cssDir, { recursive: true });
  fs.writeFileSync(screenPath, getScreenTemplate(baseName, kebabName, scope, feature), 'utf-8');
  fs.writeFileSync(cssPath, getCssTemplate(scope), 'utf-8');

  console.log('Erstellt:');
  console.log('  ' + path.relative(ROOT, screenPath));
  console.log('  ' + path.relative(ROOT, cssPath));
  console.log('');
  console.log('Route hinzufügen in AppRoutes.tsx:');
  console.log(`  <Route path="${routePath}" element={<${baseName}Screen />} />`);
}

main();
