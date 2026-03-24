/**
 * Tests für den Entscheidungskontext.
 * Verifiziert Deduplizierung, Optionen und Impact.
 */

import { describe, it, expect } from 'vitest';
import { calculatePlan } from './calculationEngine';
import { buildOptimizationResult } from './elterngeldOptimization';
import type { OptimizationResultSet } from './elterngeldOptimization';
import { buildDecisionContext } from './decisionContext';
import type { ElterngeldCalculationPlan } from './types';

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
    p.months.sort((a, b) => a.month - b.month);
  } else {
    p.months[p.months.indexOf(m)] = { ...m, mode, incomeDuringNet };
  }
}

describe('buildDecisionContext', () => {
  it('enthält immer Option 0 als aktuellen Plan', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');

    const result = calculatePlan(plan);
    const outcome = buildOptimizationResult(plan, result, 'maxMoney');
    if ('status' in outcome && outcome.status === 'unsupported') return;

    const ctx = buildDecisionContext(outcome as Parameters<typeof buildDecisionContext>[0], 0);
    expect(ctx.options.length).toBeGreaterThanOrEqual(1);
    expect(ctx.options[0].strategyType).toBe('current');
    expect(ctx.options[0].label).toBe('Aktueller Plan');
    expect(ctx.options[0].description).toBe(
      'Dein Plan bleibt unverändert – keine automatische Umwandlung und kein Optimierungs-Eingriff.'
    );
  });

  it('dedupliziert Optionen mit gleichem distinctnessKey', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');

    const result = calculatePlan(plan);
    const outcome = buildOptimizationResult(plan, result, 'maxMoney');
    if ('status' in outcome && outcome.status === 'unsupported') return;

    const ctx = buildDecisionContext(outcome as Parameters<typeof buildDecisionContext>[0], 0);
    const keys = new Set(ctx.options.map((o) => o.distinctnessKey));
    expect(keys.size).toBe(ctx.options.length);
  });

  it('setzt Impact korrekt für nicht-aktuelle Optionen', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');

    const result = calculatePlan(plan);
    const outcome = buildOptimizationResult(plan, result, 'maxMoney');
    if ('status' in outcome && outcome.status === 'unsupported') return;

    const ctx = buildDecisionContext(outcome as Parameters<typeof buildDecisionContext>[0], 0);
    expect(ctx.decisionQuestion).toBeTruthy();
    expect(ctx.basePlan).toBe(plan);
    expect(ctx.baseResult).toBe(result);

    if (ctx.options.length > 1) {
      const opt = ctx.options[1];
      expect(opt.impact.financialDelta).toBeDefined();
      expect(opt.impact.durationDelta).toBeDefined();
    }
  });

  it('setzt Vergleichsbasis auf aktuellen Plan', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');

    const result = calculatePlan(plan);
    const outcome = buildOptimizationResult(plan, result, 'maxMoney');
    if ('status' in outcome && outcome.status === 'unsupported') return;

    const ctx = buildDecisionContext(outcome as Parameters<typeof buildDecisionContext>[0], 0);
    expect(ctx.comparisonBaseline).toBe('current');
    expect(ctx.baselineLabel).toBe('Aktueller Plan');
  });

  it('setzt fullSummary für nicht-aktuelle Optionen mit whatChanged, advantage, tradeoff, alternatives', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');

    const result = calculatePlan(plan);
    const outcome = buildOptimizationResult(plan, result, 'maxMoney');
    if ('status' in outcome && outcome.status === 'unsupported') return;

    const ctx = buildDecisionContext(outcome as Parameters<typeof buildDecisionContext>[0], 0);
    for (let i = 1; i < ctx.options.length; i++) {
      const opt = ctx.options[i];
      expect(opt.impact.fullSummary).toBeDefined();
      const full = opt.impact.fullSummary!;
      expect(Array.isArray(full.whatChanged)).toBe(true);
      expect(Array.isArray(full.alternatives)).toBe(true);
      expect(full.baselineLabel).toBe('Aktueller Plan');
      expect(full.alternatives).toContain('Aktueller Plan');
    }
  });

  it('clamped selectedOptionIndex auf gültigen Bereich', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');

    const result = calculatePlan(plan);
    const outcome = buildOptimizationResult(plan, result, 'maxMoney');
    if ('status' in outcome && outcome.status === 'unsupported') return;

    const ctx = buildDecisionContext(outcome as Parameters<typeof buildDecisionContext>[0], 99);
    expect(ctx.selectedOptionIndex).toBeLessThanOrEqual(ctx.options.length - 1);
    expect(ctx.selectedOptionIndex).toBeGreaterThanOrEqual(0);
  });

  it('Deltas beziehen sich auf baseResult (aktueller Plan)', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');

    const result = calculatePlan(plan);
    const outcome = buildOptimizationResult(plan, result, 'maxMoney');
    if ('status' in outcome && outcome.status === 'unsupported') return;

    const ctx = buildDecisionContext(outcome as Parameters<typeof buildDecisionContext>[0], 0);
    const baseTotal = ctx.baseResult.householdTotal;

    for (let i = 1; i < ctx.options.length; i++) {
      const opt = ctx.options[i];
      const expectedDelta = opt.result.householdTotal - baseTotal;
      expect(opt.impact.financialDelta).toBeCloseTo(expectedDelta, 0);
    }
  });

  it('fullSummary enthält primaryChanges und secondaryChanges', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');

    const result = calculatePlan(plan);
    const outcome = buildOptimizationResult(plan, result, 'maxMoney');
    if ('status' in outcome && outcome.status === 'unsupported') return;

    const ctx = buildDecisionContext(outcome as Parameters<typeof buildDecisionContext>[0], 0);
    for (let i = 1; i < ctx.options.length; i++) {
      const full = ctx.options[i].impact.fullSummary;
      expect(full).toBeDefined();
      expect(Array.isArray(full!.primaryChanges)).toBe(true);
      expect(Array.isArray(full!.secondaryChanges)).toBe(true);
    }
  });

  it('baselineExplanation passt zu comparisonMode', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');

    const result = calculatePlan(plan);
    const outcome = buildOptimizationResult(plan, result, 'maxMoney');
    if ('status' in outcome && outcome.status === 'unsupported') return;

    const ctxCurrent = buildDecisionContext(outcome as Parameters<typeof buildDecisionContext>[0], 0);
    expect(ctxCurrent.baselineExplanation).toMatch(/aktuellen Plan/i);

    const ctxOriginal = buildDecisionContext(outcome as Parameters<typeof buildDecisionContext>[0], 0, {
      originalPlan: plan,
      originalResult: result,
      comparisonMode: 'vsOriginal',
    });
    expect(ctxOriginal.baselineExplanation).toMatch(/ursprünglichen Plan/i);
  });

  it('comparisonMode vsOriginal setzt baselineLabel auf Ursprünglicher Plan', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');

    const result = calculatePlan(plan);
    const outcome = buildOptimizationResult(plan, result, 'maxMoney');
    if ('status' in outcome && outcome.status === 'unsupported') return;

    const ctx = buildDecisionContext(outcome as Parameters<typeof buildDecisionContext>[0], 0, {
      originalPlan: plan,
      originalResult: result,
      comparisonMode: 'vsOriginal',
    });
    expect(ctx.baselineLabel).toBe('Ursprünglicher Plan');
    expect(ctx.comparisonMode).toBe('vsOriginal');
  });

  it('empfohlene Option hat konkrete recommendedReason in Nutzersprache', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');

    const result = calculatePlan(plan);
    const outcome = buildOptimizationResult(plan, result, 'maxMoney');
    if ('status' in outcome && outcome.status === 'unsupported') return;

    const ctx = buildDecisionContext(outcome as Parameters<typeof buildDecisionContext>[0], 1);
    const recommended = ctx.options.find((o) => o.recommended);
    if (recommended && recommended.recommendedReason) {
      expect(recommended.recommendedReason).toMatch(/passt|Elterngeld|Variante/i);
      expect(recommended.recommendedReason).not.toMatch(/^maxMoney|optimiert$/);
    }
  });

  it('Optionen haben Nutzer-Labels (keine technischen Namen)', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');

    const result = calculatePlan(plan);
    const outcome = buildOptimizationResult(plan, result, 'maxMoney');
    if ('status' in outcome && outcome.status === 'unsupported') return;

    const ctx = buildDecisionContext(outcome as Parameters<typeof buildDecisionContext>[0], 0);
    for (const opt of ctx.options) {
      expect(opt.label).not.toMatch(/^maxMoney|longerDuration|frontLoad|partnerBonus$/);
    }
  });

  it('Option withPartTime: Beschreibung enthält Hinweis zu 28 Wochenstunden', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 2500;
    plan.parents[1].incomeBeforeNet = 2500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');
    const result = calculatePlan(plan);
    const altPlan = JSON.parse(JSON.stringify(plan)) as ElterngeldCalculationPlan;
    setMonth(altPlan, 0, 1, 'plus');
    const altResult = calculatePlan(altPlan);
    const resultSet: OptimizationResultSet = {
      goal: 'maxMoney',
      status: 'improved',
      currentPlan: plan,
      currentResult: result,
      suggestions: [
        {
          goal: 'maxMoney',
          status: 'improved',
          strategyType: 'withPartTime',
          title: 'Mit Partnerschaftsbonus',
          explanation: 'Beide in Teilzeit – Bonusmonate werden genutzt.',
          metricLabel: 'Gesamtsumme',
          currentMetricValue: result.householdTotal,
          optimizedMetricValue: altResult.householdTotal,
          deltaValue: altResult.householdTotal - result.householdTotal,
          currentTotal: result.householdTotal,
          optimizedTotal: altResult.householdTotal,
          currentDurationMonths: 2,
          optimizedDurationMonths: 2,
          plan: altPlan,
          result: altResult,
        },
      ],
    };
    const ctx = buildDecisionContext(resultSet, 0);
    const withPart = ctx.options.find((o) => o.strategyType === 'withPartTime');
    expect(withPart).toBeDefined();
    expect(withPart!.description).toMatch(/28\s*Wochenstunden/);
  });
});
