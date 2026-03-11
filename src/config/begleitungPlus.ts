/**
 * Begleitung Plus – Feature-Flags und Free-Limits.
 * Zentrale Konfiguration für das Plus-Feature.
 */

export type FeatureKey =
  | 'EXPORT'
  | 'ADVANCED_KNOWLEDGE'
  | 'REMINDERS'
  | 'PHASE_TRACKING'
  | 'APPOINTMENTS_UNLIMITED'
  | 'CONTACTS_UNLIMITED';

/** Feature-Mapping: welche Features sind Plus-exklusiv */
export const FEATURE_PLUS_MAP: Record<FeatureKey, boolean> = {
  EXPORT: true,
  ADVANCED_KNOWLEDGE: true,
  REMINDERS: true,
  PHASE_TRACKING: true,
  APPOINTMENTS_UNLIMITED: true,
  CONTACTS_UNLIMITED: true,
};

/** Free-Limits (ohne Plus) */
export const FREE_LIMITS = {
  appointmentsMax: 3,
  contactsMax: 3,
} as const;

export type FreeLimits = typeof FREE_LIMITS;

/**
 * Prüft, ob ein Feature nur mit Begleitung Plus verfügbar ist.
 */
export function isFeaturePlus(feature: FeatureKey): boolean {
  return FEATURE_PLUS_MAP[feature] ?? false;
}
