/**
 * Elterngeld-Berechnung (unverbindliche Schätzung).
 */

export * from './types';
export * from './calculationEngine';
export * from './partnerBonusValidation';
export { createDefaultPlan } from './defaultPlan';
import type { ElterngeldCalculationPlan } from './types';

/** Erstellt eine tiefe Kopie des Plans für den Variantenvergleich. */
export function duplicatePlan(plan: ElterngeldCalculationPlan): ElterngeldCalculationPlan {
  return JSON.parse(JSON.stringify(plan));
}
