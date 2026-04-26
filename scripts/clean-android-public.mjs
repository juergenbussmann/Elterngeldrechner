/**
 * Entfernt die eingebetteten Web-Assets vor `cap sync`, damit keine veralteten Dateien
 * im Ordner liegen bleiben (merge/copy-Artefakte).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = path.join(root, 'android', 'app', 'src', 'main', 'assets', 'public');

if (fs.existsSync(target)) {
  fs.rmSync(target, { recursive: true, force: true });
  console.log('[clean-android-public] removed', target);
} else {
  console.log('[clean-android-public] skip (missing):', target);
}
