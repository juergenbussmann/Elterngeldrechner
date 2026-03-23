/**
 * Diagnostik-Test: Simuliert den Overlay-Flow und gibt Variantendaten aus.
 * Ausführung: npm test -- overlayFlowDiagnostic --run
 *
 * Zeigt:
 * - Welche Varianten in step3Suggestions landen
 * - Monate, Auszahlung, Titel pro Variante
 * - Ob eine longerDuration-Variante dabei ist
 * - Sortierung nach „Variante übernehmen“
 */

import { describe, it } from 'vitest';
import { calculatePlan } from './calculationEngine';
import { buildStepDecisionContext } from './stepDecisionFlow';
import type { ElterngeldCalculationPlan } from './types';

function countBezugMonths(result: { parents: Array<{ monthlyResults: Array<{ month: number; mode: string; amount: number }> }> }): number {
  const months = new Set<number>();
  for (const p of result.parents) {
    for (const r of p.monthlyResults) {
      if (r.mode !== 'none' || r.amount > 0) months.add(r.month);
    }
  }
  return months.size;
}

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

function formatCurrency(n: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);
}

describe('Overlay-Flow Diagnostik', () => {
  it('gibt Variantendaten für B1-Fall aus', () => {
    // B1: Mutter 1200€, Vater 3500€, Mutter 2 Basis (1–2)
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
    const currentDuration = countBezugMonths(ctx.baseResult);

    console.log('\n' + '='.repeat(70));
    console.log('FALL: B1 (Mutter 1200€, Vater 3500€, Mutter 2 Basis 1–2)');
    console.log('UserPriorität: maxMoney');
    console.log(`Basis: ${formatCurrency(ctx.baseResult.householdTotal)} · ${currentDuration} Monate`);
    console.log('='.repeat(70));

    console.log('\n## Sichtbare Varianten in step3Suggestions:\n');
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      const mon = countBezugMonths(opt.result);
      const isLonger = opt.strategyType === 'longerDuration' || (mon > currentDuration && opt.strategyType !== 'current');
      console.log(`  ${i + 1}. ${opt.label}`);
      console.log(`     scenarioLabel: ${opt.scenarioLabel ?? '(leer)'}`);
      console.log(`     strategyType: ${opt.strategyType}`);
      console.log(`     Monate: ${mon} | Auszahlung: ${formatCurrency(opt.result.householdTotal)}`);
      console.log(`     longerDuration-Variante: ${isLonger ? 'JA' : 'nein'}`);
      console.log(`     matchesUserPriority: ${opt.matchesUserPriority ?? false}`);
      console.log('');
    }

    const hasLongerDuration = options.some(
      (o) => o.strategyType === 'longerDuration' || (countBezugMonths(o.result) > currentDuration && o.strategyType !== 'current')
    );
    console.log('## longerDuration-Variante dabei?', hasLongerDuration ? 'JA' : 'NEIN');
    const maxMonths = options.length > 0 ? Math.max(...options.map((o) => countBezugMonths(o.result))) : 0;
    console.log('## Maximale Monate unter Varianten:', maxMonths);

    console.log('\n## Nach „Diese Variante übernehmen“ (Index → erwartete Monate):');
    for (let idx = 0; idx < options.length; idx++) {
      const opt = options[idx];
      const mon = countBezugMonths(opt.result);
      console.log(`  Index ${idx}: ${opt.label} → Plan hätte ${mon} Monate Bezug`);
    }
  });

  it('gibt Variantendaten für B1 mit longerDuration-Priorität aus', () => {
    const plan = createPlan({});
    plan.parents[0].incomeBeforeNet = 1200;
    plan.parents[1].incomeBeforeNet = 3500;
    setMonth(plan, 0, 1, 'basis');
    setMonth(plan, 0, 2, 'basis');

    const result = calculatePlan(plan);
    const ctx = buildStepDecisionContext(plan, result, {
      strategyStepRequireExplicitSelection: true,
      userPriorityGoal: 'longerDuration',
    });

    const optStep = ctx.decisionSteps[ctx.decisionSteps.length - 1];
    const options = optStep?.stepOptions ?? [];
    const currentDuration = countBezugMonths(ctx.baseResult);

    console.log('\n' + '='.repeat(70));
    console.log('FALL: B1 mit userPriorityGoal: longerDuration');
    console.log(`Basis: ${formatCurrency(ctx.baseResult.householdTotal)} · ${currentDuration} Monate`);
    console.log('='.repeat(70));
    console.log('\nVarianten-Anzahl:', options.length);
    const hasLongerDuration = options.some((o) => o.strategyType === 'longerDuration');
    console.log('longerDuration-Variante in Liste:', hasLongerDuration ? 'JA' : 'NEIN');
    for (let i = 0; i < options.length; i++) {
      const opt = options[i];
      console.log(`  ${i + 1}. ${opt.label} | ${opt.scenarioLabel ?? '-'} | ${countBezugMonths(opt.result)} Monate | ${formatCurrency(opt.result.householdTotal)}`);
    }
  });
});
