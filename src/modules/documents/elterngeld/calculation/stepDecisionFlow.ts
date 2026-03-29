/**
 * Step-basierter Entscheidungsflow für die Elterngeld-Optimierung.
 * Führt den Nutzer schrittweise: Grundmodell → Teilzeit/Bonus → Optimierungsziel.
 */

import type {
  ElterngeldCalculationPlan,
  CalculationResult,
} from './types';
import { calculatePlan } from './calculationEngine';
import { buildOptimizationResult } from './elterngeldOptimization';
import type { OptimizationResultSet, OptimizationSuggestion } from './elterngeldOptimization';
import type { DecisionOption, BuildDecisionContextOptions } from './decisionContext';
import { buildDecisionContext, resolveBaseline } from './decisionContext';
import { shouldShowVariant } from '../steps/optimizationExplanation';

/** Schritt-Typ: Grundmodell, Teilzeit, Optimierung */
export type StepKind = 'distribution' | 'partTime' | 'optimization';

/** Ein Entscheidungsschritt */
export interface DecisionStep {
  id: string;
  kind: StepKind;
  stepQuestion: string;
  stepDescription: string;
  stepOptions: DecisionOption[];
  /** Index der aktuell gewählten Option (-1 = noch nicht gewählt) */
  selectedOptionIndex: number;
  /** Rückmeldung nach Auswahl (Mikroführung) */
  feedbackAfterSelection?: string;
  /** Hinweis auf nächsten Schritt oder Abschluss */
  nextStepHint?: string;
}

/** Aus dem Flow abgeleiteter Plan nach einem Schritt */
export interface DerivedPlanAfterStep {
  plan: ElterngeldCalculationPlan;
  result: CalculationResult;
  stepIndex: number;
}

/** Step-basierter Entscheidungskontext */
export interface StepDecisionContext {
  decisionSteps: DecisionStep[];
  currentStepIndex: number;
  selectedOptionPerStep: number[];
  /** Plan/Result nach jedem abgeschlossenen Schritt */
  derivedPlanAfterStep: (DerivedPlanAfterStep | null)[];
  /** Finaler Plan aus allen getroffenen Entscheidungen */
  finalResolvedPlan: ElterngeldCalculationPlan;
  finalResolvedResult: CalculationResult;
  /** Basis für Vergleiche (original/current/lastAdopted) */
  basePlan: ElterngeldCalculationPlan;
  baseResult: CalculationResult;
  baselineLabel: string;
  baselineExplanation: string;
  originalPlan: ElterngeldCalculationPlan;
  originalResult: CalculationResult;
  lastAdoptedPlan: ElterngeldCalculationPlan | null;
  lastAdoptedResult: CalculationResult | null;
}

/** Optionen für buildStepDecisionContext */
export interface BuildStepDecisionContextOptions extends BuildDecisionContextOptions {
  /** Vorgewählte Optionen pro Schritt (für Persistenz) */
  selectedOptionPerStep?: number[];
  /** Vergleichsbasis für Deltas und Summaries */
  comparisonMode?: 'vsCurrent' | 'vsOriginal' | 'vsLastAdopted';
  /** Im Strategie-Step keine Vorauswahl – Nutzer muss explizit wählen (R5) */
  strategyStepRequireExplicitSelection?: boolean;
  /** Nutzerpriorität (wenn bekannt), für Kennzeichnung in der UI */
  userPriorityGoal?: import('./elterngeldOptimization').OptimizationGoal;
  /**
   * false: keine Partnerbonus-Ziele/„Mit Partnerschaftsbonus“-Variante (zentrale 24–32-h-Regel aus der Vorbereitung).
   * Standard true für Abwärtskompatibilität (z. B. Rechner ohne Vorbereitungskontext).
   */
  partnerBonusHoursEligible?: boolean;
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

function getBezugMonthsPerParent(result: CalculationResult): [number, number] {
  const a = new Set(
    result.parents[0]?.monthlyResults.filter((r) => r.mode !== 'none' || r.amount > 0).map((r) => r.month) ?? []
  );
  const b = new Set(
    result.parents[1]?.monthlyResults.filter((r) => r.mode !== 'none' || r.amount > 0).map((r) => r.month) ?? []
  );
  return [a.size, b.size];
}

function hasPartnerBonusOrPlus(plan: ElterngeldCalculationPlan): boolean {
  return plan.parents.some((p) =>
    p.months.some((m) => m.mode === 'partnerBonus' || m.mode === 'plus')
  );
}

function countOverlappingPlusMonths(plan: ElterngeldCalculationPlan): number {
  if (plan.parents.length < 2) return 0;
  const plusA = new Set(
    plan.parents[0].months.filter((m) => m.mode === 'plus' || m.mode === 'partnerBonus').map((m) => m.month)
  );
  let count = 0;
  for (const m of plan.parents[1].months) {
    if ((m.mode === 'plus' || m.mode === 'partnerBonus') && plusA.has(m.month)) count++;
  }
  return count;
}

function planFingerprint(plan: ElterngeldCalculationPlan): string {
  const parts = plan.parents.map((p) =>
    p.months
      .filter((m) => m.mode !== 'none')
      .map((m) => `${m.month}:${m.mode}`)
      .sort((a, b) => parseInt(a.split(':')[0], 10) - parseInt(b.split(':')[0], 10))
      .join(',')
  );
  return parts.join('|');
}

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

/** Sammelt alle Kandidaten aus mehreren Optimierungsläufen */
function collectAllCandidates(
  plan: ElterngeldCalculationPlan,
  result: CalculationResult,
  includePartnerBonusGoal: boolean
): { plan: ElterngeldCalculationPlan; result: CalculationResult; strategyType: string }[] {
  const seen = new Map<string, { plan: ElterngeldCalculationPlan; result: CalculationResult; strategyType: string }>();
  const goals = (
    includePartnerBonusGoal
      ? (['maxMoney', 'longerDuration', 'frontLoad', 'partnerBonus'] as const)
      : (['maxMoney', 'longerDuration', 'frontLoad'] as const)
  ) as readonly ('maxMoney' | 'longerDuration' | 'frontLoad' | 'partnerBonus')[];

  for (const goal of goals) {
    const outcome = buildOptimizationResult(plan, result, goal);
    if ('status' in outcome && outcome.status === 'unsupported') continue;
    const ors = outcome as OptimizationResultSet;
    for (const s of ors.suggestions) {
      const fp = planFingerprint(s.plan);
      if (seen.has(fp)) continue;
      if (resultsAreEqual(result, s.result)) continue;
      if (!shouldShowVariant(s, result, goal)) continue;
      seen.set(fp, { plan: s.plan, result: s.result, strategyType: s.strategyType ?? goal });
    }
  }

  return [...seen.values()];
}

/** Kontextabhängige Rückmeldung für Schritt 1 */
function getFeedbackForStep1(strategyType?: string): string {
  switch (strategyType) {
    case 'motherOnly':
      return 'Damit ist klar: Nur die Mutter bezieht Elterngeld.';
    case 'bothBalanced':
      return 'Damit ist klar: Beide Eltern sind am Elterngeld beteiligt.';
    case 'current':
    default:
      return 'Aktuell beziehen sich die Planvorschläge auf eure bisherige Aufteilung.';
  }
}

/** Kontextabhängige Rückmeldung für Schritt 2 */
function getFeedbackForStep2(strategyType?: string): string {
  switch (strategyType) {
    case 'current':
      return 'Eure aktuelle Aufteilung bleibt hier zunächst unverändert – ohne automatische Planänderung in diesem Schritt. Im nächsten Schritt könnt ihr Varianten vergleichen und bei Bedarf eine Umstellung übernehmen.';
    case 'withoutPartTime':
      return 'Ihr verzichtet auf Teilzeit und Partnerschaftsbonus.';
    case 'withPartTime':
      return 'Ihr nutzt Teilzeit, um den Partnerschaftsbonus zu erhalten.';
    default:
      return 'Damit ist die Teilzeit-Frage geklärt.';
  }
}

/** Kontextabhängige Rückmeldung für Schritt 3 */
function getFeedbackForStep3(strategyType?: string): string {
  switch (strategyType) {
    case 'maxMoney':
      return 'Der Fokus liegt jetzt auf einer möglichst hohen Gesamtauszahlung.';
    case 'longerDuration':
      return 'Der Fokus liegt jetzt auf einer möglichst langen Bezugsdauer.';
    case 'frontLoad':
      return 'Der Fokus liegt auf mehr Geld in den ersten Monaten.';
    case 'current':
    default:
      return 'Aktuell beziehen sich die Planvorschläge auf eure gewählte Aufteilung.';
  }
}

/** Prüft ob Schritt 2 (Teilzeit/Bonus) fachlich relevant ist. Nur wenn beide Eltern Monate haben. */
function isPartTimeStepRelevant(
  planAfterStep1: ElterngeldCalculationPlan,
  resultAfterStep1: CalculationResult,
  candidates: { plan: ElterngeldCalculationPlan; result: CalculationResult; strategyType: string }[],
  step1Model: 'current' | 'motherOnly' | 'bothBalanced'
): boolean {
  if (step1Model === 'motherOnly') return false;
  const [a, b] = getBezugMonthsPerParent(resultAfterStep1);
  if (a === 0 || b === 0) return false;
  if (!hasPartnerBonusOrPlus(planAfterStep1)) {
    const overlap = countOverlappingPlusMonths(planAfterStep1);
    if (overlap < 2) return false;
  }
  const hasWithout = candidates.some((c) => c.strategyType === 'withoutPartTime');
  const hasWith = candidates.some((c) => c.strategyType === 'withPartTime');
  return hasWithout || hasWith;
}

/** Baut den Step-Entscheidungskontext */
export function buildStepDecisionContext(
  plan: ElterngeldCalculationPlan,
  result: CalculationResult,
  opts?: BuildStepDecisionContextOptions
): StepDecisionContext {
  const originalPlan = opts?.originalPlan ?? plan;
  const originalResult = opts?.originalResult ?? result;
  const lastAdoptedPlan = opts?.lastAdoptedPlan ?? null;
  const lastAdoptedResult = opts?.lastAdoptedResult ?? null;
  const preSelected = opts?.selectedOptionPerStep ?? [];
  const comparisonMode = opts?.comparisonMode ?? 'vsCurrent';
  const partnerBonusHoursEligible = opts?.partnerBonusHoursEligible ?? true;

  const { basePlan, baseResult, baselineLabel, baselineExplanation } = resolveBaseline(
    comparisonMode,
    plan,
    result,
    originalPlan,
    originalResult,
    lastAdoptedPlan,
    lastAdoptedResult
  );

  const allCandidates = collectAllCandidates(plan, result, partnerBonusHoursEligible);
  const steps: DecisionStep[] = [];
  const derivedPlanAfterStep: (DerivedPlanAfterStep | null)[] = [];
  let currentPlan = plan;
  let currentResult = result;
  const selectedOptionPerStep: number[] = [];

  // Schritt 1: Grundmodell der Aufteilung
  const step1Options: DecisionOption[] = [];
  const maxMoneySet = buildOptimizationResult(plan, result, 'maxMoney');
  const maxMoneyCtx =
    'status' in maxMoneySet && maxMoneySet.status !== 'unsupported'
      ? buildDecisionContext(maxMoneySet as OptimizationResultSet, 0, { ...opts, comparisonMode })
      : null;

  const hasFatherMonths = getBezugMonthsPerParent(result)[1] > 0;
  const hasBothMonths = getBezugMonthsPerParent(result)[0] > 0 && getBezugMonthsPerParent(result)[1] > 0;

  if (maxMoneyCtx) {
    const currentOpt = maxMoneyCtx.options.find((o) => o.strategyType === 'current');
    if (currentOpt) step1Options.push(currentOpt);
    const motherOpt = maxMoneyCtx.options.find((o) => o.strategyType === 'motherOnly');
    if (motherOpt && hasFatherMonths) step1Options.push(motherOpt);
    const bothOpt = maxMoneyCtx.options.find((o) => o.strategyType === 'bothBalanced');
    if (bothOpt) step1Options.push(bothOpt);
  }

  if (step1Options.length === 0 && maxMoneyCtx) {
    step1Options.push(maxMoneyCtx.options[0]);
  }

  const step1Selected = Math.max(0, Math.min(preSelected[0] ?? 0, step1Options.length - 1));
  selectedOptionPerStep[0] = step1Selected;
  const step1Choice = step1Options[step1Selected];
  if (step1Choice) {
    currentPlan = step1Choice.plan;
    currentResult = step1Choice.result;
    derivedPlanAfterStep[0] = { plan: currentPlan, result: currentResult, stepIndex: 0 };
  }

  const step1Model = (step1Choice?.strategyType === 'motherOnly' ? 'motherOnly' : step1Choice?.strategyType === 'bothBalanced' ? 'bothBalanced' : 'current') as 'current' | 'motherOnly' | 'bothBalanced';
  const partTimeRelevant = isPartTimeStepRelevant(currentPlan, currentResult, allCandidates, step1Model);

  let step2Options: DecisionOption[] = [];
  if (partTimeRelevant) {
    const partnerBonusOutcome = buildOptimizationResult(currentPlan, currentResult, 'partnerBonus');
    const maxMoneyOutcome = buildOptimizationResult(currentPlan, currentResult, 'maxMoney');
    const step2Raw: { plan: ElterngeldCalculationPlan; result: CalculationResult; strategyType: string }[] = [];
    for (const outcome of [partnerBonusOutcome, maxMoneyOutcome]) {
      if ('status' in outcome && outcome.status === 'unsupported') continue;
      const ors = outcome as OptimizationResultSet;
      for (const s of ors.suggestions) {
        if (s.strategyType !== 'withoutPartTime' && s.strategyType !== 'withPartTime') continue;
        if (resultsAreEqual(currentResult, s.result)) continue;
        step2Raw.push({ plan: s.plan, result: s.result, strategyType: s.strategyType });
      }
    }
    const step2Seen = new Set<string>();
    const step2Candidates = step2Raw.filter((c) => {
      const fp = planFingerprint(c.plan);
      if (step2Seen.has(fp)) return false;
      step2Seen.add(fp);
      return true;
    });

    const step2ResultSet: OptimizationResultSet = {
      goal: 'maxMoney',
      status: 'improved',
      currentPlan,
      currentResult,
      suggestions: step2Candidates.map((c) => ({
        goal: 'maxMoney' as const,
        status: 'improved' as const,
        strategyType: c.strategyType,
        title: c.strategyType === 'withoutPartTime' ? 'Einfachere Aufteilung ohne Teilzeit' : 'Mit Partnerschaftsbonus',
        explanation: c.strategyType === 'withoutPartTime' ? 'Kein Partnerschaftsbonus, nur Basiselterngeld.' : 'Beide in Teilzeit – Bonusmonate werden genutzt.',
        metricLabel: 'Gesamtsumme',
        currentMetricValue: currentResult.householdTotal,
        optimizedMetricValue: c.result.householdTotal,
        deltaValue: c.result.householdTotal - currentResult.householdTotal,
        currentTotal: currentResult.householdTotal,
        optimizedTotal: c.result.householdTotal,
        currentDurationMonths: countBezugMonths(currentResult),
        optimizedDurationMonths: countBezugMonths(c.result),
        plan: c.plan,
        result: c.result,
      })),
    };

    const step2Ctx = buildDecisionContext(step2ResultSet, 0, {
      ...opts,
      originalPlan: currentPlan,
      originalResult: currentResult,
      comparisonMode,
    });

    step2Options = step2Ctx.options.filter(
      (o) =>
        o.strategyType === 'current' ||
        o.strategyType === 'withoutPartTime' ||
        o.strategyType === 'withPartTime'
    );
    if (!partnerBonusHoursEligible) {
      step2Options = step2Options.filter((o) => o.strategyType !== 'withPartTime');
    }
  }

  const hasStep2 = partTimeRelevant && step2Options.length > 0;
  const step1HasRealChoice = step1Options.length > 1;

  steps.push({
    id: 'step-distribution',
    kind: 'distribution',
    stepQuestion: step1HasRealChoice
      ? 'Wer soll Elterngeld beziehen?'
      : 'Aufteilung prüfen',
    stepDescription: step1HasRealChoice
      ? 'Entscheide zuerst, ob nur ein Elternteil oder beide Elternteile Elterngeld beziehen.'
      : 'Dein aktueller Plan ist der Ausgangspunkt. Du kannst die Aufteilung in den Monaten bearbeiten oder verschiedene Ziele vergleichen.',
    stepOptions: step1Options,
    selectedOptionIndex: step1Selected,
    feedbackAfterSelection: getFeedbackForStep1(step1Choice?.strategyType),
    nextStepHint: hasStep2
      ? 'Als Nächstes schauen wir, ob Teilzeit und Partnerschaftsbonus für euch sinnvoll sind.'
      : 'Im nächsten Schritt könnt ihr die Vorschläge vergleichen und optional eine Variante übernehmen.',
  });

  let step2Selected = -1;
  if (hasStep2) {
      step2Selected = Math.max(0, Math.min(preSelected[1] ?? 0, step2Options.length - 1));
      selectedOptionPerStep[1] = step2Selected;
      const step2Choice = step2Options[step2Selected];
      if (step2Choice) {
        currentPlan = step2Choice.plan;
        currentResult = step2Choice.result;
        derivedPlanAfterStep[1] = { plan: currentPlan, result: currentResult, stepIndex: 1 };
      }

      steps.push({
        id: 'step-parttime',
        kind: 'partTime',
        stepQuestion: 'Teilzeit und Partnerschaftsbonus?',
        stepDescription: 'Soll der Partnerschaftsbonus genutzt werden oder eine einfachere Aufteilung ohne Teilzeit?',
        stepOptions: step2Options,
        selectedOptionIndex: step2Selected,
        feedbackAfterSelection: getFeedbackForStep2(step2Choice?.strategyType),
        nextStepHint:
          'Im nächsten Schritt könnt ihr die Vorschläge vergleichen und optional eine Variante übernehmen.',
      });
  }

  // Schritt 3: Optimierungsziel innerhalb des gewählten Modells – nur beste Variante pro Ziel (R1, R2, R5)
  const step3ResultSet: OptimizationResultSet = {
    goal: 'maxMoney',
    status: 'improved',
    currentPlan,
    currentResult,
    suggestions: [],
  };

  const hasPartner = currentPlan.parents[1] != null;
  const goalsForStep3: readonly string[] =
    step1Choice?.strategyType === 'motherOnly'
      ? (['maxMoney', 'longerDuration', 'frontLoad'] as const)
      : (['maxMoney', 'longerDuration', 'frontLoad', ...(hasPartner && partnerBonusHoursEligible ? ['partnerBonus'] : [])] as const);

  /** Alle validen Suggestions pro Ziel sammeln (sortiert nach Ziel-Metrik, beste zuerst). */
  const candidatesPerGoal = new Map<string, OptimizationSuggestion[]>();
  for (const goal of goalsForStep3) {
    const outcome = buildOptimizationResult(currentPlan, currentResult, goal);
    if ('status' in outcome && outcome.status === 'unsupported') continue;
    const ors = outcome as OptimizationResultSet;
    const valid: OptimizationSuggestion[] = [];
    for (const s of ors.suggestions) {
      if (resultsAreEqual(currentResult, s.result)) continue;
      if (!shouldShowVariant(s, currentResult, goal)) continue;
      const [optA, optB] = getBezugMonthsPerParent(s.result);
      if (step1Choice?.strategyType === 'motherOnly' && optB > 0) continue;
      if (step1Choice?.strategyType === 'bothBalanced' && (optA === 0 || optB === 0)) continue;
      valid.push(s);
    }
    valid.sort((a, b) => {
      if (goal === 'maxMoney') return b.result.householdTotal - a.result.householdTotal;
      if (goal === 'longerDuration') return countBezugMonths(b.result) - countBezugMonths(a.result);
      if (goal === 'frontLoad') return (b.deltaValue ?? 0) - (a.deltaValue ?? 0);
      if (goal === 'partnerBonus') {
        const diffTotal = b.result.householdTotal - a.result.householdTotal;
        if (diffTotal !== 0) return diffTotal;
        return countPartnerBonusMonths(b.result) - countPartnerBonusMonths(a.result);
      }
      return 0;
    });
    candidatesPerGoal.set(goal, valid);
  }

  /** [DEV] Diagnose: Kandidaten pro Ziel für Variantenanzahl-Analyse */
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    const diagnose: Record<string, { count: number; items: { strategyType: string; total: number; duration: number; fp: string }[] }> = {};
    for (const goal of goalsForStep3) {
      const candidates = candidatesPerGoal.get(goal) ?? [];
      diagnose[goal] = {
        count: candidates.length,
        items: candidates.slice(0, 5).map((s) => ({
          strategyType: String(s.strategyType ?? s.goal),
          total: Math.round(s.result.householdTotal),
          duration: countBezugMonths(s.result),
          fp: planFingerprint(s.plan).slice(0, 40) + (planFingerprint(s.plan).length > 40 ? '…' : ''),
        })),
      };
    }
    console.log('[stepDecisionFlow] Kandidaten pro Ziel', diagnose);
  }

  /** Sichtbar unterschiedliche Szenarien: pro Ziel bis zu zwei Varianten (beste + zweitbeste).
   * Strategie-Vielfalt (unterschiedliche strategyType) bevorzugen; unterschiedliche Pläne (planFingerprint) erhalten,
   * damit Ziele nicht auf denselben Plan kollabieren. */
  const step3Suggestions: OptimizationSuggestion[] = [];
  const seenPlanFp = new Set<string>();
  const userPriorityGoal = opts?.userPriorityGoal;
  const goalsOrdered =
    userPriorityGoal && goalsForStep3.includes(userPriorityGoal)
      ? [userPriorityGoal, ...goalsForStep3.filter((g) => g !== userPriorityGoal)]
      : [...goalsForStep3];

  const getRepresentedStrategyTypes = (): Set<string> =>
    new Set(step3Suggestions.map((s) => s.strategyType ?? s.goal).filter(Boolean));

  const maxSuggestions = 6;
  const currentDuration = countBezugMonths(currentResult);

  /** longerDuration reservieren: Wenn valide Variante mit deutlich längerer Bezugsdauer existiert, einen Slot sichern. */
  const longerDurationCandidates = candidatesPerGoal.get('longerDuration') ?? [];
  const bestLonger =
    longerDurationCandidates.length > 0
      ? longerDurationCandidates.reduce((best, s) =>
          countBezugMonths(s.result) > countBezugMonths(best.result) ? s : best
        )
      : null;
  if (
    bestLonger &&
    countBezugMonths(bestLonger.result) > currentDuration &&
    !seenPlanFp.has(planFingerprint(bestLonger.plan))
  ) {
    seenPlanFp.add(planFingerprint(bestLonger.plan));
    step3Suggestions.push(bestLonger);
  }

  /** Erster Durchlauf: pro Ziel bis zu zwei Kandidaten – bevorzugt mit unterschiedlichen strategyTypes. */
  for (const goal of goalsOrdered) {
    if (step3Suggestions.length >= maxSuggestions) break;
    const candidates = candidatesPerGoal.get(goal) ?? [];
    let addedThisGoal = 0;
    const maxPerGoal = 2;

    /** 1. Kandidat mit neuem strategyType (noch nicht vertreten). */
    const represented = getRepresentedStrategyTypes();
    for (const s of candidates) {
      if (addedThisGoal >= maxPerGoal) break;
      const fp = planFingerprint(s.plan);
      if (seenPlanFp.has(fp)) continue;
      const strat = s.strategyType ?? s.goal;
      if (represented.size > 0 && represented.has(strat)) continue;
      seenPlanFp.add(fp);
      step3Suggestions.push(s);
      addedThisGoal++;
      break;
    }

    /** 2. Zweitbester: beliebiger Kandidat mit anderem planFingerprint (klar unterscheidbar). */
    if (addedThisGoal < maxPerGoal) {
      for (const s of candidates) {
        if (addedThisGoal >= maxPerGoal || step3Suggestions.length >= maxSuggestions) break;
        const fp = planFingerprint(s.plan);
        if (seenPlanFp.has(fp)) continue;
        seenPlanFp.add(fp);
        step3Suggestions.push(s);
        addedThisGoal++;
        break;
      }
    }
  }

  /** Zweiter Durchlauf: bis 6 auffüllen – bevorzugt neue strategyTypes, sonst weitere distincte Pläne. */
  if (step3Suggestions.length < maxSuggestions) {
    for (const goal of goalsOrdered) {
      if (step3Suggestions.length >= maxSuggestions) break;
      const candidates = candidatesPerGoal.get(goal) ?? [];
      let addedFromThisGoal = 0;
      const represented = getRepresentedStrategyTypes();
      for (const s of candidates) {
        if (step3Suggestions.length >= maxSuggestions || addedFromThisGoal >= 2) break;
        const fp = planFingerprint(s.plan);
        if (seenPlanFp.has(fp)) continue;
        const strat = s.strategyType ?? s.goal;
        if (represented.size > 0 && !represented.has(strat)) {
          seenPlanFp.add(fp);
          step3Suggestions.push(s);
          addedFromThisGoal++;
          break;
        }
      }
      if (addedFromThisGoal < 2) {
        for (const s of candidates) {
          if (step3Suggestions.length >= maxSuggestions || addedFromThisGoal >= 2) break;
          const fp = planFingerprint(s.plan);
          if (seenPlanFp.has(fp)) continue;
          seenPlanFp.add(fp);
          step3Suggestions.push(s);
          addedFromThisGoal++;
        }
      }
    }
  }

  step3ResultSet.suggestions = step3Suggestions;

  /** [DEV] Diagnose: step3Suggestions nach Deduplizierung, vor buildDecisionContext */
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.log('[stepDecisionFlow] step3Suggestions', {
      count: step3Suggestions.length,
      items: step3Suggestions.map((s) => ({
        goal: s.goal,
        strategyType: String(s.strategyType ?? s.goal),
        total: Math.round(s.result.householdTotal),
        duration: countBezugMonths(s.result),
      })),
    });
  }

  const step3Ctx = buildDecisionContext(step3ResultSet, 0, {
    ...opts,
    originalPlan: currentPlan,
    originalResult: currentResult,
    comparisonMode,
    userPriorityGoal: opts?.userPriorityGoal,
  });

  const step3Options = step3Ctx.options.filter((o) => o.strategyType !== 'current');
  const hasCurrentInStep3 = step3Ctx.options.some((o) => o.strategyType === 'current');
  const currentOpt = step3Ctx.options.find((o) => o.strategyType === 'current');

  /** Varianten sortieren: Nutzerpriorität zuerst, dann nach householdTotal absteigend (höchste Auszahlung oben). */
  const sortedRest = [...step3Options].sort((a, b) => {
    const aPrio = a.matchesUserPriority ? 1 : 0;
    const bPrio = b.matchesUserPriority ? 1 : 0;
    if (bPrio !== aPrio) return bPrio - aPrio;
    return b.result.householdTotal - a.result.householdTotal;
  });

  const step3OptionsFinal =
    step3Options.length > 0
      ? (hasCurrentInStep3 && currentOpt ? [currentOpt, ...sortedRest] : sortedRest)
      : [step3Ctx.options[0]];
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.log('[stepDecisionFlow] step3Ctx.options (nach buildDecisionContext)', {
      count: step3Ctx.options.length,
      step3OptionsFinalCount: step3OptionsFinal.length,
    });
  }
  const step3HasRealChoice = step3OptionsFinal.length > 1;
  const step3Selected =
    opts?.strategyStepRequireExplicitSelection && step3HasRealChoice
      ? -1
      : Math.max(0, Math.min(preSelected[2] ?? 0, step3OptionsFinal.length - 1));
  selectedOptionPerStep[2] = step3Selected;
  const step3Choice = step3Selected >= 0 ? step3OptionsFinal[step3Selected] : undefined;
  if (step3Choice) {
    currentPlan = step3Choice.plan;
    currentResult = step3Choice.result;
    derivedPlanAfterStep[2] = { plan: currentPlan, result: currentResult, stepIndex: 2 };
  }

  steps.push({
    id: 'step-optimization',
    kind: 'optimization',
    stepQuestion: step3HasRealChoice
      ? 'Welches Ziel ist dir wichtiger?'
      : 'Deine Variante',
    stepDescription: step3HasRealChoice
      ? 'Die Planvorschläge bleiben innerhalb deiner gewählten Aufteilung.'
      : 'Für eure Situation gibt es aktuell nur eine sinnvolle Variante.',
    stepOptions: step3OptionsFinal,
    selectedOptionIndex: step3Selected,
    feedbackAfterSelection: getFeedbackForStep3(step3Choice?.strategyType),
    nextStepHint: step3HasRealChoice
      ? 'Du hast eine Variante ausgewählt. Du kannst sie jetzt übernehmen oder weiter anpassen.'
      : 'Du kannst diese Variante ansehen und übernehmen.',
  });

  const currentStepIndex = steps.findIndex((s) => s.selectedOptionIndex < 0) >= 0
    ? steps.findIndex((s) => s.selectedOptionIndex < 0)
    : steps.length - 1;

  return {
    decisionSteps: steps,
    currentStepIndex: Math.min(currentStepIndex, steps.length - 1),
    selectedOptionPerStep,
    derivedPlanAfterStep,
    finalResolvedPlan: currentPlan,
    finalResolvedResult: currentResult,
    basePlan,
    baseResult,
    baselineLabel,
    baselineExplanation,
    originalPlan,
    originalResult,
    lastAdoptedPlan,
    lastAdoptedResult,
  };
}
