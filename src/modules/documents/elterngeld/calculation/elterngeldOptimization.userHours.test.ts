/**
 * Optimierer: Nutzerstunden aus dem Plan vs. 28h-Fallback (Referenz- und Variantenpfade).
 */

import { describe, it, expect } from 'vitest';
import { applicationToCalculationPlan } from '../applicationToCalculationPlan';
import { calculatePlan } from './calculationEngine';
import { buildOptimizationResult } from './elterngeldOptimization';
import { INITIAL_ELTERNGELD_APPLICATION } from '../types/elterngeldTypes';
import type { ElterngeldApplication } from '../types/elterngeldTypes';
import type { ElterngeldCalculationPlan } from './types';

function appWithConcreteDistribution(
  hoursA: number | undefined,
  hoursB: number | undefined,
  plannedA = true,
  plannedB = true
): ElterngeldApplication {
  const dist = Array.from({ length: 14 }, (_, i) => ({
    month: i + 1,
    modeA: i < 8 ? ('plus' as const) : ('none' as const),
    modeB: i >= 6 && i < 10 ? ('plus' as const) : ('none' as const),
  }));
  return {
    ...INITIAL_ELTERNGELD_APPLICATION,
    applicantMode: 'both_parents',
    parentA: {
      ...INITIAL_ELTERNGELD_APPLICATION.parentA,
      incomeBeforeBirth: '3000',
      plannedPartTime: plannedA,
      hoursPerWeek: hoursA,
    },
    parentB: {
      ...INITIAL_ELTERNGELD_APPLICATION.parentA,
      incomeBeforeBirth: '3000',
      plannedPartTime: plannedB,
      hoursPerWeek: hoursB,
    },
    child: {
      ...INITIAL_ELTERNGELD_APPLICATION.child,
      birthDate: '2025-06-01',
    },
    benefitPlan: {
      ...INITIAL_ELTERNGELD_APPLICATION.benefitPlan,
      model: 'plus',
      parentAMonths: '24',
      parentBMonths: '12',
      partnershipBonus: true,
      concreteMonthDistribution: dist,
    },
  };
}

function hoursProfileFromPlan(plan: ElterngeldCalculationPlan): { a: Set<number>; b: Set<number> } {
  const take = (idx: number) => {
    const s = new Set<number>();
    for (const m of plan.parents[idx]?.months ?? []) {
      if ((m.mode === 'plus' || m.mode === 'partnerBonus') && m.hoursPerWeek != null) {
        s.add(m.hoursPerWeek);
      }
    }
    return s;
  };
  return { a: take(0), b: take(1) };
}

describe('Optimierer – Nutzerstunden vs. 28h-Fallback', () => {
  it('a) ohne im Plan hinterlegte Stunden: Plus/Bonus in Vorschlägen nutzt 28h (Fallback)', () => {
    const values = appWithConcreteDistribution(undefined, undefined, false, false);
    const plan = applicationToCalculationPlan(values);
    for (const p of plan.parents) {
      for (const m of p.months) {
        expect(m.hoursPerWeek).toBeUndefined();
      }
    }
    const result = calculatePlan(plan);
    expect(result.validation.errors.length).toBe(0);
    const outcome = buildOptimizationResult(plan, result, 'maxMoney');
    if (!('suggestions' in outcome) || outcome.suggestions.length === 0) {
      return;
    }
    const withHours = outcome.suggestions.filter((s) => {
      const { a, b } = hoursProfileFromPlan(s.plan);
      return a.size > 0 || b.size > 0;
    });
    expect(withHours.length).toBeGreaterThan(0);
    for (const s of withHours) {
      const { a, b } = hoursProfileFromPlan(s.plan);
      for (const h of a) expect(h).toBe(28);
      for (const h of b) expect(h).toBe(28);
    }
  });

  it('b) mit Vorbereitungs-Stunden: Vorschläge übernehmen diese Werte je Elternteil', () => {
    const values = appWithConcreteDistribution(26, 31, true, true);
    const plan = applicationToCalculationPlan(values);
    const result = calculatePlan(plan);
    expect(result.validation.errors.length).toBe(0);
    const outcome = buildOptimizationResult(plan, result, 'maxMoney');
    if (!('suggestions' in outcome) || outcome.suggestions.length === 0) {
      return;
    }
    const withUserHours = outcome.suggestions.filter((s) => {
      const { a, b } = hoursProfileFromPlan(s.plan);
      return (a.has(26) && !a.has(28)) || (b.has(31) && !b.has(28));
    });
    expect(withUserHours.length).toBeGreaterThan(0);
  });

  it('c) geänderte Stunden → unterschiedliche Stundenprofiele in den Optimierungsplänen', () => {
    const low = appWithConcreteDistribution(24, 24, true, true);
    const high = appWithConcreteDistribution(30, 30, true, true);
    const pL = applicationToCalculationPlan(low);
    const pH = applicationToCalculationPlan(high);
    const rL = calculatePlan(pL);
    const rH = calculatePlan(pH);
    if (rL.validation.errors.length > 0 || rH.validation.errors.length > 0) return;
    const oL = buildOptimizationResult(pL, rL, 'partnerBonus');
    const oH = buildOptimizationResult(pH, rH, 'partnerBonus');
    if (!('suggestions' in oL) || !('suggestions' in oH)) return;
    if (oL.suggestions.length === 0 || oH.suggestions.length === 0) return;

    const sig = (o: typeof oL) =>
      o.suggestions
        .map((s) => {
          const { a, b } = hoursProfileFromPlan(s.plan);
          return `${[...a].sort().join(',')}|${[...b].sort().join(',')}`;
        })
        .sort()
        .join(';');

    expect(sig(oL)).not.toBe(sig(oH));
  });
});
