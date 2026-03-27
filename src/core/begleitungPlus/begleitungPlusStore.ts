/**
 * Begleitung Plus – Entitlement-Cache und Persistenz.
 *
 * Source of Truth:
 * - Android + Billing: Google Play Store (syncEntitlementsFromStore überschreibt diesen Cache)
 * - Web: Kein Store → Cache nur für DEV/Admin-Stub
 *
 * localStorage = Cache/Fallback: Wird von Sync/Kauf/Dev/Admin geschrieben.
 * Bei Sync-Fehler (z.B. offline) bleibt der letzte Cache erhalten.
 */

import type { Entitlements } from './entitlements';
import { DEFAULT_FREE_ENTITLEMENTS, normalizeStoredEntitlements } from './entitlements';

const STORAGE_KEY = 'app_begleitung_plus_v1';

function parseEntitlements(raw: string | null): Entitlements {
  if (!raw) return DEFAULT_FREE_ENTITLEMENTS;
  try {
    const parsed = JSON.parse(raw) as Partial<Entitlements>;
    return normalizeStoredEntitlements(parsed);
  } catch {
    return DEFAULT_FREE_ENTITLEMENTS;
  }
}

/** Liest Entitlements aus dem Cache (localStorage). Auf Android wird der Cache von syncEntitlementsFromStore überschrieben. */
export function getEntitlements(): Entitlements {
  if (typeof window === 'undefined') return DEFAULT_FREE_ENTITLEMENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return parseEntitlements(raw);
  } catch {
    return DEFAULT_FREE_ENTITLEMENTS;
  }
}

export function setEntitlements(entitlements: Entitlements): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entitlements));
  } catch {
    /* localStorage nicht verfügbar */
  }
}

const BEGLEITUNG_PLUS_CHANGED = 'begleitung-plus-changed';

/**
 * Setzt Premium im Cache inkl. Plan-Typ (z. B. nach RevenueCat-Sync).
 * Production Android: nur von billingService (Kauf/Sync) – Dev/Admin nutzen eigene Pfade.
 */
export function activatePlusWithPlan(planType: 'monthly' | 'yearly', expiresAt?: string): void {
  const now = new Date().toISOString();
  setEntitlements({
    isPremium: true,
    planType,
    activatedAt: now,
    expiresAt,
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BEGLEITUNG_PLUS_CHANGED));
  }
}

/**
 * Setzt Premium im Cache (monatlich als Default, kompatibel zu älteren Aufrufern).
 * Production Android: nur falls nicht durch Store ersetzt.
 */
export function activatePlus(expiresAt?: string): void {
  activatePlusWithPlan('monthly', expiresAt);
}

/** Entfernt Premium aus dem Cache. Wird von Billing-Sync aufgerufen, wenn kein gültiges Abo. */
export function deactivatePlus(): void {
  setEntitlements({
    isPremium: false,
    planType: 'none',
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BEGLEITUNG_PLUS_CHANGED));
  }
}

/** DEV-only: Plus im Cache setzen. In Production kein Effekt. */
export function activatePlusDev(): void {
  if (!import.meta.env.DEV) return;
  setEntitlements({
    isPremium: true,
    planType: 'monthly',
    activatedAt: new Date().toISOString(),
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BEGLEITUNG_PLUS_CHANGED));
  }
}

/** DEV-only: Plus im Cache entfernen. In Production kein Effekt. */
export function deactivatePlusDev(): void {
  if (!import.meta.env.DEV) return;
  setEntitlements({
    isPremium: false,
    planType: 'none',
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BEGLEITUNG_PLUS_CHANGED));
  }
}

/** Admin: Plus aktivieren. In Production kein Effekt (versehentliche Freischaltung verhindern). */
export function activatePlusAdmin(): void {
  if (import.meta.env.PROD) return;
  const now = new Date().toISOString();
  setEntitlements({
    isPremium: true,
    planType: 'monthly',
    activatedAt: now,
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BEGLEITUNG_PLUS_CHANGED));
  }
}

/** Admin: Plus deaktivieren. In Production kein Effekt. */
export function deactivatePlusAdmin(): void {
  if (import.meta.env.PROD) return;
  setEntitlements({
    isPremium: false,
    planType: 'none',
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(BEGLEITUNG_PLUS_CHANGED));
  }
}
