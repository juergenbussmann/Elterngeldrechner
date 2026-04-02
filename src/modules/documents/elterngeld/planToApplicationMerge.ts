/**
 * Merged Berechnungsplan-Daten zurück in die Vorbereitung.
 * Nur für UX: Nutzer wählt „Vorbereitung aktualisieren“.
 * Keine Business-Logik, nur Daten-Mapping.
 */

import type {
  ElterngeldApplication,
  MonthDistributionEntry,
  OptimizationAdoptableGoal,
} from './types/elterngeldTypes';
import { EMPTY_ELTERNGELD_PARENT } from './types/elterngeldTypes';
import type { ElterngeldCalculationPlan, CalculationResult } from './calculation';
import { calculatePlan } from './calculation/calculationEngine';
import { getAdoptedBaselineScoreFromResult, parseOptimizationAdoptedBaselineMap } from './calculation/elterngeldOptimization';

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

function isValidMonthMode(v: string): v is MonthDistributionEntry['modeA'] {
  return ['none', 'basis', 'plus', 'partnerBonus'].includes(v);
}

/** Extrahiert konkrete Monatsverteilung aus Plan für Monate 1..maxMonth. */
function extractMonthDistribution(
  plan: ElterngeldCalculationPlan,
  maxMonth: number
): MonthDistributionEntry[] {
  const parentA = plan.parents[0];
  const parentB = plan.parents.length > 1 ? plan.parents[1] : null;
  const byMonthA = new Map(parentA.months.map((m) => [m.month, m.mode]));
  const byMonthB = new Map(parentB?.months.map((m) => [m.month, m.mode]) ?? []);

  const result: MonthDistributionEntry[] = [];
  for (let m = 1; m <= maxMonth; m++) {
    const modeA = isValidMonthMode(byMonthA.get(m) ?? 'none') ? (byMonthA.get(m) as MonthDistributionEntry['modeA']) : 'none';
    const modeB = isValidMonthMode(byMonthB.get(m) ?? 'none') ? (byMonthB.get(m) as MonthDistributionEntry['modeB']) : 'none';
    result.push({ month: m, modeA, modeB });
  }
  return result;
}

export type MergePlanIntoPreparationOptions = {
  /** Beim Übernehmen aus dem Optimierungs-Overlay: Ziel, für das die Score-Baseline gesetzt wird. */
  adoptedOptimizationGoal?: OptimizationAdoptableGoal;
  /** Ergebnis der übernommenen Variante (gleiche Zahlen wie in der UI); sonst einmal calculatePlan(plan). */
  adoptedOptimizationResult?: CalculationResult;
};

/**
 * Aktualisiert die Vorbereitung mit Daten aus dem Berechnungsplan.
 * Behält bestehende Felder (z. B. Namen) bei, überschreibt nur plan-relevante Werte.
 */
export function mergePlanIntoPreparation(
  current: ElterngeldApplication,
  plan: ElterngeldCalculationPlan,
  opts?: MergePlanIntoPreparationOptions
): ElterngeldApplication {
  const parentA = plan.parents[0];
  const parentB = plan.parents.length > 1 ? plan.parents[1] : null;

  const countA = countBelegteMonate(parentA.months);
  const countB = parentB ? countBelegteMonate(parentB.months) : 0;
  const hasPB = parentA.months.some((m) => m.mode === 'partnerBonus') || (parentB?.months.some((m) => m.mode === 'partnerBonus') ?? false);
  const hasPlus = hasPlusOrBonus(parentA.months) || (parentB ? hasPlusOrBonus(parentB.months) : false);
  const model = hasPB || hasPlus ? 'plus' : 'basis';

  const maxMonth = model === 'plus' ? 24 : 14;
  const concreteMonthDistribution = extractMonthDistribution(plan, maxMonth);

  const hasPartnerMonths = countB > 0;
  const applicantMode = hasPartnerMonths ? ('both_parents' as const) : current.applicantMode;
  const effectiveParentB =
    parentB && (current.parentB || hasPartnerMonths)
      ? (current.parentB ?? { ...EMPTY_ELTERNGELD_PARENT })
      : current.parentB;

  const updated: ElterngeldApplication = {
    ...current,
    applicantMode,
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
    parentB: effectiveParentB && parentB
      ? {
          ...effectiveParentB,
          incomeBeforeBirth: parentB.incomeBeforeNet > 0 ? String(parentB.incomeBeforeNet) : effectiveParentB.incomeBeforeBirth,
          employmentType: parentB.employmentType ?? effectiveParentB.employmentType,
          plannedPartTime: (getHoursFromMonths(parentB.months) ?? 0) > 0,
          hoursPerWeek: getHoursFromMonths(parentB.months) ?? effectiveParentB.hoursPerWeek,
        }
      : effectiveParentB ?? null,
    benefitPlan: {
      ...current.benefitPlan,
      model,
      parentAMonths: String(countA),
      parentBMonths: String(countB),
      partnershipBonus: hasPB,
      concreteMonthDistribution,
      optimizationAdoptedBaselineGoals: opts?.adoptedOptimizationGoal
        ? {
            ...parseOptimizationAdoptedBaselineMap(current.benefitPlan.optimizationAdoptedBaselineGoals),
            [opts.adoptedOptimizationGoal]: {
              score: getAdoptedBaselineScoreFromResult(
                opts.adoptedOptimizationGoal,
                opts.adoptedOptimizationResult ?? calculatePlan(plan)
              ),
            },
          }
        : current.benefitPlan.optimizationAdoptedBaselineGoals,
    },
  };

  return updated;
}
