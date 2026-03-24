/**
 * Teilzeit 24–32 h je Elternteil: Voraussetzung für Partnerschaftsbonus (Vorbereitungsdaten).
 * Entspricht der Stundenband-Prüfung in partnerBonusValidation für partnerBonus-Monate.
 */

import type { ElterngeldApplication } from './types/elterngeldTypes';

export function isPartnerBonusPartTimeHoursEligible(values: ElterngeldApplication): boolean {
  if (values.applicantMode !== 'both_parents') return true;
  const ok = (h: number | undefined | null) =>
    h != null && !Number.isNaN(h) && h >= 24 && h <= 32;
  return ok(values.parentA.hoursPerWeek) && ok(values.parentB?.hoursPerWeek);
}
