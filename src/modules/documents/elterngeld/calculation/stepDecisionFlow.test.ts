/**
 * Tests für den Step-basierten Entscheidungsflow.
 */

import { describe, it, expect } from 'vitest';
import { calculatePlan } from './calculationEngine';
import { buildStepDecisionContext } from './stepDecisionFlow';
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

describe('buildStepDecisionContext', () => {
  it('Schritt 1 (Grundmodell) ist immer vorhanden', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');

    const result = calculatePlan(plan);
    const ctx = buildStepDecisionContext(plan, result);

    expect(ctx.decisionSteps.length).toBeGreaterThanOrEqual(1);
    const step1 = ctx.decisionSteps[0];
    expect(step1.kind).toBe('distribution');
    expect(step1.stepQuestion).toBeTruthy();
    expect(step1.stepOptions.length).toBeGreaterThanOrEqual(1);
  });

  it('Schritt 1 zeigt „Aufteilung prüfen“ wenn nur eine Option (keine Schein-Auswahl)', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');

    const result = calculatePlan(plan);
    const ctx = buildStepDecisionContext(plan, result);
    const step1 = ctx.decisionSteps[0];

    if (step1.stepOptions.length <= 1) {
      expect(step1.stepQuestion).toBe('Aufteilung prüfen');
      expect(step1.stepDescription).toMatch(/Ausgangspunkt|bearbeiten|vergleichen/);
    } else {
      expect(step1.stepQuestion).toBe('Wer soll Elterngeld beziehen?');
    }
  });

  it('Schritt 2 (Teilzeit) nur wenn fachlich relevant', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 2000;
    plan.parents[1].incomeBeforeNet = 2000;
    setMonth(plan, 0, 1, 'plus');
    setMonth(plan, 0, 2, 'plus');
    setMonth(plan, 1, 3, 'plus');
    setMonth(plan, 1, 4, 'plus');

    const result = calculatePlan(plan);
    const ctx = buildStepDecisionContext(plan, result);

    const partTimeStep = ctx.decisionSteps.find((s) => s.kind === 'partTime');
    if (partTimeStep) {
      expect(partTimeStep.stepOptions.length).toBeGreaterThan(0);
    }
  });

  it('Schritt 3 (Optimierung) baut auf vorherigen Entscheidungen auf', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');

    const result = calculatePlan(plan);
    const ctx = buildStepDecisionContext(plan, result);

    const optStep = ctx.decisionSteps.find((s) => s.kind === 'optimization');
    expect(optStep).toBeDefined();
    expect(optStep!.stepOptions.length).toBeGreaterThanOrEqual(1);
  });

  it('Änderung in Schritt 1 invalidiert spätere Schritte – finalResolvedPlan wird neu berechnet', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');

    const result = calculatePlan(plan);
    const ctxDefault = buildStepDecisionContext(plan, result, { selectedOptionPerStep: [0] });
    const ctxMotherOnly = buildStepDecisionContext(plan, result, { selectedOptionPerStep: [1] });

    const step1Options = ctxDefault.decisionSteps[0].stepOptions;
    const hasMotherOnly = step1Options.some((o) => o.strategyType === 'motherOnly');
    if (hasMotherOnly) {
      expect(ctxDefault.finalResolvedPlan).not.toEqual(ctxMotherOnly.finalResolvedPlan);
    }
  });

  it('Jede Step-Option hat verständliches Label (keine technischen Namen)', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');

    const result = calculatePlan(plan);
    const ctx = buildStepDecisionContext(plan, result);

    for (const step of ctx.decisionSteps) {
      for (const opt of step.stepOptions) {
        expect(opt.label).toBeTruthy();
        expect(opt.label).not.toMatch(/^maxMoney|longerDuration|frontLoad|partnerBonus$/);
      }
    }
  });

  it('baselineExplanation passt zu comparisonMode', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');

    const result = calculatePlan(plan);
    const ctxCurrent = buildStepDecisionContext(plan, result, { comparisonMode: 'vsCurrent' });
    expect(ctxCurrent.baselineExplanation).toMatch(/aktuellen Plan/i);

    const ctxOriginal = buildStepDecisionContext(plan, result, {
      originalPlan: plan,
      originalResult: result,
      comparisonMode: 'vsOriginal',
    });
    expect(ctxOriginal.baselineExplanation).toMatch(/ursprünglichen Plan/i);
  });

  it('baselineLabel wird aus comparisonMode abgeleitet und im Flow angezeigt', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');

    const result = calculatePlan(plan);
    const ctxCurrent = buildStepDecisionContext(plan, result, { comparisonMode: 'vsCurrent' });
    expect(ctxCurrent.baselineLabel).toBe('Aktueller Plan');

    const ctxOriginal = buildStepDecisionContext(plan, result, {
      originalPlan: plan,
      originalResult: result,
      comparisonMode: 'vsOriginal',
    });
    expect(ctxOriginal.baselineLabel).toBe('Ursprünglicher Plan');
  });

  it('Mikroführung: feedbackAfterSelection und nextStepHint nach Auswahl', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');

    const result = calculatePlan(plan);
    const ctx = buildStepDecisionContext(plan, result);

    const step1 = ctx.decisionSteps[0];
    expect(step1.feedbackAfterSelection).toBeTruthy();
    expect(step1.nextStepHint).toBeTruthy();

    const lastStep = ctx.decisionSteps[ctx.decisionSteps.length - 1];
    expect(lastStep.feedbackAfterSelection).toBeTruthy();
    expect(lastStep.nextStepHint).toMatch(/optimale Variante|übernehmen|anpassen/i);
  });

  it('Step-2 Removal: wenn kein Teilzeit-Schritt, dann kein Hinweis auf Teilzeit in Schritt 1', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');

    const result = calculatePlan(plan);
    const ctx = buildStepDecisionContext(plan, result, { selectedOptionPerStep: [1] });

    const partTimeStep = ctx.decisionSteps.find((s) => s.kind === 'partTime');
    const step1 = ctx.decisionSteps[0];
    if (!partTimeStep) {
      expect(step1.nextStepHint).not.toMatch(/Teilzeit|Partnerschaftsbonus/);
      expect(step1.nextStepHint).toMatch(/Geld|Bezugsdauer/i);
    }
  });

  it('Kontextabhängige Mikroführung: feedbackAfterSelection hängt von gewählter Option ab', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');
    setMonth(plan, 1, 3, 'basis');
    setMonth(plan, 1, 4, 'basis');

    const result = calculatePlan(plan);
    const ctx = buildStepDecisionContext(plan, result);

    const step1 = ctx.decisionSteps[0];
    expect(step1.stepOptions.length).toBeGreaterThanOrEqual(1);
    expect(step1.feedbackAfterSelection).toBeTruthy();
    expect(step1.feedbackAfterSelection).not.toMatch(/^Damit ist die grundsätzliche Aufteilung festgelegt\.$/);
  });

  it('Schritt 3 Optionen in Nutzersprache (maxMoney, longerDuration, frontLoad)', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');

    const result = calculatePlan(plan);
    const ctx = buildStepDecisionContext(plan, result);
    const optStep = ctx.decisionSteps.find((s) => s.kind === 'optimization');
    expect(optStep).toBeDefined();

    const userLabels = optStep!.stepOptions
      .filter((o) => o.strategyType !== 'current')
      .map((o) => o.label);
    for (const label of userLabels) {
      expect(label).toMatch(/möchte|wichtig|Elterngeld|Bezug|Geld|Partnerschaftsbonus|Mutter|Eltern/i);
      expect(label).not.toMatch(/^maxMoney|longerDuration|frontLoad$/);
    }
  });

  it('finalResolvedPlan und finalResolvedResult sind konsistent', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');

    const result = calculatePlan(plan);
    const ctx = buildStepDecisionContext(plan, result);

    const recalc = calculatePlan(ctx.finalResolvedPlan);
    expect(Math.round(recalc.householdTotal)).toBe(Math.round(ctx.finalResolvedResult.householdTotal));
  });
});
