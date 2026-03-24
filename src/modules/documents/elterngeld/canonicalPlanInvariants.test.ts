/**
 * Invarianten: ein kanonischer Planpfad (Vorbereitung → applicationToCalculationPlan → calculatePlan)
 * und Abgleich mit dem Optimierungs-Step-Flow.
 */

import { describe, it, expect } from 'vitest';
import { applicationToCalculationPlan } from './applicationToCalculationPlan';
import { calculatePlan } from './calculation/calculationEngine';
import { buildStepDecisionContext } from './calculation/stepDecisionFlow';
import { INITIAL_ELTERNGELD_APPLICATION } from './types/elterngeldTypes';
import type { ElterngeldApplication } from './types/elterngeldTypes';

function appWithConcreteDistribution(overrides: Partial<ElterngeldApplication['benefitPlan']>): ElterngeldApplication {
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
      plannedPartTime: true,
      hoursPerWeek: 30,
    },
    parentB: {
      ...INITIAL_ELTERNGELD_APPLICATION.parentA,
      incomeBeforeBirth: '3000',
      plannedPartTime: true,
      hoursPerWeek: 28,
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
      ...overrides,
    },
  };
}

describe('Kanonischer Plan (concreteMonthDistribution)', () => {
  it('a) gleiche Gesamtsumme/Dauer/Bonusmonate: Vorbereitung → Plan → Ergebnis; Overlay-Flow startet auf gleicher householdTotal-Basis', () => {
    const values = appWithConcreteDistribution();
    const plan = applicationToCalculationPlan(values);
    const result = calculatePlan(plan);

    const fromCountsOnly = applicationToCalculationPlan({
      ...values,
      benefitPlan: { ...values.benefitPlan, concreteMonthDistribution: undefined },
    });
    const resultFromCounts = calculatePlan(fromCountsOnly);
    expect(resultFromCounts.householdTotal).not.toBe(result.householdTotal);

    const ctx = buildStepDecisionContext(plan, result, { selectedOptionPerStep: [0, 0, 0] });
    expect(Math.round(ctx.finalResolvedResult.householdTotal)).toBe(Math.round(result.householdTotal));
  });

  it('b) bei gesetzter Distribution kein stiller Count-Pfad: Entfernen der Distribution ändert den berechneten Gesamtbetrag', () => {
    const values = appWithConcreteDistribution();
    const withDist = calculatePlan(applicationToCalculationPlan(values));
    const withoutDist = calculatePlan(
      applicationToCalculationPlan({
        ...values,
        benefitPlan: { ...values.benefitPlan, concreteMonthDistribution: undefined },
      })
    );
    expect(Math.round(withDist.householdTotal)).not.toBe(Math.round(withoutDist.householdTotal));
  });
});
