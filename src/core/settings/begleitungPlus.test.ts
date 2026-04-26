/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  attemptPlusAdminUnlockWithPassword,
  disableBegleitungPlus,
  readBegleitungPlusUnlocked,
  readStoredPlusAdminPasswordHash,
  sha256,
  writeBegleitungPlusUnlocked,
} from './begleitungPlus';

describe('begleitungPlus', () => {
  beforeEach(() => {
    writeBegleitungPlusUnlocked(false);
    try {
      window.localStorage.removeItem('begleitungPlusUnlocked');
      window.localStorage.removeItem('plusAdminPasswordHash');
    } catch {
      /* noop */
    }
  });

  it('sha256 liefert 64-stelligen Hex-String', async () => {
    const h = await sha256('test');
    expect(h).toHaveLength(64);
    expect(h).toMatch(/^[0-9a-f]+$/);
  });

  it('erstes Passwort legt Hash an und schaltet Plus frei', async () => {
    expect(readStoredPlusAdminPasswordHash()).toBeNull();
    expect(await attemptPlusAdminUnlockWithPassword('mein-geheimnis')).toBe('ok');
    expect(readStoredPlusAdminPasswordHash()).toBeTruthy();
    expect(readBegleitungPlusUnlocked()).toBe(true);
  });

  it('leere Eingabe ist ungültig', async () => {
    expect(await attemptPlusAdminUnlockWithPassword('')).toBe('invalid');
    expect(await attemptPlusAdminUnlockWithPassword('   ')).toBe('invalid');
  });

  it('disableBegleitungPlus entfernt Unlock, plusAdminPasswordHash bleibt', async () => {
    expect(await attemptPlusAdminUnlockWithPassword('geheim')).toBe('ok');
    const hashBefore = readStoredPlusAdminPasswordHash();
    expect(hashBefore).toBeTruthy();
    disableBegleitungPlus();
    expect(readBegleitungPlusUnlocked()).toBe(false);
    expect(readStoredPlusAdminPasswordHash()).toBe(hashBefore);
  });

  it('nach Einrichtung: falsches Passwort ungültig, richtiges schaltet frei wenn zuvor gesperrt', async () => {
    expect(await attemptPlusAdminUnlockWithPassword('richtig')).toBe('ok');
    writeBegleitungPlusUnlocked(false);
    window.localStorage.removeItem('begleitungPlusUnlocked');

    expect(await attemptPlusAdminUnlockWithPassword('falsch')).toBe('invalid');
    expect(readBegleitungPlusUnlocked()).toBe(false);

    expect(await attemptPlusAdminUnlockWithPassword('richtig')).toBe('ok');
    expect(readBegleitungPlusUnlocked()).toBe(true);
  });

  it('read erkennt unpräfixiertes begleitungPlusUnlocked=true', () => {
    expect(readBegleitungPlusUnlocked()).toBe(false);
    window.localStorage.setItem('begleitungPlusUnlocked', 'true');
    expect(readBegleitungPlusUnlocked()).toBe(true);
  });
});
