/**
 * Führt exakt `npm run build` aus (vite build), setzt vorher VITE_EMBED_FOR_CAPACITOR=1,
 * damit vite.config.ts die PWA für das Android-Embed auslässt.
 */
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

process.env.VITE_EMBED_FOR_CAPACITOR = '1';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
console.log('[build:android:dist] Repo-Root:', root);
console.log('[build:android:dist] process.cwd() vor npm run build:', process.cwd());
const r = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  env: process.env,
  cwd: root,
  shell: true,
});

process.exit(r.status === null ? 1 : r.status);
