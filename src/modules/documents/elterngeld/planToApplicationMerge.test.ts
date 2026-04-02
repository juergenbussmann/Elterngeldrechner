/**
 * Verifiziert: 24-Monats-Variante („Mit Partnerschaftsbonus“) wird korrekt
 * in die Vorbereitung übernommen und liefert 24 gerenderte Monatsitems.
 *
 * Siehe docs/DIAGNOSE-24-MONATS-VARIANTE-UEBERNAHME.md
 */

import { describe, it, expect } from 'vitest';
import { calculatePlan } from './calculation/calculationEngine';
import { buildStepDecisionContext } from './calculation/stepDecisionFlow';
import { mergePlanIntoPreparation } from './planToApplicationMerge';
import { applicationToCalculationPlan } from './applicationToCalculationPlan';
import { buildOptimizationResult, parseOptimizationAdoptedBaselineMap } from './calculation/elterngeldOptimization';
import { getMonthGridItemsFromValues } from './monthGridMappings';
import { INITIAL_ELTERNGELD_APPLICATION, EMPTY_ELTERNGELD_PARENT } from './types/elterngeldTypes';
import type { ElterngeldCalculationPlan } from './calculation';

function createPlan(overrides: Partial<ElterngeldCalculationPlan>): ElterngeldCalculationPlan {
  return {
    childBirthDate: '2025-03-01',
    parents: [
      { id: 'p1', label: 'Mutter', incomeBeforeNet: 2500, months: Array.from({ length: 14 }, (_, i) => ({ month: i + 1, mode: 'none' as const, incomeDuringNet: 0 })) },
      { id: 'p2', label: 'Vater', incomeBeforeNet: 2500, months: Array.from({ length: 14 }, (_, i) => ({ month: i + 1, mode: 'none' as const, incomeDuringNet: 0 })) },
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
    const idx = p.months.indexOf(m);
    p.months[idx] = { ...m, mode, incomeDuringNet };
  }
}

describe('mergePlanIntoPreparation – 24-Monats-Variante', () => {
  it('übernimmt „Mit Partnerschaftsbonus“ korrekt: 24 Einträge in concreteMonthDistribution', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');

    const result = calculatePlan(plan);
    const ctx = buildStepDecisionContext(plan, result, {
      strategyStepRequireExplicitSelection: true,
      userPriorityGoal: 'maxMoney',
    });

    const optStep = ctx.decisionSteps[ctx.decisionSteps.length - 1];
    const options = optStep?.stepOptions ?? [];
    const variant24 = options.find((o) => o.strategyType === 'withPartTime' && o.result.householdTotal > 0);

    expect(variant24).toBeDefined();
    expect(variant24!.plan).toBeDefined();

    const current = {
      ...INITIAL_ELTERNGELD_APPLICATION,
      applicantMode: 'both_parents' as const,
      parentB: { ...EMPTY_ELTERNGELD_PARENT },
      child: { birthDate: '2025-03-01', expectedBirthDate: '', multipleBirth: false },
    };

    const merged = mergePlanIntoPreparation(current, variant24!.plan);

    expect(merged.benefitPlan.concreteMonthDistribution).toBeDefined();
    expect(merged.benefitPlan.concreteMonthDistribution!.length).toBe(24);
    expect(merged.benefitPlan.model).toBe('plus');
    expect(merged.benefitPlan.parentAMonths).toBe('24');
    expect(merged.benefitPlan.parentBMonths).toBe('4');
    expect(merged.applicantMode).toBe('both_parents');
  });

  it('getMonthGridItemsFromValues liefert 24 Items für die Monatsübersicht', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');

    const result = calculatePlan(plan);
    const ctx = buildStepDecisionContext(plan, result, {
      strategyStepRequireExplicitSelection: true,
      userPriorityGoal: 'maxMoney',
    });

    const optStep = ctx.decisionSteps[ctx.decisionSteps.length - 1];
    const options = optStep?.stepOptions ?? [];
    const variant24 = options.find((o) => o.strategyType === 'withPartTime');

    expect(variant24).toBeDefined();

    const current = {
      ...INITIAL_ELTERNGELD_APPLICATION,
      applicantMode: 'both_parents' as const,
      parentB: { ...EMPTY_ELTERNGELD_PARENT },
      child: { birthDate: '2025-03-01', expectedBirthDate: '', multipleBirth: false },
    };

    const merged = mergePlanIntoPreparation(current, variant24!.plan);
    const items = getMonthGridItemsFromValues(merged, 24);

    expect(items.length).toBe(24);

    const withBezug = items.filter((i) => i.state !== 'none');
    expect(withBezug.length).toBe(24);
  });

  it('[StepPlan DIAG CLI] reproduzierbarer Lauf – B1, Mit Partnerschaftsbonus, gleiche Ausgabe wie Browser-Logs', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');

    const result = calculatePlan(plan);
    const ctx = buildStepDecisionContext(plan, result, {
      strategyStepRequireExplicitSelection: true,
      userPriorityGoal: 'maxMoney',
    });

    const optStep = ctx.decisionSteps[ctx.decisionSteps.length - 1];
    const options = optStep?.stepOptions ?? [];
    const variant24 = options.find((o) => o.strategyType === 'withPartTime');
    if (!variant24) throw new Error('24-Monats-Variante nicht gefunden');

    const current = {
      ...INITIAL_ELTERNGELD_APPLICATION,
      applicantMode: 'both_parents' as const,
      parentB: { ...EMPTY_ELTERNGELD_PARENT },
      child: { birthDate: '2025-03-01', expectedBirthDate: '', multipleBirth: false },
    };

    const values = mergePlanIntoPreparation(current, variant24.plan);
    const maxMonths = values.benefitPlan.model === 'plus' ? 24 : 14;
    const items = getMonthGridItemsFromValues(values, maxMonths);

    console.log('\n[StepPlan DIAG] values vor getMonthGridItemsFromValues:', JSON.stringify({
      model: values.benefitPlan.model,
      parentAMonths: values.benefitPlan.parentAMonths,
      parentBMonths: values.benefitPlan.parentBMonths,
      applicantMode: values.applicantMode,
      concreteMonthDistribution: {
        length: values.benefitPlan.concreteMonthDistribution?.length ?? 0,
        content: values.benefitPlan.concreteMonthDistribution ?? [],
      },
    }, null, 2));

    console.log('\n[StepPlan DIAG] nach getMonthGridItemsFromValues:', JSON.stringify({
      maxMonths,
      itemCount: items.length,
      items: items.map((i) => ({ month: i.month, state: i.state, label: i.label, subLabel: i.subLabel })),
    }, null, 2));

    const expected1to4 = items.slice(0, 4).every((i) => i.state === 'both' && i.subLabel === 'Bonus');
    const expected5to24 = items.slice(4, 24).every((i) => i.state === 'mother' && i.subLabel === 'Plus');
    const konsistent = items.length === 24 && expected1to4 && expected5to24;

    console.log('\n[StepPlan DIAG] Konsistenz: Monate 1–4 Beide/Bonus, 5–24 Mutter/Plus:', konsistent ? 'JA' : 'NEIN');

    expect(items.length).toBe(24);
    expect(expected1to4).toBe(true);
    expect(expected5to24).toBe(true);
  });
});

describe('mergePlanIntoPreparation – Optimierung idempotent nach Übernahme (maxMoney)', () => {
  it('withPartTime + adoptedOptimizationGoal maxMoney → kein weiterer maxMoney-Vorschlag', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');

    const result = calculatePlan(plan);
    const ctx = buildStepDecisionContext(plan, result, {
      strategyStepRequireExplicitSelection: true,
      userPriorityGoal: 'maxMoney',
    });
    const optStep = ctx.decisionSteps[ctx.decisionSteps.length - 1];
    const variant24 = (optStep?.stepOptions ?? []).find(
      (o) => o.strategyType === 'withPartTime' && o.result.householdTotal > 0
    );
    expect(variant24).toBeDefined();

    const current = {
      ...INITIAL_ELTERNGELD_APPLICATION,
      applicantMode: 'both_parents' as const,
      parentB: { ...EMPTY_ELTERNGELD_PARENT },
      child: { birthDate: '2025-03-01', expectedBirthDate: '', multipleBirth: false },
    };

    const merged = mergePlanIntoPreparation(current, variant24!.plan, {
      adoptedOptimizationGoal: 'maxMoney',
      adoptedOptimizationResult: variant24!.result,
    });
    expect(merged.benefitPlan.optimizationAdoptedBaselineGoals).toEqual({
      maxMoney: { score: variant24!.result.householdTotal },
    });

    const recon = applicationToCalculationPlan(merged);
    const rAfter = calculatePlan(recon);
    const outcome = buildOptimizationResult(recon, rAfter, 'maxMoney', {
      adoptedBaselineGoals: parseOptimizationAdoptedBaselineMap(
        merged.benefitPlan.optimizationAdoptedBaselineGoals
      ),
    });
    if (!('suggestions' in outcome)) throw new Error('expected optimization result set');

    const baselineScore = variant24!.result.householdTotal;
    for (const s of outcome.suggestions) {
      expect(s.optimizedTotal).toBeLessThanOrEqual(baselineScore + 1);
    }
  });
});
