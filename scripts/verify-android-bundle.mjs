/**
 * Vergleicht index-*.js (ohne index.es-*) in dist, Android public und Debug-APK.
 */
import fs from 'node:fs';
import path from 'node:path';

import {
  assertTripleMatch,
  getRepoRoot,
  logBundleSnapshot,
  paths,
} from './android-bundle-utils.mjs';

const root = getRepoRoot();
const pkg = path.join(root, 'package.json');
if (!fs.existsSync(pkg)) {
  console.error('[verify-android-bundle] Kein package.json unter', root);
  process.exit(1);
}
process.chdir(root);

const apkPath = process.env.VERIFY_ANDROID_APK_PATH?.trim() || paths(root).apkDebug;
logBundleSnapshot(root, 'verify-android-bundle (vor Prüfung)');
assertTripleMatch(root, apkPath);
