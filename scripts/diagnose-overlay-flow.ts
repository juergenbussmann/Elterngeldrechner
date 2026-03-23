/**
 * Diagnostik-Script: Simuliert den Overlay-Flow („Aufteilung prüfen“)
 * und gibt die Variantendaten aus, die step3Suggestions / step3OptionsFinal erzeugen.
 *
 * Ausführung: npx tsx scripts/diagnose-overlay-flow.ts
 */

import { calculatePlan } from '../src/modules/documents/elterngeld/calculation/calculationEngine';
import { buildStepDecisionContext } from '../src/modules/documents/elterngeld/calculation/stepDecisionFlow';
import type { ElterngeldCalculationPlan } from '../src/modules/documents/elterngeld/calculation/types';

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

// --- Typische Fälle für die Reproduktion ---

const CASES: Record<string, { plan: ElterngeldCalculationPlan; userPriorityGoal: 'maxMoney' | 'longerDuration' | undefined }> = {
  B1: {
    plan: (() => {
      const plan = createPlan({});
      plan.parents[0].incomeBeforeNet = 1200;
      plan.parents[1].incomeBeforeNet = 3500;
      setMonth(plan, 0, 1, 'basis');
      setMonth(plan, 0, 2, 'basis');
      return plan;
    })(),
    userPriorityGoal: 'maxMoney',
  },
  B1_longer: {
    plan: (() => {
      const plan = createPlan({});
      plan.parents[0].incomeBeforeNet = 1200;
      plan.parents[1].incomeBeforeNet = 3500;
      setMonth(plan, 0, 1, 'basis');
      setMonth(plan, 0, 2, 'basis');
      return plan;
    })(),
    userPriorityGoal: 'longerDuration',
  },
  A1: {
    plan: (() => {
      const plan = createPlan({});
      plan.parents[0].incomeBeforeNet = 2500;
      plan.parents[1].incomeBeforeNet = 2500;
      setMonth(plan, 0, 1, 'basis');
      setMonth(plan, 0, 2, 'basis');
      setMonth(plan, 1, 3, 'basis');
      setMonth(plan, 1, 4, 'basis');
      return plan;
    })(),
    userPriorityGoal: 'maxMoney',
  },
};

function runDiagnostic(caseName: string, plan: ElterngeldCalculationPlan, userPriorityGoal: 'maxMoney' | 'longerDuration' | undefined) {
  const result = calculatePlan(plan);
  const ctx = buildStepDecisionContext(plan, result, {
    strategyStepRequireExplicitSelection: true,
    userPriorityGoal,
  });

  const optStep = ctx.decisionSteps[ctx.decisionSteps.length - 1];
  const options = optStep?.stepOptions ?? [];

  const currentDuration = countBezugMonths(ctx.baseResult);

  console.log('\n' + '='.repeat(70));
  console.log(`FALL: ${caseName}`);
  console.log(`UserPriorität: ${userPriorityGoal ?? 'nicht gesetzt'}`);
  console.log(`Basis: ${formatCurrency(ctx.baseResult.householdTotal)} · ${currentDuration} Monate`);
  console.log('='.repeat(70));

  console.log('\n## Sichtbare Varianten in step3Suggestions / step3OptionsFinal:\n');
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
  console.log('## Sortierung: Priorität zuerst, dann householdTotal absteigend\n');

  // Simulation „Diese Variante übernehmen“
  console.log('## Nach „Diese Variante übernehmen“ (Index 0 = erste Variante):');
  for (let idx = 0; idx < options.length; idx++) {
    const opt = options[idx];
    const mon = countBezugMonths(opt.result);
    console.log(`  Index ${idx}: ${opt.label} → Plan würde ${mon} Monate Bezug haben.`);
  }
  console.log('');
}

// Hauptausführung
const caseName = process.argv[2] ?? 'B1';
const testCase = CASES[caseName] ?? CASES.B1;
const { plan, userPriorityGoal } = testCase;

console.log('\n[Overlay-Flow Diagnostik]');
runDiagnostic(caseName, plan, userPriorityGoal);

// Optional: B1_longer ebenfalls ausgeben
if (caseName === 'B1') {
  runDiagnostic('B1_longer', CASES.B1_longer.plan, 'longerDuration');
}
