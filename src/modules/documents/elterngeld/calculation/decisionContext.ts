/**
 * Entscheidungskontext für den geführten Optimierungsflow.
 * Modelliert echte Nutzerentscheidungen statt einzelner Vorschläge.
 */

import type {
  ElterngeldCalculationPlan,
  CalculationResult,
} from './types';
import type { OptimizationGoal, OptimizationSuggestion, OptimizationResultSet } from './elterngeldOptimization';
import { shouldShowVariant } from '../steps/optimizationExplanation';

/** Eindeutiger Schlüssel zur Deduplizierung – gleiche Optionen werden zusammengeführt */
export type DistinctnessKey = string;

/** Vergleichsbasis für Deltas und Änderungen */
export type ComparisonBaseline = 'original' | 'current' | 'lastAdopted';

/** Konkrete Änderungen aus Plan-Vergleich (option.plan vs baseline.plan) */
export interface ChangeSummaryConcrete {
  primaryChanges: string[];
  secondaryChanges?: string[];
}

/** Vollständige Änderungssummary nach Auswahl */
export interface ChangeSummaryFull {
  whatChanged: string[];
  primaryChanges: string[];
  secondaryChanges: string[];
  advantage: string | null;
  tradeoff: string | null;
  alternatives: string[];
  baselineLabel: string;
}

/** Vergleichsmodus: wogegen wird verglichen */
export type ComparisonMode = 'vsCurrent' | 'vsOriginal' | 'vsLastAdopted';

/** Auswirkung einer Option im Vergleich zur Basis */
export interface OptionImpact {
  financialDelta: number;
  durationDelta: number;
  bonusDelta: number;
  changeSummary: string[];
  advantage: string | null;
  tradeoff: string | null;
  /** 1–3 Kernänderungen in Nutzersprache */
  coreChanges: string[];
  fullSummary?: ChangeSummaryFull;
}

/** Eine wählbare Option im Entscheidungskontext */
export interface DecisionOption {
  id: string;
  /** Eindeutigkeitsschlüssel für Deduplizierung */
  distinctnessKey: DistinctnessKey;
  /** Verständliche Bezeichnung */
  label: string;
  /** Kurzbeschreibung */
  description: string;
  /** Strategietyp für Kategorisierung */
  strategyType: 'current' | 'maxMoney' | 'longerDuration' | 'frontLoad' | 'partnerBonus' | 'motherOnly' | 'bothBalanced' | 'withoutPartTime' | 'withPartTime' | 'bothParents' | 'simplePlanning';
  /** Ist diese Option empfohlen? */
  recommended: boolean;
  /** Warum empfohlen (nur wenn recommended) */
  recommendedReason: string | null;
  /** Auswirkung gegenüber der Basis */
  impact: OptionImpact;
  plan: ElterngeldCalculationPlan;
  result: CalculationResult;
  /** Original-Suggestion falls aus Optimierung */
  suggestion?: OptimizationSuggestion;
}

/** Kontext für eine Entscheidungsfrage */
export interface DecisionContext {
  decisionQuestion: string;
  decisionReason: string | null;
  basePlan: ElterngeldCalculationPlan;
  baseResult: CalculationResult;
  options: DecisionOption[];
  selectedOptionIndex: number;
  goal: OptimizationGoal;
  comparisonBaseline: ComparisonBaseline;
  baselineLabel: string;
  baselineExplanation: string;
  comparisonMode: ComparisonMode;
  originalPlan: ElterngeldCalculationPlan;
  originalResult: CalculationResult;
  lastAdoptedPlan: ElterngeldCalculationPlan | null;
  lastAdoptedResult: CalculationResult | null;
}

/** Erweiterte Eingabe für buildDecisionContext */
export interface BuildDecisionContextOptions {
  originalPlan?: ElterngeldCalculationPlan;
  originalResult?: CalculationResult;
  lastAdoptedPlan?: ElterngeldCalculationPlan | null;
  lastAdoptedResult?: CalculationResult | null;
  comparisonMode?: ComparisonMode;
}

/** Konsequenzbeschreibung für Schritt-3-Optionen (Nutzerverständlich) */
export const STEP3_STRATEGY_CONSEQUENCES: Record<string, string> = {
  maxMoney: 'Meist höhere Gesamtauszahlung.',
  longerDuration: 'Mehr Monate Bezug, aber oft geringere Monatsbeträge.',
  frontLoad: 'Mehr Geld in den ersten Monaten, später weniger Spielraum.',
};

/** Kanonische Plan-Signatur: pro Monat wer (A/B/both) welchen Modus hat – für fachliche Deduplizierung */
function getCanonicalPlanSignature(result: CalculationResult): string {
  const allMonths = new Set<number>();
  for (const p of result.parents) {
    for (const r of p.monthlyResults) {
      if (r.mode !== 'none' || r.amount > 0) allMonths.add(r.month);
    }
  }
  const months = [...allMonths].sort((a, b) => a - b);
  const parts: string[] = [];
  for (const m of months) {
    const rA = result.parents[0]?.monthlyResults.find((r) => r.month === m)?.mode ?? 'none';
    const rB = result.parents[1]?.monthlyResults.find((r) => r.month === m)?.mode ?? 'none';
    const hasA = rA !== 'none';
    const hasB = rB !== 'none';
    const mode = rA !== 'none' ? rA : rB;
    const who = hasA && hasB ? 'both' : hasA ? 'A' : 'B';
    parts.push(`${m}:${who}:${mode}`);
  }
  return parts.join(';');
}

/** Bezugsmonate pro Elternteil (Anzahl) */
function getBezugMonthsPerParent(result: CalculationResult): [number, number] {
  const a = new Set(
    result.parents[0]?.monthlyResults.filter((r) => r.mode !== 'none' || r.amount > 0).map((r) => r.month) ?? []
  );
  const b = new Set(
    result.parents[1]?.monthlyResults.filter((r) => r.mode !== 'none' || r.amount > 0).map((r) => r.month) ?? []
  );
  return [a.size, b.size];
}

/** Prüft ob zwei Results fachlich äquivalent sind (gleiche Aussage für den Nutzer) */
function resultsAreSemanticallyEquivalent(
  a: CalculationResult,
  b: CalculationResult,
  toleranceEur: number = 2
): boolean {
  const totalA = Math.round(a.householdTotal);
  const totalB = Math.round(b.householdTotal);
  if (Math.abs(totalA - totalB) > toleranceEur) return false;

  const durA = countBezugMonths(a);
  const durB = countBezugMonths(b);
  if (durA !== durB) return false;

  const bonusA = countPartnerBonusMonths(a);
  const bonusB = countPartnerBonusMonths(b);
  if (bonusA !== bonusB) return false;

  const [aA, aB] = getBezugMonthsPerParent(a);
  const [bA, bB] = getBezugMonthsPerParent(b);
  if (aA !== bA || aB !== bB) return false;

  const sigA = getCanonicalPlanSignature(a);
  const sigB = getCanonicalPlanSignature(b);
  return sigA === sigB;
}

/** Erzeugt distinctnessKey – fachlich robust, nicht nur textuell */
export function getDistinctnessKey(plan: ElterngeldCalculationPlan, result: CalculationResult): DistinctnessKey {
  const total = Math.round(result.householdTotal);
  const duration = countBezugMonths(result);
  const bonus = countPartnerBonusMonths(result);
  const sig = getCanonicalPlanSignature(result);
  return `${total}-${duration}-${bonus}-${sig}`;
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

function countPartnerBonusMonths(result: CalculationResult): number {
  const months = new Set<number>();
  for (const p of result.parents) {
    for (const r of p.monthlyResults) {
      if (r.mode === 'partnerBonus') months.add(r.month);
    }
  }
  return months.size;
}

/** Vergleicht zwei Results – sind sie strukturell gleich? */
function resultsAreEqual(a: CalculationResult, b: CalculationResult): boolean {
  if (a.parents.length !== b.parents.length) return false;
  for (let i = 0; i < a.parents.length; i++) {
    const pa = a.parents[i];
    const pb = b.parents[i];
    if (pa.monthlyResults.length !== pb.monthlyResults.length) return false;
    const byMonthA = new Map(pa.monthlyResults.map((r) => [r.month, r.mode]));
    const byMonthB = new Map(pb.monthlyResults.map((r) => [r.month, r.mode]));
    const allMonths = new Set([...byMonthA.keys(), ...byMonthB.keys()]);
    for (const m of allMonths) {
      if ((byMonthA.get(m) ?? 'none') !== (byMonthB.get(m) ?? 'none')) return false;
    }
  }
  return true;
}

/** Erzeugt Änderungszusammenfassung aus current → optimized */
function getChangeSummary(currentResult: CalculationResult, optimizedResult: CalculationResult): string[] {
  const allMonths = new Set<number>();
  for (const p of currentResult.parents) {
    for (const r of p.monthlyResults) allMonths.add(r.month);
  }
  for (const p of optimizedResult.parents) {
    for (const r of p.monthlyResults) allMonths.add(r.month);
  }
  const months = [...allMonths].sort((a, b) => a - b);
  const changes: string[] = [];
  for (const month of months) {
    const curA = currentResult.parents[0]?.monthlyResults.find((r) => r.month === month)?.mode ?? 'none';
    const curB = currentResult.parents[1]?.monthlyResults.find((r) => r.month === month)?.mode ?? 'none';
    const optA = optimizedResult.parents[0]?.monthlyResults.find((r) => r.month === month)?.mode ?? 'none';
    const optB = optimizedResult.parents[1]?.monthlyResults.find((r) => r.month === month)?.mode ?? 'none';
    if (curA !== optA || curB !== optB) {
      const from = formatMonthState(curA, curB);
      const to = formatMonthState(optA, optB);
      if (from !== to) changes.push(`Monat ${month}: ${from} → ${to}`);
    }
  }
  return changes.slice(0, 8);
}

function formatMonthState(a: string, b: string): string {
  if (a !== 'none' && b !== 'none') return 'beide';
  if (a !== 'none') return 'Mutter';
  if (b !== 'none') return 'Partner';
  return 'keiner';
}

/** Konkrete Änderungen aus Plan-Vergleich – Nutzersprache, max 3 primary */
function getConcreteChangeSummary(
  basePlan: ElterngeldCalculationPlan,
  optionPlan: ElterngeldCalculationPlan,
  baseResult: CalculationResult,
  optionResult: CalculationResult
): { primaryChanges: string[]; secondaryChanges: string[] } {
  const primary: string[] = [];
  const secondary: string[] = [];

  const baseBonus = countPartnerBonusMonths(baseResult);
  const optBonus = countPartnerBonusMonths(optionResult);
  if (optBonus > baseBonus) primary.push('Partnerschaftsbonus kommt hinzu');
  else if (optBonus < baseBonus) primary.push('Teilzeit entfernt – kein Partnerschaftsbonus mehr');

  const [baseA, baseB] = getBezugMonthsPerParent(baseResult);
  const [optA, optB] = getBezugMonthsPerParent(optionResult);

  if (optB === 0 && baseB > 0) {
    const fatherMonths = getMonthsWithBezug(basePlan, 1);
    primary.push(`Vater bezieht kein Elterngeld mehr${formatMonthRange(fatherMonths)}`);
  }
  if (optA === 0 && baseA > 0) {
    const motherMonths = getMonthsWithBezug(basePlan, 0);
    primary.push(`Mutter bezieht kein Elterngeld mehr${formatMonthRange(motherMonths)}`);
  }

  const durBase = countBezugMonths(baseResult);
  const durOpt = countBezugMonths(optionResult);
  if (durOpt > durBase) {
    primary.push('Der Bezug läuft über mehr Monate, dafür fallen die Beträge pro Monat oft niedriger aus.');
  } else if (durOpt < durBase) {
    primary.push('Kürzere Bezugsdauer');
  }

  const motherGained = getMonthsGained(basePlan, optionPlan, 0);
  const fatherGained = getMonthsGained(basePlan, optionPlan, 1);
  if (motherGained.length >= 2) secondary.push(`Mutter übernimmt zusätzliche Monate ${formatMonthRange(motherGained)}`);
  if (fatherGained.length >= 2) secondary.push(`Vater übernimmt zusätzliche Monate ${formatMonthRange(fatherGained)}`);

  const basisToPlus = countBasisToPlusChanges(baseResult, optionResult);
  if (basisToPlus > 0 && !primary.some((p) => p.includes('ElterngeldPlus'))) {
    secondary.push(`${basisToPlus} Monat${basisToPlus === 1 ? '' : 'e'} zu ElterngeldPlus geändert`);
  }

  if (primary.length === 0 && secondary.length === 0) {
    primary.push('Die Monate werden klarer zwischen Mutter und Vater aufgeteilt.');
  }
  return { primaryChanges: primary.slice(0, 3), secondaryChanges: secondary.slice(0, 2) };
}

function getMonthsWithBezug(plan: ElterngeldCalculationPlan, parentIdx: number): number[] {
  const p = plan.parents[parentIdx];
  return (p?.months.filter((m) => m.mode !== 'none').map((m) => m.month) ?? []).sort((a, b) => a - b);
}

function getMonthsGained(base: ElterngeldCalculationPlan, opt: ElterngeldCalculationPlan, parentIdx: number): number[] {
  const baseMonths = new Set(getMonthsWithBezug(base, parentIdx));
  const optMonths = getMonthsWithBezug(opt, parentIdx);
  return optMonths.filter((m) => !baseMonths.has(m));
}

function formatMonthRange(months: number[]): string {
  if (months.length === 0) return '';
  const sorted = [...months].sort((a, b) => a - b);
  if (sorted.length === 1) return ` (Monat ${sorted[0]})`;
  return ` (Monat ${sorted[0]}–${sorted[sorted.length - 1]})`;
}

/** 1–3 Kernänderungen in Nutzersprache */
function getCoreChanges(baseResult: CalculationResult, optimizedResult: CalculationResult): string[] {
  const core: string[] = [];
  const bonusBase = countPartnerBonusMonths(baseResult);
  const bonusOpt = countPartnerBonusMonths(optimizedResult);
  const [baseA, baseB] = getBezugMonthsPerParent(baseResult);
  const [optA, optB] = getBezugMonthsPerParent(optimizedResult);

  if (bonusOpt > bonusBase) core.push('Partnerschaftsbonus kommt hinzu');
  else if (bonusOpt < bonusBase) core.push('Partnerschaftsbonus entfällt');

  const shift = Math.abs(Math.abs(optA - optB) - Math.abs(baseA - baseB));
  if (shift >= 2) core.push('Die Monate werden klarer zwischen Mutter und Vater aufgeteilt.');

  const basisToPlus = countBasisToPlusChanges(baseResult, optimizedResult);
  if (basisToPlus > 0) core.push(`${basisToPlus} Monat${basisToPlus === 1 ? '' : 'e'} zu ElterngeldPlus geändert`);

  const durBase = countBezugMonths(baseResult);
  const durOpt = countBezugMonths(optimizedResult);
  if (durOpt > durBase) core.push('Der Bezug läuft über mehr Monate, dafür fallen die Beträge pro Monat oft niedriger aus.');
  else if (durOpt < durBase) core.push('Kürzere Bezugsdauer');

  if (core.length === 0) core.push('Die Monate werden klarer zwischen Mutter und Vater aufgeteilt.');
  return core.slice(0, 3);
}

function countBasisToPlusChanges(a: CalculationResult, b: CalculationResult): number {
  const allMonths = new Set<number>();
  for (const p of a.parents) for (const r of p.monthlyResults) allMonths.add(r.month);
  for (const p of b.parents) for (const r of p.monthlyResults) allMonths.add(r.month);
  let count = 0;
  for (const month of allMonths) {
    const rA1 = a.parents[0]?.monthlyResults.find((r) => r.month === month)?.mode ?? 'none';
    const rB1 = a.parents[1]?.monthlyResults.find((r) => r.month === month)?.mode ?? 'none';
    const rA2 = b.parents[0]?.monthlyResults.find((r) => r.month === month)?.mode ?? 'none';
    const rB2 = b.parents[1]?.monthlyResults.find((r) => r.month === month)?.mode ?? 'none';
    const hadBasis = (rA1 === 'basis' || rB1 === 'basis') && rA1 !== 'partnerBonus' && rB1 !== 'partnerBonus';
    const hasPlus = rA2 === 'plus' || rA2 === 'partnerBonus' || rB2 === 'plus' || rB2 === 'partnerBonus';
    if (hadBasis && hasPlus) count++;
  }
  return count;
}

/** Erzeugt Advantage/Tradeoff aus Suggestion und Goal */
function getAdvantageTradeoff(
  suggestion: OptimizationSuggestion,
  baseResult: CalculationResult,
  goal: OptimizationGoal
): { advantage: string | null; tradeoff: string | null } {
  const deltaTotal = suggestion.optimizedTotal - baseResult.householdTotal;
  const deltaDuration = suggestion.optimizedDurationMonths - countBezugMonths(baseResult);
  const deltaBonus = countPartnerBonusMonths(suggestion.result) - countPartnerBonusMonths(baseResult);

  let advantage: string | null = null;
  let tradeoff: string | null = null;

  if (goal === 'maxMoney' && deltaTotal > 0) advantage = 'Höhere Gesamtauszahlung';
  if (goal === 'maxMoney' && deltaTotal < 0) tradeoff = 'Weniger Gesamtauszahlung';
  if (goal === 'longerDuration' && deltaDuration > 0) advantage = 'Längere Bezugsdauer';
  if (goal === 'longerDuration' && deltaDuration < 0) tradeoff = 'Kürzere Bezugsdauer';
  if (goal === 'frontLoad' && (suggestion.deltaValue ?? 0) > 0) advantage = 'Mehr Auszahlung am Anfang';
  if (goal === 'partnerBonus' && deltaBonus > 0) advantage = 'Partnerschaftsbonus genutzt';
  if (deltaBonus > 0 && !advantage) advantage = 'Partnerschaftsbonus berücksichtigt';
  if (deltaTotal > 0 && !advantage && goal !== 'maxMoney') advantage = 'Höhere Gesamtsumme';

  if (deltaDuration < 0 && deltaTotal <= 0 && !tradeoff) tradeoff = 'Kürzere Bezugsdauer';
  if (deltaTotal < 0 && deltaDuration === 0 && !tradeoff) tradeoff = 'Weniger Gesamtauszahlung';

  return { advantage, tradeoff };
}

/** Konkrete Empfehlungsbegründung in Nutzersprache */
function getRecommendedReasonText(
  strategyType: string,
  goal: OptimizationGoal,
  suggestion: OptimizationSuggestion
): string {
  switch (strategyType) {
    case 'maxMoney':
      return 'Diese Variante passt am besten, wenn ihr insgesamt mehr Elterngeld bekommen möchtet.';
    case 'longerDuration':
      return 'Diese Variante passt, wenn ihr den Bezug über mehr Monate strecken möchtet – dafür fallen die Beträge pro Monat oft niedriger aus.';
    case 'frontLoad':
      return 'Diese Variante passt, wenn ihr am Anfang mehr Geld braucht und später flexibler seid.';
    case 'motherOnly':
      return 'Diese Variante passt, wenn nur ein Elternteil Elterngeld beziehen soll und ihr die höchste Auszahlung anstrebt.';
    case 'bothBalanced':
      return 'Diese Variante passt, wenn beide Eltern Elterngeld beziehen und die Monate fair aufteilen möchten.';
    case 'withPartTime':
      return 'Diese Variante passt, wenn ihr beide in Teilzeit arbeiten und den Partnerschaftsbonus nutzen möchtet.';
    case 'withoutPartTime':
      return 'Diese Variante passt, wenn ihr eine einfachere Aufteilung ohne Teilzeit bevorzugt.';
    default:
      return suggestion.explanation || 'Diese Variante passt gut zu eurer Situation.';
  }
}

/** Entscheidungsfrage je nach Ziel */
function getDecisionQuestion(goal: OptimizationGoal): string {
  switch (goal) {
    case 'maxMoney':
      return 'Wie soll die Aufteilung optimiert werden?';
    case 'longerDuration':
      return 'Soll die Bezugsdauer verlängert werden?';
    case 'frontLoad':
      return 'Soll mehr Geld am Anfang fließen?';
    case 'partnerBonus':
      return 'Soll der Partnerschaftsbonus genutzt werden?';
    default:
      return 'Welche Variante passt zu dir?';
  }
}

/** Nutzer-Labels für Strategietypen (Schritt 3: Zielentscheidungen in Nutzersprache) */
const STRATEGY_LABELS: Record<string, string> = {
  maxMoney: 'Ich möchte insgesamt möglichst viel Elterngeld bekommen',
  longerDuration: 'Ich möchte den Bezug möglichst lange strecken',
  frontLoad: 'Ich möchte am Anfang mehr Geld haben',
  partnerBonus: 'Partnerschaftsbonus nutzen',
  motherOnly: 'Nur Mutter bezieht Elterngeld',
  bothBalanced: 'Beide Eltern beziehen Elterngeld',
  withoutPartTime: 'Einfachere Aufteilung ohne Teilzeit',
  withPartTime: 'Mit Partnerschaftsbonus',
};

/** Baut DecisionContext aus OptimizationResultSet */
export function buildDecisionContext(
  resultSet: OptimizationResultSet,
  selectedOptionIndex: number = 0,
  opts?: BuildDecisionContextOptions
): DecisionContext {
  const { goal, currentPlan, currentResult, suggestions } = resultSet;
  const originalPlan = opts?.originalPlan ?? currentPlan;
  const originalResult = opts?.originalResult ?? currentResult;
  const lastAdoptedPlan = opts?.lastAdoptedPlan ?? null;
  const lastAdoptedResult = opts?.lastAdoptedResult ?? null;
  const comparisonMode = opts?.comparisonMode ?? 'vsCurrent';

  const { basePlan, baseResult, baselineLabel, baselineExplanation, comparisonBaseline } = resolveBaseline(
    comparisonMode,
    currentPlan,
    currentResult,
    originalPlan,
    originalResult,
    lastAdoptedPlan,
    lastAdoptedResult
  );

  const baseTotal = baseResult.householdTotal;
  const baseDuration = countBezugMonths(baseResult);
  const baseBonus = countPartnerBonusMonths(baseResult);

  const options: DecisionOption[] = [];
  const seenKeys = new Set<DistinctnessKey>();

  const currentKey = getDistinctnessKey(currentPlan, currentResult);
  seenKeys.add(currentKey);
  options.push({
    id: 'current',
    distinctnessKey: currentKey,
    label: 'Aktueller Plan',
    description: 'Deine aktuelle Aufteilung beibehalten.',
    strategyType: 'current',
    recommended: false,
    recommendedReason: null,
    impact: { financialDelta: 0, durationDelta: 0, bonusDelta: 0, changeSummary: [], advantage: null, tradeoff: null, coreChanges: [] },
    plan: currentPlan,
    result: currentResult,
  });

  for (let i = 0; i < suggestions.length; i++) {
    const s = suggestions[i];
    const key = getDistinctnessKey(s.plan, s.result);
    if (seenKeys.has(key)) continue;
    if (resultsAreEqual(currentResult, s.result)) continue;
    if (resultsAreSemanticallyEquivalent(currentResult, s.result)) continue;
    if (!shouldShowVariant(s, currentResult, goal)) continue;

    const isDuplicateOfExisting = options.some(
      (o) => o.strategyType !== 'current' && resultsAreSemanticallyEquivalent(o.result, s.result)
    );
    if (isDuplicateOfExisting) continue;
    seenKeys.add(key);

    const { advantage, tradeoff } = getAdvantageTradeoff(s, baseResult, goal);
    const changeSummary = getChangeSummary(baseResult, s.result);
    const coreChanges = getCoreChanges(baseResult, s.result);
    const concrete = getConcreteChangeSummary(basePlan, s.plan, baseResult, s.result);

    const strategyType = mapStrategyType(s.strategyType);
    const label = STRATEGY_LABELS[strategyType] ?? s.title;
    const isStep3Strategy = ['maxMoney', 'longerDuration', 'frontLoad'].includes(strategyType);
    const description = isStep3Strategy
      ? (STEP3_STRATEGY_CONSEQUENCES[strategyType] ?? s.explanation)
      : s.explanation;
    const isFirstNonCurrent = options.filter((o) => o.strategyType !== 'current').length === 0;
    const recommendedReasonText = getRecommendedReasonText(strategyType, goal, s);

    options.push({
      id: `opt-${options.length}`,
      distinctnessKey: key,
      label,
      description,
      strategyType,
      recommended: s.status === 'improved' && isFirstNonCurrent,
      recommendedReason: s.status === 'improved' && isFirstNonCurrent ? recommendedReasonText : null,
      impact: {
        financialDelta: s.optimizedTotal - baseTotal,
        durationDelta: s.optimizedDurationMonths - baseDuration,
        bonusDelta: countPartnerBonusMonths(s.result) - baseBonus,
        changeSummary,
        advantage,
        tradeoff,
        coreChanges,
      },
      plan: s.plan,
      result: s.result,
      suggestion: s,
    });
  }

  for (let j = 1; j < options.length; j++) {
    const opt = options[j];
    const concrete = getConcreteChangeSummary(basePlan, opt.plan, baseResult, opt.result);
    const alternatives = ['Aktueller Plan', ...options.filter((o, i) => i !== 0 && i !== j).map((o) => o.label)];
    opt.impact.fullSummary = {
      whatChanged: concrete.primaryChanges.length > 0 ? concrete.primaryChanges : opt.impact.coreChanges,
      primaryChanges: concrete.primaryChanges,
      secondaryChanges: concrete.secondaryChanges,
      advantage: opt.impact.advantage,
      tradeoff: opt.impact.tradeoff,
      alternatives,
      baselineLabel,
    };
  }

  const clampedIndex = Math.max(0, Math.min(selectedOptionIndex, options.length - 1));

  return {
    decisionQuestion: getDecisionQuestion(goal),
    decisionReason: 'Wähle die Variante, die am besten zu deiner Situation passt.',
    basePlan: currentPlan,
    baseResult: currentResult,
    options,
    selectedOptionIndex: clampedIndex,
    goal,
    comparisonBaseline,
    baselineLabel,
    baselineExplanation,
    comparisonMode,
    originalPlan,
    originalResult,
    lastAdoptedPlan,
    lastAdoptedResult,
  };
}

function mapStrategyType(s: string | null): DecisionOption['strategyType'] {
  if (s === 'motherOnly' || s === 'bothBalanced' || s === 'withoutPartTime' || s === 'withPartTime') return s;
  if (s === 'maxMoney' || s === 'longerDuration' || s === 'frontLoad' || s === 'partnerBonus') return s;
  return 'maxMoney';
}

export function resolveBaseline(
  mode: ComparisonMode,
  currentPlan: ElterngeldCalculationPlan,
  currentResult: CalculationResult,
  originalPlan: ElterngeldCalculationPlan,
  originalResult: CalculationResult,
  lastAdoptedPlan: ElterngeldCalculationPlan | null,
  lastAdoptedResult: CalculationResult | null
): {
  basePlan: ElterngeldCalculationPlan;
  baseResult: CalculationResult;
  baselineLabel: string;
  baselineExplanation: string;
  comparisonBaseline: ComparisonBaseline;
} {
  if (mode === 'vsOriginal') {
    return {
      basePlan: originalPlan,
      baseResult: originalResult,
      baselineLabel: 'Ursprünglicher Plan',
      baselineExplanation: 'Die Änderungen beziehen sich auf euren ursprünglichen Plan.',
      comparisonBaseline: 'original',
    };
  }
  if (mode === 'vsLastAdopted' && lastAdoptedPlan && lastAdoptedResult) {
    return {
      basePlan: lastAdoptedPlan,
      baseResult: lastAdoptedResult,
      baselineLabel: 'Letzte gewählte Variante',
      baselineExplanation: 'Die Änderungen beziehen sich auf eure zuletzt gewählte Variante.',
      comparisonBaseline: 'lastAdopted',
    };
  }
  return {
    basePlan: currentPlan,
    baseResult: currentResult,
    baselineLabel: 'Aktueller Plan',
    baselineExplanation: 'Die Änderungen beziehen sich auf euren aktuellen Plan.',
    comparisonBaseline: 'current',
  };
}
