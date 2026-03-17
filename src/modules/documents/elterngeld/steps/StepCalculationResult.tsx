/**
 * Ergebnisdarstellung der Elterngeld-Berechnung.
 * Klarer Optimierungsblock mit zielabhängiger Darstellung.
 */

import React, { useMemo, useState, useEffect } from 'react';
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
import { getMonthGridItemsFromResults } from '../monthGridMappings';
import type {
  CalculationResult,
  MonthlyResult,
  ElterngeldCalculationPlan,
} from '../calculation';
import {
  buildOptimizationResult,
  GOAL_LABELS,
  UNSUPPORTED_GOALS,
  type OptimizationGoal,
  type OptimizationResultSet,
  type OptimizationSuggestion,
} from '../calculation/elterngeldOptimization';
import type { CombinedWho } from '../calculation/monthCombinedState';
import type { MonthMode } from '../calculation';
import { isPlanEmpty } from '../infra/calculationPlanStorage';

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

function countBezugMonths(result: CalculationResult): number {
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
  if (label === 'Partnerschaftsbonus') return 'Partnerschaftsbonus (beide Eltern)';
  if (label === 'Beide – Bonus') return 'ElterngeldPlus mit beiden Eltern';
  if (label === 'Mutter – Basis') return 'Basiselterngeld (Mutter)';
  if (label === 'Mutter – Plus') return 'ElterngeldPlus (Mutter)';
  if (label === 'Partner – Basis') return 'Basiselterngeld (Partner)';
  if (label === 'Partner – Plus') return 'ElterngeldPlus (Partner)';
  return label;
}

/** Änderungen im Plan – verständlich formatiert („Monat 3–5 wird zu ElterngeldPlus mit beiden Eltern“). */
function getResultChangePreviewUserFriendly(
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

  for (const month of months) {
    const cur = getStateFromResult(currentResult, month);
    const opt = getStateFromResult(optimizedResult, month);
    const fromLabel = formatStateLabel(cur.who, cur.mode);
    const toLabel = formatStateLabel(opt.who, opt.mode);

    if (fromLabel === toLabel) continue;

    const changeType: 'neu' | 'entfernt' | 'replace' =
      cur.who === 'none' ? 'neu' : opt.who === 'none' ? 'entfernt' : 'replace';

    if (
      currentRun &&
      changeType === currentRun.changeType &&
      (changeType === 'neu' ? toLabel === currentRun.toLabel : changeType === 'entfernt' ? fromLabel === currentRun.fromLabel : `${fromLabel}→${toLabel}` === `${currentRun.fromLabel}→${currentRun.toLabel}`)
    ) {
      currentRun.months.push(month);
    } else {
      if (currentRun) changes.push(currentRun);
      currentRun = { months: [month], changeType, fromLabel, toLabel };
    }
  }
  if (currentRun) changes.push(currentRun);

  const formatMonthRangeUser = (m: number[]): string => {
    if (m.length === 0) return '';
    if (m.length === 1) return `Monat ${m[0]}`;
    return `Monat ${m[0]}–${m[m.length - 1]}`;
  };

  const lines: string[] = [];
  for (const c of changes) {
    const range = formatMonthRangeUser(c.months);
    const line =
      c.changeType === 'entfernt'
        ? `${range} wird entfernt`
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

/** Prüft ob zwei Results strukturell gleich sind (für Optimierungsvergleich). */
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

type PlanStability = 'gut' | 'pruefen' | 'kritisch';

function getPlanStability(result: CalculationResult): {
  level: PlanStability;
  label: string;
  hints: string[];
} {
  const { validation, parents } = result;
  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;
  const hasParentWarnings = parents.some((p) => p.warnings.length > 0);
  const hasPartnerBonus = parents.some((p) =>
    p.monthlyResults.some((m) => m.mode === 'partnerBonus')
  );
  const hasHoursWarning = validation.warnings.some((w) => w.includes('24–32') || w.includes('Wochenstunden'));
  const hasPartnerBonusWarning = validation.warnings.some((w) =>
    w.includes('Partnerschaftsbonus') || w.includes('Partnerbonus')
  );

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
      hints: hints.length > 0 ? hints : ['Bitte prüfen Sie die angezeigten Hinweise.'],
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
  if (warning.includes('Partnerschaftsbonus') || warning.includes('Partnerbonus')) return { label: 'Partnerschaftsbonus prüfen', action: 'openPartnerBonusCheck' };
  if (warning.includes('24–32') || warning.includes('Wochenstunden') || warning.includes('Arbeitszeit')) {
    const m = getFirstRelevantMonth(result);
    return { label: 'Arbeitszeit anpassen', action: m != null ? 'focusMonth' : 'focusMonatsplan', month: m ?? undefined };
  }
  if (warning.includes('Einkommen')) return { label: 'Einkommen prüfen', action: 'focusEinkommen' };
  if (warning.includes('Geburtsdatum') || warning.includes('Termin')) return { label: 'Grunddaten prüfen', action: 'focusGrunddaten' };
  return { label: '', action: null };
}

/** Aktion für Validierungsfehler (errors) */
function getErrorAction(error: string): { label: string; action: 'focusGrunddaten' | 'focusEinkommen' | null } {
  if (error.includes('Geburtsdatum') || error.includes('Termin')) return { label: 'Grunddaten prüfen', action: 'focusGrunddaten' };
  if (error.includes('Einkommen')) return { label: 'Einkommen prüfen', action: 'focusEinkommen' };
  return { label: '', action: null };
}

type PlanStabilityBlockProps = {
  result: CalculationResult;
  className?: string;
};

function PlanStabilityBlock({ result, className }: PlanStabilityBlockProps) {
  const { level, label, hints } = getPlanStability(result);
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

type OptimizationComparisonBlockProps = {
  optimizationResultSet: OptimizationResultSet;
  selectedSuggestionIndex: number;
  onSelectSuggestion: (index: number) => void;
  formatCurrency: (n: number) => string;
  formatCurrencySigned: (n: number) => string;
  countBezugMonths: (r: CalculationResult) => number;
  hasPartnerBonus: (r: CalculationResult) => boolean;
  onAdoptOptimization?: (plan: ElterngeldCalculationPlan) => void;
  onDiscardOptimization?: () => void;
  onBackToOptimization?: () => void;
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
  const planChangeLines = getResultChangePreviewUserFriendly(currentResult, optimizedResult);

  const impactLines: string[] = [];
  if (deltaTotal !== 0) impactLines.push(formatCurrencySigned(deltaTotal));
  if (deltaDuration !== 0) {
    const unit = formatMonthsLabel(Math.abs(deltaDuration), 'Monat', 'Monate');
    impactLines.push(deltaDuration > 0 ? `+${deltaDuration} ${unit}` : `${deltaDuration} ${unit}`);
  }
  if (impactLines.length === 0) impactLines.push('±0 €');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Optimierungsvorschlag übernehmen" variant="softpill">
      <div className="elterngeld-adopt-confirm">
        <p className="elterngeld-adopt-confirm__intro">
          Dieser Vorschlag verändert deinen aktuellen Plan.
        </p>
        {planChangeLines.length > 0 && (
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
        <div className="elterngeld-adopt-confirm__actions next-steps__stack">
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

function OptimizationComparisonBlock({
  optimizationResultSet,
  selectedSuggestionIndex,
  onSelectSuggestion,
  formatCurrency,
  formatCurrencySigned,
  countBezugMonths,
  hasPartnerBonus,
  onAdoptOptimization,
  onDiscardOptimization,
  onBackToOptimization,
}: OptimizationComparisonBlockProps) {
  const [showAdoptConfirm, setShowAdoptConfirm] = useState(false);
  const { goal, status, currentResult, suggestions } = optimizationResultSet;
  const suggestionsWithDifference = suggestions.filter((s) => !resultsAreEqual(currentResult, s.result));
  const effectiveSuggestions = suggestionsWithDifference.length > 0 ? suggestionsWithDifference : suggestions;
  const clampedIndex = Math.min(selectedSuggestionIndex, Math.max(0, effectiveSuggestions.length - 1));
  const selectedSuggestion = effectiveSuggestions[clampedIndex] ?? effectiveSuggestions[0];
  const hasSuggestions = effectiveSuggestions.length > 0;

  const currentTotal = currentResult.householdTotal;
  const currentDuration = countBezugMonths(currentResult);

  const optimizedResult = selectedSuggestion?.result ?? currentResult;
  const optimizedTotal = selectedSuggestion?.optimizedTotal ?? currentTotal;
  const optimizedDuration = selectedSuggestion?.optimizedDurationMonths ?? countBezugMonths(optimizedResult);

  const optimizedResultForCompare = selectedSuggestion?.result ?? currentResult;
  const resultsIdentical = resultsAreEqual(currentResult, optimizedResultForCompare);
  const improved = status === 'improved' && selectedSuggestion?.status === 'improved' && !resultsIdentical;
  const isAlreadyOptimal = resultsIdentical || !improved;
  const deltaTotal = optimizedTotal - currentTotal;
  const deltaMonths = optimizedDuration - currentDuration;

  const benefitText = improved
    ? goal === 'longerDuration'
      ? `+${deltaMonths} ${formatMonthsLabel(deltaMonths, 'Monat', 'Monate')}`
      : goal === 'frontLoad'
        ? (selectedSuggestion?.deltaValue ?? 0) > 0
          ? 'Mehr Auszahlung am Anfang'
          : ''
        : formatCurrencySigned(deltaTotal)
    : '';

  const getSuggestionDeltaLines = (s: OptimizationSuggestion): string[] => {
    const deltaTotal = s.optimizedTotal - currentTotal;
    const deltaDuration = s.optimizedDurationMonths - currentDuration;
    const deltaBonus = countPartnerBonusMonths(s.result) - countPartnerBonusMonths(currentResult);

    const formatTotalLine = (): string => formatCurrencySigned(deltaTotal);
    const formatDurationLine = (): string => {
      if (deltaDuration > 0) return `+${deltaDuration} ${formatMonthsLabel(deltaDuration, 'Monat', 'Monate')}`;
      if (deltaDuration < 0) return `${deltaDuration} ${formatMonthsLabel(-deltaDuration, 'Monat', 'Monate')}`;
      return '±0 Monate';
    };
    const formatBonusLine = (): string => {
      if (deltaBonus > 0) return `+${deltaBonus} ${formatMonthsLabel(deltaBonus, 'Partnerbonus-Monat', 'Partnerbonus-Monate')}`;
      if (deltaBonus < 0) return `${deltaBonus} ${formatMonthsLabel(-deltaBonus, 'Partnerbonus-Monat', 'Partnerbonus-Monate')}`;
      return '±0 Bonusmonate';
    };

    const lines: string[] = [];
    if (goal === 'maxMoney') {
      lines.push(formatTotalLine());
      lines.push(formatDurationLine());
      if (deltaBonus !== 0) lines.push(formatBonusLine());
    } else if (goal === 'longerDuration') {
      lines.push(formatDurationLine());
      lines.push(formatTotalLine());
      if (deltaBonus !== 0) lines.push(formatBonusLine());
    } else if (goal === 'partnerBonus') {
      lines.push(formatBonusLine());
      lines.push(formatTotalLine());
      if (deltaDuration !== 0) lines.push(formatDurationLine());
    } else if (goal === 'frontLoad') {
      if (s.deltaValue > 0) lines.push('Mehr Auszahlung in frühen Monaten');
      lines.push(formatTotalLine());
      if (deltaDuration !== 0) lines.push(formatDurationLine());
    }
    return lines;
  };

  return (
    <>
      <AdoptConfirmDialog
        isOpen={showAdoptConfirm}
        onClose={() => setShowAdoptConfirm(false)}
        onConfirm={() => selectedSuggestion && onAdoptOptimization?.(selectedSuggestion.plan)}
        currentResult={currentResult}
        optimizedResult={selectedSuggestion?.result ?? currentResult}
        formatCurrency={formatCurrency}
        formatCurrencySigned={formatCurrencySigned}
        deltaTotal={deltaTotal}
        deltaDuration={deltaMonths}
      />
      <Card className="still-daily-checklist__card elterngeld-calculation__optimization-block elterngeld-calculation__optimization-block--comparison">
        {isAlreadyOptimal ? (
          <>
            <h3 className="elterngeld-step__title">Dein aktueller Plan ist bereits optimal.</h3>
            {onBackToOptimization && (
              <Button
                type="button"
                variant="secondary"
                className="btn--softpill"
                onClick={onBackToOptimization}
              >
                Zurück zur Optimierung
              </Button>
            )}
          </>
        ) : (
          <>
            <h3 className="elterngeld-step__title">Verbesserung möglich</h3>
            <div
              className={`elterngeld-calculation__optimization-benefit ${
                goal === 'maxMoney' ? deltaTotal > 0 : goal === 'longerDuration' ? deltaMonths > 0 : goal === 'frontLoad' ? (selectedSuggestion?.deltaValue ?? 0) > 0 : deltaTotal > 0
                  ? 'elterngeld-calculation__optimization-benefit--positive'
                  : goal === 'maxMoney' ? deltaTotal < 0 : goal === 'longerDuration' ? deltaMonths < 0 : goal === 'frontLoad' ? (selectedSuggestion?.deltaValue ?? 0) < 0 : deltaTotal < 0
                    ? 'elterngeld-calculation__optimization-benefit--negative'
                    : ''
              }`}
            >
              {benefitText || 'Keine Verbesserung gefunden'}
            </div>

            {hasSuggestions && (
              <div className="elterngeld-calculation__suggestion-list" role="list">
                {effectiveSuggestions.map((s, idx) => {
                  const deltaLines = getSuggestionDeltaLines(s);
                  const planChangeLines = getResultChangePreviewUserFriendly(currentResult, s.result);
                  return (
                    <button
                      key={idx}
                      type="button"
                      role="listitem"
                      className={`elterngeld-calculation__suggestion-card ${idx === clampedIndex ? 'elterngeld-calculation__suggestion-card--selected' : ''}`}
                      onClick={() => onSelectSuggestion(idx)}
                    >
                      <span className="elterngeld-calculation__suggestion-title">{s.title}</span>
                      {deltaLines.length > 0 && (
                        <span className="elterngeld-calculation__suggestion-delta">
                          {deltaLines.map((line, i) => {
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
                        </span>
                      )}
                      {planChangeLines.length > 0 && (
                        <div className="elterngeld-calculation__suggestion-plan-changes">
                          <span className="elterngeld-calculation__suggestion-plan-changes-title">Änderungen</span>
                          {planChangeLines.map((line, i) => (
                            <span key={i} className="elterngeld-calculation__suggestion-plan-changes-line" title={line}>
                              {line}
                            </span>
                          ))}
                        </div>
                      )}
                      <span className="elterngeld-calculation__suggestion-meta">
                        {formatCurrency(s.optimizedTotal)} · {s.optimizedDurationMonths} Monate
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="elterngeld-calculation__optimization-actions">
              {selectedSuggestion && onAdoptOptimization && (
                <Button
                  type="button"
                  variant="primary"
                  className="btn--softpill elterngeld-calculation__optimization-action-primary"
                  onClick={() => setShowAdoptConfirm(true)}
                >
                  Optimierung übernehmen
                </Button>
              )}
              <div className="elterngeld-calculation__optimization-actions-secondary">
                {onDiscardOptimization && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="btn--softpill"
                    onClick={onDiscardOptimization}
                  >
                    Beibehalten
                  </Button>
                )}
                {onBackToOptimization && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="btn--softpill"
                    onClick={onBackToOptimization}
                  >
                    Zurück
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
          <dd>{b.replacementRatePercent} %</dd>
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
  onAdoptOptimization?: (plan: ElterngeldCalculationPlan) => void;
  onDiscardOptimization?: () => void;
  onShowCompareOriginal?: () => void;
  onCreatePdf?: () => void;
  isSubmitting?: boolean;
  onOpenOptimizationGoal?: () => void;
  /** Springt zur Eingabe und fokussiert Monat/ Bereich */
  onNavigateToInput?: (target: NavigateToInputTarget) => void;
  /** Wendet Schnellaktion für Partnerschaftsbonus an (nur Ergebnis-Ansicht) */
  onApplyPartnerBonusFix?: (month: number, fix: 'switchToPlus' | 'setBoth' | 'setBonusMonth') => void;
  /** Setzt mehrere Monate als Bonusmonate (ElterngeldPlus + Beide) */
  onApplyPartnerBonusFixMultiple?: (months: number[]) => void;
};

export const StepCalculationResult: React.FC<Props> = ({
  result,
  plan,
  planB,
  optimizationGoal,
  optimizationStatus = 'idle',
  onAdoptOptimization,
  onDiscardOptimization,
  onShowCompareOriginal,
  onCreatePdf,
  isSubmitting = false,
  onOpenOptimizationGoal,
  onNavigateToInput,
  onApplyPartnerBonusFix,
  onApplyPartnerBonusFixMultiple,
}) => {
  const { parents, householdTotal, validation, meta } = result;

  const optimizationResultSet = useMemo((): OptimizationResultSet | null => {
    if (!plan || !optimizationGoal || validation.errors.length > 0) return null;
    const outcome = buildOptimizationResult(plan, result, optimizationGoal);
    if ('status' in outcome && outcome.status === 'unsupported') return null;
    return outcome as OptimizationResultSet;
  }, [plan, result, optimizationGoal, validation.errors.length]);

  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [showPartnerBonusCheck, setShowPartnerBonusCheck] = useState(false);

  useEffect(() => {
    setSelectedSuggestionIndex(0);
  }, [optimizationResultSet?.suggestions?.length, optimizationResultSet?.goal]);

  const selectedSuggestion = optimizationResultSet?.suggestions?.[selectedSuggestionIndex];
  const isOptimizationAdopted =
    optimizationStatus === 'adopted' ||
    Boolean(
      selectedSuggestion &&
        resultsAreEqual(result, selectedSuggestion.result)
    );

  return (
    <div className="elterngeld-calculation-result">
      <div className="elterngeld-calculation__disclaimer">
        <p className="elterngeld-calculation__disclaimer-text">
          <strong>Unverbindliche Schätzung</strong>
        </p>
        <p className="elterngeld-calculation__disclaimer-text">
          {meta.disclaimer}
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

      {validation.warnings.length > 0 && (
        <div className="elterngeld-calculation__validation elterngeld-calculation__validation--warning">
          {validation.warnings.map((w, i) => {
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
                {action.action === 'openOptimization' && onOpenOptimizationGoal && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="elterngeld-calculation__validation-action elterngeld-calculation__validation-action--small"
                    onClick={onOpenOptimizationGoal}
                  >
                    {action.label}
                  </Button>
                )}
                {action.action === 'openPartnerBonusCheck' && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="elterngeld-calculation__validation-action elterngeld-calculation__validation-action--small"
                    onClick={() => setShowPartnerBonusCheck(true)}
                  >
                    {action.label}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <PlanStabilityBlock result={result} className="elterngeld-calculation__plan-stability" />

      {!validation.warnings.some((w) => w.includes('Partnerschaftsbonus') || w.includes('Partnerbonus')) && (
        <div className="elterngeld-calculation__partner-bonus-block">
          {parents.some((p) => p.monthlyResults.some((m) => m.mode === 'partnerBonus')) && (
            <p className="elterngeld-calculation__partner-bonus-hint">
              Der Partnerschaftsbonus kann zusätzliche Monate ermöglichen, ist aber kein pauschaler
              Zuschlag. Die finanzielle Wirkung hängt von Ihrer konkreten Verteilung ab.
            </p>
          )}
          <Button
            type="button"
            variant="secondary"
            className="btn--softpill elterngeld-step__partner-bonus-check-btn"
            onClick={() => setShowPartnerBonusCheck(true)}
          >
            Partnerschaftsbonus prüfen
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
              <Card className="still-daily-checklist__card elterngeld-calculation__optimization-block elterngeld-calculation__optimization-block--adopted">
                <h3 className="elterngeld-step__title">Optimierung übernommen</h3>
                <p className="elterngeld-calculation__adopted-banner">
                  Die aktive Berechnung basiert jetzt auf der optimierten Strategie.
                </p>
                <p className="elterngeld-step__hint elterngeld-step__hint--section">
                  Der ursprüngliche Plan wurde als Vergleich gespeichert.
                </p>
                {onShowCompareOriginal && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="btn--softpill"
                    onClick={onShowCompareOriginal}
                  >
                    Ursprünglichen Plan vergleichen
                  </Button>
                )}
              </Card>
            ) : (
              <OptimizationComparisonBlock
                optimizationResultSet={optimizationResultSet}
                selectedSuggestionIndex={selectedSuggestionIndex}
                onSelectSuggestion={setSelectedSuggestionIndex}
                formatCurrency={formatCurrency}
                formatCurrencySigned={formatCurrencySigned}
                countBezugMonths={countBezugMonths}
                hasPartnerBonus={hasPartnerBonus}
                onAdoptOptimization={onAdoptOptimization}
                onDiscardOptimization={onDiscardOptimization}
                onBackToOptimization={onOpenOptimizationGoal}
              />
            )}
          </>
        )}

      <Card className="still-daily-checklist__card">
        <h3 className="elterngeld-step__title">Monatsplan</h3>
        {(() => {
          const monthItems = getMonthGridItemsFromResults(
            parents,
            Math.max(14, ...parents.flatMap((p) => p.monthlyResults.map((r) => r.month)), 0)
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

      {parents.map((parent) => (
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
              <strong>Gesamt {parent.label}:</strong> {formatCurrency(parent.total)}
            </p>
            {parent.warnings.length > 0 && (
              <ul className="elterngeld-calculation__warnings">
                {parent.warnings.map((w, i) => {
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
                      {action.action === 'openOptimization' && onOpenOptimizationGoal && (
                        <Button
                          type="button"
                    variant="secondary"
                    className="elterngeld-calculation__validation-action elterngeld-calculation__validation-action--small"
                    onClick={onOpenOptimizationGoal}
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

      <Card className="still-daily-checklist__card elterngeld-calculation__household-card">
        <h3 className="elterngeld-step__title">Haushaltsgesamtsumme</h3>
        <p className="elterngeld-calculation__result-basis">
          {isOptimizationAdopted
            ? 'Aktive Berechnung basiert auf der optimierten Strategie.'
            : 'Aktive Berechnung basiert auf Ihrem aktuellen Plan.'}
          {planB && !isPlanEmpty(planB) && isOptimizationAdopted && (
            <> Der ursprüngliche Plan ist als Vergleichsvariante gespeichert.</>
          )}
        </p>
        <p className="elterngeld-calculation__household-total">
          {formatCurrency(householdTotal)}
        </p>
      </Card>

      {!optimizationGoal && onOpenOptimizationGoal && (
        <div className="elterngeld-calculation__optimization-hint-block">
          <p className="elterngeld-calculation__optimization-hint-text">
            Sie können jetzt auch prüfen, ob eine andere Aufteilung vorteilhafter wäre.
          </p>
          <Button
            type="button"
            variant="secondary"
            className="btn--softpill"
            onClick={onOpenOptimizationGoal}
          >
            Optimierungsziel wählen
          </Button>
        </div>
      )}

      {plan && (
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
