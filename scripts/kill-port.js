#!/usr/bin/env node
'use strict';

/**
 * kill-port.js – Port-Cleanup vor Vite-Dev-Start
 * Beendet Prozesse auf Port 5173 plattformübergreifend (Windows/macOS/Linux).
 * Verwendet ausschließlich Node Core APIs.
 */

const { execSync, spawnSync } = require('child_process');
const { platform } = require('os');

const PORT = 5173;
const IS_WIN = platform() === 'win32';

/**
 * Ermittelt PIDs, die Port 5173 belegen (Windows).
 * @returns {string[]} Liste der PIDs
 */
function getPidsWindows() {
  try {
    const out = execSync(`netstat -ano | findstr :${PORT}`, {
      encoding: 'utf8',
      windowsHide: true,
    });
    const pids = new Set();
    for (const line of out.split('\n')) {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid);
    }
    return [...pids];
  } catch (e) {
    if (e.status === 1) return [];
    throw e;
  }
}

/**
 * Ermittelt PIDs, die Port 5173 belegen (macOS/Linux).
 * @returns {string[]} Liste der PIDs
 */
function getPidsUnix() {
  try {
    const out = execSync(`lsof -ti :${PORT}`, { encoding: 'utf8' });
    return out.trim() ? out.trim().split(/\s+/).filter(Boolean) : [];
  } catch (e) {
    if (e.status === 1) return [];
    throw e;
  }
}

/**
 * Ermittelt den Prozessnamen für eine PID.
 * @param {string} pid
 * @returns {string} Prozessname oder PID als Fallback
 */
function getProcessName(pid) {
  try {
    if (IS_WIN) {
      const out = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, {
        encoding: 'utf8',
        windowsHide: true,
      });
      const match = out.match(/^"([^"]+)"/);
      return match ? match[1] : pid;
    }
    const out = execSync(`ps -p ${pid} -o comm=`, { encoding: 'utf8' });
    return out.trim() || pid;
  } catch {
    return pid;
  }
}

/**
 * Beendet Prozesse per PID.
 * @param {string[]} pids
 */
function killPids(pids) {
  for (const pid of pids) {
    const name = getProcessName(pid);
    try {
      if (IS_WIN) {
        spawnSync('taskkill', ['/PID', pid, '/F'], {
          stdio: 'pipe',
          windowsHide: true,
        });
      } else {
        spawnSync('kill', ['-9', pid], { stdio: 'pipe' });
      }
      console.log(`[kill-port] Beendet: ${name} (PID ${pid})`);
    } catch (e) {
      console.error(`[kill-port] Fehler beim Beenden von PID ${pid}:`, e.message);
    }
  }
}

function main() {
  console.log(`[kill-port] Prüfe Port ${PORT}...`);
  const pids = IS_WIN ? getPidsWindows() : getPidsUnix();

  if (pids.length === 0) {
    console.log(`[kill-port] Port ${PORT} ist frei.`);
    process.exit(0);
    return;
  }

  console.log(`[kill-port] Port ${PORT} belegt. Beende ${pids.length} Prozess(e)...`);
  killPids(pids);
  console.log(`[kill-port] Port ${PORT} freigegeben.`);
  process.exit(0);
}

try {
  main();
} catch (e) {
  console.error('[kill-port] Fehler:', e.message);
  process.exit(1);
}
