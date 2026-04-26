/**
 * Ergebnisdarstellung der Elterngeld-Berechnung.
 * Klarer Optimierungsblock mit zielabhängiger Darstellung.
 */

import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../../../../shared/ui/Card';
import { Button } from '../../../../shared/ui/Button';
import { Modal } from '../../../../shared/ui/Modal';
import { MonthGrid } from '../ui/MonthGrid';
import { PlanPhases } from '../ui/PlanPhases';
import { MonthSummary } from '../ui/MonthSummary';
import {
  PartnerBonusCheckDialog,
  getFirstPartnerBonusMonthFromResult,
  type PartnerBonusAction,
} from './PartnerBonusCheckDialog';
import {
  getPartnerschaftsbonusHandlungshinweis,
  isPartnerschaftsbonusWarningMessage,
  PARTNERSCHAFTSBONUS_KARTE_TITEL,
  PARTNERSCHAFTSBONUS_OVERLAY_AKTION,
} from './partnerBonusUiCopy';
import { getMonthGridItemsFromResults } from '../monthGridMappings';
import {
  type CalculationResult,
  type MonthlyResult,
  type ElterngeldCalculationPlan,
} from '../calculation';
import {
  buildOptimizationResult,
  GOAL_LABELS,
  parseOptimizationAdoptedBaselineMap,
  UNSUPPORTED_GOALS,
  type OptimizationGoal,
  type OptimizationResultSet,
  type OptimizationSuggestion,
} from '../calculation/elterngeldOptimization';
import { buildDecisionContext, SCENARIO_SHORT_LABELS, type DecisionContext, type DecisionOption } from '../calculation/decisionContext';
import { buildStepDecisionContext, type StepDecisionContext } from '../calculation/stepDecisionFlow';
import {
  getExplainableAdvantageWhenSameDurationLessTotal,
  getMainRecommendationExplanation,
  getCalculationBreakdown,
  getOptimizationBreakdown,
  shouldShowVariant,
} from './optimizationExplanation';
import { OPTIMIZATION_GOAL_CHOICE_HINT } from './OptimizationGoalDialog';
import type { CombinedWho } from '../calculation/monthCombinedState';
import type { MonthMode } from '../calculation';
import { isPlanEmpty } from '../infra/calculationPlanStorage';
import { getAdoptionStatus } from './adoptionStatus';
import type { ElterngeldApplication, OptimizationAdoptableGoal } from '../types/elterngeldTypes';
import { getOptimizationAdoptUiState } from './optimizationAdoptUi';

function optimizationGoalToAdoptable(
  g: OptimizationGoal | undefined
): OptimizationAdoptableGoal | undefined {
  if (g === 'maxMoney' || g === 'longerDuration' || g === 'frontLoad' || g === 'partnerBonus') return g;
  return undefined;
}

const MODE_LABELS: Record<string, string> = {
  none: '–',
  basis: 'Basis',
  plus: 'Plus',
  partnerBonus: 'PartnerBonus',
};

const MODE_LABELS_LONG: Record<string, string> = {
  none: 'Kein Bezug',
  basis: 'Basiselterngeld',
  plus: 'ElterngeldPlus',
  partnerBonus: 'Partnerschaftsbonus',
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCurrencySigned(amount: number): string {
  const formatted = formatCurrency(Math.abs(amount));
  if (amount > 0) return `+${formatted}`;
  if (amount < 0) return `−${formatted}`;
  return formatted;
}

function countBezugMonthsCore(result: CalculationResult): number {
  const months = new Set<number>();
  for (const p of result.parents) {
    for (const r of p.monthlyResults) {
      if (r.mode !== 'none' || r.amount > 0) months.add(r.month);
    }
  }
  return months.size;
}

function hasPartnerBonus(result: CalculationResult): boolean {
  return result.parents.some((p) =>
    p.monthlyResults.some((m) => m.mode === 'partnerBonus')
  );
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

function getSuggestionDedupKey(s: OptimizationSuggestion): string {
  const total = Math.round(s.result.householdTotal);
  const duration = countBezugMonthsCore(s.result);
  const bonus = countPartnerBonusMonths(s.result);
  const modeSig = s.result.parents
    .map((p) =>
      p.monthlyResults
        .filter((r) => r.mode !== 'none')
        .map((r) => `${r.month}:${r.mode}`)
        .sort((a, b) => parseInt(a.split(':')[0], 10) - parseInt(b.split(':')[0], 10))
        .join(',')
    )
    .join('|');
  return `${s.goal}-${total}-${duration}-${bonus}-${modeSig}`;
}

function planHasPlusOrPartnerBonus(plan: ElterngeldCalculationPlan): boolean {
  return plan.parents.some((p) =>
    p.months.some((m) => m.mode === 'plus' || m.mode === 'partnerBonus')
  );
}

function OptimizationLeistungLaufzeitHint() {
  return (
    <div
      className="elterngeld-calculation__leistung-laufzeit-hint elterngeld-step__notice elterngeld-step__notice--tip"
      role="region"
      aria-label="Hinweis zu Leistung und Laufzeit"
    >
      <p className="elterngeld-calculation__leistung-laufzeit-hint-p">
        Laufzeit und Höhe der Monatsbeträge hängen von der Leistungsform (Basiselterngeld oder ElterngeldPlus) ab. Die
        Karten unten zeigen die geschätzten Auswirkungen je Variante.
      </p>
    </div>
  );
}

function formatMonthsLabel(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

function formatStateLabel(who: CombinedWho, mode: MonthMode): string {
  if (who === 'none') return 'Kein Bezug';
  if (who === 'both') return 'Partnerschaftsbonus';
  if (who === 'mother') return mode === 'plus' ? 'Mutter – Plus' : 'Mutter – Basis';
  if (who === 'partner') return mode === 'plus' ? 'Partner – Plus' : 'Partner – Basis';
  return 'Beide – Bonus';
}

/** Leitet who/mode aus monthlyResults für einen Monat ab (result-basiert). */
function getStateFromResult(
  result: CalculationResult,
  month: number
): { who: CombinedWho; mode: MonthMode } {
  const parentA = result.parents[0];
  const parentB = result.parents[1];
  const rA = parentA?.monthlyResults.find((r) => r.month === month);
  const rB = parentB?.monthlyResults.find((r) => r.month === month);
  const modeA: MonthMode = rA?.mode ?? 'none';
  const modeB: MonthMode = rB?.mode ?? 'none';
  const hasA = modeA !== 'none';
  const hasB = modeB !== 'none';
  if (hasA && !hasB) return { who: 'mother', mode: modeA };
  if (!hasA && hasB) return { who: 'partner', mode: modeB };
  if (hasA && hasB) {
    const mode = modeA === 'partnerBonus' && modeB === 'partnerBonus' ? 'partnerBonus' : modeA;
    return { who: 'both', mode };
  }
  return { who: 'none', mode: 'none' };
}

/** Änderungsvorschau aus Result-Daten (eine Quelle: result). */
function getResultChangePreview(
  currentResult: CalculationResult,
  optimizedResult: CalculationResult,
  maxLines: number = 5
): string[] {
  const allMonths = new Set<number>();
  for (const p of currentResult.parents) {
    for (const r of p.monthlyResults) allMonths.add(r.month);
  }
  for (const p of optimizedResult.parents) {
    for (const r of p.monthlyResults) allMonths.add(r.month);
  }
  const months = [...allMonths].sort((a, b) => a - b);

  type Change = { months: number[]; changeType: 'neu' | 'entfernt' | 'replace'; fromLabel?: string; toLabel?: string };
  const changes: Change[] = [];
  let currentRun: Change | null = null;

  const getChangeKey = (cur: { who: CombinedWho; mode: MonthMode }, opt: { who: CombinedWho; mode: MonthMode }): string => {
    const fromLabel = formatStateLabel(cur.who, cur.mode);
    const toLabel = formatStateLabel(opt.who, opt.mode);
    if (cur.who === 'none') return 'neu';
    if (opt.who === 'none') return 'entfernt';
    return `${fromLabel} → ${toLabel}`;
  };

  for (const month of months) {
    const cur = getStateFromResult(currentResult, month);
    const opt = getStateFromResult(optimizedResult, month);
    const fromLabel = formatStateLabel(cur.who, cur.mode);
    const toLabel = formatStateLabel(opt.who, opt.mode);

    if (fromLabel === toLabel) continue;

    const key = getChangeKey(cur, opt);

    if (currentRun && getChangeKey(
      getStateFromResult(currentResult, currentRun.months[0]),
      getStateFromResult(optimizedResult, currentRun.months[0])
    ) === key) {
      currentRun.months.push(month);
    } else {
      if (currentRun) changes.push(currentRun);
      currentRun = {
        months: [month],
        changeType: cur.who === 'none' ? 'neu' : opt.who === 'none' ? 'entfernt' : 'replace',
        fromLabel,
        toLabel,
      };
    }
  }
  if (currentRun) changes.push(currentRun);

  const formatMonthRange = (m: number[]): string => {
    if (m.length === 0) return '';
    if (m.length === 1) return `LM ${m[0]}`;
    return `LM ${m[0]}–${m[m.length - 1]}`;
  };

  const lines: string[] = [];
  for (const c of changes) {
    const range = formatMonthRange(c.months);
    const line =
      c.changeType === 'neu'
        ? `${range}: neu hinzugefügt`
        : c.changeType === 'entfernt'
          ? `${range}: entfernt`
          : `${range}: ${c.fromLabel} → ${c.toLabel}`;
    lines.push(line);
  }

  if (lines.length > maxLines) {
    return lines.slice(0, maxLines - 1).concat([
      `… und ${lines.length - maxLines + 1} weitere Änderungen`,
    ]);
  }
  return lines;
}

/** Technisches Label → verständliche Beschreibung für Nutzer. */
function formatModeForUser(label: string): string {
  if (label === 'Kein Bezug') return 'kein Bezug';
  if (label === 'Partnerschaftsbonus') return 'Partnerschaftsbonus — beide Eltern parallel mit ElterngeldPlus';
  if (label === 'Beide – Bonus') return 'ElterngeldPlus mit beiden Eltern';
  if (label === 'Mutter – Basis') return 'Basiselterngeld (Mutter)';
  if (label === 'Mutter – Plus') return 'ElterngeldPlus (Mutter)';
  if (label === 'Partner – Basis') return 'Basiselterngeld (Partner)';
  if (label === 'Partner – Plus') return 'ElterngeldPlus (Partner)';
  return label;
}

/** Alle Lebensmonate, die für die Änderungsvorschau verglichen werden (Union inkl. geschlossener Lücken). */
function expandPreviewMonthsUnionWithGaps(currentResult: CalculationResult, optimizedResult: CalculationResult): number[] {
  const allMonths = new Set<number>();
  for (const p of currentResult.parents) {
    for (const r of p.monthlyResults) allMonths.add(r.month);
  }
  for (const p of optimizedResult.parents) {
    for (const r of p.monthlyResults) allMonths.add(r.month);
  }
  const sortedSeed = [...allMonths].sort((a, b) => a - b);
  for (let i = 0; i < sortedSeed.length - 1; i++) {
    const lo = sortedSeed[i];
    const hi = sortedSeed[i + 1];
    if (hi > lo + 1) {
      for (let m = lo + 1; m < hi; m++) allMonths.add(m);
    }
  }
  return [...allMonths].sort((a, b) => a - b);
}

function assertChangePreviewCoversAllChangedMonths(
  changedMonths: Set<number>,
  changes: { months: number[] }[]
): void {
  const covered = new Set<number>();
  for (const c of changes) {
    for (const m of c.months) covered.add(m);
  }
  if (changedMonths.size === covered.size && [...changedMonths].every((m) => covered.has(m))) return;

  const msg = `[getResultChangePreviewUserFriendly] Unvollständige Monatsabdeckung: geändert=${[...changedMonths].sort((a, b) => a - b).join(',')}, abgebildet=${[...covered].sort((a, b) => a - b).join(',')}`;
  console.error(msg);
  if (import.meta.env.DEV) {
    throw new Error(msg);
  }
}

/** Änderungen im Plan – verständlich formatiert („Monat 3–5 wird zu ElterngeldPlus mit beiden Eltern“). */
export function getResultChangePreviewUserFriendly(
  currentResult: CalculationResult,
  optimizedResult: CalculationResult,
  maxLines: number = 5
): string[] {
  const months = expandPreviewMonthsUnionWithGaps(currentResult, optimizedResult);
  const changedMonths = new Set<number>();

  type Change = { months: number[]; changeType: 'neu' | 'entfernt' | 'replace'; fromLabel?: string; toLabel?: string };
  const changes: Change[] = [];
  let currentRun: Change | null = null;

  for (const month of months) {
    const cur = getStateFromResult(currentResult, month);
    const opt = getStateFromResult(optimizedResult, month);
    const fromLabel = formatStateLabel(cur.who, cur.mode);
    const toLabel = formatStateLabel(opt.who, opt.mode);

    if (fromLabel === toLabel) continue;

    changedMonths.add(month);

    const changeType: 'neu' | 'entfernt' | 'replace' =
      cur.who === 'none' ? 'neu' : opt.who === 'none' ? 'entfernt' : 'replace';

    const lastInRun = currentRun?.months[currentRun.months.length - 1];
    const consecutive = lastInRun != null && month === lastInRun + 1;

    let extendRun = false;
    if (currentRun && changeType === currentRun.changeType && consecutive) {
      if (changeType === 'entfernt') extendRun = true;
      else if (changeType === 'neu') extendRun = toLabel === currentRun.toLabel;
      else extendRun = fromLabel === currentRun.fromLabel && toLabel === currentRun.toLabel;
    }

    if (extendRun && currentRun) {
      currentRun.months.push(month);
    } else {
      if (currentRun) changes.push(currentRun);
      currentRun = { months: [month], changeType, fromLabel, toLabel };
    }
  }
  if (currentRun) changes.push(currentRun);

  assertChangePreviewCoversAllChangedMonths(changedMonths, changes);

  const formatMonthRangeUser = (m: number[]): string => {
    if (m.length === 0) return '';
    if (m.length === 1) return `Monat ${m[0]}`;
    return `Monat ${m[0]}–${m[m.length - 1]}`;
  };

  const lines: string[] = [];
  for (const c of changes) {
    const range = formatMonthRangeUser(c.months);
    const toPartnerschaftsbonus =
      (c.changeType === 'neu' || c.changeType === 'replace') && c.toLabel === 'Partnerschaftsbonus';
    if (toPartnerschaftsbonus) {
      lines.push(`${range} wird zum Partnerschaftsbonus`);
      lines.push('→ beide Eltern müssen parallel ElterngeldPlus beziehen');
      continue;
    }
    const line =
      c.changeType === 'entfernt'
        ? c.months.length === 1
          ? `${range} entfällt`
          : `${range} entfallen`
        : c.changeType === 'neu' && c.toLabel
          ? `${range} wird zu ${formatModeForUser(c.toLabel)}`
          : c.changeType === 'replace' && c.toLabel
            ? `${range} wird zu ${formatModeForUser(c.toLabel)}`
            : `${range}: ${c.fromLabel} → ${c.toLabel}`;
    lines.push(line);
  }

  if (lines.length > maxLines) {
    return lines.slice(0, maxLines - 1).concat([`… und ${lines.length - maxLines + 1} weitere Änderungen`]);
  }
  return lines;
}

type PlanStability = 'gut' | 'pruefen' | 'kritisch';

function getPlanStability(
  result: CalculationResult,
  hidePartnerschaftsbonusUi = false
): {
  level: PlanStability;
  label: string;
  hints: string[];
} {
  const { parents } = result;
  const validation = hidePartnerschaftsbonusUi
    ? {
        ...result.validation,
        warnings: result.validation.warnings.filter((w) => !isPartnerschaftsbonusWarningMessage(w)),
      }
    : result.validation;
  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;
  const hasParentWarnings = parents.some((p) => p.warnings.length > 0);
  const hasPartnerBonus =
    !hidePartnerschaftsbonusUi &&
    parents.some((p) => p.monthlyResults.some((m) => m.mode === 'partnerBonus'));
  const hasHoursWarning = validation.warnings.some((w) => w.includes('24–32') || w.includes('Wochenstunden'));
  const hasPartnerBonusWarning = validation.warnings.some((w) => isPartnerschaftsbonusWarningMessage(w));

  if (hasErrors) {
    return {
      level: 'kritisch',
      label: 'Kritisch',
      hints: validation.errors.slice(0, 3),
    };
  }

  if (hasWarnings || hasParentWarnings) {
    const hints: string[] = [];
    if (hasPartnerBonusWarning) hints.push('Partnerschaftsbonus bitte mit Arbeitszeit anpassen');
    else if (hasHoursWarning) hints.push('Angaben zur Teilzeit sollten geprüft werden');
    if (validation.warnings.some((w) => w.includes('Monat'))) hints.push('Mehrere Monate enthalten Sonderkonstellationen');
    if (validation.warnings.some((w) => w.includes('Einkommen'))) hints.push('Einkommensangaben prüfen');
    if (hints.length === 0) hints.push(...validation.warnings.slice(0, 2));
    return {
      level: 'pruefen',
      label: 'Bitte prüfen',
      hints: hints.length > 0 ? hints : ['Bitte prüfe die angezeigten Hinweise.'],
    };
  }

  if (hasPartnerBonus) {
    return {
      level: 'gut',
      label: 'Gut planbar',
      hints: ['Plan wirkt konsistent und gut nachvollziehbar.'],
    };
  }

  return {
    level: 'gut',
    label: 'Gut planbar',
    hints: ['Plan wirkt konsistent und gut nachvollziehbar.'],
  };
}

/** Extrahiert Monatsnummer aus Warnungstext (z.B. "Monat 5: ..." → 5) */
function extractMonthFromWarning(warning: string): number | null {
  const m = warning.match(/Monat\s+(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

/** Erster Monat mit Plus oder PartnerBonus (für Arbeitszeit-Hinweise) */
function getFirstRelevantMonth(result: CalculationResult): number | null {
  for (const p of result.parents) {
    const m = p.monthlyResults.find((r) => r.mode === 'partnerBonus' || r.mode === 'plus');
    if (m) return m.month;
  }
  return null;
}

/** Prüft ob ein Hinweis eine konkrete Aktion hat */
function getHintAction(
  warning: string,
  result: CalculationResult
): { label: string; action: 'focusMonth' | 'focusEinkommen' | 'focusGrunddaten' | 'focusMonatsplan' | 'openOptimization' | 'openPartnerBonusCheck' | null; month?: number } {
  const month = extractMonthFromWarning(warning);
  if (month != null) return { label: `Monat ${month} anpassen`, action: 'focusMonth', month };
  if (warning.includes('Partnerschaftsbonus') || warning.includes('Partnerbonus'))
    return { label: PARTNERSCHAFTSBONUS_OVERLAY_AKTION, action: 'openPartnerBonusCheck' };
  if (warning.includes('24–32') || warning.includes('Wochenstunden') || warning.includes('Arbeitszeit')) {
    const m = getFirstRelevantMonth(result);
    return { label: 'Arbeitszeit anpassen', action: m != null ? 'focusMonth' : 'focusMonatsplan', month: m ?? undefined };
  }
  if (warning.includes('Einkommen')) return { label: 'Einkommen anpassen', action: 'focusEinkommen' };
  if (warning.includes('Geburtsdatum') || warning.includes('Termin')) return { label: 'Grunddaten prüfen', action: 'focusGrunddaten' };
  return { label: '', action: null };
}

/** Aktion für Validierungsfehler (errors) */
function getErrorAction(error: string): { label: string; action: 'focusGrunddaten' | 'focusEinkommen' | null } {
  if (error.includes('Geburtsdatum') || error.includes('Termin')) return { label: 'Grunddaten prüfen', action: 'focusGrunddaten' };
  if (error.includes('Einkommen')) return { label: 'Einkommen anpassen', action: 'focusEinkommen' };
  return { label: '', action: null };
}

type PlanStabilityBlockProps = {
  result: CalculationResult;
  className?: string;
  hidePartnerschaftsbonusUi?: boolean;
};

function PlanStabilityBlock({
  result,
  className,
  hidePartnerschaftsbonusUi = false,
}: PlanStabilityBlockProps) {
  const { level, label, hints } = getPlanStability(result, hidePartnerschaftsbonusUi);
  const levelClass =
    level === 'kritisch'
      ? 'elterngeld-plan-stability--kritisch'
      : level === 'pruefen'
        ? 'elterngeld-plan-stability--pruefen'
        : 'elterngeld-plan-stability--gut';
  return (
    <div className={`elterngeld-plan-stability ${levelClass} ${className ?? ''}`.trim()}>
      <h4 className="elterngeld-plan-stability__title">Plan-Einschätzung</h4>
      <p className="elterngeld-plan-stability__label">{label}</p>
      <ul className="elterngeld-plan-stability__hints">
        {hints.map((h, i) => (
          <li key={i}>{h}</li>
        ))}
      </ul>
    </div>
  );
}

type StepOptimizationBlockProps = {
  plan: ElterngeldCalculationPlan;
  result: CalculationResult;
  formatCurrency: (n: number) => string;
  formatCurrencySigned: (n: number) => string;
  countBezugMonths: (r: CalculationResult) => number;
  hasPartnerBonus: (r: CalculationResult) => boolean;
  onAdoptOptimization?: (
    plan: ElterngeldCalculationPlan,
    adoptedGoal?: OptimizationAdoptableGoal,
    adoptedResult?: CalculationResult
  ) => void;
  onDiscardOptimization?: () => void;
  onBackToOptimization?: () => void;
  /** Schließt Overlay/Ansicht und führt sichtbar in die Monatsaufteilungs-Bearbeitung. */
  onNavigateToMonthEditing?: () => void;
  /** Optional: direkt zur Leistungswahl Basis/ElterngeldPlus (z. B. Wizard-Scroll zu `#elterngeld-plan-leistung`). */
  onNavigateToLeistungSettings?: () => void;
  /** Führt zur Stundeneingabe (Vorbereitung: Eltern & Arbeit; Rechner: Eingabe Monatsplan). */
  onNavigateToPartTimeSettings?: () => void;
  /** Startet direkt bei der Strategie-/Ziel-Auswahl (Step 3). */
  skipToStrategyStep?: boolean;
  /** Blendet „Aktuellen Plan beibehalten“ aus. */
  hideDiscardButton?: boolean;
  /** Blendet Zurück-Button (Monatsaufteilung bearbeiten) aus. */
  hideBackButton?: boolean;
  /** Führt zurück zur Zielauswahl (Overlay-Einstiegsview). Nur im Overlay-Pfad. */
  onBackToGoalSelection?: () => void;
  originalPlanForOptimization?: ElterngeldCalculationPlan | null;
  originalResultForOptimization?: CalculationResult | null;
  lastAdoptedPlan?: ElterngeldCalculationPlan | null;
  lastAdoptedResult?: CalculationResult | null;
  /** Wird aufgerufen, wenn sich die angezeigte Variante ändert – für Monatsübersicht-Sync */
  onResolvedResultChange?: (result: CalculationResult) => void;
  /** Optional: Plan der gewählten Variante (für direkte Übernahme ohne Overlay) */
  onResolvedPlanChange?: (plan: ElterngeldCalculationPlan) => void;
  /** Nutzerpriorität für Kennzeichnung in der UI (z. B. aus Zielauswahl) */
  optimizationGoal?: OptimizationGoal;
  /** false: zentrale 24–32-h-Regel nicht erfüllt – kein Partnerbonus-Pfad im Overlay (Standard true). */
  partnerBonusHoursEligible?: boolean;
  /** Wird im Overlay bei jeder Teilzeitänderung im Modal erhöht (nur Anzeige-Hinweis, keine Logik). */
  partTimeEditGeneration?: number;
  /** Vorbereitungsdaten: für Übernahme-Prüfung „explizit eingetragene Teilzeit“ (nicht nur Fallback-Schätzung). */
  elterngeldApplicationForAdoption?: ElterngeldApplication | null;
  /** Alleinerziehend: keine Partnerschaftsbonus-Darstellung in Varianten. */
  hidePartnerschaftsbonusUi?: boolean;
};

type OptimizationComparisonBlockProps = {
  optimizationResultSet: OptimizationResultSet;
  selectedOptionIndex: number;
  onSelectOption: (index: number) => void;
  formatCurrency: (n: number) => string;
  formatCurrencySigned: (n: number) => string;
  countBezugMonths: (r: CalculationResult) => number;
  hasPartnerBonus: (r: CalculationResult) => boolean;
  onAdoptOptimization?: (
    plan: ElterngeldCalculationPlan,
    adoptedGoal?: OptimizationAdoptableGoal,
    adoptedResult?: CalculationResult
  ) => void;
  onDiscardOptimization?: () => void;
  onBackToOptimization?: () => void;
  originalPlanForOptimization?: ElterngeldCalculationPlan | null;
  originalResultForOptimization?: CalculationResult | null;
  lastAdoptedPlan?: ElterngeldCalculationPlan | null;
  lastAdoptedResult?: CalculationResult | null;
  onNavigateToPartTimeSettings?: () => void;
  elterngeldApplicationForAdoption?: ElterngeldApplication | null;
  /** Nutzer-Basisplan für Adopt-Prüfung (Standard: Optimierungs-`currentPlan`). */
  adoptUserPlan?: ElterngeldCalculationPlan | null;
};

type AdoptConfirmDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  currentResult: CalculationResult;
  optimizedResult: CalculationResult;
  formatCurrency: (n: number) => string;
  formatCurrencySigned: (n: number) => string;
  deltaTotal: number;
  deltaDuration: number;
};

function AdoptConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  currentResult,
  optimizedResult,
  formatCurrency,
  formatCurrencySigned,
  deltaTotal,
  deltaDuration,
}: AdoptConfirmDialogProps) {
  const planChangeLines = getResultChangePreviewUserFriendly(currentResult, optimizedResult, 20);

  const impactLines: string[] = [];
  if (deltaTotal !== 0) impactLines.push(formatCurrencySigned(deltaTotal));
  if (deltaDuration !== 0) {
    const unit = formatMonthsLabel(Math.abs(deltaDuration), 'Monat', 'Monate');
    impactLines.push(deltaDuration > 0 ? `+${deltaDuration} ${unit}` : `${deltaDuration} ${unit}`);
  }
  const hasStructuralChanges = planChangeLines.length > 0;
  const hasNoFinancialChange = deltaTotal === 0 && deltaDuration === 0;
  if (impactLines.length === 0) {
    impactLines.push(hasStructuralChanges ? 'Betrag und Dauer bleiben gleich' : '±0 €');
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Planvorschlag übernehmen" variant="softpill" scrollableContent>
      <div className="elterngeld-screen elterngeld-optimization-overlay-content elterngeld-adopt-confirm">
        <p className="elterngeld-adopt-confirm__intro">
          Dieser Vorschlag verändert deinen aktuellen Plan.
        </p>
        {hasNoFinancialChange && planChangeLines.length > 0 && (
          <div className="elterngeld-adopt-confirm__section elterngeld-adopt-confirm__section--primary">
            <h4 className="elterngeld-adopt-confirm__section-title">Geänderte Monate und Verteilung</h4>
            <ul className="elterngeld-adopt-confirm__list">
              {planChangeLines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        )}
        {!hasNoFinancialChange && planChangeLines.length > 0 && (
          <div className="elterngeld-adopt-confirm__section">
            <h4 className="elterngeld-adopt-confirm__section-title">Änderungen</h4>
            <ul className="elterngeld-adopt-confirm__list">
              {planChangeLines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="elterngeld-adopt-confirm__section">
          <h4 className="elterngeld-adopt-confirm__section-title">Auswirkungen</h4>
          <ul className="elterngeld-adopt-confirm__list">
            {impactLines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
        <div className="elterngeld-adopt-confirm__actions next-steps__stack elterngeld-optimization-goal__actions">
          <Button
            type="button"
            variant="primary"
            className="next-steps__button btn--softpill"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Vorschlag übernehmen
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="next-steps__button btn--softpill"
            onClick={onClose}
          >
            Abbrechen
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function getOptionImpactLines(
  opt: DecisionOption,
  formatCurrency: (n: number) => string,
  formatCurrencySigned: (n: number) => string,
  options?: { omitDurationLine?: boolean; omitBonusDelta?: boolean }
): string[] {
  const { impact } = opt;
  const lines: string[] = [];
  if (impact.financialDelta !== 0) lines.push(formatCurrencySigned(impact.financialDelta));
  if (!options?.omitDurationLine && impact.durationDelta !== 0) {
    const unit = formatMonthsLabel(Math.abs(impact.durationDelta), 'Monat', 'Monate');
    lines.push(impact.durationDelta > 0 ? `+${impact.durationDelta} ${unit}` : `${impact.durationDelta} ${unit}`);
  }
  if (!options?.omitBonusDelta && impact.bonusDelta !== 0) {
    const unit = formatMonthsLabel(Math.abs(impact.bonusDelta), 'Bonusmonat', 'Bonusmonate');
    lines.push(impact.bonusDelta > 0 ? `+${impact.bonusDelta} ${unit}` : `${impact.bonusDelta} ${unit}`);
  }
  if (impact.advantage) lines.push(impact.advantage);
  if (impact.tradeoff) lines.push(impact.tradeoff);
  return lines;
}

export function StepOptimizationBlock({
  plan,
  result,
  formatCurrency,
  formatCurrencySigned,
  countBezugMonths,
  hasPartnerBonus,
  onAdoptOptimization,
  onDiscardOptimization,
  onBackToOptimization,
  onNavigateToMonthEditing,
  onNavigateToPartTimeSettings,
  skipToStrategyStep,
  hideDiscardButton,
  hideBackButton,
  onBackToGoalSelection,
  originalPlanForOptimization,
  originalResultForOptimization,
  lastAdoptedPlan,
  lastAdoptedResult,
  onResolvedResultChange,
  onResolvedPlanChange,
  optimizationGoal,
  partnerBonusHoursEligible = true,
  partTimeEditGeneration = 0,
  elterngeldApplicationForAdoption = null,
  hidePartnerschaftsbonusUi = false,
}: StepOptimizationBlockProps) {
  const [selectedOptionPerStep, setSelectedOptionPerStep] = useState<number[]>([]);
  const [showAdoptConfirm, setShowAdoptConfirm] = useState(false);
  const [variantTotalsUnchangedHint, setVariantTotalsUnchangedHint] = useState<string | null>(null);
  const lastVariantTotalsSig = useRef<string | null>(null);
  /** Einheitlicher State: immer gesetzt vor Adopt-Dialog-Öffnung – ein Pfad für alle Varianten */
  const [adoptDialogOption, setAdoptDialogOption] = useState<{ plan: ElterngeldCalculationPlan; result: CalculationResult; financialDelta: number; durationDelta: number } | null>(null);

  const stepContext = useMemo(() => {
    const opts =
      originalPlanForOptimization && originalResultForOptimization
        ? {
            originalPlan: originalPlanForOptimization,
            originalResult: originalResultForOptimization,
            lastAdoptedPlan: lastAdoptedPlan ?? null,
            lastAdoptedResult: lastAdoptedResult ?? null,
            selectedOptionPerStep,
            strategyStepRequireExplicitSelection: skipToStrategyStep,
            userPriorityGoal: optimizationGoal && !UNSUPPORTED_GOALS.includes(optimizationGoal) ? optimizationGoal : undefined,
            partnerBonusHoursEligible,
          }
        : {
            selectedOptionPerStep,
            strategyStepRequireExplicitSelection: skipToStrategyStep,
            userPriorityGoal: optimizationGoal && !UNSUPPORTED_GOALS.includes(optimizationGoal) ? optimizationGoal : undefined,
            partnerBonusHoursEligible,
          };
    return buildStepDecisionContext(plan, result, opts);
  }, [
    plan,
    result,
    originalPlanForOptimization,
    originalResultForOptimization,
    lastAdoptedPlan,
    lastAdoptedResult,
    selectedOptionPerStep,
    skipToStrategyStep,
    optimizationGoal,
    partnerBonusHoursEligible,
  ]);

  const { decisionSteps, finalResolvedPlan, finalResolvedResult, baselineLabel, baselineExplanation } = stepContext;

  const optimizationInputRevision = useMemo(
    () =>
      [
        ...plan.parents.map((p) =>
          p.months.map((m) => `${m.month}:${m.mode}:${m.hoursPerWeek ?? ''}`).join(';')
        ),
        String(result.householdTotal),
      ].join('|'),
    [plan, result]
  );

  useEffect(() => {
    if (!skipToStrategyStep || !decisionSteps.length) return;
    const targetLen = decisionSteps.length - 1;
    if (targetLen <= 0) return;
    setSelectedOptionPerStep(Array(targetLen).fill(0));
  }, [skipToStrategyStep, decisionSteps.length, optimizationInputRevision]);

  useEffect(() => {
    if (!skipToStrategyStep) {
      setVariantTotalsUnchangedHint(null);
      lastVariantTotalsSig.current = null;
      return;
    }
    const sig = decisionSteps
      .flatMap((s) => s.stepOptions.map((o) => `${Math.round(o.result.householdTotal)}-${countBezugMonthsCore(o.result)}`))
      .join('|');
    if (partTimeEditGeneration > 0 && lastVariantTotalsSig.current !== null && lastVariantTotalsSig.current === sig) {
      setVariantTotalsUnchangedHint(
        'Die angezeigten Kennzahlen der Varianten bleiben unter der Schätzung unverändert – trotz angepasster Wochenstunden. Eure Eingabe ist im Plan übernommen.'
      );
    } else if (partTimeEditGeneration > 0) {
      setVariantTotalsUnchangedHint(null);
    }
    lastVariantTotalsSig.current = sig;
  }, [skipToStrategyStep, decisionSteps, partTimeEditGeneration]);

  const currentStepIndex = Math.min(selectedOptionPerStep.length, decisionSteps.length - 1);
  const currentStep = decisionSteps[currentStepIndex];
  const showCompactVariantIntro = currentStep && currentStep.stepOptions.length > 1;

  const hasAnyAlternatives = decisionSteps.some((s) => s.stepOptions.length > 1);

  const openAdoptDialogForOption = useCallback((opt: DecisionOption) => {
    if (opt.strategyType === 'current') return;
    if (!opt?.impact) return;
    if (
      !getOptimizationAdoptUiState(opt.plan, {
        userPlan: plan,
        application: elterngeldApplicationForAdoption,
      }).allowed
    )
      return;
    setAdoptDialogOption({
      plan: opt.plan,
      result: opt.result,
      financialDelta: opt.impact.financialDelta,
      durationDelta: opt.impact.durationDelta,
    });
    setShowAdoptConfirm(true);
  }, [plan, elterngeldApplicationForAdoption]);

  const closeAdoptDialog = useCallback(() => {
    setShowAdoptConfirm(false);
    setAdoptDialogOption(null);
  }, []);

  useEffect(() => {
    onResolvedResultChange?.(finalResolvedResult);
    onResolvedPlanChange?.(finalResolvedPlan);
  }, [finalResolvedResult, finalResolvedPlan, onResolvedResultChange, onResolvedPlanChange]);

  const handleSelectOption = (stepIdx: number, optionIdx: number) => {
    setSelectedOptionPerStep((prev) => {
      const next = [...prev];
      next[stepIdx] = optionIdx;
      return next.slice(0, stepIdx + 1);
    });
  };

  const handleStepBack = (stepIdx: number) => {
    setSelectedOptionPerStep((prev) => prev.slice(0, stepIdx));
  };

  /** Einheitliche Vergleichsbasis für OptionCard und Confirm-Dialog – identische Referenz (R3) */
  const currentResultForStep =
    currentStepIndex === 0 ? result : stepContext.derivedPlanAfterStep[currentStepIndex - 1]?.result ?? result;

  const postVariantCardsMeta = (
    <>
      <div
        className="elterngeld-step-flow__progress"
        role="progressbar"
        aria-valuenow={currentStepIndex + 1}
        aria-valuemin={1}
        aria-valuemax={decisionSteps.length}
      >
        <span className="elterngeld-step-flow__progress-label">
          Schritt {currentStepIndex + 1} von {decisionSteps.length}
        </span>
      </div>
      {variantTotalsUnchangedHint && (
        <p className="elterngeld-step__notice elterngeld-step__notice--tip" role="status">
          {variantTotalsUnchangedHint}
        </p>
      )}
      {optimizationGoal && !UNSUPPORTED_GOALS.includes(optimizationGoal) && (
        <div
          className="elterngeld-calculation__chosen-goal-banner elterngeld-step__notice elterngeld-step__notice--tip"
          role="status"
        >
          <p className="elterngeld-calculation__chosen-goal-title">
            Gewähltes Ziel:{' '}
            <strong>{SCENARIO_SHORT_LABELS[optimizationGoal] ?? optimizationGoal}</strong>
          </p>
          {OPTIMIZATION_GOAL_CHOICE_HINT[optimizationGoal] &&
            !(hidePartnerschaftsbonusUi && optimizationGoal === 'partnerBonus') && (
            <p className="elterngeld-calculation__chosen-goal-detail">
              {OPTIMIZATION_GOAL_CHOICE_HINT[optimizationGoal]}
            </p>
          )}
        </div>
      )}
      <div
        className="elterngeld-calculation__optimization-context elterngeld-step__notice elterngeld-step__notice--tip"
        role="note"
      >
        <p className="elterngeld-calculation__optimization-context-p">
          Die Vorschläge basieren auf euren erfassten Einkommensangaben; Grenzen und Obergrenzen hängen davon ab.
          {!skipToStrategyStep && (
            <> Änderungen am Plan gelten erst nach Übernahme – bis dahin bleibt dein aktueller Plan unverändert.</>
          )}
        </p>
        <p className="elterngeld-calculation__optimization-context-p elterngeld-calculation__optimization-context-p--baseline">
          <strong>Vergleich zu:</strong> {baselineLabel}. {baselineExplanation}
        </p>
      </div>
      {currentStepIndex > 0 && (() => {
        const prevStep = decisionSteps[currentStepIndex - 1];
        const showPartTimeHoursLink =
          prevStep?.kind === 'partTime' &&
          !!onNavigateToPartTimeSettings &&
          prevStep.stepOptions[Math.max(0, prevStep.selectedOptionIndex)]?.strategyType === 'withPartTime';
        if (!prevStep?.feedbackAfterSelection && !prevStep?.nextStepHint && !showPartTimeHoursLink) {
          return null;
        }
        return (
          <div className="elterngeld-step-flow__transition" role="status">
            {prevStep.feedbackAfterSelection && (
              <p className="elterngeld-step-flow__feedback">{prevStep.feedbackAfterSelection}</p>
            )}
            {showPartTimeHoursLink && (
              <div className="elterngeld-step-flow__feedback elterngeld-step__hint">
                <Button
                  type="button"
                  variant="secondary"
                  className="next-steps__button btn--softpill"
                  onClick={() => onNavigateToPartTimeSettings?.()}
                >
                  Teilzeitstunden anpassen
                </Button>
              </div>
            )}
            {prevStep.nextStepHint && (
              <p className="elterngeld-step-flow__next-hint">{prevStep.nextStepHint}</p>
            )}
          </div>
        );
      })()}
    </>
  );

  return (
    <>
      {adoptDialogOption && (
        <AdoptConfirmDialog
          isOpen={showAdoptConfirm}
          onClose={closeAdoptDialog}
          onConfirm={() => {
            if (
              !getOptimizationAdoptUiState(adoptDialogOption.plan, {
                userPlan: plan,
                application: elterngeldApplicationForAdoption,
              }).allowed
            )
              return;
            onAdoptOptimization?.(
              adoptDialogOption.plan,
              optimizationGoalToAdoptable(optimizationGoal),
              adoptDialogOption.result
            );
          }}
          currentResult={currentResultForStep}
          optimizedResult={adoptDialogOption.result}
          formatCurrency={formatCurrency}
          formatCurrencySigned={formatCurrencySigned}
          deltaTotal={adoptDialogOption.financialDelta}
          deltaDuration={adoptDialogOption.durationDelta}
        />
      )}
      <Card className="still-daily-checklist__card elterngeld-calculation__optimization-block elterngeld-calculation__optimization-block--comparison">
        {!hasAnyAlternatives ? (
          <>
            <OptimizationLeistungLaufzeitHint />
            <h3 className="elterngeld-step__title">Dein aktueller Plan passt gut zu deinem Ziel.</h3>
            {onBackToOptimization && (
              <Button type="button" variant="secondary" className="btn--softpill" onClick={onBackToOptimization}>
                Planvorschläge schließen
              </Button>
            )}
          </>
        ) : (
        <div className="elterngeld-step-flow">
          <OptimizationLeistungLaufzeitHint />
          {showCompactVariantIntro && (
            <p className="elterngeld-step__hint">Wähle eine Variante und bestätige sie in der Karte.</p>
          )}
          {(() => {
            const step = decisionSteps[currentStepIndex];
            if (!step) return null;
            const isStrategyStepSingleOption = step.kind === 'optimization' && step.stepOptions.length === 1;
            if (isStrategyStepSingleOption) {
              const opt = step.stepOptions[0];
              const singlePbAdopt = getOptimizationAdoptUiState(opt.plan, {
                userPlan: plan,
                application: elterngeldApplicationForAdoption,
              });
              return (
                <div key={step.id} className="elterngeld-step-flow__step elterngeld-step-flow__step--active">
                  <h3 className="elterngeld-step__title">Für eure Situation gibt es aktuell nur eine sinnvolle Variante.</h3>
                  <p className="elterngeld-calculation__decision-reason">{step.stepDescription}</p>
                  <div className="elterngeld-plan__summary-rows">
                    <div className="elterngeld-plan__summary-row">
                      <span className="elterngeld-plan__summary-label">Gesamtbetrag</span>
                      <span className="elterngeld-plan__summary-value">{formatCurrency(opt.result.householdTotal)}</span>
                    </div>
                    <div className="elterngeld-plan__summary-row">
                      <span className="elterngeld-plan__summary-label">Dauer</span>
                      <span className="elterngeld-plan__summary-value">{countBezugMonths(opt.result)} Monate</span>
                    </div>
                  </div>
                  {opt.strategyType === 'withPartTime' && onNavigateToPartTimeSettings && (
                    <div className="elterngeld-step__hint elterngeld-step-flow__feedback">
                      <Button
                        type="button"
                        variant="secondary"
                        className="next-steps__button btn--softpill"
                        onClick={() => onNavigateToPartTimeSettings?.()}
                      >
                        Teilzeitstunden anpassen
                      </Button>
                    </div>
                  )}
                  <div className="elterngeld-calculation__optimization-actions next-steps__stack">
                    {opt.strategyType !== 'current' && onAdoptOptimization && (
                      <>
                        <Button
                          type="button"
                          variant="primary"
                          className="btn--softpill elterngeld-calculation__optimization-action-primary"
                          disabled={!singlePbAdopt.allowed}
                          onClick={() => {
                            if (!singlePbAdopt.allowed) return;
                            openAdoptDialogForOption(opt);
                          }}
                        >
                          Diese Variante übernehmen
                        </Button>
                        {!singlePbAdopt.allowed && singlePbAdopt.hint && (
                          <span
                            className="elterngeld-step__notice elterngeld-step__notice--tip elterngeld-calculation__optimization-adopt-block-hint"
                            role="status"
                          >
                            {singlePbAdopt.hint}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {postVariantCardsMeta}
                </div>
              );
            }
            const allSameTotal =
              step.stepOptions.length > 1 &&
              step.stepOptions.every((o) => o.result.householdTotal === step.stepOptions[0].result.householdTotal);
            return (
              <div key={step.id} className="elterngeld-step-flow__step elterngeld-step-flow__step--active">
                <div className="elterngeld-calculation__suggestion-list" role="list">
                  {step.stepOptions.map((opt, optIdx) => (
                    <OptionCard
                      key={opt.id}
                      opt={opt}
                      idx={optIdx}
                      clampedIndex={step.selectedOptionIndex}
                      currentResult={currentResultForStep}
                      formatCurrency={formatCurrency}
                      formatCurrencySigned={formatCurrencySigned}
                      onSelectOption={(idx) => handleSelectOption(currentStepIndex, idx)}
                      onAdoptOption={onAdoptOptimization ? openAdoptDialogForOption : undefined}
                      onNavigateToPartTimeSettings={onNavigateToPartTimeSettings}
                      adoptUserPlan={plan}
                      adoptApplication={elterngeldApplicationForAdoption}
                      hidePartnerschaftsbonusUi={hidePartnerschaftsbonusUi}
                    />
                  ))}
                </div>
                {postVariantCardsMeta}
                {!skipToStrategyStep && (
                  <>
                    <h3 className="elterngeld-step__title">{step.stepQuestion}</h3>
                    <p className="elterngeld-calculation__decision-reason">{step.stepDescription}</p>
                  </>
                )}
                {allSameTotal && (
                  <p className="elterngeld-calculation__gleichstand-hint">
                    Diese Varianten führen zur gleichen Gesamtauszahlung – sie unterscheiden sich in der Aufteilung.
                  </p>
                )}
                {currentStepIndex > 0 && !hideBackButton && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="btn--softpill elterngeld-step-flow__back"
                    onClick={() => {
                      if (currentStepIndex === 1 && onNavigateToMonthEditing) {
                        onNavigateToMonthEditing();
                      } else {
                        handleStepBack(currentStepIndex);
                      }
                    }}
                  >
                    {currentStepIndex === 1 && onNavigateToMonthEditing
                      ? 'Monatsaufteilung bearbeiten'
                      : `Zurück zu Schritt ${currentStepIndex}`}
                  </Button>
                )}
                {currentStepIndex === decisionSteps.length - 1 && step.selectedOptionIndex >= 0 && step.feedbackAfterSelection && (
                  <div className="elterngeld-step-flow__transition" role="status">
                    <p className="elterngeld-step-flow__feedback">{step.feedbackAfterSelection}</p>
                    {step.nextStepHint && (
                      <p className="elterngeld-step-flow__next-hint">{step.nextStepHint}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
          <div className="elterngeld-calculation__optimization-actions next-steps__stack">
            <div className="elterngeld-calculation__optimization-actions-secondary">
              {onBackToGoalSelection && (
                <Button type="button" variant="secondary" className="btn--softpill" onClick={onBackToGoalSelection}>
                  Zurück zur Zielauswahl
                </Button>
              )}
              {onDiscardOptimization && !hideDiscardButton && (
                <Button type="button" variant="secondary" className="btn--softpill" onClick={onDiscardOptimization}>
                  Aktuellen Plan beibehalten
                </Button>
              )}
              {onNavigateToMonthEditing && (
                <Button type="button" variant="secondary" className="btn--softpill" onClick={onNavigateToMonthEditing}>
                  Zur Monatsübersicht (zeigt aktuellen Plan)
                </Button>
              )}
              {onBackToOptimization && (
                <Button type="button" variant="secondary" className="btn--softpill" onClick={onBackToOptimization}>
                  Planvorschläge schließen
                </Button>
              )}
            </div>
          </div>
        </div>
        )}
      </Card>
    </>
  );
}

function OptimizationComparisonBlock({
  optimizationResultSet,
  selectedOptionIndex,
  onSelectOption,
  formatCurrency,
  formatCurrencySigned,
  countBezugMonths,
  hasPartnerBonus,
  onAdoptOptimization,
  onDiscardOptimization,
  onBackToOptimization,
  originalPlanForOptimization,
  originalResultForOptimization,
  lastAdoptedPlan,
  lastAdoptedResult,
  onNavigateToPartTimeSettings,
  elterngeldApplicationForAdoption = null,
  adoptUserPlan = null,
}: OptimizationComparisonBlockProps) {
  const hidePartnerschaftsbonusUi = elterngeldApplicationForAdoption?.applicantMode === 'single_parent';
  const [showAdoptConfirm, setShowAdoptConfirm] = useState(false);
  const { goal, status, currentResult, suggestions } = optimizationResultSet;
  const comparisonAdoptUserPlan = adoptUserPlan ?? optimizationResultSet.currentPlan;

  const decisionContext = useMemo(() => {
    const opts =
      originalPlanForOptimization && originalResultForOptimization
        ? {
            originalPlan: originalPlanForOptimization,
            originalResult: originalResultForOptimization,
            lastAdoptedPlan: lastAdoptedPlan ?? null,
            lastAdoptedResult: lastAdoptedResult ?? null,
          }
        : undefined;
    return buildDecisionContext(optimizationResultSet, selectedOptionIndex, opts);
  }, [optimizationResultSet, selectedOptionIndex, originalPlanForOptimization, originalResultForOptimization, lastAdoptedPlan, lastAdoptedResult]);

  const { decisionQuestion, options, baselineLabel, baselineExplanation } = decisionContext;
  const clampedIndex = Math.max(0, Math.min(selectedOptionIndex, options.length - 1));
  const selectedOption = options[clampedIndex];
  const hasAlternatives = options.length > 1;
  const isCurrentSelected = selectedOption?.strategyType === 'current';
  const showAdoptPrimary = !isCurrentSelected && selectedOption && onAdoptOptimization;
  const comparisonPbAdopt = selectedOption
    ? getOptimizationAdoptUiState(selectedOption.plan, {
        userPlan: comparisonAdoptUserPlan,
        application: elterngeldApplicationForAdoption,
      })
    : { allowed: true, hint: null as string | null };

  const isAlreadyOptimal = options.length <= 1 || (status !== 'improved' && status !== 'checked_but_not_better');

  return (
    <>
      <AdoptConfirmDialog
        isOpen={showAdoptConfirm}
        onClose={() => setShowAdoptConfirm(false)}
        onConfirm={() => {
          if (!selectedOption || selectedOption.strategyType === 'current') return;
          if (
            !getOptimizationAdoptUiState(selectedOption.plan, {
              userPlan: comparisonAdoptUserPlan,
              application: elterngeldApplicationForAdoption,
            }).allowed
          )
            return;
          onAdoptOptimization?.(selectedOption.plan, optimizationGoalToAdoptable(goal), selectedOption.result);
        }}
        currentResult={currentResult}
        optimizedResult={selectedOption?.result ?? currentResult}
        formatCurrency={formatCurrency}
        formatCurrencySigned={formatCurrencySigned}
        deltaTotal={selectedOption?.impact.financialDelta ?? 0}
        deltaDuration={selectedOption?.impact.durationDelta ?? 0}
      />
      <Card className="still-daily-checklist__card elterngeld-calculation__optimization-block elterngeld-calculation__optimization-block--comparison">
        {isAlreadyOptimal ? (
          <>
            <h3 className="elterngeld-step__title">Dein aktueller Plan passt gut zu deinem Ziel.</h3>
            {onBackToOptimization && (
              <Button
                type="button"
                variant="secondary"
                className="btn--softpill"
                onClick={onBackToOptimization}
              >
                Planvorschläge schließen
              </Button>
            )}
          </>
        ) : (
          <>
            <p className="elterngeld-calculation__data-basis-hint">
              Die Planvorschläge basieren auf deinen erfassten Einkommensangaben. Grenzen und Obergrenzen hängen davon ab.
            </p>
            <p className="elterngeld-calculation__adoption-hint">
              Vergleich zum aktuellen Plan. Änderungen gelten erst nach Übernahme – dein Plan bleibt unverändert.
            </p>
            <h3 className="elterngeld-step__title elterngeld-calculation__decision-question">{decisionQuestion}</h3>
            <p className="elterngeld-calculation__decision-reason">
              Klicke auf eine Option zum Vergleichen (Auswahl ist noch keine Übernahme).
            </p>
            <p className="elterngeld-calculation__baseline-hint">
              Vergleich zu: <strong>{baselineLabel}</strong>
            </p>
            <p className="elterngeld-calculation__baseline-explanation">{baselineExplanation}</p>

            {hasAlternatives && options.length > 1 && options.every((o) => o.result.householdTotal === options[0].result.householdTotal) && (
              <p className="elterngeld-calculation__gleichstand-hint">
                Diese Varianten führen zur gleichen Gesamtauszahlung – sie unterscheiden sich in der Aufteilung.
              </p>
            )}

            {hasAlternatives && (() => {
              const recommendedOptions = options.filter((o) => o.recommended);
              const otherOptions = options.filter((o) => !o.recommended);
              return (
                <div className="elterngeld-calculation__suggestion-list" role="list">
                  {recommendedOptions.length > 0 && (
                    <div className="elterngeld-calculation__suggestion-section" role="group" aria-labelledby="elterngeld-empfohlen-heading">
                      <h4 id="elterngeld-empfohlen-heading" className="elterngeld-calculation__suggestion-section-title">
                        Empfohlene Variante
                      </h4>
                      {recommendedOptions.map((opt, idx) => {
                        const globalIdx = options.indexOf(opt);
                        return (
                          <OptionCard
                            key={opt.id}
                            opt={opt}
                            idx={globalIdx}
                            clampedIndex={clampedIndex}
                            currentResult={currentResult}
                            formatCurrency={formatCurrency}
                            formatCurrencySigned={formatCurrencySigned}
                            onSelectOption={onSelectOption}
                            onNavigateToPartTimeSettings={onNavigateToPartTimeSettings}
                            adoptUserPlan={comparisonAdoptUserPlan}
                            adoptApplication={elterngeldApplicationForAdoption}
                            hidePartnerschaftsbonusUi={hidePartnerschaftsbonusUi}
                          />
                        );
                      })}
                    </div>
                  )}
                  {otherOptions.length > 0 && (
                    <div className="elterngeld-calculation__suggestion-section" role="group" aria-labelledby="elterngeld-alternativen-heading">
                      <h4 id="elterngeld-alternativen-heading" className="elterngeld-calculation__suggestion-section-title">
                        {recommendedOptions.length > 0 ? 'Andere Optionen' : 'Optionen'}
                      </h4>
                      {otherOptions.map((opt, idx) => {
                        const globalIdx = options.indexOf(opt);
                        return (
                          <OptionCard
                            key={opt.id}
                            opt={opt}
                            idx={globalIdx}
                            clampedIndex={clampedIndex}
                            currentResult={currentResult}
                            formatCurrency={formatCurrency}
                            formatCurrencySigned={formatCurrencySigned}
                            onSelectOption={onSelectOption}
                            onNavigateToPartTimeSettings={onNavigateToPartTimeSettings}
                            adoptUserPlan={comparisonAdoptUserPlan}
                            adoptApplication={elterngeldApplicationForAdoption}
                            hidePartnerschaftsbonusUi={hidePartnerschaftsbonusUi}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="elterngeld-calculation__optimization-actions next-steps__stack">
              {showAdoptPrimary && (
                <>
                  <Button
                    type="button"
                    variant="primary"
                    className="btn--softpill elterngeld-calculation__optimization-action-primary"
                    disabled={!comparisonPbAdopt.allowed}
                    onClick={() => {
                      if (!comparisonPbAdopt.allowed) return;
                      setShowAdoptConfirm(true);
                    }}
                  >
                    Diese Variante übernehmen
                  </Button>
                  {!comparisonPbAdopt.allowed && comparisonPbAdopt.hint && (
                    <p className="elterngeld-step__notice elterngeld-step__notice--tip elterngeld-calculation__optimization-adopt-block-hint" role="status">
                      {comparisonPbAdopt.hint}
                    </p>
                  )}
                </>
              )}
              <div className="elterngeld-calculation__optimization-actions-secondary">
                {onDiscardOptimization && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="btn--softpill"
                    onClick={onDiscardOptimization}
                  >
                    Aktuellen Plan beibehalten
                  </Button>
                )}
                {onBackToOptimization && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="btn--softpill"
                    onClick={onBackToOptimization}
                  >
                    Planvorschläge schließen
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </Card>
    </>
  );
}

export function OptionCard({
  opt,
  idx,
  clampedIndex,
  currentResult,
  formatCurrency,
  formatCurrencySigned,
  onSelectOption,
  onAdoptOption,
  onNavigateToPartTimeSettings,
  adoptUserPlan,
  adoptApplication = null,
  hidePartnerschaftsbonusUi = false,
}: {
  opt: DecisionOption;
  idx: number;
  clampedIndex: number;
  currentResult: CalculationResult;
  formatCurrency: (n: number) => string;
  formatCurrencySigned: (n: number) => string;
  onSelectOption: (idx: number) => void;
  onAdoptOption?: (opt: DecisionOption) => void;
  onNavigateToPartTimeSettings?: () => void;
  adoptUserPlan: ElterngeldCalculationPlan;
  adoptApplication?: ElterngeldApplication | null;
  hidePartnerschaftsbonusUi?: boolean;
}) {
  const durationDelta = opt.impact.durationDelta;
  const impactLines = getOptionImpactLines(opt, formatCurrency, formatCurrencySigned, {
    omitBonusDelta: hidePartnerschaftsbonusUi,
  });
  const planChangeLines =
    opt.strategyType === 'current'
      ? []
      : getResultChangePreviewUserFriendly(currentResult, opt.result, 20);
  const isSelected = idx === clampedIndex;
  const hasStructuralOnly = impactLines.length === 0 && planChangeLines.length > 0;
  const isCurrent = opt.strategyType === 'current';
  const pbAdopt = getOptimizationAdoptUiState(opt.plan, {
    userPlan: adoptUserPlan,
    application: adoptApplication ?? null,
  });
  const cardClassName = `elterngeld-calculation__suggestion-card ${isSelected ? 'elterngeld-calculation__suggestion-card--selected' : ''} ${hasStructuralOnly ? 'elterngeld-calculation__suggestion-card--structural-primary' : ''}`;

  const handleSelectOnly = () => {
    onSelectOption(idx);
  };

  const cardContent = (
    <>
      {opt.strategyType === 'partnerBonus' && !hidePartnerschaftsbonusUi && (
        <span
          className="elterngeld-calculation__suggestion-card-badge elterngeld-calculation__suggestion-card-badge--inline"
        >
          👥 Nur mit Partner möglich
        </span>
      )}
      <span className="elterngeld-calculation__suggestion-title">{opt.label}</span>
      {(impactLines.length > 0 || hasStructuralOnly) && (
        <span className="elterngeld-calculation__suggestion-delta">
          {hasStructuralOnly && (
            <span className="elterngeld-calculation__suggestion-delta-line elterngeld-calculation__suggestion-delta-line--structural">
              Betrag und Dauer gleich · geänderte Monate/Verteilung
            </span>
          )}
          {impactLines.map((line, i) => {
            const isPositive = /^\+/.test(line) && !line.includes('−') && !/^-\d/.test(line);
            const isNegative = line.includes('−') || /^-\d/.test(line);
            const lineClass = isPositive
              ? 'elterngeld-calculation__suggestion-delta-line elterngeld-calculation__suggestion-delta-line--positive'
              : isNegative
                ? 'elterngeld-calculation__suggestion-delta-line elterngeld-calculation__suggestion-delta-line--negative'
                : 'elterngeld-calculation__suggestion-delta-line';
            return (
              <span key={i} className={lineClass}>
                {line}
              </span>
            );
          })}
          {durationDelta > 0 && planHasPlusOrPartnerBonus(opt.plan) && (
            <span className="elterngeld-calculation__suggestion-delta-line elterngeld-calculation__suggestion-delta-line--note">
              basierend auf ElterngeldPlus
            </span>
          )}
          {opt.strategyType === 'partnerBonus' && !hidePartnerschaftsbonusUi && (
            <span className="elterngeld-calculation__suggestion-delta-line elterngeld-calculation__suggestion-delta-line--note">
              Voraussetzung: Partner bezieht gleichzeitig Elterngeld
            </span>
          )}
        </span>
      )}
      {opt.strategyType === 'partnerBonus' && !hidePartnerschaftsbonusUi && impactLines.length === 0 && !hasStructuralOnly && (
        <span className="elterngeld-calculation__suggestion-delta-line elterngeld-calculation__suggestion-delta-line--note">
          Voraussetzung: Partner bezieht gleichzeitig Elterngeld
        </span>
      )}
      {planChangeLines.length > 0 && (
        <div className={`elterngeld-calculation__suggestion-plan-changes ${hasStructuralOnly ? 'elterngeld-calculation__suggestion-plan-changes--primary' : ''}`}>
          <span className={`elterngeld-calculation__suggestion-plan-changes-title ${hasStructuralOnly ? 'elterngeld-calculation__suggestion-delta-line--positive' : ''}`}>
            Das würde sich ändern
          </span>
          {planChangeLines.map((line, i) => (
            <span
              key={i}
              className={`elterngeld-calculation__suggestion-plan-changes-line ${hasStructuralOnly ? 'elterngeld-calculation__suggestion-delta-line--positive' : ''}`}
              title={line}
            >
              {line}
            </span>
          ))}
        </div>
      )}
      <span className="elterngeld-calculation__suggestion-description">{opt.description}</span>
      {opt.strategyType === 'withPartTime' && onNavigateToPartTimeSettings && (
        <Button
          type="button"
          variant="secondary"
          className="btn--softpill elterngeld-calculation__part-time-hours-cta next-steps__button"
          onClick={(e) => {
            e.stopPropagation();
            onNavigateToPartTimeSettings();
          }}
        >
          Teilzeitstunden anpassen
        </Button>
      )}
      {isSelected && opt.strategyType !== 'current' && (() => {
        const full = opt.impact.fullSummary;
        const optBreakdown = getOptimizationBreakdown(currentResult, opt.result);
        const calcBreakdown = getCalculationBreakdown(opt.result);
        if (!full && optBreakdown.length === 0 && calcBreakdown.length === 0) return null;
        return (
          <div className="elterngeld-calculation__suggestion-beleg elterngeld-calculation__change-summary">
            {full && (
              <>
                {full.whatChanged.length > 0 && (
                  <div className="elterngeld-calculation__beleg-section">
                    <span className="elterngeld-calculation__beleg-title">Was wird geändert</span>
                    <ul className="elterngeld-calculation__beleg-list">
                      {full.whatChanged.map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {full.advantage && (
                  <div className="elterngeld-calculation__change-summary-advantage">
                    <span className="elterngeld-calculation__beleg-title">Vorteil</span>
                    <p>{full.advantage}</p>
                  </div>
                )}
                {full.tradeoff && (
                  <div className="elterngeld-calculation__change-summary-tradeoff">
                    <span className="elterngeld-calculation__beleg-title">Trade-off</span>
                    <p>{full.tradeoff}</p>
                  </div>
                )}
                {full.alternatives.length > 0 && (
                  <div className="elterngeld-calculation__beleg-section">
                    <span className="elterngeld-calculation__beleg-title">Alternativen</span>
                    <p className="elterngeld-calculation__alternatives-text">
                      Du kannst stattdessen wählen: {full.alternatives.join(', ')}
                    </p>
                  </div>
                )}
              </>
            )}
            {!full && optBreakdown.length > 0 && (
              <div className="elterngeld-calculation__beleg-section">
                <span className="elterngeld-calculation__beleg-title">Was wurde geändert</span>
                <ul className="elterngeld-calculation__beleg-list">
                  {optBreakdown.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            )}
            {calcBreakdown.length > 0 && (
              <div className="elterngeld-calculation__beleg-section">
                <span className="elterngeld-calculation__beleg-title">So wird geschätzt</span>
                <ul className="elterngeld-calculation__beleg-list">
                  {calcBreakdown.map((line, i) => (
                    <li key={i}>{line.value ? `${line.label} ${line.value}` : line.label}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })()}
      <span className="elterngeld-calculation__suggestion-meta">
        {formatCurrency(opt.result.householdTotal)} · {countBezugMonthsCore(opt.result)} Monate
        {opt.strategyType !== 'current' && hasPartnerBonus(opt.result) && !hidePartnerschaftsbonusUi && (
          <> · Partnerschaftsbonus</>
        )}
        {opt.matchesUserPriority && <> · Dein Ziel</>}
        {opt.recommended && !opt.matchesUserPriority && <> · empfohlen</>}
        {opt.scenarioLabel && !opt.matchesUserPriority && !opt.recommended && <> · {opt.scenarioLabel}</>}
      </span>
      {!isCurrent && onAdoptOption && (
        <>
          <Button
            type="button"
            variant="primary"
            className="elterngeld-calculation__suggestion-adopt-btn btn--softpill"
            disabled={!pbAdopt.allowed}
            onClick={(e) => {
              e.stopPropagation();
              if (!pbAdopt.allowed) return;
              onAdoptOption(opt);
            }}
          >
            Diese Variante übernehmen
          </Button>
          {!pbAdopt.allowed && pbAdopt.hint && (
            <span
              className="elterngeld-step__notice elterngeld-step__notice--tip elterngeld-calculation__suggestion-adopt-hint"
              role="status"
            >
              {pbAdopt.hint}
            </span>
          )}
        </>
      )}
    </>
  );

  if (isCurrent) {
    return (
      <div key={opt.id} role="listitem" className={cardClassName}>
        {cardContent}
      </div>
    );
  }

  return (
    <div
      key={opt.id}
      role="listitem"
      tabIndex={0}
      aria-pressed={isSelected}
      className={cardClassName}
      onClick={handleSelectOnly}
      onKeyDown={(e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        if ((e.target as HTMLElement).closest('button')) return;
        e.preventDefault();
        handleSelectOnly();
      }}
    >
      {cardContent}
    </div>
  );
}

function MonthlyBreakdownRow({ r }: { r: MonthlyResult }) {
  const b = r.breakdown;
  if (!b || r.mode === 'none') return null;

  return (
    <div className="elterngeld-calculation__breakdown-month" role="group" aria-labelledby={`breakdown-month-${r.month}`}>
      <h4 id={`breakdown-month-${r.month}`} className="elterngeld-calculation__breakdown-month-title">
        Lebensmonat {r.month} – {MODE_LABELS_LONG[r.mode] ?? r.mode}
        {b.hasMaternityBenefit && (
          <span className="elterngeld-calculation__maternity-badge">Mutterschutz / Mutterschaftsleistungen</span>
        )}
      </h4>
      <dl className="elterngeld-calculation__breakdown-dl">
        <div className="elterngeld-calculation__breakdown-row">
          <dt>Ausgangseinkommen vor der Geburt</dt>
          <dd>{formatCurrency(b.incomeBeforeNet)}</dd>
        </div>
        <div className="elterngeld-calculation__breakdown-row">
          <dt>Geplantes Einkommen in diesem Monat</dt>
          <dd>{formatCurrency(b.incomeDuringNet)}</dd>
        </div>
        <div className="elterngeld-calculation__breakdown-row">
          <dt>Geschätzter Einkommenswegfall</dt>
          <dd>{formatCurrency(b.loss)}</dd>
        </div>
        <div className="elterngeld-calculation__breakdown-row">
          <dt>Verwendete Ersatzrate</dt>
          <dd>{b.replacementRatePercent} %</dd>
        </div>
        {b.theoreticalBaseClamp != null && b.maxPlus != null && (
          <>
            <div className="elterngeld-calculation__breakdown-row">
              <dt>Theoretisches Basis (ohne Einkommen)</dt>
              <dd>{formatCurrency(b.theoreticalBaseClamp)}</dd>
            </div>
            <div className="elterngeld-calculation__breakdown-row">
              <dt>Max. ElterngeldPlus (Hälfte davon)</dt>
              <dd>{formatCurrency(b.maxPlus)}</dd>
            </div>
          </>
        )}
        {b.appliedMin != null && (
          <div className="elterngeld-calculation__breakdown-row">
            <dt>Mindestbetrag angewendet</dt>
            <dd>{formatCurrency(b.appliedMin)}</dd>
          </div>
        )}
        {b.appliedMax != null && (
          <div className="elterngeld-calculation__breakdown-row">
            <dt>Höchstbetrag angewendet</dt>
            <dd>{formatCurrency(b.appliedMax)}</dd>
          </div>
        )}
        {b.siblingBonus != null && b.siblingBonus > 0 && (
          <div className="elterngeld-calculation__breakdown-row">
            <dt>Geschwisterbonus</dt>
            <dd>+{formatCurrency(b.siblingBonus)}</dd>
          </div>
        )}
        {b.additionalChildrenAmount != null && b.additionalChildrenAmount > 0 && (
          <div className="elterngeld-calculation__breakdown-row">
            <dt>Mehrlingszuschlag</dt>
            <dd>+{formatCurrency(b.additionalChildrenAmount)}</dd>
          </div>
        )}
        {b.hasMaternityBenefit && (
          <div className="elterngeld-calculation__breakdown-row elterngeld-calculation__breakdown-row--maternity">
            <dt>Hinweis</dt>
            <dd>Für diesen Lebensmonat werden Mutterschaftsleistungen vereinfacht berücksichtigt. Die tatsächliche Anrechnung kann abweichen.</dd>
          </div>
        )}
        <div className="elterngeld-calculation__breakdown-row elterngeld-calculation__breakdown-row--total">
          <dt>Voraussichtlicher Monatsbetrag</dt>
          <dd><strong>{formatCurrency(r.amount)}</strong></dd>
        </div>
      </dl>
    </div>
  );
}

export type NavigateToInputTarget =
  | { focusMonth: number; changedMonth?: number }
  | { focusSection: 'grunddaten' | 'einkommen' | 'monatsplan' };

type Props = {
  result: CalculationResult;
  plan?: ElterngeldCalculationPlan | null;
  planB?: ElterngeldCalculationPlan | null;
  optimizationGoal?: OptimizationGoal;
  optimizationStatus?: 'idle' | 'proposed' | 'adopted';
  originalPlanForOptimization?: ElterngeldCalculationPlan | null;
  originalResultForOptimization?: CalculationResult | null;
  lastAdoptedPlan?: ElterngeldCalculationPlan | null;
  lastAdoptedResult?: CalculationResult | null;
  onAdoptOptimization?: (
    plan: ElterngeldCalculationPlan,
    adoptedGoal?: OptimizationAdoptableGoal,
    adoptedResult?: CalculationResult
  ) => void;
  onDiscardOptimization?: () => void;
  onShowCompareOriginal?: () => void;
  onCreatePdf?: () => void;
  isSubmitting?: boolean;
  /** Zurück zur Eingabe (wird an Step-Flow übergeben) */
  onBackFromOptimization?: () => void;
  /** Springt zur Eingabe und fokussiert Monat/ Bereich */
  onNavigateToInput?: (target: NavigateToInputTarget) => void;
  /** Schließt Optimierung und führt sichtbar in die Monatsaufteilungs-Bearbeitung (wird aus onNavigateToInput abgeleitet) */
  onNavigateToMonthEditing?: () => void;
  /** Optional: Sprung zur Leistungswahl Basis/Plus (z. B. Wizard) */
  onNavigateToLeistungSettings?: () => void;
  /** Wizard/Overlay: z. B. Teilzeit-Dialog statt nur Sprung zum Monatsplan */
  onNavigateToPartTimeSettings?: () => void;
  /** false: keine PB-Optimierungs-/Teilzeit-„Mit Bonus“-Variante (24–32 h) */
  partnerBonusHoursEligible?: boolean;
  /** Nach Änderung der Wochenstunden im Overlay (Hinweis bei unveränderten Varianten-Kennzahlen) */
  partTimeEditGeneration?: number;
  /** Wendet Schnellaktion für Partnerschaftsbonus an (nur Ergebnis-Ansicht) */
  onApplyPartnerBonusFix?: (month: number, fix: 'switchToPlus' | 'setBoth' | 'setBonusMonth') => void;
  /** Setzt mehrere Monate als Bonusmonate (ElterngeldPlus + Beide) */
  onApplyPartnerBonusFixMultiple?: (months: number[]) => void;
  /** Ersetzt den Plan durch gemeinsame Monate für Partnerschaftsbonus */
  onApplyCreatePartnerOverlap?: (suggestedPlan: ElterngeldCalculationPlan) => void;
  /** Vorbereitung zur Prüfung „explizit eingetragene Teilzeit“ bei Übernahme (Rechner: nur wenn Vorbereitung gespeichert). */
  elterngeldApplicationForAdoption?: ElterngeldApplication | null;
};

export const StepCalculationResult: React.FC<Props> = ({
  result,
  plan,
  planB,
  optimizationGoal,
  optimizationStatus = 'idle',
  originalPlanForOptimization,
  originalResultForOptimization,
  lastAdoptedPlan,
  lastAdoptedResult,
  onAdoptOptimization,
  onDiscardOptimization,
  onShowCompareOriginal,
  onCreatePdf,
  isSubmitting = false,
  onBackFromOptimization,
  onNavigateToInput,
  onNavigateToMonthEditing,
  onNavigateToLeistungSettings,
  onNavigateToPartTimeSettings,
  partnerBonusHoursEligible = true,
  partTimeEditGeneration = 0,
  onApplyPartnerBonusFix,
  onApplyPartnerBonusFixMultiple,
  onApplyCreatePartnerOverlap,
  elterngeldApplicationForAdoption = null,
}) => {
  const { parents, householdTotal, validation, meta } = result;
  const hidePartnerschaftsbonusUi = elterngeldApplicationForAdoption?.applicantMode === 'single_parent';

  const partnerBonusWarningMessages = useMemo(
    () =>
      hidePartnerschaftsbonusUi
        ? []
        : validation.warnings.filter(isPartnerschaftsbonusWarningMessage),
    [validation.warnings, hidePartnerschaftsbonusUi]
  );
  const nonPartnerBonusWarnings = useMemo(
    () => validation.warnings.filter((w) => !isPartnerschaftsbonusWarningMessage(w)),
    [validation.warnings]
  );

  const optimizationResultSet = useMemo((): OptimizationResultSet | null => {
    if (!plan || !optimizationGoal || validation.errors.length > 0) return null;
    const outcome = buildOptimizationResult(plan, result, optimizationGoal, {
      adoptedBaselineGoals: parseOptimizationAdoptedBaselineMap(
        elterngeldApplicationForAdoption?.benefitPlan.optimizationAdoptedBaselineGoals
      ),
    });
    if ('status' in outcome && outcome.status === 'unsupported') return null;
    return outcome as OptimizationResultSet;
  }, [
    plan,
    result,
    optimizationGoal,
    validation.errors.length,
    elterngeldApplicationForAdoption?.benefitPlan.optimizationAdoptedBaselineGoals,
  ]);

  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0);
  const [showPartnerBonusCheck, setShowPartnerBonusCheck] = useState(false);
  const [displayResultForMonths, setDisplayResultForMonths] = useState<CalculationResult | null>(null);

  useEffect(() => {
    if (!optimizationResultSet) return;
    const ctx = buildDecisionContext(optimizationResultSet, 0);
    setSelectedOptionIndex(ctx.options.length > 1 ? 1 : 0);
  }, [optimizationResultSet?.suggestions?.length, optimizationResultSet?.goal]);

  const buildDecisionContextOpts =
    originalPlanForOptimization && originalResultForOptimization
      ? {
          originalPlan: originalPlanForOptimization,
          originalResult: originalResultForOptimization,
          lastAdoptedPlan: lastAdoptedPlan ?? null,
          lastAdoptedResult: lastAdoptedResult ?? null,
        }
      : undefined;

  const decisionContextForAdopted = optimizationResultSet
    ? buildDecisionContext(optimizationResultSet, selectedOptionIndex, buildDecisionContextOpts)
    : null;
  const selectedOption = decisionContextForAdopted?.options[selectedOptionIndex];

  const adoptionStatus = useMemo(
    () =>
      plan
        ? getAdoptionStatus(plan, result, {
            planB: planB ?? null,
            lastAdoptedPlan: lastAdoptedPlan ?? null,
            lastAdoptedResult: lastAdoptedResult ?? null,
            originalPlanForOptimization: originalPlanForOptimization ?? null,
            optimizationStatus,
            optimizationGoal,
          })
        : { kind: 'idle' as const, message: '', displayCategory: null } as import('./adoptionStatus').AdoptionStatus,
    [
      plan,
      result,
      planB,
      lastAdoptedPlan,
      lastAdoptedResult,
      originalPlanForOptimization,
      optimizationStatus,
      optimizationGoal,
    ]
  );

  const isOptimizationAdopted = adoptionStatus.kind === 'adopted_active';

  useEffect(() => {
    if (!optimizationGoal || isOptimizationAdopted) setDisplayResultForMonths(null);
  }, [optimizationGoal, isOptimizationAdopted]);

  /** Nach Übernahme: immer den übernommenen Plan anzeigen. */
  const resultForMonths =
    isOptimizationAdopted && lastAdoptedResult
      ? lastAdoptedResult
      : optimizationGoal && !isOptimizationAdopted && displayResultForMonths
        ? displayResultForMonths
        : result;
  const parentsForMonths = resultForMonths.parents;

  return (
    <div className="elterngeld-calculation-result">
      <div className="elterngeld-calculation__disclaimer">
        <p className="elterngeld-calculation__disclaimer-text">
          <strong>Orientierung für deine Planung</strong>
        </p>
        <p className="elterngeld-calculation__disclaimer-text">
          Diese Planung hilft dir bei der Orientierung und ersetzt keine offizielle Prüfung. Wichtige Grenzen und typische Konflikte werden geprüft. Einige Regeln werden vereinfacht dargestellt, zum Beispiel bei Mutterschaftsleistungen. Die endgültige Entscheidung trifft die Elterngeldstelle.
        </p>
      </div>

      {validation.errors.length > 0 && (
        <div className="elterngeld-calculation__validation elterngeld-calculation__validation--error">
          {validation.errors.map((e, i) => {
            const action = getErrorAction(e);
            return (
              <div key={i} className="elterngeld-calculation__validation-item">
                <p>{e}</p>
                {action.action && onNavigateToInput && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="elterngeld-calculation__validation-action elterngeld-calculation__validation-action--small"
                    onClick={() =>
                      onNavigateToInput(
                        action.action === 'focusGrunddaten'
                          ? { focusSection: 'grunddaten' }
                          : { focusSection: 'einkommen' }
                      )
                    }
                  >
                    {action.label}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!hidePartnerschaftsbonusUi && partnerBonusWarningMessages.length > 0 && (
        <Card className="still-daily-checklist__card elterngeld-calculation__partner-bonus-issue-card elterngeld-step__notice elterngeld-step__notice--warning">
          <h3 className="elterngeld-step__title">{PARTNERSCHAFTSBONUS_KARTE_TITEL}</h3>
          <p className="elterngeld-calculation__partner-bonus-issue-detail">{partnerBonusWarningMessages[0]}</p>
          {partnerBonusWarningMessages.length > 1 && (
            <ul className="elterngeld-calculation__partner-bonus-issue-list">
              {partnerBonusWarningMessages.slice(1).map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          )}
          <p className="elterngeld-calculation__partner-bonus-issue-hint">
            {getPartnerschaftsbonusHandlungshinweis(partnerBonusWarningMessages[0])}
          </p>
          <Button
            type="button"
            variant="primary"
            className="btn--softpill elterngeld-calculation__partner-bonus-issue-cta"
            onClick={() => setShowPartnerBonusCheck(true)}
          >
            {PARTNERSCHAFTSBONUS_OVERLAY_AKTION}
          </Button>
        </Card>
      )}

      {nonPartnerBonusWarnings.length > 0 && (
        <div className="elterngeld-calculation__validation elterngeld-calculation__validation--warning">
          {nonPartnerBonusWarnings.map((w, i) => {
            const action = getHintAction(w, result);
            return (
              <div key={i} className="elterngeld-calculation__validation-item">
                <p>{w}</p>
                {action.action && action.action !== 'openOptimization' && action.action !== 'openPartnerBonusCheck' && onNavigateToInput && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="elterngeld-calculation__validation-action elterngeld-calculation__validation-action--small"
                    onClick={() => {
                      if (action.action === 'focusMonth' && action.month != null) {
                        onNavigateToInput({ focusMonth: action.month });
                      } else if (action.action === 'focusEinkommen') {
                        onNavigateToInput({ focusSection: 'einkommen' });
                      } else if (action.action === 'focusGrunddaten') {
                        onNavigateToInput({ focusSection: 'grunddaten' });
                      } else if (action.action === 'focusMonatsplan') {
                        onNavigateToInput({ focusSection: 'monatsplan' });
                      }
                    }}
                  >
                    {action.label}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <PlanStabilityBlock
        result={result}
        className="elterngeld-calculation__plan-stability"
        hidePartnerschaftsbonusUi={hidePartnerschaftsbonusUi}
      />

      {!hidePartnerschaftsbonusUi && partnerBonusWarningMessages.length === 0 && (
        <div className="elterngeld-calculation__partner-bonus-block">
          {parents.some((p) => p.monthlyResults.some((m) => m.mode === 'partnerBonus')) && (
            <p className="elterngeld-calculation__partner-bonus-hint">
              Der Partnerschaftsbonus kann zusätzliche Monate ermöglichen, ist aber kein pauschaler
              Zuschlag. Die finanzielle Wirkung hängt von deiner konkreten Verteilung ab.
            </p>
          )}
          <Button
            type="button"
            variant="secondary"
            className="btn--softpill elterngeld-step__partner-bonus-check-btn"
            onClick={() => setShowPartnerBonusCheck(true)}
          >
            {PARTNERSCHAFTSBONUS_OVERLAY_AKTION}
          </Button>
        </div>
      )}

      {/* Optimierungsblock: Vergleichsanzeige nur bei unterstützten Zielen, nicht bei Validierungsfehlern */}
      {optimizationGoal &&
        validation.errors.length === 0 &&
        optimizationResultSet &&
        !UNSUPPORTED_GOALS.includes(optimizationGoal) && (
          <>
            {isOptimizationAdopted ? (
              <Card className="still-daily-checklist__card elterngeld-calculation__optimization-block elterngeld-calculation__optimization-block--adopted elterngeld-calculation__adoption-block--compact">
                <p className="elterngeld-calculation__adopted-banner">
                  Vorschlag übernommen
                </p>
                {onShowCompareOriginal && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="btn--softpill elterngeld-calculation__compare-original-btn"
                    onClick={onShowCompareOriginal}
                  >
                    Ursprünglichen Plan vergleichen
                  </Button>
                )}
              </Card>
            ) : (
              <>
                {(adoptionStatus.displayCategory === 'geändert' ||
                  adoptionStatus.displayCategory === 'nicht mehr aktuell' ||
                  adoptionStatus.kind === 'original_active') && (
                  <Card className="still-daily-checklist__card elterngeld-calculation__optimization-status-hint elterngeld-calculation__status-hint--subdued">
                    <p className="elterngeld-calculation__status-message">{adoptionStatus.message}</p>
                    {adoptionStatus.hint && (
                      <p className="elterngeld-calculation__status-hint">{adoptionStatus.hint}</p>
                    )}
                  </Card>
                )}
                <StepOptimizationBlock
                  plan={plan}
                  result={result}
                  formatCurrency={formatCurrency}
                  formatCurrencySigned={formatCurrencySigned}
                  countBezugMonths={countBezugMonthsCore}
                  hasPartnerBonus={hasPartnerBonus}
                  onAdoptOptimization={onAdoptOptimization}
                  onDiscardOptimization={onDiscardOptimization}
                  onBackToOptimization={onBackFromOptimization}
                  onNavigateToMonthEditing={onNavigateToMonthEditing ?? (onNavigateToInput ? () => onNavigateToInput({ focusSection: 'monatsplan' }) : undefined)}
                  onNavigateToLeistungSettings={onNavigateToLeistungSettings}
                  onNavigateToPartTimeSettings={
                    onNavigateToPartTimeSettings ??
                    (onNavigateToInput ? () => onNavigateToInput({ focusSection: 'monatsplan' }) : undefined)
                  }
                  originalPlanForOptimization={originalPlanForOptimization}
                  originalResultForOptimization={originalResultForOptimization}
                  lastAdoptedPlan={lastAdoptedPlan}
                  lastAdoptedResult={lastAdoptedResult}
                  onResolvedResultChange={setDisplayResultForMonths}
                  optimizationGoal={optimizationGoal}
                  partnerBonusHoursEligible={partnerBonusHoursEligible}
                  partTimeEditGeneration={partTimeEditGeneration}
                  elterngeldApplicationForAdoption={elterngeldApplicationForAdoption}
                  hidePartnerschaftsbonusUi={hidePartnerschaftsbonusUi}
                />
              </>
            )}
          </>
        )}

      {isOptimizationAdopted && (
        <Card className="still-daily-checklist__card elterngeld-calculation__household-card elterngeld-calculation__household-card--active">
          <h3 className="elterngeld-step__title">Aktueller Plan</h3>
          <p className="elterngeld-calculation__result-basis">
            Diese Variante ist aktuell aktiv. Der ursprüngliche Plan ist als Vergleichsvariante gespeichert.
          </p>
          <p className="elterngeld-calculation__household-total">
            {formatCurrency(householdTotal)}
          </p>
          {(() => {
            const breakdown = getCalculationBreakdown(result);
            if (breakdown.length === 0) return null;
            return (
              <div className="elterngeld-calculation__beleg elterngeld-plan-phases">
                <h4 className="elterngeld-plan-phases__title">So wird geschätzt:</h4>
                <ul className="elterngeld-plan-phases__list">
                  {breakdown.map((line, i) => (
                    <li key={i} className="elterngeld-plan-phases__item">
                      {line.value ? (
                        <>
                          <span className="elterngeld-plan-phases__label">{line.label}</span>
                          <span className="elterngeld-plan-phases__range">{line.value}</span>
                        </>
                      ) : (
                        line.label
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}
          <div className="elterngeld-calculation__transparency-hint">
            {meta.transparencyHints && meta.transparencyHints.length > 0 ? (
              <ul className="elterngeld-calculation__transparency-list">
                {meta.transparencyHints.map((hint, i) => (
                  <li key={i}>{hint}</li>
                ))}
              </ul>
            ) : (
              <p>Die Planung basiert auf den aktuellen Elterngeld-Regeln und dient als Orientierung.</p>
            )}
          </div>
          <p className="elterngeld-calculation__elterngeldstelle-hint">
            Die endgültige Entscheidung über deinen Anspruch und die Auszahlung trifft immer die zuständige Elterngeldstelle. Diese Planung dient zur Orientierung und ersetzt keine offizielle Prüfung.
          </p>
        </Card>
      )}

      <Card className="still-daily-checklist__card">
        <h3 className="elterngeld-step__title">Monatsplan</h3>
        {(() => {
          const monthItems = getMonthGridItemsFromResults(
            parentsForMonths,
            Math.max(14, ...parentsForMonths.flatMap((p) => p.monthlyResults.map((r) => r.month)), 0)
          );
          return (
            <>
              <PlanPhases items={monthItems} />
              <MonthSummary items={monthItems} />
              <MonthGrid items={monthItems} />
            </>
          );
        })()}
      </Card>

      {parentsForMonths.map((parent) => (
        <Card key={parent.id} className="still-daily-checklist__card">
          <h3 className="elterngeld-step__title">{parent.label}</h3>
          <div className="elterngeld-calculation__parent-result">
            <table className="elterngeld-calculation__table">
              <thead>
                <tr>
                  <th>Lebensmonat</th>
                  <th>Modus</th>
                  <th className="elterngeld-calculation__th-right">Betrag</th>
                </tr>
              </thead>
              <tbody>
                {parent.monthlyResults
                  .filter((r) => r.mode !== 'none' || r.amount > 0)
                  .map((r) => (
                    <tr key={r.month} className={r.hasMaternityBenefit ? 'elterngeld-calculation__row--maternity' : undefined}>
                      <td>{r.month}</td>
                      <td>
                        {MODE_LABELS[r.mode] ?? r.mode}
                        {r.hasMaternityBenefit && (
                          <span className="elterngeld-calculation__maternity-badge" title="Mutterschutz / Mutterschaftsleistungen">MS</span>
                        )}
                      </td>
                      <td className="elterngeld-calculation__td-right">
                        {formatCurrency(r.amount)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {parent.monthlyResults.every((r) => r.mode === 'none' && r.amount === 0) && (
              <p className="elterngeld-calculation__no-data">Kein Bezug geplant</p>
            )}
            <p className="elterngeld-calculation__total">
              <strong>Geschätzt {parent.label}:</strong> {formatCurrency(parent.total)}
            </p>
            {parent.warnings.length > 0 && (
              <ul className="elterngeld-calculation__warnings">
                {parent.warnings
                  .filter((w) => !hidePartnerschaftsbonusUi || !isPartnerschaftsbonusWarningMessage(w))
                  .map((w, i) => {
                  const action = getHintAction(w, result);
                  return (
                    <li key={i} className="elterngeld-calculation__warning-item">
                      <span>{w}</span>
                      {action.action && action.action !== 'openOptimization' && onNavigateToInput && (
                        <Button
                          type="button"
                          variant="secondary"
                          className="elterngeld-calculation__validation-action elterngeld-calculation__validation-action--small"
                          onClick={() => {
                            if (action.action === 'focusMonth' && action.month != null) {
                              onNavigateToInput({ focusMonth: action.month });
                            } else if (action.action === 'focusEinkommen') {
                              onNavigateToInput({ focusSection: 'einkommen' });
                            } else if (action.action === 'focusGrunddaten') {
                              onNavigateToInput({ focusSection: 'grunddaten' });
                            } else if (action.action === 'focusMonatsplan') {
                              onNavigateToInput({ focusSection: 'monatsplan' });
                            }
                          }}
                        >
                          {action.label}
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {parent.monthlyResults.some((r) => r.breakdown) && (
              <details className="elterngeld-calculation__breakdown">
                <summary className="elterngeld-calculation__breakdown-summary">
                  So wurde geschätzt
                </summary>
                <p className="elterngeld-calculation__breakdown-hint">
                  Diese Darstellung zeigt die vereinfachte Schätzlogik Ihrer Eingaben. Die endgültige
                  Entscheidung trifft die zuständige Elterngeldstelle.
                </p>
                <div className="elterngeld-calculation__breakdown-months">
                  {parent.monthlyResults
                    .filter((r) => r.breakdown)
                    .map((r) => (
                      <MonthlyBreakdownRow key={r.month} r={r} />
                    ))}
                </div>
              </details>
            )}
          </div>
        </Card>
      ))}

      {!isOptimizationAdopted && (
      <Card className="still-daily-checklist__card elterngeld-calculation__household-card">
        <h3 className="elterngeld-step__title">Haushaltsgesamtsumme</h3>
        <p className="elterngeld-calculation__result-basis">
          {adoptionStatus.displayCategory === 'aktiv'
            ? (
                adoptionStatus.kind === 'original_active'
                  ? 'Ihr nutzt jetzt wieder euren ursprünglichen Plan.'
                  : 'Aktive Berechnung basiert auf eurem aktuellen Plan.'
              )
            : adoptionStatus.displayCategory === 'geändert'
              ? 'Ihr habt den Plan nach der Übernahme noch angepasst.'
              : 'Aktive Berechnung basiert auf eurem aktuellen Plan.'}
        </p>
        <p className="elterngeld-calculation__household-total">
          {formatCurrency(householdTotal)}
        </p>
        {(() => {
          const breakdown = getCalculationBreakdown(result);
          if (breakdown.length === 0) return null;
          return (
            <div className="elterngeld-calculation__beleg elterngeld-plan-phases">
              <h4 className="elterngeld-plan-phases__title">So wird geschätzt:</h4>
              <ul className="elterngeld-plan-phases__list">
                {breakdown.map((line, i) => (
                  <li key={i} className="elterngeld-plan-phases__item">
                    {line.value ? (
                      <>
                        <span className="elterngeld-plan-phases__label">{line.label}</span>
                        <span className="elterngeld-plan-phases__range">{line.value}</span>
                      </>
                    ) : (
                      line.label
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}
        <div className="elterngeld-calculation__transparency-hint">
          {meta.transparencyHints && meta.transparencyHints.length > 0 ? (
            <ul className="elterngeld-calculation__transparency-list">
              {meta.transparencyHints.map((hint, i) => (
                <li key={i}>{hint}</li>
              ))}
            </ul>
          ) : (
            <p>Die Planung basiert auf den aktuellen Elterngeld-Regeln und dient als Orientierung.</p>
          )}
        </div>
        <p className="elterngeld-calculation__elterngeldstelle-hint">
          Die endgültige Entscheidung über deinen Anspruch und die Auszahlung trifft immer die zuständige Elterngeldstelle. Diese Planung dient zur Orientierung und ersetzt keine offizielle Prüfung.
        </p>
      </Card>
      )}

      {plan && !hidePartnerschaftsbonusUi && (
        <PartnerBonusCheckDialog
          isOpen={showPartnerBonusCheck}
          onClose={() => setShowPartnerBonusCheck(false)}
          plan={plan}
          result={result}
          onAction={(action: PartnerBonusAction) => {
            if (action.type === 'applyFix') {
              onApplyPartnerBonusFix?.(action.month, action.fix);
            } else if (action.type === 'applySetAllSuitableMonths') {
              onApplyPartnerBonusFixMultiple?.(action.months);
            } else if (action.type === 'focusMonth') {
              onNavigateToInput?.({ focusMonth: action.month });
            } else if (action.type === 'focusSection') {
              if (action.section === 'elternArbeit') {
                const m = getFirstPartnerBonusMonthFromResult(result);
                onNavigateToInput?.(m != null ? { focusMonth: m } : { focusSection: 'monatsplan' });
              } else if (action.section === 'eltern') {
                onNavigateToInput?.({ focusSection: 'einkommen' });
              } else if (
                action.section === 'grunddaten' ||
                action.section === 'einkommen' ||
                action.section === 'monatsplan'
              ) {
                onNavigateToInput?.({ focusSection: action.section });
              }
            }
          }}
        />
      )}

      {onCreatePdf && (
        <Button
          type="button"
          variant="primary"
          fullWidth
          className="next-steps__button btn--softpill"
          onClick={onCreatePdf}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Wird erstellt…' : 'PDF erstellen'}
        </Button>
      )}
    </div>
  );
};
