/**
 * Sichtbarkeit von Optimierungsvarianten: gleiche Bezugsdauer + weniger Geld darf nicht erscheinen.
 */

import { describe, it, expect } from 'vitest';
import { calculatePlan } from '../calculation/calculationEngine';
import type { ElterngeldCalculationPlan } from '../calculation/types';
import type { OptimizationSuggestion } from '../calculation/elterngeldOptimization';
import { shouldShowVariant } from './optimizationExplanation';

function createPlan(overrides: Partial<ElterngeldCalculationPlan>): ElterngeldCalculationPlan {
  return {
    childBirthDate: '2025-03-01',
    parents: [
      {
        id: 'p1',
        label: 'Mutter',
        incomeBeforeNet: 2500,
        months: Array.from({ length: 14 }, (_, i) => ({
          month: i + 1,
          mode: 'none' as const,
          incomeDuringNet: 0,
        })),
      },
      {
        id: 'p2',
        label: 'Vater',
        incomeBeforeNet: 2500,
        months: Array.from({ length: 14 }, (_, i) => ({
          month: i + 1,
          mode: 'none' as const,
          incomeDuringNet: 0,
        })),
      },
    ],
    hasSiblingBonus: false,
    additionalChildren: 0,
    ...overrides,
  };
}

function setMonth(
  plan: ElterngeldCalculationPlan,
  parentIdx: number,
  month: number,
  mode: 'none' | 'basis' | 'plus' | 'partnerBonus',
  incomeDuringNet = 0
) {
  const p = plan.parents[parentIdx];
  let m = p.months.find((x) => x.month === month);
  if (!m) {
    m = { month, mode, incomeDuringNet };
    p.months.push(m);
    p.months.sort((a, b) => a.month - b);
  } else {
    p.months[p.months.indexOf(m)] = { ...m, mode, incomeDuringNet };
  }
}

function suggestionStub(
  current: ReturnType<typeof calculatePlan>,
  optimized: ReturnType<typeof calculatePlan>,
  planOpt: ElterngeldCalculationPlan,
  goal: OptimizationSuggestion['goal'] = 'maxMoney'
): OptimizationSuggestion {
  return {
    goal,
    status: 'checked_but_not_better',
    strategyType: 'maxMoney',
    title: 't',
    explanation: 'e',
    metricLabel: 'Gesamtsumme',
    currentMetricValue: current.householdTotal,
    optimizedMetricValue: optimized.householdTotal,
    deltaValue: optimized.householdTotal - current.householdTotal,
    currentTotal: current.householdTotal,
    optimizedTotal: optimized.householdTotal,
    currentDurationMonths: 0,
    optimizedDurationMonths: 0,
    plan: planOpt,
    result: optimized,
  };
}

describe('shouldShowVariant – Dauer vs. Gesamtauszahlung', () => {
  it('Fall A: gleiche Bezugsdauer und weniger Geld → false', () => {
    const planCur = createPlan({});
    planCur.parents[0].incomeBeforeNet = 1200;
    planCur.parents[1].incomeBeforeNet = 3500;
    for (let m = 1; m <= 4; m++) setMonth(planCur, 1, m, 'basis');

    const planOpt = createPlan({});
    planOpt.parents[0].incomeBeforeNet = 1200;
    planOpt.parents[1].incomeBeforeNet = 3500;
    for (let m = 1; m <= 4; m++) setMonth(planOpt, 0, m, 'basis');

    const current = calculatePlan(planCur);
    const optimized = calculatePlan(planOpt);
    expect(optimized.householdTotal).toBeLessThan(current.householdTotal);

    const s = suggestionStub(current, optimized, planOpt);
    expect(shouldShowVariant(s, current, 'maxMoney')).toBe(false);
  });

  it('Fall B: gleiche Bezugsdauer und mehr Geld → true', () => {
    const planCur = createPlan({});
    planCur.parents[0].incomeBeforeNet = 1200;
    planCur.parents[1].incomeBeforeNet = 3500;
    for (let m = 1; m <= 2; m++) setMonth(planCur, 0, m, 'basis');

    const planOpt = createPlan({});
    planOpt.parents[0].incomeBeforeNet = 1200;
    planOpt.parents[1].incomeBeforeNet = 3500;
    for (let m = 1; m <= 2; m++) setMonth(planOpt, 1, m, 'basis');

    const current = calculatePlan(planCur);
    const optimized = calculatePlan(planOpt);
    expect(optimized.householdTotal).toBeGreaterThan(current.householdTotal);

    const s = suggestionStub(current, optimized, planOpt);
    expect(shouldShowVariant(s, current, 'maxMoney')).toBe(true);
  });

  it('Fall C: andere Bezugsdauer und weniger Geld → true (Trade-off)', () => {
    const planCur = createPlan({});
    planCur.parents[0].incomeBeforeNet = 1200;
    planCur.parents[1].incomeBeforeNet = 3500;
    for (let m = 1; m <= 4; m++) setMonth(planCur, 1, m, 'basis');

    const planOpt = createPlan({});
    planOpt.parents[0].incomeBeforeNet = 1200;
    planOpt.parents[1].incomeBeforeNet = 3500;
    for (let m = 1; m <= 6; m++) setMonth(planOpt, 0, m, 'basis');

    const current = calculatePlan(planCur);
    const optimized = calculatePlan(planOpt);
    expect(optimized.householdTotal).toBeLessThan(current.householdTotal);

    const s = suggestionStub(current, optimized, planOpt);
    expect(shouldShowVariant(s, current, 'maxMoney')).toBe(true);
  });

  it('Fall D: andere Bezugsdauer und mehr Geld → true', () => {
    const planCur = createPlan({});
    planCur.parents[0].incomeBeforeNet = 1200;
    planCur.parents[1].incomeBeforeNet = 3500;
    for (let m = 1; m <= 2; m++) setMonth(planCur, 0, m, 'basis');

    const planOpt = createPlan({});
    planOpt.parents[0].incomeBeforeNet = 1200;
    planOpt.parents[1].incomeBeforeNet = 3500;
    for (let m = 1; m <= 4; m++) setMonth(planOpt, 1, m, 'basis');

    const current = calculatePlan(planCur);
    const optimized = calculatePlan(planOpt);
    expect(optimized.householdTotal).toBeGreaterThan(current.householdTotal);

    const s = suggestionStub(current, optimized, planOpt);
    expect(shouldShowVariant(s, current, 'maxMoney')).toBe(true);
  });
});
