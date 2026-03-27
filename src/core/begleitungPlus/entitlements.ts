/**
 * Begleitung Plus – Entitlements (Berechtigungen).
 */

export type PlanType = 'none' | 'monthly' | 'yearly';

export interface Entitlements {
  isPremium: boolean;
  planType: PlanType;
  activatedAt?: string;
  expiresAt?: string;
}

/** Default-Zustand für Free-Nutzer */
export const DEFAULT_FREE_ENTITLEMENTS: Entitlements = {
  isPremium: false,
  planType: 'none',
};

/**
 * Erststart / kein localStorage-Eintrag: Plus mit Jahresplan als Default.
 * Bestehende gespeicherte Werte bleiben unverändert (werden nicht überschrieben).
 */
export const DEFAULT_ENTITLEMENTS_WHEN_NO_STORAGE: Entitlements = {
  isPremium: true,
  planType: 'yearly',
};

/**
 * Normalisiert rohe/legacy gespeicherte Werte.
 * Nur isPremium ohne planType → bei Premium planType 'monthly' (bestehende Nutzer).
 */
export function normalizeStoredEntitlements(parsed: Partial<Entitlements>): Entitlements {
  const isPremium = Boolean(parsed?.isPremium);
  let planType: PlanType = 'none';
  if (isPremium) {
    const p = parsed?.planType;
    if (p === 'yearly' || p === 'monthly') {
      planType = p;
    } else {
      planType = 'monthly';
    }
  }
  return {
    isPremium,
    planType,
    activatedAt: parsed?.activatedAt,
    expiresAt: parsed?.expiresAt,
  };
}
