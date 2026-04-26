/**
 * Eine Pipeline für `npm run build:apk`:
 * Repo-Root erzwingen → dist+public leeren → Web-Build (embed) → cap sync aus Root →
 * dist vs. android public prüfen → gradlew clean assembleDebug → APK vs. dist prüfen.
 */
import { execFileSync, execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import {
  assertDistAndroidPublicSame,
  assertTripleMatch,
  getRepoRoot,
  listMainIndexBundles,
  logBundleSnapshot,
  paths,
  warnExtraAndroidTrees,
} from './android-bundle-utils.mjs';

const root = getRepoRoot();
const pkg = path.join(root, 'package.json');
if (!fs.existsSync(pkg)) {
  console.error('[build-apk-pipeline] Abbruch: package.json fehlt unter', root);
  process.exit(1);
}

const beforeCwd = process.cwd();
process.chdir(root);
console.log('[build-apk-pipeline] cwd vor chdir:', beforeCwd);
console.log('[build-apk-pipeline] cwd nach chdir (Repo-Root):', process.cwd());
console.log('[build-apk-pipeline] Erwarteter webDir (rel.): dist — siehe capacitor.config.ts');

const capCfg = path.join(root, 'capacitor.config.ts');
if (fs.existsSync(capCfg)) {
  const txt = fs.readFileSync(capCfg, 'utf8');
  const m = txt.match(/webDir:\s*['"]([^'"]+)['"]/);
  console.log('[build-apk-pipeline] capacitor webDir in Datei:', m ? m[1] : '(nicht per Regex gefunden)');
}

warnExtraAndroidTrees(root);
logBundleSnapshot(root, 'Start (vor clean)');

function runNodeScript(rel, args = []) {
  const scriptPath = path.join(root, rel);
  const r = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  if (r.status !== 0) {
    process.exit(r.status === null ? 1 : r.status);
  }
}

function runNpm(scriptName) {
  const r = spawnSync('npm', ['run', scriptName], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
    shell: true,
  });
  if (r.status !== 0) {
    process.exit(r.status === null ? 1 : r.status);
  }
}

// 1) Leeren
console.log('\n[build-apk-pipeline] Schritt: clean dist + android public');
runNodeScript('scripts/clean-dist-and-android-public.mjs');
logBundleSnapshot(root, 'Nach clean (dist sollte fehlen / leer)');

// 2) Vite-Build (embed)
console.log('\n[build-apk-pipeline] Schritt: npm run build:android:dist (VITE_EMBED_FOR_CAPACITOR=1)');
runNpm('build:android:dist');
logBundleSnapshot(root, 'Nach vite build');

if (listMainIndexBundles(paths(root).distAssets).length === 0) {
  console.error('[build-apk-pipeline] Abbruch: Nach Build fehlt index-*.js in dist/assets.');
  process.exit(1);
}

// 3) Cap sync (immer aus Root)
console.log('\n[build-apk-pipeline] Schritt: cap sync android (aus Repo-Root)');
runNodeScript('scripts/cap-sync-android-from-root.mjs');
logBundleSnapshot(root, 'Nach cap sync');

assertDistAndroidPublicSame(root);

// 4) Gradle — Windows: .bat braucht Shell (execSync); Unix: execFile ohne Shell
console.log('\n[build-apk-pipeline] Schritt: gradlew clean assembleDebug');
const androidDir = path.join(root, 'android');
const gradleName = process.platform === 'win32' ? 'gradlew.bat' : 'gradlew';
const gradlew = path.join(androidDir, gradleName);
try {
  if (process.platform === 'win32') {
    execSync(`"${gradlew}" clean assembleDebug`, {
      cwd: androidDir,
      stdio: 'inherit',
      env: process.env,
    });
  } else {
    execFileSync(path.join(androidDir, 'gradlew'), ['clean', 'assembleDebug'], {
      cwd: androidDir,
      stdio: 'inherit',
      env: process.env,
    });
  }
} catch (e) {
  console.error('[build-apk-pipeline] Gradle fehlgeschlagen:', e?.message ?? e);
  process.exit(1);
}

logBundleSnapshot(root, 'Nach assembleDebug');

const apkPath = process.env.VERIFY_ANDROID_APK_PATH?.trim() || paths(root).apkDebug;
assertTripleMatch(root, apkPath);
