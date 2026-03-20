/**
 * Begleitung Plus – Entitlements (Berechtigungen).
 */

export interface Entitlements {
  isPremium: boolean;
  activatedAt?: string;
  expiresAt?: string;
}

/** Default-Zustand für Free-Nutzer */
export const DEFAULT_FREE_ENTITLEMENTS: Entitlements = {
  isPremium: false,
};
