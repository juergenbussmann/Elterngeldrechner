import { useSyncExternalStore } from 'react';
import { getValue, setValue } from '../../shared/lib/storage';

const BEGLEITUNG_PLUS_CHANGED = 'begleitung-plus-changed';

const STORAGE_KEY_PREF = 'begleitungPlusUnlocked';
const LEGACY_KEY = 'elterngeld.optimizationPlusUnlocked.v1';
const RAW_LS_KEY = 'begleitungPlusUnlocked';
const RAW_HASH_KEY = 'plusAdminPasswordHash';

export async function sha256(text: string): Promise<string> {
  if (typeof globalThis.crypto?.subtle?.digest !== 'function') return '';
  const data = new TextEncoder().encode(text);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function readStoredPlusAdminPasswordHash(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(RAW_HASH_KEY);
  } catch {
    return null;
  }
}

function writeStoredPlusAdminPasswordHash(hash: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RAW_HASH_KEY, hash);
  } catch {
    /* noop */
  }
  notify();
}

function readRawFlag(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(RAW_LS_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeRawFlag(on: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (on) window.localStorage.setItem(RAW_LS_KEY, 'true');
    else window.localStorage.removeItem(RAW_LS_KEY);
  } catch {
    /* noop */
  }
}

function notify(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(BEGLEITUNG_PLUS_CHANGED));
  }
}

export function readBegleitungPlusUnlocked(): boolean {
  if (readRawFlag()) return true;
  if (getValue<boolean>(STORAGE_KEY_PREF, false) === true) return true;
  if (getValue<boolean>(LEGACY_KEY, false) === true) {
    writeBegleitungPlusUnlocked(true);
    return true;
  }
  return false;
}

export function writeBegleitungPlusUnlocked(unlocked: boolean): void {
  writeRawFlag(unlocked);
  setValue(STORAGE_KEY_PREF, unlocked);
  if (!unlocked) {
    setValue(LEGACY_KEY, false);
  }
  notify();
}

export function unlockBegleitungPlus(): void {
  writeBegleitungPlusUnlocked(true);
}

/** Entfernt nur den lokalen Plus-Unlock; `plusAdminPasswordHash` bleibt unverändert. */
export function disableBegleitungPlus(): void {
  writeBegleitungPlusUnlocked(false);
}

/**
 * Erstes gültiges Passwort: Hash unter plusAdminPasswordHash speichern und Plus freischalten.
 * Später: Eingabe hashen, mit gespeichertem Hash vergleichen; bei Treffer Plus freischalten.
 */
export async function attemptPlusAdminUnlockWithPassword(plain: string): Promise<'ok' | 'invalid'> {
  const trimmed = plain.trim();
  if (!trimmed) return 'invalid';

  const digest = await sha256(trimmed);
  if (!digest) return 'invalid';

  const stored = readStoredPlusAdminPasswordHash();
  if (!stored) {
    writeStoredPlusAdminPasswordHash(digest);
    unlockBegleitungPlus();
    return 'ok';
  }

  if (digest.toLowerCase() === stored.toLowerCase()) {
    unlockBegleitungPlus();
    return 'ok';
  }

  return 'invalid';
}

export function subscribeBegleitungPlus(onChange: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const h = () => onChange();
  const onStorage = (e: StorageEvent) => {
    if (!e.key) return;
    if (
      e.key === RAW_LS_KEY ||
      e.key === RAW_HASH_KEY ||
      e.key === `pwa-skeleton:${STORAGE_KEY_PREF}` ||
      e.key === `pwa-skeleton:${LEGACY_KEY}`
    ) {
      onChange();
    }
  };
  window.addEventListener(BEGLEITUNG_PLUS_CHANGED, h);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(BEGLEITUNG_PLUS_CHANGED, h);
    window.removeEventListener('storage', onStorage);
  };
}

export function useBegleitungPlus(): boolean {
  return useSyncExternalStore(subscribeBegleitungPlus, readBegleitungPlusUnlocked, () => false);
}
