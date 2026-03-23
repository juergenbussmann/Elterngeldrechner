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
  goal: 'maxMoney' | 'longerDuration' | 'frontLoad' | 'partnerBonus';
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
  goal: 'maxMoney' | 'longerDuration' | 'frontLoad' | 'partnerBonus';
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
  frontLoad: 'Am Anfang mehr Geld',
  balanced: 'Gleichmäßigere monatliche Zahlungen',
  partnerBonus: 'Partnerschaftsbonus prüfen',
};

/** Ziele ohne implementierte Strategielogik */
const UNSUPPORTED_GOALS: OptimizationGoal[] = ['balanced'];

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

  const afterUniquenessFilter = new Set(candidates.map((c) => planFingerprint(c.plan))).size;

  if (import.meta.env.DEV) {
    console.log('[elterngeld-optimization] goal pipeline', {
      goal,
      generatedRaw: candidates.length,
      afterGoalSpecificGeneration: candidates.length,
      afterUniquenessFilter,
    });
  }

  const top3 = selectTop3(candidates, goal);
  let suggestions = top3.map((c) => candidateToSuggestion(c, goal, currentDuration, currentTotal, currentResult));

  /** Bei maxMoney/partnerBonus: Vorschläge mit vernachlässigbarem Zuwachs ausfiltern – verhindert Drift bei wiederholter Optimierung. */
  if (goal === 'maxMoney' || goal === 'partnerBonus') {
    suggestions = suggestions.filter(
      (s) => s.optimizedTotal <= currentTotal || s.optimizedTotal - currentTotal > MIN_IMPROVEMENT_EUR
    );
  }

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
      goal: goal as 'maxMoney' | 'longerDuration' | 'frontLoad' | 'partnerBonus',
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
        candidateCount,
        topDeltaTotal,
        topDeltaDuration,
        topDeltaPartnerBonus,
      });
    }
  }

  return {
    goal: goal as 'maxMoney' | 'longerDuration' | 'frontLoad' | 'partnerBonus',
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
  currentTotal: number,
  currentResult: CalculationResult
): OptimizationSuggestion {
  const { plan, result, strategyType } = c;
  const optimizedTotal = result.householdTotal;
  const optimizedDuration = countBezugMonths(result);
  const bonusUsed = countOverlappingPlusMonths(plan) >= 2;

  let deltaValue: number;
  let improved: boolean;
  let metricLabel: string;
  let currentMetricValue: number;
  let optimizedMetricValue: number;

  switch (goal) {
    case 'maxMoney':
      metricLabel = 'Gesamtsumme';
      deltaValue = optimizedTotal - currentTotal;
      improved = deltaValue > MIN_IMPROVEMENT_EUR;
      currentMetricValue = currentTotal;
      optimizedMetricValue = optimizedTotal;
      break;
    case 'longerDuration':
      metricLabel = 'Bezugsdauer (Monate)';
      deltaValue = optimizedDuration - currentDuration;
      improved = deltaValue > 0;
      currentMetricValue = currentDuration;
      optimizedMetricValue = optimizedDuration;
      break;
    case 'frontLoad': {
      const currentFL = computeFrontLoadScore(currentResult);
      const optimizedFL = computeFrontLoadScore(result);
      metricLabel = 'Auszahlung früher';
      deltaValue = optimizedFL - currentFL;
      improved = deltaValue > 0;
      currentMetricValue = currentFL;
      optimizedMetricValue = optimizedFL;
      break;
    }
    case 'partnerBonus':
      metricLabel = 'Gesamtsumme';
      deltaValue = optimizedTotal - currentTotal;
      improved = deltaValue > MIN_IMPROVEMENT_EUR;
      currentMetricValue = currentTotal;
      optimizedMetricValue = optimizedTotal;
      break;
    default:
      metricLabel = 'Gesamtsumme';
      deltaValue = optimizedTotal - currentTotal;
      improved = deltaValue > 0;
      currentMetricValue = currentTotal;
      optimizedMetricValue = optimizedTotal;
  }

  const { title, explanation } = getSuggestionTitleAndExplanation(goal, strategyType);

  return {
    goal: goal as 'maxMoney' | 'longerDuration' | 'frontLoad' | 'partnerBonus',
    status: improved ? 'improved' : 'checked_but_not_better',
    strategyType,
    title,
    explanation,
    metricLabel,
    currentMetricValue,
    optimizedMetricValue,
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
  goal: 'maxMoney' | 'longerDuration' | 'frontLoad' | 'partnerBonus',
  strategyType: string | null
): { title: string; explanation: string } {
  const altLabels: Record<string, { title: string; explanation: string }> = {
    motherOnly: { title: 'Nur Mutter bezieht Elterngeld', explanation: 'Vater bezieht kein Elterngeld, alle Monate bei Mutter.' },
    bothBalanced: { title: 'Beide Eltern beziehen Elterngeld', explanation: 'Möglichst gleichmäßige Aufteilung zwischen Mutter und Vater.' },
    withoutPartTime: { title: 'Einfachere Aufteilung ohne Teilzeit', explanation: 'Kein Partnerschaftsbonus, nur Basiselterngeld.' },
    withPartTime: { title: 'Mit Partnerschaftsbonus', explanation: 'Beide in Teilzeit – Bonusmonate werden genutzt.' },
  };
  if (strategyType && altLabels[strategyType]) return altLabels[strategyType];

  switch (goal) {
    case 'maxMoney':
      return { title: 'Maximale Auszahlung', explanation: 'Diese Variante erhöht die geschätzte Gesamtauszahlung.' };
    case 'longerDuration':
      return { title: 'Längere Bezugsdauer', explanation: 'Diese Variante verteilt den Bezug auf mehr Monate.' };
    case 'frontLoad':
      return { title: 'Am Anfang mehr Geld', explanation: 'Diese Variante konzentriert höhere Auszahlungen in die ersten Lebensmonate.' };
    case 'partnerBonus':
      return { title: 'Partnerschaftsbonus nutzen', explanation: 'Diese Variante nutzt überlappende ElterngeldPlus-Monate günstiger.' };
    default:
      return { title: 'Optimierte Strategie', explanation: '' };
  }
}

const MAX_CANDIDATES = 20;
const DEFAULT_MONTH_COUNT = 14;

/** Mindestverbesserung (EUR) für maxMoney/partnerBonus – verhindert Drift bei wiederholter Optimierung (Rundung, Darstellungsabweichungen). */
const MIN_IMPROVEMENT_EUR = 1;

/** BEEG §4 – Bezugsdauer: Basis bis LM 14, Plus bis 24, Mindestbezug 2 */
const BEEG_BASIS_MAX = 14;
const BEEG_PLUS_MAX = 24;

/** Fachliche Dauer-Kandidaten je Modell: alle zulässigen Monatszahlen 2–14 (Basis), 2–24 (Plus). */
const DURATIONS_BASIS: readonly number[] = Array.from({ length: BEEG_BASIS_MAX - 1 }, (_, i) => i + 2);
const DURATIONS_PLUS: readonly number[] = Array.from({ length: BEEG_PLUS_MAX - 1 }, (_, i) => i + 2);

function getDurationsForConfig(config: ReferenceConfigType): readonly number[] {
  if (config === 'motherOnlyBasis' || config === 'bothBasis') return DURATIONS_BASIS;
  if (config === 'bothPlusWithBonus') {
    return DURATIONS_PLUS.filter((d) => d >= 4);
  }
  return DURATIONS_PLUS;
}

/** Referenz-Konfigurationen: Plans aus Metadaten, ohne duplicatePlan – unabhängig vom Ist-Zustand */
type ReferenceConfigType =
  | 'motherOnlyBasis'
  | 'motherOnlyPlus'
  | 'bothBasis'
  | 'bothPlus'
  | 'bothPlusWithBonus';

/**
 * Erzeugt einen Plan aus Plan-Metadaten – NICHT aus duplicatePlan.
 * Ermöglicht Suchraum unabhängig vom aktuellen Plan (R1, R4).
 */
function createReferencePlan(
  plan: ElterngeldCalculationPlan,
  config: ReferenceConfigType,
  totalMonths: number
): ElterngeldCalculationPlan | null {
  const parentA = plan.parents[0];
  if (!parentA || parentA.incomeBeforeNet <= 0) return null;
  const parentB = plan.parents[1];

  const months = Array.from({ length: totalMonths }, (_, i) => i + 1);
  const mode =
    config === 'motherOnlyBasis' || config === 'bothBasis' ? 'basis' : 'plus';
  const hoursForBonus = 28;

  if (config === 'motherOnlyBasis' || config === 'motherOnlyPlus') {
    const pAMonths = months.map((month) => ({
      month,
      mode: mode as MonthMode,
      incomeDuringNet: 0,
      hoursPerWeek: mode === 'plus' ? hoursForBonus : undefined,
    }));
    const parents: CalculationParentInput[] = [
      { ...parentA, months: pAMonths },
    ];
    if (parentB) {
      const pBMonthsNone = Array.from({ length: DEFAULT_MONTH_COUNT }, (_, i) => ({
        month: i + 1,
        mode: 'none' as MonthMode,
        incomeDuringNet: 0,
      }));
      parents.push({ ...parentB, months: pBMonthsNone });
    }
    return {
      childBirthDate: plan.childBirthDate,
      parents,
      hasSiblingBonus: plan.hasSiblingBonus,
      additionalChildren: plan.additionalChildren,
    };
  }

  if (!parentB || parentB.incomeBeforeNet <= 0) return null;

  if (config === 'bothBasis' || config === 'bothPlus') {
    const targetPerParent = Math.ceil(totalMonths / 2);
    const toA = months.slice(0, targetPerParent);
    const toB = months.slice(targetPerParent);
    const pAMonths = toA.map((month) => ({
      month,
      mode: mode as MonthMode,
      incomeDuringNet: 0,
      hoursPerWeek: mode === 'plus' ? hoursForBonus : undefined,
    }));
    const pBMonths = toB.map((month) => ({
      month,
      mode: mode as MonthMode,
      incomeDuringNet: 0,
      hoursPerWeek: mode === 'plus' ? hoursForBonus : undefined,
    }));
    return {
      childBirthDate: plan.childBirthDate,
      parents: [
        { ...parentA, months: pAMonths },
        { ...parentB, months: pBMonths },
      ],
      hasSiblingBonus: plan.hasSiblingBonus,
      additionalChildren: plan.additionalChildren,
    };
  }

  if (config === 'bothPlusWithBonus' && totalMonths >= 4) {
    const overlapCount = Math.min(4, Math.floor(totalMonths / 2));
    const overlapMonths = months.slice(0, overlapCount);
    const restA = months.slice(overlapCount, totalMonths);
    const pAMonths = [
      ...overlapMonths.map((month) => ({
        month,
        mode: 'partnerBonus' as MonthMode,
        incomeDuringNet: 0,
        hoursPerWeek: hoursForBonus,
      })),
      ...restA.map((month) => ({
        month,
        mode: 'plus' as MonthMode,
        incomeDuringNet: 0,
        hoursPerWeek: hoursForBonus,
      })),
    ].sort((a, b) => a.month - b.month);
    const pBMonths = overlapMonths
      .map((month) => ({
        month,
        mode: 'partnerBonus' as MonthMode,
        incomeDuringNet: 0,
        hoursPerWeek: hoursForBonus,
      }))
      .sort((a, b) => a.month - b.month);
    return {
      childBirthDate: plan.childBirthDate,
      parents: [
        { ...parentA, months: pAMonths },
        { ...parentB, months: pBMonths },
      ],
      hasSiblingBonus: plan.hasSiblingBonus,
      additionalChildren: plan.additionalChildren,
    };
  }

  return null;
}

/** Szenario-Typ für die Zuordnung von Kandidaten (Trade-off-Darstellung). */
type ScenarioType = 'maxMoney' | 'longerDuration' | 'frontLoad' | 'partnerBonus';

/**
 * Fügt Referenz-Konfigurationen als Szenarien hinzu – unabhängig vom aktuellen Plan.
 * Erzeugt für jede Zielrichtung (maxMoney, longerDuration, frontLoad, partnerBonus)
 * eigenständige Szenarien, ohne Ausschluss wegen anderer Dimensionen (z. B. längere Dauer bei geringerer Summe).
 */
function addReferenceConfigCandidates(
  plan: ElterngeldCalculationPlan,
  _currentResult: CalculationResult,
  candidates: Candidate[],
  _goal: OptimizationGoal,
  addIfNew: AddCandidateFn
): void {
  const configs: ReferenceConfigType[] = ['motherOnlyBasis', 'motherOnlyPlus'];
  if (plan.parents[1] && plan.parents[1].incomeBeforeNet > 0) {
    configs.push('bothBasis', 'bothPlus', 'bothPlusWithBonus');
  }

  const allRefCandidates: Candidate[] = [];
  const maxLen = Math.max(...configs.map((c) => getDurationsForConfig(c).length));

  for (let i = 0; i < maxLen; i++) {
    for (const config of configs) {
      const durations = getDurationsForConfig(config);
      const totalMonths = durations[i];
      if (totalMonths === undefined) continue;

      const refPlan = createReferencePlan(plan, config, totalMonths);
      if (!refPlan) continue;
      const res = calculatePlan(refPlan);
      if (!res.validation.isValid) continue;

      const strategyType: Candidate['strategyType'] =
        config === 'motherOnlyBasis' || config === 'motherOnlyPlus'
          ? 'motherOnly'
          : config === 'bothPlusWithBonus'
            ? 'withPartTime'
            : 'bothBalanced';
      allRefCandidates.push({ plan: refPlan, result: res, strategyType });
    }
  }

  /** Beste pro Szenario – auch wenn in anderer Dimension schlechter. */
  const bestByScenario = new Map<ScenarioType, Candidate>();
  for (const c of allRefCandidates) {
    const total = c.result.householdTotal;
    const duration = countBezugMonths(c.result);
    const frontLoad = computeFrontLoadScore(c.result);
    const bonus = countPartnerBonusMonths(c.result);

    const updateIfBetter = (scenario: ScenarioType, isBetter: boolean) => {
      if (!isBetter) return;
      const existing = bestByScenario.get(scenario);
      if (
        !existing ||
        (scenario === 'maxMoney' && total > existing.result.householdTotal) ||
        (scenario === 'longerDuration' && duration > countBezugMonths(existing.result)) ||
        (scenario === 'frontLoad' && frontLoad > computeFrontLoadScore(existing.result)) ||
        (scenario === 'partnerBonus' && bonus > countPartnerBonusMonths(existing.result))
      ) {
        bestByScenario.set(scenario, c);
      }
    };

    updateIfBetter('maxMoney', total > 0);
    updateIfBetter('longerDuration', duration > 0);
    updateIfBetter('frontLoad', frontLoad > 0);
    updateIfBetter('partnerBonus', bonus > 0);
  }

  for (const c of bestByScenario.values()) {
    addIfNew(c);
    if (candidates.length >= MAX_CANDIDATES) return;
  }

  /** Round-robin: weitere Varianten für Diversität, bis Limit. */
  const indices = [0, Math.floor(maxLen / 2), maxLen - 1];
  for (const i of indices) {
    if (candidates.length >= MAX_CANDIDATES) return;
    for (const config of configs) {
      if (candidates.length >= MAX_CANDIDATES) return;
      const durations = getDurationsForConfig(config);
      const totalMonths = durations[i];
      if (totalMonths === undefined) continue;

      const refPlan = createReferencePlan(plan, config, totalMonths);
      if (!refPlan) continue;
      const res = calculatePlan(refPlan);
      if (!res.validation.isValid) continue;

      const strategyType: Candidate['strategyType'] =
        config === 'motherOnlyBasis' || config === 'motherOnlyPlus'
          ? 'motherOnly'
          : config === 'bothPlusWithBonus'
            ? 'withPartTime'
            : 'bothBalanced';
      addIfNew({ plan: refPlan, result: res, strategyType });
    }
  }
}

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
  strategyType: 'maxMoney' | 'longerDuration' | 'frontLoad' | 'partnerBonus' | 'motherOnly' | 'bothBalanced' | 'withoutPartTime' | 'withPartTime';
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

/** Echte Grundalternativen: nur Mutter, beide balanced, ohne/mit Teilzeit. Als Szenarien, ohne Ausschluss nach anderen Dimensionen. */
function addAlternativeCandidates(
  plan: ElterngeldCalculationPlan,
  _currentResult: CalculationResult,
  candidates: Candidate[],
  _goal: OptimizationGoal,
  addIfNew: AddCandidateFn
): void {
  const parentB = plan.parents[1];
  if (!parentB || parentB.incomeBeforeNet <= 0) return;

  const monthsB = getBezugMonths(parentB);
  const monthsA = getBezugMonths(plan.parents[0]);
  const hasFatherMonths = monthsB.length > 0;
  const hasBoth = monthsA.length > 0 && monthsB.length > 0;

  if (candidates.length >= MAX_CANDIDATES) return;

  if (hasFatherMonths) {
    const motherOnly = createMotherOnlyPlan(plan);
    if (motherOnly) {
      const res = calculatePlan(motherOnly);
      addIfNew({ plan: motherOnly, result: res, strategyType: 'motherOnly' });
    }
  }

  if (hasBoth && candidates.length < MAX_CANDIDATES) {
    const balanced = createBothBalancedPlan(plan);
    if (balanced) {
      const res = calculatePlan(balanced);
      addIfNew({ plan: balanced, result: res, strategyType: 'bothBalanced' });
    }
  }

  if (!hasBoth && monthsA.length > 0 && candidates.length < MAX_CANDIDATES) {
    const balanced = createBothBalancedPlan(plan);
    if (balanced) {
      const res = calculatePlan(balanced);
      addIfNew({ plan: balanced, result: res, strategyType: 'bothBalanced' });
    }
  }

  if (hasPartnerBonusOrPlus(plan) && candidates.length < MAX_CANDIDATES) {
    const withoutPartTime = createWithoutPartTimePlan(plan);
    if (withoutPartTime) {
      const res = calculatePlan(withoutPartTime);
      addIfNew({ plan: withoutPartTime, result: res, strategyType: 'withoutPartTime' });
    }
  }

  if (!hasPartnerBonus(plan) && countOverlappingPlusMonths(plan) >= 2 && candidates.length < MAX_CANDIDATES) {
    const withPartTime = tryAddPartnerBonus(plan);
    if (withPartTime) {
      const res = calculatePlan(withPartTime);
      const bonusMonths = countPartnerBonusMonths(res);
      if (bonusMonths > 0) {
        addIfNew({ plan: withPartTime, result: res, strategyType: 'withPartTime' });
      }
    }
  }
}

function hasPartnerBonusOrPlus(plan: ElterngeldCalculationPlan): boolean {
  return plan.parents.some((p) =>
    p.months.some((m) => m.mode === 'partnerBonus' || m.mode === 'plus')
  );
}

/**
 * Erzeugt eine „Beide Plus“-Variante, wenn bisher nur Elternteil A Monate hat.
 * B „steigt ein“: Ein Teil der Bezugsmonate von A wird auf B übertragen (Split).
 * Kein Partnerschaftsbonus – nur reguläre Beide-Plus-Aufteilung.
 */
function createBothFromSingleParentPlan(
  plan: ElterngeldCalculationPlan,
  parentA: CalculationParentInput,
  parentB: CalculationParentInput
): ElterngeldCalculationPlan | null {
  const bezugMonths = parentA.months
    .filter((m) => m.mode !== 'none')
    .map((m) => ({ ...m, mode: (m.mode === 'partnerBonus' ? 'plus' : m.mode) as MonthMode }))
    .sort((a, b) => a.month - b.month);
  if (bezugMonths.length < 2) return null;

  const total = bezugMonths.length;
  const targetB = Math.max(1, Math.ceil(total * 0.25));
  const toB = bezugMonths.slice(-targetB);
  const toA = bezugMonths.slice(0, -targetB);

  const copy = duplicatePlan(plan);
  const pA = copy.parents[0];
  const pB = copy.parents[1];

  pA.months = pA.months.filter((m) => m.mode === 'none' || toA.some((t) => t.month === m.month));
  for (const t of toA) {
    const idx = pA.months.findIndex((x) => x.month === t.month);
    const entry = { month: t.month, mode: t.mode, incomeDuringNet: t.incomeDuringNet, hoursPerWeek: t.hoursPerWeek };
    if (idx < 0) pA.months.push(entry);
    else pA.months[idx] = { ...pA.months[idx], ...entry };
  }
  pA.months = pA.months.filter((m) => m.mode !== 'none').sort((a, b) => a.month - b.month);

  for (const t of toB) {
    pB.months = pB.months.filter((m) => m.month !== t.month);
    pB.months.push({
      month: t.month,
      mode: t.mode,
      incomeDuringNet: 0,
      hoursPerWeek: t.hoursPerWeek ?? 28,
    });
    pB.months.sort((a, b) => a.month - b.month);
  }
  pB.months = pB.months.filter((m) => m.mode !== 'none').sort((a, b) => a.month - b.month);

  const countB = pB.months.length;
  if (countB === 0) return null;
  const hasTwoConsecutive = (() => {
    const months = pB.months.map((m) => m.month).sort((a, b) => a - b);
    for (let i = 1; i < months.length; i++) {
      if (months[i] === months[i - 1] + 1) return true;
    }
    return false;
  })();
  const meetsMinShare = countB >= Math.ceil((pA.months.length + countB) * 0.25);
  if (!meetsMinShare && !hasTwoConsecutive) return null;
  return copy;
}

function createMotherOnlyPlan(plan: ElterngeldCalculationPlan): ElterngeldCalculationPlan | null {
  const parentB = plan.parents[1];
  if (!parentB) return null;
  const fatherMonths = parentB.months.filter((m) => m.mode !== 'none');
  if (fatherMonths.length === 0) return null;

  const copy = duplicatePlan(plan);
  const pA = copy.parents[0];
  const pB = copy.parents[1];
  for (const m of fatherMonths) {
    const idxB = pB.months.findIndex((x) => x.month === m.month);
    if (idxB >= 0) pB.months[idxB] = { ...pB.months[idxB], mode: 'none' };
    let idxA = pA.months.findIndex((x) => x.month === m.month);
    if (idxA < 0) {
      pA.months.push({
        month: m.month,
        mode: m.mode === 'partnerBonus' ? 'plus' : m.mode,
        incomeDuringNet: m.incomeDuringNet,
        hoursPerWeek: m.hoursPerWeek,
      });
      pA.months.sort((a, b) => a.month - b.month);
    } else {
      pA.months[idxA] = {
        ...pA.months[idxA],
        mode: m.mode === 'partnerBonus' ? 'plus' : m.mode,
        incomeDuringNet: m.incomeDuringNet,
        hoursPerWeek: m.hoursPerWeek,
      };
    }
  }
  return copy;
}

/**
 * Erzeugt eine sinnvolle gemeinsame Aufteilung (beide Eltern).
 * Bevorzugt zusammenhängende Blöcke statt Zickzack-Verteilung.
 * Nutzt vorhandene Planstruktur als Ausgangspunkt, wenn beide bereits sinnvoll beteiligt sind.
 * Erweitert: Wenn nur Elternteil A Monate hat, wird B in eine sinnvolle Anzahl Bezugsmonate
 * „eingesetzt“ (Split), sodass „Beide Plus“ als reguläre Variante erzeugt werden kann.
 */
function createBothBalancedPlan(plan: ElterngeldCalculationPlan): ElterngeldCalculationPlan | null {
  const parentA = plan.parents[0];
  const parentB = plan.parents[1];
  if (!parentB) return null;

  const monthsA = getBezugMonths(parentA);
  const monthsB = getBezugMonths(parentB);
  if (monthsA.length === 0 && monthsB.length === 0) return null;
  if (monthsA.length === 0) return null;

  const onlyAHasMonths = monthsB.length === 0;
  if (onlyAHasMonths) {
    return createBothFromSingleParentPlan(plan, parentA, parentB);
  }

  const allMonths: { month: number; mode: MonthMode; income: number; hours?: number }[] = [];
  for (const p of [parentA, parentB]) {
    for (const m of p.months) {
      if (m.mode !== 'none') {
        allMonths.push({
          month: m.month,
          mode: m.mode === 'partnerBonus' ? 'plus' : m.mode,
          income: m.incomeDuringNet,
          hours: m.hoursPerWeek,
        });
      }
    }
  }
  if (allMonths.length < 2) return null;

  const sorted = [...allMonths].sort((a, b) => a.month - b.month);
  const total = sorted.length;
  const targetPerParent = Math.ceil(total / 2);

  const minA = monthsA.length > 0 ? Math.min(...monthsA) : 999;
  const minB = monthsB.length > 0 ? Math.min(...monthsB) : 999;
  const aHasEarlierMonths = minA <= minB;

  let toA: typeof sorted;
  let toB: typeof sorted;
  if (aHasEarlierMonths) {
    toA = sorted.slice(0, targetPerParent);
    toB = sorted.slice(targetPerParent);
  } else {
    toB = sorted.slice(0, targetPerParent);
    toA = sorted.slice(targetPerParent);
  }

  const copy = duplicatePlan(plan);
  const pA = copy.parents[0];
  const pB = copy.parents[1];

  pA.months = pA.months.filter((m) => m.mode === 'none' || toA.some((t) => t.month === m.month));
  pB.months = pB.months.filter((m) => m.mode === 'none' || toB.some((t) => t.month === m.month));

  for (const t of toA) {
    const idx = pA.months.findIndex((x) => x.month === t.month);
    const entry = { month: t.month, mode: t.mode, incomeDuringNet: t.income, hoursPerWeek: t.hours };
    if (idx < 0) pA.months.push(entry);
    else pA.months[idx] = { ...pA.months[idx], ...entry };
  }
  for (const t of toB) {
    const idx = pB.months.findIndex((x) => x.month === t.month);
    const entry = { month: t.month, mode: t.mode, incomeDuringNet: t.income, hoursPerWeek: t.hours };
    if (idx < 0) pB.months.push(entry);
    else pB.months[idx] = { ...pB.months[idx], ...entry };
  }
  pA.months = pA.months.filter((m) => m.mode !== 'none').sort((a, b) => a.month - b.month);
  pB.months = pB.months.filter((m) => m.mode !== 'none').sort((a, b) => a.month - b.month);

  const countA = pA.months.length;
  const countB = pB.months.length;
  const totalMonths = countA + countB;
  const minCount = Math.min(countA, countB);
  const smallerMonths = countA <= countB ? pA.months.map((m) => m.month) : pB.months.map((m) => m.month);

  const meetsMinShare = minCount >= Math.ceil(totalMonths * 0.25);
  const hasTwoConsecutive = (() => {
    const sorted = [...smallerMonths].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1] + 1) return true;
    }
    return false;
  })();

  if (!meetsMinShare && !hasTwoConsecutive) return null;
  return copy;
}

function createWithoutPartTimePlan(plan: ElterngeldCalculationPlan): ElterngeldCalculationPlan | null {
  const copy = duplicatePlan(plan);
  let changed = false;
  for (const p of copy.parents) {
    for (let i = 0; i < p.months.length; i++) {
      const m = p.months[i];
      if (m.mode === 'partnerBonus' || m.mode === 'plus') {
        p.months[i] = { ...m, mode: 'basis' };
        changed = true;
      }
    }
  }
  return changed ? copy : null;
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

/** Gewichtete Summe: frühe Monate zählen stärker. Höher = mehr Auszahlung am Anfang. */
function computeFrontLoadScore(result: CalculationResult): number {
  const monthToAmount = new Map<number, number>();
  for (const p of result.parents) {
    for (const r of p.monthlyResults) {
      if (r.mode !== 'none' || r.amount > 0) {
        monthToAmount.set(r.month, (monthToAmount.get(r.month) ?? 0) + r.amount);
      }
    }
  }
  const maxMonth = Math.max(24, ...monthToAmount.keys(), 1);
  let score = 0;
  for (const [month, amount] of monthToAmount) {
    score += amount * (maxMonth - month + 1);
  }
  return score;
}

/** Ergebnis-Fingerprint für Duplikaterkennung (identische Ausgaben inkl. FrontLoad-Verteilung) */
function resultFingerprint(c: Candidate): string {
  const total = c.result.householdTotal;
  const duration = countBezugMonths(c.result);
  const bonus = countPartnerBonusMonths(c.result);
  const strategy = c.strategyType;
  const frontLoad = computeFrontLoadScore(c.result);
  return `${total}-${duration}-${bonus}-${strategy}-${frontLoad}`;
}

const SCENARIO_TYPES: ScenarioType[] = ['maxMoney', 'longerDuration', 'frontLoad', 'partnerBonus'];

/** Ermittelt den besten Kandidaten für ein Szenario aus der Liste. */
function bestForScenario(candidates: Candidate[], scenario: ScenarioType): Candidate | null {
  if (candidates.length === 0) return null;
  return candidates.reduce((best, c) => {
    const total = c.result.householdTotal;
    const duration = countBezugMonths(c.result);
    const frontLoad = computeFrontLoadScore(c.result);
    const bonus = countPartnerBonusMonths(c.result);
    if (!best) return c;
    if (scenario === 'maxMoney') return total > best.result.householdTotal ? c : best;
    if (scenario === 'longerDuration') return duration > countBezugMonths(best.result) ? c : best;
    if (scenario === 'frontLoad') return frontLoad > computeFrontLoadScore(best.result) ? c : best;
    if (scenario === 'partnerBonus') return bonus > countPartnerBonusMonths(best.result) ? c : best;
    return best;
  }, null as Candidate | null);
}

/** Szenariobasierte Auswahl: gewähltes Ziel priorisiert, andere sinnvolle Trade-off-Szenarien bleiben erhalten. Max 3, keine Duplikate. */
function selectTop3(candidates: Candidate[], goal: OptimizationGoal): Candidate[] {
  if (candidates.length === 0) return [];

  const seenPlan = new Set<string>();
  const seenResult = new Set<string>();
  const deduped: Candidate[] = [];
  for (const c of candidates) {
    const fp = planFingerprint(c.plan);
    const rf = resultFingerprint(c);
    if (seenPlan.has(fp) || seenResult.has(rf)) continue;
    seenPlan.add(fp);
    seenResult.add(rf);
    deduped.push(c);
  }

  const goalScenario = goal as ScenarioType;
  const scenarioOrder: ScenarioType[] =
    goalScenario === 'balanced'
      ? [...SCENARIO_TYPES]
      : [goalScenario, ...SCENARIO_TYPES.filter((s) => s !== goalScenario)];

  const result: Candidate[] = [];
  const added = new Set<Candidate>();

  for (const scenario of scenarioOrder) {
    if (result.length >= MAX_SUGGESTIONS) break;
    if (goal === 'maxMoney' && scenario === 'frontLoad') continue;
    const best = bestForScenario(deduped, scenario);
    if (best && !added.has(best)) {
      result.push(best);
      added.add(best);
    }
  }

  /** Strategie-Vielfalt: bothBalanced explizit einbeziehen, wenn noch keiner in result und Platz (gemeinsame Aufteilung = sinnvolles Szenario) */
  const hasBothBalanced = result.some((c) => c.strategyType === 'bothBalanced');
  if (result.length < MAX_SUGGESTIONS && !hasBothBalanced) {
    const bothBalanced = deduped.find((c) => c.strategyType === 'bothBalanced' && !added.has(c));
    if (bothBalanced) {
      result.push(bothBalanced);
      added.add(bothBalanced);
    }
  }

  return result;
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
  seen.add(planFingerprint(plan));
  const addIfNew = (c: Candidate) => {
    const fp = planFingerprint(c.plan);
    if (seen.has(fp)) return;
    seen.add(fp);
    if (candidates.length < MAX_CANDIDATES) candidates.push(c);
  };

  addReferenceConfigCandidates(plan, currentResult, candidates, goal, addIfNew);
  addAlternativeCandidates(plan, currentResult, candidates, goal, addIfNew);

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
    return;
  }

  if (goal === 'frontLoad') {
    addFrontLoadCandidates(plan, currentResult, candidates, addIfNew);
    return;
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
    if (duration > currentDuration) {
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
      if (duration > currentDuration) {
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

/** Strategie: Plus → Basis Umwandlung (max 2 pro Kandidat). Optional für frontLoad. */
function addPlusToBasisCandidates(
  plan: ElterngeldCalculationPlan,
  _currentResult: CalculationResult,
  candidates: Candidate[],
  addIfNew: AddCandidateFn,
  strategyTypeOverride?: 'frontLoad'
): void {
  const strategyType = strategyTypeOverride ?? 'maxMoney';
  const maxMoneySource = strategyType === 'maxMoney' ? ('plusToBasis' as const) : undefined;
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
    addIfNew({ plan: copy, result: res, strategyType, maxMoneySource });
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
      addIfNew({ plan: copy, result: res, strategyType, maxMoneySource });
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

/** Strategie frontLoad: Monate verschieben und Plus→Basis – alle Kandidaten (Filter später) */
function addFrontLoadCandidates(
  plan: ElterngeldCalculationPlan,
  currentResult: CalculationResult,
  candidates: Candidate[],
  addIfNew: AddCandidateFn
): void {
  const parentB = plan.parents[1];
  if (!parentB) {
    addPlusToBasisCandidates(plan, currentResult, candidates, addIfNew);
    return;
  }
  addShiftCandidatesInDirectionForFrontLoad(plan, 0, 1, candidates, addIfNew);
  if (candidates.length >= MAX_CANDIDATES) return;
  addShiftCandidatesInDirectionForFrontLoad(plan, 1, 0, candidates, addIfNew);
  if (candidates.length >= MAX_CANDIDATES) return;
  addPlusToBasisCandidates(plan, currentResult, candidates, addIfNew, 'frontLoad');
}


/** Hilfsfunktion: Alle Shift-Mutationen für frontLoad (ohne Total-Filter) */
function addShiftCandidatesInDirectionForFrontLoad(
  plan: ElterngeldCalculationPlan,
  sourceIdx: 0 | 1,
  targetIdx: 0 | 1,
  candidates: Candidate[],
  addIfNew: AddCandidateFn
): void {
  const parentSource = plan.parents[sourceIdx];
  const parentTarget = plan.parents[targetIdx];
  if (!parentTarget || parentSource.incomeBeforeNet <= 0 || parentTarget.incomeBeforeNet <= 0) return;

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
    if (candidates.length >= MAX_CANDIDATES) return;
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
    addIfNew({ plan: copy, result: res, strategyType: 'frontLoad' });
  }

  for (let i = 0; i < shiftableMonths.length && candidates.length < MAX_CANDIDATES; i++) {
    for (let j = i + 1; j < shiftableMonths.length && candidates.length < MAX_CANDIDATES; j++) {
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
      addIfNew({ plan: copy, result: res, strategyType: 'frontLoad' });
    }
  }
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
