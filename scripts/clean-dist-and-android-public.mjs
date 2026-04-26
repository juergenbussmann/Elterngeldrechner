/**
 * Vor Android-Build/Sync: `dist` und eingebettete Web-Assets leeren,
 * damit keine veralteten `index-*.js`-Hashes mit dem frischen Vite-Output gemischt werden.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const publicDir = path.join(root, 'android', 'app', 'src', 'main', 'assets', 'public');

console.log('[clean-dist-and-android-public] cwd:', process.cwd());
console.log('[clean-dist-and-android-public] root:', root);

for (const target of [dist, publicDir]) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
    console.log('[clean-dist-and-android-public] removed', target);
  } else {
    console.log('[clean-dist-and-android-public] skip (missing):', target);
  }
}
