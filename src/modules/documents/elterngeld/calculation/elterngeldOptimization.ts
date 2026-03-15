/**
 * Optimierungsvorschläge für den Elterngeld-Bezug.
 * Liefert ein vollständiges Optimierungsergebnis mit zielabhängiger Verbesserungslogik.
 */

import type {
  ElterngeldCalculationPlan,
  CalculationResult,
  CalculationParentInput,
  MonthMode,
} from './types';
import { calculatePlan } from './calculationEngine';

function duplicatePlan(plan: ElterngeldCalculationPlan): ElterngeldCalculationPlan {
  return JSON.parse(JSON.stringify(plan));
}

export type OptimizationGoal =
  | 'maxMoney'
  | 'longerDuration'
  | 'frontLoad'
  | 'balanced'
  | 'partnerBonus';

export type OptimizationStatus =
  | 'improved'
  | 'checked_but_not_better'
  | 'no_candidate'
  | 'unsupported';

export interface OptimizationResult {
  goal: OptimizationGoal;
  /** Nur true, wenn die zielabhängige Metrik tatsächlich besser wurde */
  improved: boolean;
  title: string;
  explanation: string;
  improvements: string[];
  metricLabel: string;
  currentMetricValue: number;
  optimizedMetricValue: number;
  deltaValue: number;
  currentTotal: number;
  optimizedTotal: number;
  currentDurationMonths: number;
  optimizedDurationMonths: number;
  plan: ElterngeldCalculationPlan;
  result: CalculationResult;
}

export interface OptimizationOutcome {
  goal: OptimizationGoal;
  status: OptimizationStatus;
  result?: OptimizationResult;
}

const GOAL_LABELS: Record<OptimizationGoal, string> = {
  maxMoney: 'Mehr Gesamtauszahlung',
  longerDuration: 'Längere Bezugsdauer',
  frontLoad: 'Höhere Zahlungen am Anfang',
  balanced: 'Gleichmäßigere monatliche Zahlungen',
  partnerBonus: 'Partnerschaftsbonus prüfen',
};

/** Ziele ohne implementierte Strategielogik */
const UNSUPPORTED_GOALS: OptimizationGoal[] = ['frontLoad', 'balanced'];

/**
 * Berechnet ein Optimierungsergebnis für das gewählte Ziel.
 * Liefert ein OptimizationOutcome mit status:
 * - improved: bessere Strategie gefunden
 * - checked_but_not_better: Kandidaten geprüft, keiner besser
 * - no_candidate: keine Vergleichsstrategie aus Planung ableitbar
 * - unsupported: Ziel noch nicht implementiert
 */
export function buildOptimizationResult(
  plan: ElterngeldCalculationPlan,
  currentResult: CalculationResult,
  goal: OptimizationGoal
): OptimizationOutcome {
  if (UNSUPPORTED_GOALS.includes(goal)) {
    if (import.meta.env.DEV) {
      console.log('[elterngeld-optimization] unsupported goal', { goal });
    }
    return { goal, status: 'unsupported' };
  }

  const currentDuration = countBezugMonths(currentResult);
  const currentTotal = currentResult.householdTotal;
  const currentFrontLoad = sumEarlyMonths(currentResult, 6);
  const currentVariance = monthlyVariance(currentResult);

  const candidate = findBestCandidate(plan, currentResult, goal);
  if (!candidate) {
    if (import.meta.env.DEV) {
      console.log('[elterngeld-optimization] no candidate found', { goal });
    }
    return { goal, status: 'no_candidate' };
  }

  const { plan: optimizedPlan, result: optimizedResult, strategyType } = candidate;
  const optimizedTotal = optimizedResult.householdTotal;
  const optimizedDuration = countBezugMonths(optimizedResult);
  const optimizedFrontLoad = sumEarlyMonths(optimizedResult, 6);
  const optimizedVariance = monthlyVariance(optimizedResult);

  let improved: boolean;
  let metricLabel: string;
  let currentMetricValue: number;
  let optimizedMetricValue: number;
  let deltaValue: number;

  switch (goal) {
    case 'maxMoney':
      metricLabel = 'Gesamtsumme';
      currentMetricValue = currentTotal;
      optimizedMetricValue = optimizedTotal;
      deltaValue = optimizedTotal - currentTotal;
      improved = deltaValue > 0;
      break;
    case 'longerDuration':
      metricLabel = 'Bezugsdauer (Monate)';
      currentMetricValue = currentDuration;
      optimizedMetricValue = optimizedDuration;
      deltaValue = optimizedDuration - currentDuration;
      improved = deltaValue > 0;
      break;
    case 'frontLoad':
      metricLabel = 'Summe Monate 1–6 (€)';
      currentMetricValue = currentFrontLoad;
      optimizedMetricValue = optimizedFrontLoad;
      deltaValue = optimizedFrontLoad - currentFrontLoad;
      improved = deltaValue > 0;
      break;
    case 'balanced':
      metricLabel = 'Schwankung (Standardabweichung)';
      currentMetricValue = currentVariance;
      optimizedMetricValue = optimizedVariance;
      deltaValue = currentVariance - optimizedVariance; // niedriger = besser
      improved = deltaValue > 0;
      break;
    case 'partnerBonus':
      metricLabel = 'Gesamtsumme';
      currentMetricValue = currentTotal;
      optimizedMetricValue = optimizedTotal;
      deltaValue = optimizedTotal - currentTotal;
      improved = deltaValue > 0;
      break;
    default:
      improved = false;
      metricLabel = 'Gesamtsumme';
      currentMetricValue = currentTotal;
      optimizedMetricValue = optimizedTotal;
      deltaValue = 0;
  }

  const title = getStrategyTitle(strategyType);
  const explanation = getStrategyExplanation(strategyType);
  const improvements = getImprovements(strategyType, optimizedDuration, currentDuration);

  const status: OptimizationStatus = improved ? 'improved' : 'checked_but_not_better';

  if (import.meta.env.DEV) {
    console.log('[elterngeld-optimization] debug', {
      goal,
      strategyType,
      status,
      currentTotal: currentResult.householdTotal,
      optimizedTotal: optimizedResult.householdTotal,
      currentDuration,
      optimizedDuration,
      improved,
    });
  }

  const result: OptimizationResult = {
    goal,
    improved,
    title,
    explanation,
    improvements,
    metricLabel,
    currentMetricValue,
    optimizedMetricValue,
    deltaValue,
    currentTotal,
    optimizedTotal,
    currentDurationMonths: currentDuration,
    optimizedDurationMonths: optimizedDuration,
    plan: optimizedPlan,
    result: optimizedResult,
  };

  return { goal, status, result };
}

type Candidate = {
  plan: ElterngeldCalculationPlan;
  result: CalculationResult;
  strategyType: 'maxMoney' | 'longerDuration' | 'partnerBonus';
};

function findBestCandidate(
  plan: ElterngeldCalculationPlan,
  currentResult: CalculationResult,
  goal: OptimizationGoal
): Candidate | null {
  const candidates: Candidate[] = [];
  const currentTotal = currentResult.householdTotal;
  const parentA = plan.parents[0];
  const parentB = plan.parents[1];

  if (import.meta.env.DEV) {
    const monthsA = parentA ? getBezugMonths(parentA) : [];
    const monthsB = parentB ? getBezugMonths(parentB) : [];
    console.log('[elterngeld-optimization] findBestCandidate input', {
      goal,
      currentTotal,
      hasParentB: !!parentB,
      monthsACount: monthsA.length,
      monthsBCount: monthsB.length,
      incomeA: parentA?.incomeBeforeNet,
      incomeB: parentB?.incomeBeforeNet,
    });
  }

  if (parentB && parentA.incomeBeforeNet > 0 && parentB.incomeBeforeNet > 0) {
    const monthsA = getBezugMonths(parentA);
    const monthsB = getBezugMonths(parentB);
    if (
      monthsA.length >= 2 &&
      monthsB.length < monthsA.length &&
      parentB.incomeBeforeNet > parentA.incomeBeforeNet
    ) {
      const shifted = shiftMonthsFromAtoB(plan, 1);
      if (shifted) {
        const res = calculatePlan(shifted);
        if (res.householdTotal > currentTotal) {
          candidates.push({ plan: shifted, result: res, strategyType: 'maxMoney' });
        }
      }
    }
  }

  if (parentB && !hasPartnerBonus(plan)) {
    const plusMonthsA = getMonthsWithMode(parentA, 'plus');
    const plusMonthsB = getMonthsWithMode(parentB, 'plus');
    if (plusMonthsA.length >= 2 && plusMonthsB.length >= 2) {
      const withBonus = tryAddPartnerBonus(plan);
      if (withBonus) {
        const res = calculatePlan(withBonus);
        candidates.push({ plan: withBonus, result: res, strategyType: 'partnerBonus' });
      }
    }
  }

  const basisMonths = countMonthsWithMode(plan, 'basis');
  const plusMonths = countMonthsWithMode(plan, 'plus');
  const noBezugMonths = countNoBezugMonths(plan);
  if (basisMonths >= 2 && plusMonths === 0 && noBezugMonths >= 2) {
    const stretched = tryStretchBasisToPlus(plan);
    if (stretched) {
      const res = calculatePlan(stretched);
      const diff = res.householdTotal - currentTotal;
      if (diff >= -50) {
        candidates.push({ plan: stretched, result: res, strategyType: 'longerDuration' });
      }
    }
  }

  const goalMatches = candidates.filter((c) => c.strategyType === goal);
  const pool = goalMatches.length > 0 ? goalMatches : candidates;
  if (pool.length === 0) {
    if (import.meta.env.DEV) {
      console.log('[elterngeld-optimization] findBestCandidate: no pool', {
        goal,
        candidatesCount: candidates.length,
        candidateTypes: candidates.map((c) => c.strategyType),
      });
    }
    return null;
  }

  const sorted =
    goal === 'maxMoney' || goal === 'partnerBonus'
      ? [...pool].sort((a, b) => b.result.householdTotal - a.result.householdTotal)
      : goal === 'longerDuration'
        ? [...pool].sort(
            (a, b) =>
              countBezugMonths(b.result) - countBezugMonths(a.result)
          )
        : [...pool];

  return sorted[0];
}

function countBezugMonths(result: CalculationResult): number {
  const months = new Set<number>();
  for (const p of result.parents) {
    for (const r of p.monthlyResults) {
      if (r.mode !== 'none' || r.amount > 0) months.add(r.month);
    }
  }
  return months.size;
}

function sumEarlyMonths(result: CalculationResult, limit: number): number {
  let sum = 0;
  for (const p of result.parents) {
    for (const r of p.monthlyResults) {
      if (r.month <= limit && (r.mode !== 'none' || r.amount > 0)) {
        sum += r.amount;
      }
    }
  }
  return sum;
}

function monthlyVariance(result: CalculationResult): number {
  const monthlyTotals: number[] = [];
  const months = new Set<number>();
  for (const p of result.parents) {
    for (const r of p.monthlyResults) {
      if (r.mode !== 'none' || r.amount > 0) months.add(r.month);
    }
  }
  for (const month of months) {
    let total = 0;
    for (const p of result.parents) {
      const r = p.monthlyResults.find((m) => m.month === month);
      if (r && (r.mode !== 'none' || r.amount > 0)) total += r.amount;
    }
    if (total > 0) monthlyTotals.push(total);
  }
  if (monthlyTotals.length < 2) return 0;
  const mean = monthlyTotals.reduce((a, b) => a + b, 0) / monthlyTotals.length;
  const sqDiffs = monthlyTotals.map((x) => (x - mean) ** 2);
  return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / monthlyTotals.length);
}

function getStrategyTitle(type: string): string {
  switch (type) {
    case 'maxMoney':
      return 'Mehr Monate beim Partner';
    case 'longerDuration':
      return 'ElterngeldPlus statt Basis';
    case 'partnerBonus':
      return 'Mit Partnerschaftsbonus';
    default:
      return 'Optimierte Strategie';
  }
}

function getStrategyExplanation(type: string): string {
  switch (type) {
    case 'maxMoney':
      return 'Durch geänderte Verteilung zwischen den Elternteilen ergibt sich eine höhere Gesamtsumme, da der Partner ein höheres Einkommen vor der Geburt hatte.';
    case 'longerDuration':
      return 'ElterngeldPlus streckt den Bezug bei halber Rate – sinnvoll, wenn Sie den Bezugszeitraum verlängern möchten.';
    case 'partnerBonus':
      return 'Beide Elternteile beziehen gleichzeitig ElterngeldPlus in Teilzeit (24–32 Std/Woche). Ob sich das finanziell lohnt, hängt von Ihrer konkreten Verteilung ab.';
    default:
      return 'Die Strategie wurde an Ihr Optimierungsziel angepasst.';
  }
}

function getImprovements(
  type: string,
  optimizedMonths: number,
  currentMonths: number
): string[] {
  switch (type) {
    case 'maxMoney':
      return ['Partner übernimmt mehr Bezugsmonate'];
    case 'longerDuration':
      return [
        'ElterngeldPlus wird stärker genutzt',
        optimizedMonths > currentMonths
          ? `Bezugsdauer: ${currentMonths} → ${optimizedMonths} Monate`
          : 'Bezugsdauer wird verlängert',
      ];
    case 'partnerBonus':
      return [
        'Partnerschaftsbonus wird genutzt',
        'Beide Eltern beziehen gleichzeitig ElterngeldPlus',
      ];
    default:
      return [getStrategyTitle(type)];
  }
}

function getBezugMonths(parent: CalculationParentInput): number[] {
  return parent.months
    .filter((m) => m.mode !== 'none')
    .map((m) => m.month)
    .sort((a, b) => a - b);
}

function getMonthsWithMode(parent: CalculationParentInput, mode: MonthMode): number[] {
  return parent.months.filter((m) => m.mode === mode).map((m) => m.month);
}

function hasPartnerBonus(plan: ElterngeldCalculationPlan): boolean {
  return plan.parents.some((p) => p.months.some((m) => m.mode === 'partnerBonus'));
}

function countMonthsWithMode(plan: ElterngeldCalculationPlan, mode: MonthMode): number {
  return plan.parents.reduce(
    (sum, p) => sum + p.months.filter((m) => m.mode === mode).length,
    0
  );
}

function countNoBezugMonths(plan: ElterngeldCalculationPlan): number {
  const allMonths = new Set<number>();
  plan.parents.forEach((p) => p.months.forEach((m) => allMonths.add(m.month)));
  return Array.from(allMonths).filter((month) => {
    const hasBezug = plan.parents.some((p) => {
      const m = p.months.find((x) => x.month === month);
      return m && m.mode !== 'none';
    });
    return !hasBezug;
  }).length;
}

function shiftMonthsFromAtoB(
  plan: ElterngeldCalculationPlan,
  count: number
): ElterngeldCalculationPlan | null {
  const copy = duplicatePlan(plan);
  const parentA = copy.parents[0];
  const parentB = copy.parents[1];
  if (!parentB) return null;

  const monthsA = getBezugMonths(parentA);
  const monthsB = getBezugMonths(parentB);
  if (monthsA.length < count) return null;

  const toShift = monthsA.slice(-count);
  const minB = monthsB.length > 0 ? Math.min(...monthsB) : 15;
  if (toShift.some((m) => m >= minB)) return null;

  for (const month of toShift) {
    const sourceMonth = parentA.months.find((m) => m.month === month);
    const modeToUse = (sourceMonth?.mode ?? 'basis') as MonthMode;
    const incomeToUse = sourceMonth?.incomeDuringNet ?? 0;
    const hoursToUse = sourceMonth?.hoursPerWeek;

    const idxA = parentA.months.findIndex((m) => m.month === month);
    const idxB = parentB.months.findIndex((m) => m.month === month);
    if (idxA >= 0) {
      parentA.months[idxA] = { ...parentA.months[idxA], mode: 'none' };
    }
    if (idxB >= 0) {
      parentB.months[idxB] = {
        ...parentB.months[idxB],
        mode: modeToUse,
        incomeDuringNet: incomeToUse,
        hoursPerWeek: hoursToUse,
      };
    }
  }

  return copy;
}

function tryAddPartnerBonus(plan: ElterngeldCalculationPlan): ElterngeldCalculationPlan | null {
  const copy = duplicatePlan(plan);
  const parentA = copy.parents[0];
  const parentB = copy.parents[1];
  if (!parentB) return null;

  const overlap = findOverlapMonths(parentA, parentB, 'plus');
  if (overlap.length < 2) return null;

  const toConvert = overlap.slice(0, 4);

  for (const month of toConvert) {
    const idxA = parentA.months.findIndex((m) => m.month === month);
    const idxB = parentB.months.findIndex((m) => m.month === month);
    if (idxA >= 0) {
      parentA.months[idxA] = {
        ...parentA.months[idxA],
        mode: 'partnerBonus',
        hoursPerWeek: parentA.months[idxA].hoursPerWeek ?? 28,
      };
    }
    if (idxB >= 0) {
      parentB.months[idxB] = {
        ...parentB.months[idxB],
        mode: 'partnerBonus',
        hoursPerWeek: parentB.months[idxB].hoursPerWeek ?? 28,
      };
    }
  }

  return copy;
}

function findOverlapMonths(
  parentA: CalculationParentInput,
  parentB: CalculationParentInput,
  mode: MonthMode
): number[] {
  const monthsA = new Set(
    parentA.months.filter((m) => m.mode === mode).map((m) => m.month)
  );
  return parentB.months
    .filter((m) => m.mode === mode && monthsA.has(m.month))
    .map((m) => m.month)
    .sort((a, b) => a - b);
}

function tryStretchBasisToPlus(plan: ElterngeldCalculationPlan): ElterngeldCalculationPlan | null {
  const copy = duplicatePlan(plan);
  const parentA = copy.parents[0];

  const basisMonthsA = parentA.months
    .filter((m) => m.mode === 'basis')
    .map((m) => m.month)
    .sort((a, b) => a - b);
  const freeMonths = getFreeMonths(plan);

  if (basisMonthsA.length < 1 || freeMonths.length < 2) return null;

  const n = Math.min(Math.floor(basisMonthsA.length / 2), Math.floor(freeMonths.length / 2), 2);
  if (n < 1) return null;

  const sourceMonths = basisMonthsA.slice(-n * 2);
  const targetMonths = freeMonths.slice(0, n * 2);

  const firstSource = parentA.months.find((m) => m.month === basisMonthsA[0]);
  const incomeToUse = firstSource?.incomeDuringNet ?? 0;

  for (const month of sourceMonths) {
    const idx = parentA.months.findIndex((m) => m.month === month);
    if (idx >= 0) {
      parentA.months[idx] = { ...parentA.months[idx], mode: 'none' };
    }
  }

  for (const month of targetMonths) {
    const idx = parentA.months.findIndex((m) => m.month === month);
    if (idx >= 0) {
      parentA.months[idx] = {
        ...parentA.months[idx],
        mode: 'plus',
        incomeDuringNet: incomeToUse,
        hoursPerWeek: 28,
      };
    }
  }

  return copy;
}

function getFreeMonths(plan: ElterngeldCalculationPlan): number[] {
  const result: number[] = [];
  for (let m = 1; m <= 14; m++) {
    const hasBezug = plan.parents.some((p) => {
      const month = p.months.find((x) => x.month === m);
      return month && month.mode !== 'none';
    });
    if (!hasBezug) result.push(m);
  }
  return result;
}

export { GOAL_LABELS, UNSUPPORTED_GOALS };
