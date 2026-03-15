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
  /** true wenn mindestens 2 überlappende Plus-Monate existieren */
  bonusUsed?: boolean;
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

/** Einzelner Optimierungsvorschlag (für Top-3-Liste) */
export interface OptimizationSuggestion {
  goal: 'maxMoney' | 'longerDuration' | 'partnerBonus';
  status: 'improved' | 'checked_but_not_better';
  strategyType: string | null;
  title: string;
  explanation: string;
  metricLabel: string;
  currentMetricValue: number;
  optimizedMetricValue: number;
  deltaValue: number;
  currentTotal: number;
  optimizedTotal: number;
  currentDurationMonths: number;
  optimizedDurationMonths: number;
  bonusUsed?: boolean;
  plan: ElterngeldCalculationPlan;
  result: CalculationResult;
}

/** Ergebnis mit bis zu 3 Vorschlägen */
export interface OptimizationResultSet {
  goal: 'maxMoney' | 'longerDuration' | 'partnerBonus';
  status: OptimizationStatus;
  currentPlan: ElterngeldCalculationPlan;
  currentResult: CalculationResult;
  suggestions: OptimizationSuggestion[];
}

/** @deprecated Verwende OptimizationResultSet. Für Abwärtskompatibilität: result = suggestions[0] */
export interface OptimizationOutcome {
  goal: OptimizationGoal;
  status: OptimizationStatus;
  result?: OptimizationResult;
  /** Neu: bis zu 3 Vorschläge */
  suggestions?: OptimizationSuggestion[];
  currentPlan?: ElterngeldCalculationPlan;
  currentResult?: CalculationResult;
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

const MAX_SUGGESTIONS = 3;

/**
 * Berechnet ein Optimierungsergebnis für das gewählte Ziel.
 * Liefert ein OptimizationResultSet mit bis zu 3 Vorschlägen.
 */
export function buildOptimizationResult(
  plan: ElterngeldCalculationPlan,
  currentResult: CalculationResult,
  goal: OptimizationGoal
): OptimizationResultSet | { goal: OptimizationGoal; status: 'unsupported' } {
  if (UNSUPPORTED_GOALS.includes(goal)) {
    if (import.meta.env.DEV) {
      console.log('[elterngeld-optimization] unsupported goal', { goal });
    }
    return { goal, status: 'unsupported' };
  }

  if (import.meta.env.DEV) {
    console.log('[elterngeld-optimization] optimization start', { goal });
  }

  const currentDuration = countBezugMonths(currentResult);
  const currentTotal = currentResult.householdTotal;

  const t0 = import.meta.env.DEV ? performance.now() : 0;
  const { candidates, candidateCount, uniqueCount } = findCandidates(plan, currentResult, goal);
  const durationMs = import.meta.env.DEV ? Math.round(performance.now() - t0) : 0;

  const improvedCount = filterImprovedCandidates(candidates, currentResult, goal).length;
  const afterUniquenessFilter = new Set(candidates.map((c) => planFingerprint(c.plan))).size;

  if (import.meta.env.DEV) {
    console.log('[elterngeld-optimization] goal pipeline', {
      goal,
      generatedRaw: candidates.length,
      afterGoalSpecificGeneration: candidates.length,
      afterUniquenessFilter,
      improved: improvedCount,
    });
    if (goal === 'maxMoney') {
      const improvedCandidates = filterImprovedCandidates(candidates, currentResult, goal);
      const improvedByShift = improvedCandidates.filter((c) => c.maxMoneySource === 'shift').length;
      const improvedByPlusToBasis = improvedCandidates.filter((c) => c.maxMoneySource === 'plusToBasis').length;
      console.log('[elterngeld-optimization] maxMoney improvement sources', {
        improvedByShift,
        improvedByPlusToBasis,
      });
    }
  }

  const top3 = selectTop3(candidates, goal);
  const suggestions = top3.map((c) => candidateToSuggestion(c, goal, currentDuration, currentTotal));

  const status: OptimizationStatus =
    suggestions.length === 0
      ? 'no_candidate'
      : suggestions.some((s) => s.status === 'improved')
        ? 'improved'
        : 'checked_but_not_better';

  if (suggestions.length === 0) {
    if (import.meta.env.DEV) {
      console.log('[elterngeld-optimization] run finished', {
        goal,
        durationMs,
        candidateCount,
        uniqueCandidateCount: uniqueCount,
        returnedSuggestionCount: 0,
        topStrategyTypes: [],
        status: 'no_candidate',
      });
    }
    return {
      goal: goal as 'maxMoney' | 'longerDuration' | 'partnerBonus',
      status: 'no_candidate',
      currentPlan: plan,
      currentResult,
      suggestions: [],
    };
  }

  if (import.meta.env.DEV) {
    console.log('[elterngeld-optimization] run finished', {
      goal,
      durationMs,
      candidateCount,
      uniqueCandidateCount: uniqueCount,
      returnedSuggestionCount: suggestions.length,
      topStrategyTypes: suggestions.map((s) => s.strategyType),
      status,
    });
    const top = suggestions[0];
    if (top) {
      const topDeltaTotal = top.optimizedTotal - currentTotal;
      const topDeltaDuration = top.optimizedDurationMonths - currentDuration;
      const topDeltaPartnerBonus =
        countPartnerBonusMonths(top.result) - countPartnerBonusMonths(currentResult);
      console.log('[elterngeld-optimization] summary', {
        goal,
        improvedCandidates: improvedCount,
        topDeltaTotal,
        topDeltaDuration,
        topDeltaPartnerBonus,
      });
    }
  }

  return {
    goal: goal as 'maxMoney' | 'longerDuration' | 'partnerBonus',
    status,
    currentPlan: plan,
    currentResult,
    suggestions,
  };
}

function candidateToSuggestion(
  c: Candidate,
  goal: OptimizationGoal,
  currentDuration: number,
  currentTotal: number
): OptimizationSuggestion {
  const { plan, result, strategyType } = c;
  const optimizedTotal = result.householdTotal;
  const optimizedDuration = countBezugMonths(result);
  const bonusUsed = countOverlappingPlusMonths(plan) >= 2;

  let deltaValue: number;
  let improved: boolean;
  let metricLabel: string;

  switch (goal) {
    case 'maxMoney':
      metricLabel = 'Gesamtsumme';
      deltaValue = optimizedTotal - currentTotal;
      improved = deltaValue > 0;
      break;
    case 'longerDuration':
      metricLabel = 'Bezugsdauer (Monate)';
      deltaValue = optimizedDuration - currentDuration;
      improved = deltaValue > 0;
      break;
    case 'partnerBonus':
      metricLabel = 'Gesamtsumme';
      deltaValue = optimizedTotal - currentTotal;
      improved = deltaValue > 0;
      break;
    default:
      metricLabel = 'Gesamtsumme';
      deltaValue = optimizedTotal - currentTotal;
      improved = deltaValue > 0;
  }

  const { title, explanation } = getSuggestionTitleAndExplanation(goal, strategyType);

  return {
    goal: goal as 'maxMoney' | 'longerDuration' | 'partnerBonus',
    status: improved ? 'improved' : 'checked_but_not_better',
    strategyType,
    title,
    explanation,
    metricLabel,
    currentMetricValue: goal === 'longerDuration' ? currentDuration : currentTotal,
    optimizedMetricValue: goal === 'longerDuration' ? optimizedDuration : optimizedTotal,
    deltaValue,
    currentTotal,
    optimizedTotal,
    currentDurationMonths: currentDuration,
    optimizedDurationMonths: optimizedDuration,
    bonusUsed,
    plan,
    result,
  };
}

function getSuggestionTitleAndExplanation(
  goal: 'maxMoney' | 'longerDuration' | 'partnerBonus',
  _strategyType: string | null
): { title: string; explanation: string } {
  switch (goal) {
    case 'maxMoney':
      return {
        title: 'Mehr Gesamtauszahlung',
        explanation: 'Diese Variante erhöht die geschätzte Gesamtauszahlung.',
      };
    case 'longerDuration':
      return {
        title: 'Längere Bezugsdauer',
        explanation: 'Diese Variante verteilt den Bezug auf mehr Monate.',
      };
    case 'partnerBonus':
      return {
        title: 'Partnerschaftsbonus nutzen',
        explanation: 'Diese Variante nutzt überlappende ElterngeldPlus-Monate günstiger.',
      };
    default:
      return { title: 'Optimierte Strategie', explanation: '' };
  }
}

const MAX_CANDIDATES = 20;

/** Zählt überlappende Plus-Monate (beide Eltern haben Plus im selben Monat) */
function countOverlappingPlusMonths(plan: ElterngeldCalculationPlan): number {
  if (plan.parents.length < 2) return 0;
  const parentA = plan.parents[0];
  const parentB = plan.parents[1];
  const plusMonthsA = new Set(getMonthsWithMode(parentA, 'plus'));
  let count = 0;
  for (const m of getMonthsWithMode(parentB, 'plus')) {
    if (plusMonthsA.has(m)) count++;
  }
  return count;
}

type Candidate = {
  plan: ElterngeldCalculationPlan;
  result: CalculationResult;
  strategyType: 'maxMoney' | 'longerDuration' | 'partnerBonus';
  /** Nur für maxMoney: Quelle der Kandidatenerzeugung (für Debug) */
  maxMoneySource?: 'shift' | 'plusToBasis';
};

function findCandidates(
  plan: ElterngeldCalculationPlan,
  currentResult: CalculationResult,
  goal: OptimizationGoal
): { candidates: Candidate[]; candidateCount: number; uniqueCount: number } {
  const candidates: Candidate[] = [];
  const parentA = plan.parents[0];
  const parentB = plan.parents[1];

  if (import.meta.env.DEV) {
    const monthsA = parentA ? getBezugMonths(parentA) : [];
    const monthsB = parentB ? getBezugMonths(parentB) : [];
    console.log('[elterngeld-optimization] findCandidates input', {
      goal,
      currentTotal: currentResult.householdTotal,
      hasParentB: !!parentB,
      monthsACount: monthsA.length,
      monthsBCount: monthsB.length,
      incomeA: parentA?.incomeBeforeNet,
      incomeB: parentB?.incomeBeforeNet,
    });
  }

  generateMutationCandidates(plan, currentResult, candidates, goal);

  const uniqueCount = new Set(candidates.map((c) => planFingerprint(c.plan))).size;

  return { candidates, candidateCount: candidates.length, uniqueCount };
}

/** Filtert Kandidaten: nur solche behalten, die das Ziel tatsächlich verbessern */
function filterImprovedCandidates(
  candidates: Candidate[],
  currentResult: CalculationResult,
  goal: OptimizationGoal
): Candidate[] {
  const baseTotal = currentResult.householdTotal;
  const baseDuration = countBezugMonths(currentResult);
  const basePartnerBonusMonths = countPartnerBonusMonths(currentResult);

  return candidates.filter((c) => {
    if (goal === 'maxMoney') return c.result.householdTotal > baseTotal;
    if (goal === 'longerDuration') return countBezugMonths(c.result) > baseDuration;
    if (goal === 'partnerBonus') return countPartnerBonusMonths(c.result) > basePartnerBonusMonths;
    return false;
  });
}

/** Zählt Monate mit Partnerschaftsbonus im Ergebnis */
function countPartnerBonusMonths(result: CalculationResult): number {
  const months = new Set<number>();
  for (const p of result.parents) {
    for (const r of p.monthlyResults) {
      if (r.mode === 'partnerBonus') months.add(r.month);
    }
  }
  return months.size;
}

/** Sortiert nach Ziel und wählt maximal 3 unterschiedliche Kandidaten */
function selectTop3(candidates: Candidate[], goal: OptimizationGoal): Candidate[] {
  if (candidates.length === 0) return [];

  const seen = new Set<string>();
  const deduped: Candidate[] = [];
  for (const c of candidates) {
    const fp = planFingerprint(c.plan);
    if (seen.has(fp)) continue;
    seen.add(fp);
    deduped.push(c);
  }

  const sorted =
    goal === 'maxMoney'
      ? [...deduped].sort((a, b) => {
          const diff = b.result.householdTotal - a.result.householdTotal;
          if (diff !== 0) return diff;
          return countBezugMonths(b.result) - countBezugMonths(a.result);
        })
      : goal === 'longerDuration'
        ? [...deduped].sort((a, b) => {
            const diff = countBezugMonths(b.result) - countBezugMonths(a.result);
            if (diff !== 0) return diff;
            return b.result.householdTotal - a.result.householdTotal;
          })
        : goal === 'partnerBonus'
          ? [...deduped].sort((a, b) => {
              const bonusA = countPartnerBonusMonths(a.result);
              const bonusB = countPartnerBonusMonths(b.result);
              if (bonusB !== bonusA) return bonusB - bonusA;
              const diff = b.result.householdTotal - a.result.householdTotal;
              if (diff !== 0) return diff;
              return countBezugMonths(b.result) - countBezugMonths(a.result);
            })
          : [...deduped];

  return sorted.slice(0, MAX_SUGGESTIONS);
}

/**
 * Zentrale Kandidatenerzeugung – strikt pro gewähltem Optimierungsziel.
 * Keine Zielvermischung: nur Kandidaten für das angegebene goal.
 * Max 20 Kandidaten, Duplikate werden ausgeschlossen.
 */
function generateMutationCandidates(
  plan: ElterngeldCalculationPlan,
  currentResult: CalculationResult,
  candidates: Candidate[],
  goal: OptimizationGoal
): void {
  const seen = new Set<string>();
  const addIfNew = (c: Candidate) => {
    const fp = planFingerprint(c.plan);
    if (seen.has(fp)) return;
    seen.add(fp);
    if (candidates.length < MAX_CANDIDATES) candidates.push(c);
  };

  if (goal === 'maxMoney') {
    addShiftBetweenParentsCandidates(plan, currentResult, candidates, addIfNew);
    if (candidates.length >= MAX_CANDIDATES) return;
    addPlusToBasisCandidates(plan, currentResult, candidates, addIfNew);
    return;
  }

  if (goal === 'longerDuration') {
    addBasisToPlusCandidates(plan, currentResult, candidates, addIfNew);
    return;
  }

  if (goal === 'partnerBonus') {
    addPartnerBonusOverlapCandidates(plan, currentResult, candidates, addIfNew);
    if (candidates.length >= MAX_CANDIDATES) return;
    if (!hasPartnerBonus(plan)) {
      const withBonus = tryAddPartnerBonus(plan);
      if (withBonus) {
        const res = calculatePlan(withBonus);
        addIfNew({ plan: withBonus, result: res, strategyType: 'partnerBonus' });
      }
    }
    if (import.meta.env.DEV) {
      const baseBonus = countPartnerBonusMonths(currentResult);
      const improvedBonusMonths = candidates.filter((c) => countPartnerBonusMonths(c.result) > baseBonus).length;
      console.log('[elterngeld-optimization] partnerBonus candidates', {
        generated: candidates.length,
        improvedBonusMonths,
      });
    }
  }
}

/** Stabiler Fingerprint aus parent/month/mode für Duplikaterkennung */
function planFingerprint(plan: ElterngeldCalculationPlan): string {
  const parts: string[] = [];
  for (const p of plan.parents) {
    const modes = p.months
      .filter((m) => m.mode !== 'none')
      .map((m) => `${m.month}:${m.mode}`)
      .sort((a, b) => parseInt(a.split(':')[0], 10) - parseInt(b.split(':')[0], 10))
      .join(',');
    parts.push(modes);
  }
  return parts.join('|');
}

type AddCandidateFn = (c: Candidate) => void;

/** Strategie: Basis → Plus Umwandlung (max 2 pro Kandidat) für längere Bezugsdauer */
function addBasisToPlusCandidates(
  plan: ElterngeldCalculationPlan,
  currentResult: CalculationResult,
  candidates: Candidate[],
  addIfNew: AddCandidateFn
): void {
  const currentDuration = countBezugMonths(currentResult);
  const basisEntries: { parentIdx: number; monthIdx: number }[] = [];

  for (let pIdx = 0; pIdx < plan.parents.length; pIdx++) {
    const parent = plan.parents[pIdx];
    for (let mIdx = 0; mIdx < parent.months.length; mIdx++) {
      if (parent.months[mIdx].mode === 'basis') {
        basisEntries.push({ parentIdx: pIdx, monthIdx: mIdx });
      }
    }
  }

  let singlesGenerated = 0;
  let doublesGenerated = 0;
  let durationImproved = 0;

  for (const { parentIdx, monthIdx } of basisEntries) {
    if (candidates.length >= MAX_CANDIDATES) return;
    singlesGenerated++;
    const copy = duplicatePlan(plan);
    const p = copy.parents[parentIdx];
    const m = p.months[monthIdx];
    p.months[monthIdx] = { ...m, mode: 'plus' as MonthMode };
    const res = calculatePlan(copy);
    const duration = countBezugMonths(res);
    if (duration > currentDuration) durationImproved++;
    if (duration >= currentDuration) {
      addIfNew({ plan: copy, result: res, strategyType: 'longerDuration' });
    }
  }

  for (let i = 0; i < basisEntries.length && candidates.length < MAX_CANDIDATES; i++) {
    for (let j = i + 1; j < basisEntries.length && candidates.length < MAX_CANDIDATES; j++) {
      doublesGenerated++;
      const a = basisEntries[i];
      const b = basisEntries[j];
      const copy = duplicatePlan(plan);
      const pa = copy.parents[a.parentIdx];
      const pb = copy.parents[b.parentIdx];
      pa.months[a.monthIdx] = { ...pa.months[a.monthIdx], mode: 'plus' as MonthMode };
      pb.months[b.monthIdx] = { ...pb.months[b.monthIdx], mode: 'plus' as MonthMode };
      const res = calculatePlan(copy);
      const duration = countBezugMonths(res);
      if (duration > currentDuration) durationImproved++;
      if (duration >= currentDuration) {
        addIfNew({ plan: copy, result: res, strategyType: 'longerDuration' });
      }
    }
  }

  if (import.meta.env.DEV) {
    console.log('[elterngeld-optimization] longerDuration candidates', {
      basisToPlusSingle: singlesGenerated,
      basisToPlusDouble: doublesGenerated,
      improvedDuration: durationImproved,
    });
  }
}

/** Strategie: Plus → Basis Umwandlung (max 2 pro Kandidat) */
function addPlusToBasisCandidates(
  plan: ElterngeldCalculationPlan,
  _currentResult: CalculationResult,
  candidates: Candidate[],
  addIfNew: AddCandidateFn
): void {
  const plusEntries: { parentIdx: number; monthIdx: number }[] = [];

  for (let pIdx = 0; pIdx < plan.parents.length; pIdx++) {
    const parent = plan.parents[pIdx];
    for (let mIdx = 0; mIdx < parent.months.length; mIdx++) {
      if (parent.months[mIdx].mode === 'plus') {
        plusEntries.push({ parentIdx: pIdx, monthIdx: mIdx });
      }
    }
  }

  for (const { parentIdx, monthIdx } of plusEntries) {
    if (candidates.length >= MAX_CANDIDATES) return;
    const copy = duplicatePlan(plan);
    const p = copy.parents[parentIdx];
    p.months[monthIdx] = { ...p.months[monthIdx], mode: 'basis' as MonthMode };
    const res = calculatePlan(copy);
    addIfNew({ plan: copy, result: res, strategyType: 'maxMoney', maxMoneySource: 'plusToBasis' });
  }

  for (let i = 0; i < plusEntries.length && candidates.length < MAX_CANDIDATES; i++) {
    for (let j = i + 1; j < plusEntries.length && candidates.length < MAX_CANDIDATES; j++) {
      const a = plusEntries[i];
      const b = plusEntries[j];
      const copy = duplicatePlan(plan);
      const pa = copy.parents[a.parentIdx];
      const pb = copy.parents[b.parentIdx];
      pa.months[a.monthIdx] = { ...pa.months[a.monthIdx], mode: 'basis' as MonthMode };
      pb.months[b.monthIdx] = { ...pb.months[b.monthIdx], mode: 'basis' as MonthMode };
      const res = calculatePlan(copy);
      addIfNew({ plan: copy, result: res, strategyType: 'maxMoney', maxMoneySource: 'plusToBasis' });
    }
  }
}

/** Strategie: Partnerschaftsbonus-Simulation – überlappende Plus-Monate erzeugen (max 4) */
function addPartnerBonusOverlapCandidates(
  plan: ElterngeldCalculationPlan,
  _currentResult: CalculationResult,
  candidates: Candidate[],
  addIfNew: AddCandidateFn
): void {
  const parentB = plan.parents[1];
  if (!parentB) return;

  const parentA = plan.parents[0];
  const plusA = getMonthsWithMode(parentA, 'plus');
  const plusB = getMonthsWithMode(parentB, 'plus');

  const monthsToAdd: { toParent: 0 | 1; month: number; fromParent: CalculationParentInput }[] = [];
  for (const m of plusA) {
    const mB = parentB.months.find((x) => x.month === m);
    if (!mB || mB.mode === 'none') {
      monthsToAdd.push({ toParent: 1, month: m, fromParent: parentA });
    }
  }
  for (const m of plusB) {
    const mA = parentA.months.find((x) => x.month === m);
    if (!mA || mA.mode === 'none') {
      monthsToAdd.push({ toParent: 0, month: m, fromParent: parentB });
    }
  }

  if (monthsToAdd.length === 0) return;

  const maxOverlap = Math.min(4, monthsToAdd.length);
  for (let n = 1; n <= maxOverlap && candidates.length < MAX_CANDIDATES; n++) {
    const toApply = monthsToAdd.slice(0, n);
    const copy = duplicatePlan(plan);
    for (const { toParent, month, fromParent } of toApply) {
      const src = fromParent.months.find((x) => x.month === month);
      if (!src) continue;
      const target = copy.parents[toParent];
      let idx = target.months.findIndex((x) => x.month === month);
      if (idx < 0) {
        target.months.push({
          month,
          mode: 'plus',
          incomeDuringNet: src.incomeDuringNet,
          hoursPerWeek: src.hoursPerWeek ?? 28,
        });
        target.months.sort((a, b) => a.month - b.month);
      } else {
        target.months[idx] = {
          ...target.months[idx],
          mode: 'plus',
          incomeDuringNet: src.incomeDuringNet,
          hoursPerWeek: src.hoursPerWeek ?? 28,
        };
      }
    }
    const res = calculatePlan(copy);
    addIfNew({ plan: copy, result: res, strategyType: 'partnerBonus' });
  }
}

type ShiftableMonth = { month: number; mode: MonthMode; income: number; hours?: number };

/** Hilfsfunktion: Monate von sourceParent zu targetParent verschieben (maxMoney). Gibt Zähler zurück. */
function addShiftCandidatesInDirection(
  plan: ElterngeldCalculationPlan,
  currentTotal: number,
  sourceIdx: 0 | 1,
  targetIdx: 0 | 1,
  candidates: Candidate[],
  addIfNew: AddCandidateFn
): { singles: number; doubles: number; improved: number } {
  const out = { singles: 0, doubles: 0, improved: 0 };
  const parentSource = plan.parents[sourceIdx];
  const parentTarget = plan.parents[targetIdx];
  if (!parentTarget || parentSource.incomeBeforeNet <= 0 || parentTarget.incomeBeforeNet <= 0) return out;

  const shiftableMonths: ShiftableMonth[] = [];
  for (const m of parentSource.months) {
    if (m.mode === 'none') continue;
    const mTarget = parentTarget.months.find((x) => x.month === m.month);
    if (mTarget && mTarget.mode !== 'none') continue;
    shiftableMonths.push({
      month: m.month,
      mode: m.mode,
      income: m.incomeDuringNet,
      hours: m.hoursPerWeek,
    });
  }

  for (const { month, mode, income, hours } of shiftableMonths) {
    if (candidates.length >= MAX_CANDIDATES) return out;
    out.singles++;
    const copy = duplicatePlan(plan);
    const pSource = copy.parents[sourceIdx];
    const pTarget = copy.parents[targetIdx];
    const idxSource = pSource.months.findIndex((x) => x.month === month);
    if (idxSource < 0) continue;
    pSource.months[idxSource] = { ...pSource.months[idxSource], mode: 'none' };
    let idxTarget = pTarget.months.findIndex((x) => x.month === month);
    if (idxTarget < 0) {
      pTarget.months.push({ month, mode, incomeDuringNet: income, hoursPerWeek: hours });
      pTarget.months.sort((a, b) => a.month - b.month);
    } else {
      pTarget.months[idxTarget] = { ...pTarget.months[idxTarget], mode, incomeDuringNet: income, hoursPerWeek: hours };
    }
    const res = calculatePlan(copy);
    if (res.householdTotal > currentTotal) {
      out.improved++;
      addIfNew({ plan: copy, result: res, strategyType: 'maxMoney', maxMoneySource: 'shift' });
    }
  }

  for (let i = 0; i < shiftableMonths.length && candidates.length < MAX_CANDIDATES; i++) {
    for (let j = i + 1; j < shiftableMonths.length && candidates.length < MAX_CANDIDATES; j++) {
      out.doubles++;
      const ma = shiftableMonths[i];
      const mb = shiftableMonths[j];
      const copy = duplicatePlan(plan);
      const pSource = copy.parents[sourceIdx];
      const pTarget = copy.parents[targetIdx];
      const idx1 = pSource.months.findIndex((x) => x.month === ma.month);
      const idx2 = pSource.months.findIndex((x) => x.month === mb.month);
      if (idx1 < 0 || idx2 < 0) continue;
      pSource.months[idx1] = { ...pSource.months[idx1], mode: 'none' };
      pSource.months[idx2] = { ...pSource.months[idx2], mode: 'none' };
      for (const m of [ma, mb]) {
        let idxTarget = pTarget.months.findIndex((x) => x.month === m.month);
        if (idxTarget < 0) {
          pTarget.months.push({ month: m.month, mode: m.mode, incomeDuringNet: m.income, hoursPerWeek: m.hours });
        } else {
          pTarget.months[idxTarget] = { ...pTarget.months[idxTarget], mode: m.mode, incomeDuringNet: m.income, hoursPerWeek: m.hours };
        }
      }
      pTarget.months.sort((a, b) => a.month - b.month);
      const res = calculatePlan(copy);
      if (res.householdTotal > currentTotal) {
        out.improved++;
        addIfNew({ plan: copy, result: res, strategyType: 'maxMoney', maxMoneySource: 'shift' });
      }
    }
  }
  return out;
}

/** Strategie: Monate zwischen Eltern verschieben (maxMoney) – beide Richtungen A↔B */
function addShiftBetweenParentsCandidates(
  plan: ElterngeldCalculationPlan,
  currentResult: CalculationResult,
  candidates: Candidate[],
  addIfNew: AddCandidateFn
): void {
  const parentB = plan.parents[1];
  if (!parentB) return;

  const currentTotal = currentResult.householdTotal;

  const rAB = addShiftCandidatesInDirection(plan, currentTotal, 0, 1, candidates, addIfNew);
  if (candidates.length >= MAX_CANDIDATES) return;
  const rBA = addShiftCandidatesInDirection(plan, currentTotal, 1, 0, candidates, addIfNew);

  if (import.meta.env.DEV) {
    console.log('[elterngeld-optimization] maxMoney candidates', {
      shiftsABSingle: rAB.singles,
      shiftsABDouble: rAB.doubles,
      shiftsBASingle: rBA.singles,
      shiftsBADouble: rBA.doubles,
      improved: rAB.improved + rBA.improved,
    });
  }
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

export { GOAL_LABELS, UNSUPPORTED_GOALS };
