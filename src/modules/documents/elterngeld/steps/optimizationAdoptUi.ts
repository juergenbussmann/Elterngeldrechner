import { validatePartnerBonus, type ElterngeldCalculationPlan } from '../calculation';
import type { ElterngeldApplication } from '../types/elterngeldTypes';
import {
  ADOPTION_EXPLICIT_PART_TIME_HINT,
  isAdoptionExplicitPartTimeSatisfied,
  validatePartnerBonusWithExplicitUserHours,
  variantHasPartnerschaftsbonus,
} from './adoptionExplicitPartTime';

/**
 * Übernahme-Freigabe (PB-Varianten): (1) fehlende explizite Teilzeit, (2) validatePartnerBonus auf Plan
 * mit **Nutzern**-Stunden (kein Optimizer-Fallback), (3) sonstige PB-Varianten ohne PB wie zuvor validatePartnerBonus(Variante).
 */
export function getOptimizationAdoptUiState(
  variantPlan: ElterngeldCalculationPlan,
  ctx: { userPlan: ElterngeldCalculationPlan; application?: ElterngeldApplication | null }
): { allowed: boolean; hint: string | null } {
  const fallbackPbHint =
    'Vor der Übernahme bitte die Voraussetzungen für den Partnerschaftsbonus anpassen (z. B. Teilzeit zwischen 24 und 32 Stunden pro Woche).';

  if (!variantHasPartnerschaftsbonus(variantPlan)) {
    const { isValid, warnings } = validatePartnerBonus(variantPlan);
    if (!isValid) {
      return { allowed: false, hint: warnings[0] ?? fallbackPbHint };
    }
    return { allowed: true, hint: null };
  }

  if (!isAdoptionExplicitPartTimeSatisfied(variantPlan, ctx.userPlan, ctx.application ?? null)) {
    return { allowed: false, hint: ADOPTION_EXPLICIT_PART_TIME_HINT };
  }

  const pbExplicit = validatePartnerBonusWithExplicitUserHours(
    variantPlan,
    ctx.userPlan,
    ctx.application ?? null
  );
  if (!pbExplicit.isValid) {
    return { allowed: false, hint: pbExplicit.warnings[0] ?? fallbackPbHint };
  }
  return { allowed: true, hint: null };
}
