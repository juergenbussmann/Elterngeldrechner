/**
 * Synchroner Plus-Check für Service-Guards (ohne React).
 * Nutzt getEntitlements aus dem Begleitung-Plus-Store.
 */

import { getEntitlements } from './begleitungPlusStore';

export function isPlus(): boolean {
  return getEntitlements().isPremium === true;
}

/**
 * Guard: Wirft bei Nicht-Plus, damit Service-Aktionen nicht per DevTools umgangen werden können.
 */
export function requirePlus(): void {
  if (!isPlus()) {
    throw new Error('Begleitung Plus erforderlich');
  }
}
