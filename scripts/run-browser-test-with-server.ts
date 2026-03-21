/**
 * Startet Dev-Server, führt Browser-Test aus, beendet Server.
 * Ausführung: npx tsx scripts/run-browser-test-with-server.ts
 */

import { spawn, ChildProcess } from 'child_process';
import { createInterface } from 'readline';

const BASE_URL = 'http://127.0.0.1:5173';

async function waitForServer(timeoutMs = 30000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${BASE_URL}/`);
      if (res.ok) return true;
    } catch {
      /* ignore */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function main() {
  console.log('[start] Starte Dev-Server...');
  const dev = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    env: { ...process.env, FORCE_COLOR: '0' },
  });

  let serverReady = false;
  dev.stdout?.on('data', (d: Buffer) => {
    const s = d.toString();
    if (s.includes('ready') || s.includes('Local:')) serverReady = true;
  });
  dev.stderr?.on('data', (d: Buffer) => {
    const s = d.toString();
    if (s.includes('ready') || s.includes('Local:')) serverReady = true;
  });

  const ready = await waitForServer();
  if (!ready) {
    console.error('[start] Dev-Server nicht erreichbar nach 30s. Abbruch.');
    dev.kill('SIGTERM');
    process.exit(1);
  }
  console.log('[start] Dev-Server bereit.');

  await new Promise((r) => setTimeout(r, 2000));

  console.log('[test] Starte Browser-Test...');
  const { execSync } = await import('child_process');
  try {
    execSync('npx tsx scripts/browser-test-elterngeld.ts', {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: { ...process.env, BASE_URL: BASE_URL },
    });
  } finally {
    dev.kill('SIGTERM');
    console.log('[start] Dev-Server beendet.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
