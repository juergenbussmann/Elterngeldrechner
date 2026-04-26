/**
 * Gemeinsame Hilfen für index-*.js (Haupt-Entry, ohne index.es-*) in dist, Android public und APK.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Repo-Root: Ordner mit package.json (über scripts/ ermittelt). */
export function getRepoRoot() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

/** @param {string} dir */
export function listMainIndexBundles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((n) => /^index-[A-Za-z0-9_-]+\.js$/.test(n) && !n.startsWith('index.es-'))
    .sort();
}

/** @param {string} apkPath */
export function listMainIndexBundlesInApk(apkPath) {
  if (!fs.existsSync(apkPath)) {
    throw new Error(`APK nicht gefunden: ${apkPath}`);
  }
  const listing = execFileSync('tar', ['-tf', apkPath], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const prefix = 'assets/public/assets/';
  const out = new Set();
  for (const line of listing.split(/\r?\n/)) {
    const trimmed = line.replace(/\\/g, '/').trim();
    if (!trimmed.startsWith(prefix)) continue;
    const base = path.posix.basename(trimmed);
    if (/^index-[A-Za-z0-9_-]+\.js$/.test(base) && !base.startsWith('index.es-')) {
      out.add(base);
    }
  }
  return [...out].sort();
}

/** @param {string} root */
export function paths(root) {
  return {
    distAssets: path.join(root, 'dist', 'assets'),
    androidPublicAssets: path.join(root, 'android', 'app', 'src', 'main', 'assets', 'public', 'assets'),
    apkDebug: path.join(root, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'),
    capacitorConfig: path.join(root, 'capacitor.config.ts'),
    packageJson: path.join(root, 'package.json'),
  };
}

/**
 * @param {string} root
 * @param {string} label
 */
export function logBundleSnapshot(root, label) {
  const p = paths(root);
  console.log(`\n[android-bundle] === ${label} ===`);
  console.log('[android-bundle] process.cwd():', process.cwd());
  console.log('[android-bundle] dist/assets index-*.js:', listMainIndexBundles(p.distAssets).join(', ') || '(keine)');
  console.log(
    '[android-bundle] android/.../public/assets index-*.js:',
    listMainIndexBundles(p.androidPublicAssets).join(', ') || '(keine)',
  );
  if (fs.existsSync(p.apkDebug)) {
    try {
      console.log(
        '[android-bundle] APK (debug) index-*.js:',
        listMainIndexBundlesInApk(p.apkDebug).join(', ') || '(keine)',
      );
    } catch (e) {
      console.log('[android-bundle] APK lesen fehlgeschlagen:', String(e?.message ?? e));
    }
  } else {
    console.log('[android-bundle] APK (debug): (noch nicht vorhanden)');
  }
}

/** @param {string} root */
export function warnExtraAndroidTrees(root) {
  const twa = path.join(root, 'twa-android');
  if (fs.existsSync(twa)) {
    console.log(
      '[android-bundle] Hinweis: Ordner twa-android/ existiert (nicht Teil von npm run build:apk). Nur android/ wird synchronisiert.',
    );
  }
}

/**
 * @param {string} root
 * @param {string} apkPath
 */
export function assertDistAndroidPublicSame(root) {
  const p = paths(root);
  const d = listMainIndexBundles(p.distAssets);
  const a = listMainIndexBundles(p.androidPublicAssets);
  const same = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);
  if (d.length === 0) {
    console.error('[android-bundle] FEHLER: Kein index-*.js in dist/assets.');
    process.exit(1);
  }
  if (!same(d, a)) {
    console.error('[android-bundle] FEHLER: Nach cap sync stimmen dist und android public nicht überein.');
    console.error('  dist:   ', d.join(', '));
    console.error('  android:', a.join(', '));
    process.exit(1);
  }
}

/**
 * @param {string} root
 * @param {string} apkPath
 */
export function assertTripleMatch(root, apkPath = paths(root).apkDebug) {
  const p = paths(root);
  const d = listMainIndexBundles(p.distAssets);
  const a = listMainIndexBundles(p.androidPublicAssets);
  let apk = [];
  try {
    apk = listMainIndexBundlesInApk(apkPath);
  } catch (e) {
    console.error(String(e?.message ?? e));
    process.exit(1);
  }
  const same = (x, y) => x.length === y.length && x.every((v, i) => v === y[i]);
  if (d.length === 0) {
    console.error('[verify-android-bundle] FEHLER: Kein index-*.js in dist/assets.');
    process.exit(1);
  }
  if (!same(d, a)) {
    console.error('[verify-android-bundle] FEHLER: dist und android public unterscheiden sich.');
    process.exit(1);
  }
  if (!same(d, apk)) {
    console.error('[verify-android-bundle] FEHLER: dist und APK unterscheiden sich.');
    process.exit(1);
  }
  console.log('[verify-android-bundle] OK — dist, android public und APK identisch:', d.join(', '));
}
