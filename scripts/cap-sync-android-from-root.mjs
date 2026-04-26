/**
 * Cap-Sync immer aus dem Repo-Root (wo package.json + capacitor.config liegen).
 * Verhindert, dass bei versehentlichem Aufruf aus Unterordnern eine falsche/fremde dist kopiert wird.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = path.join(root, 'package.json');
if (!fs.existsSync(pkg)) {
  console.error('[cap-sync-android-from-root] Kein package.json unter', root);
  process.exit(1);
}

const before = process.cwd();
process.chdir(root);
console.log('[cap-sync-android-from-root] cwd war:', before);
console.log('[cap-sync-android-from-root] cwd jetzt:', process.cwd());

const clean = spawnSync(process.execPath, ['scripts/clean-android-public.mjs'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});
if (clean.status !== 0) {
  process.exit(clean.status === null ? 1 : clean.status);
}

const sync = spawnSync('npx', ['cap', 'sync', 'android'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
  shell: true,
});
process.exit(sync.status === null ? 1 : sync.status);
