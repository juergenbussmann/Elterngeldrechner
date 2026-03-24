/**
 * Datenfluss Teilzeitstunden: Vorbereitung → applicationToCalculationPlan → calculatePlan.
 * (Referenzvarianten der Optimierung nutzen separat Modellkonstante 28 h in createReferencePlan.)
 */

import { describe, it, expect } from 'vitest';
import { applicationToCalculationPlan } from '../applicationToCalculationPlan';
import { calculatePlan } from './calculationEngine';
import { INITIAL_ELTERNGELD_APPLICATION } from '../types/elterngeldTypes';
import type { ElterngeldApplication } from '../types/elterngeldTypes';

function appWithConcreteDistribution(
  hoursA: number,
  hoursB: number
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
      plannedPartTime: true,
      hoursPerWeek: hoursA,
    },
    parentB: {
      ...INITIAL_ELTERNGELD_APPLICATION.parentA,
      incomeBeforeBirth: '3000',
      plannedPartTime: true,
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

describe('Teilzeitstunden im kanonischen Planpfad', () => {
  it('übernimmt hoursPerWeek aus der Vorbereitung in die Plus-Monate des Berechnungsplans', () => {
    const values = appWithConcreteDistribution(26, 30);
    const plan = applicationToCalculationPlan(values);
    const plusA = plan.parents[0].months.filter((m) => m.mode === 'plus' && m.hoursPerWeek != null);
    const plusB = plan.parents[1].months.filter((m) => m.mode === 'plus' && m.hoursPerWeek != null);
    expect(plusA.length).toBeGreaterThan(0);
    expect(plusB.length).toBeGreaterThan(0);
    expect(plusA.every((m) => m.hoursPerWeek === 26)).toBe(true);
    expect(plusB.every((m) => m.hoursPerWeek === 30)).toBe(true);
  });

  it('führt geänderte hoursPerWeek zu unterschiedlichen Plan-Monaten (Eingaben in calculatePlan)', () => {
    const low = appWithConcreteDistribution(24, 24);
    const high = appWithConcreteDistribution(32, 32);
    const pLow = applicationToCalculationPlan(low);
    const pHigh = applicationToCalculationPlan(high);
    const rLow = calculatePlan(pLow);
    const rHigh = calculatePlan(pHigh);
    expect(rLow.validation.errors.length).toBe(0);
    expect(rHigh.validation.errors.length).toBe(0);
    expect(JSON.stringify(pLow.parents[0].months)).not.toBe(JSON.stringify(pHigh.parents[0].months));
    expect(JSON.stringify(pLow.parents[1].months)).not.toBe(JSON.stringify(pHigh.parents[1].months));
  });
});
