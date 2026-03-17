/**
 * Merged Berechnungsplan-Daten zurück in die Vorbereitung.
 * Nur für UX: Nutzer wählt „Vorbereitung aktualisieren“.
 * Keine Business-Logik, nur Daten-Mapping.
 */

import type { ElterngeldApplication } from './types/elterngeldTypes';
import type { ElterngeldCalculationPlan } from './calculation';

function countBelegteMonate(months: { mode: string }[]): number {
  return months.filter((m) => m.mode !== 'none').length;
}

function hasPlusOrBonus(months: { mode: string }[]): boolean {
  return months.some((m) => m.mode === 'plus' || m.mode === 'partnerBonus');
}

function getHoursFromMonths(months: { hoursPerWeek?: number }[]): number | undefined {
  const m = months.find((x) => x.hoursPerWeek != null && x.hoursPerWeek > 0);
  return m?.hoursPerWeek;
}

/**
 * Aktualisiert die Vorbereitung mit Daten aus dem Berechnungsplan.
 * Behält bestehende Felder (z. B. Namen) bei, überschreibt nur plan-relevante Werte.
 */
export function mergePlanIntoPreparation(
  current: ElterngeldApplication,
  plan: ElterngeldCalculationPlan
): ElterngeldApplication {
  const parentA = plan.parents[0];
  const parentB = plan.parents.length > 1 ? plan.parents[1] : null;

  const countA = countBelegteMonate(parentA.months);
  const countB = parentB ? countBelegteMonate(parentB.months) : 0;
  const hasPB = parentA.months.some((m) => m.mode === 'partnerBonus') || (parentB?.months.some((m) => m.mode === 'partnerBonus') ?? false);
  const hasPlus = hasPlusOrBonus(parentA.months) || (parentB ? hasPlusOrBonus(parentB.months) : false);
  const model = hasPB || hasPlus ? 'plus' : 'basis';

  const updated: ElterngeldApplication = {
    ...current,
    child: {
      ...current.child,
      birthDate: plan.childBirthDate || current.child.birthDate,
      expectedBirthDate: plan.childBirthDate ? '' : current.child.expectedBirthDate,
    },
    parentA: {
      ...current.parentA,
      incomeBeforeBirth: parentA.incomeBeforeNet > 0 ? String(parentA.incomeBeforeNet) : current.parentA.incomeBeforeBirth,
      employmentType: parentA.employmentType ?? current.parentA.employmentType,
      plannedPartTime: (getHoursFromMonths(parentA.months) ?? 0) > 0,
      hoursPerWeek: getHoursFromMonths(parentA.months) ?? current.parentA.hoursPerWeek,
    },
    parentB: current.parentB && parentB
      ? {
          ...current.parentB,
          incomeBeforeBirth: parentB.incomeBeforeNet > 0 ? String(parentB.incomeBeforeNet) : current.parentB.incomeBeforeBirth,
          employmentType: parentB.employmentType ?? current.parentB.employmentType,
          plannedPartTime: (getHoursFromMonths(parentB.months) ?? 0) > 0,
          hoursPerWeek: getHoursFromMonths(parentB.months) ?? current.parentB.hoursPerWeek,
        }
      : current.parentB,
    benefitPlan: {
      ...current.benefitPlan,
      model,
      parentAMonths: String(countA),
      parentBMonths: String(countB),
      partnershipBonus: hasPB,
    },
  };

  return updated;
}
