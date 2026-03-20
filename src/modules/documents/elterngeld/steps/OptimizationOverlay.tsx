/**
 * Overlay zur Optimierungsdarstellung im Planungsscreen.
 * Zielauswahl oberhalb der Karten, danach passende Vorschläge und Aktionen.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '../../../../shared/ui/Modal';
import { Button } from '../../../../shared/ui/Button';
import { Card } from '../../../../shared/ui/Card';
import { ElterngeldSelectButton } from '../ui/ElterngeldSelectButton';
import { MAIN_GOAL_OPTIONS } from './OptimizationGoalDialog';
import {
  buildOptimizationResult,
  UNSUPPORTED_GOALS,
  type OptimizationGoal,
  type OptimizationResultSet,
  type OptimizationSuggestion,
} from '../calculation/elterngeldOptimization';
import {
  getExplainableAdvantageWhenSameDurationLessTotal,
  getMainRecommendationExplanation,
  getCalculationBreakdown,
  getOptimizationBreakdown,
  shouldShowVariant,
} from './optimizationExplanation';
import type { ElterngeldCalculationPlan, CalculationResult } from '../calculation';
import type { CombinedWho } from '../calculation/monthCombinedState';
import type { MonthMode } from '../calculation';

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

function countPartnerBonusMonths(result: CalculationResult): number {
  const months = new Set<number>();
  for (const p of result.parents) {
    for (const r of p.monthlyResults) {
      if (r.mode === 'partnerBonus') months.add(r.month);
    }
  }
  return months.size;
}

function getPartnerBonusMonths(result: CalculationResult): number[] {
  const months: number[] = [];
  for (const p of result.parents) {
    for (const r of p.monthlyResults) {
      if (r.mode === 'partnerBonus') months.push(r.month);
    }
  }
  return [...new Set(months)].sort((a, b) => a - b);
}

function formatPartnerBonusMonthsUserFriendly(months: number[]): string {
  if (months.length === 0) return '';
  if (months.length === 1) return `Monat ${months[0]}`;
  return `Monate ${months[0]}–${months[months.length - 1]}`;
}

function getSuggestionDedupKey(s: OptimizationSuggestion): string {
  const total = Math.round(s.result.householdTotal);
  const duration = countBezugMonths(s.result);
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

/** Auswirkungen in Alltagssprache für die Empfehlung */
function getImpactLinesUserFriendly(
  currentResult: CalculationResult,
  optimizedResult: CalculationResult,
  formatCurrencySigned: (n: number) => string,
  goal: string,
  suggestion?: OptimizationSuggestion | null
): string[] {
  const currentTotal = currentResult.householdTotal;
  const currentDuration = countBezugMonths(currentResult);
  const optimizedTotal = optimizedResult.householdTotal;
  const optimizedDuration = countBezugMonths(optimizedResult);
  const deltaTotal = optimizedTotal - currentTotal;
  const deltaDuration = optimizedDuration - currentDuration;

  const optimizedBonusMonths = getPartnerBonusMonths(optimizedResult);

  const lines: string[] = [];
  if (deltaTotal !== 0) {
    lines.push(deltaTotal > 0 ? `${formatCurrencySigned(deltaTotal)} mehr gesamt` : `${formatCurrencySigned(deltaTotal)} weniger gesamt`);
  }
  if (deltaDuration !== 0) {
    const unit = Math.abs(deltaDuration) === 1 ? 'Monat' : 'Monate';
    lines.push(deltaDuration > 0 ? `+${deltaDuration} ${unit} länger` : `${deltaDuration} ${unit} kürzer`);
  } else if (optimizedDuration > 0) {
    lines.push(`Dauer bleibt ${optimizedDuration} Monate`);
    if (deltaTotal < 0) {
      const advantage = getExplainableAdvantageWhenSameDurationLessTotal(
        currentResult,
        optimizedResult,
        goal,
        suggestion
      );
      if (advantage) lines.push(advantage);
    }
  }
  if (optimizedBonusMonths.length > 0) {
    const range = formatPartnerBonusMonthsUserFriendly(optimizedBonusMonths);
    lines.push(`${range} werden bei beiden als Bonusmonate geplant`);
  }
  return lines;
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
    <Modal isOpen={isOpen} onClose={onClose} title="Optimierungsvorschlag übernehmen" variant="softpill" scrollableContent>
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

type OptimizationOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  plan: ElterngeldCalculationPlan;
  result: CalculationResult;
  hasAnySuggestions: boolean;
  onAdoptOptimization: (plan: ElterngeldCalculationPlan) => void;
};

export const OptimizationOverlay: React.FC<OptimizationOverlayProps> = ({
  isOpen,
  onClose,
  plan,
  result,
  hasAnySuggestions,
  onAdoptOptimization,
}) => {
  const [mainGoal, setMainGoal] = useState<'maxMoney' | 'longerDuration' | 'frontLoad'>('maxMoney');
  const [optimizationGoal, setOptimizationGoal] = useState<OptimizationGoal | null>(null);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [showAdoptConfirm, setShowAdoptConfirm] = useState(false);
  const [showAllVariants, setShowAllVariants] = useState(false);

  const optimizationResultSet = useMemo((): OptimizationResultSet | null => {
    if (!optimizationGoal || result.validation.errors.length > 0 || UNSUPPORTED_GOALS.includes(optimizationGoal)) {
      return null;
    }
    const outcome = buildOptimizationResult(plan, result, optimizationGoal);
    if ('status' in outcome && outcome.status === 'unsupported') return null;
    return outcome as OptimizationResultSet;
  }, [plan, result, optimizationGoal]);

  useEffect(() => {
    setSelectedSuggestionIndex(0);
    setShowAllVariants(false);
  }, [optimizationResultSet?.suggestions?.length, optimizationResultSet?.goal]);

  const handleGoalSelect = (goal: 'maxMoney' | 'longerDuration' | 'frontLoad') => {
    setMainGoal(goal);
    if (optimizationGoal !== null) setOptimizationGoal(goal);
  };

  const handleStartOptimization = () => {
    setOptimizationGoal(mainGoal);
  };

  const handleClose = () => {
    setOptimizationGoal(null);
    setSelectedSuggestionIndex(0);
    setShowAllVariants(false);
    onClose();
  };

  const handleBackToGoal = () => {
    setOptimizationGoal(null);
    setSelectedSuggestionIndex(0);
    setShowAllVariants(false);
  };

  if (!isOpen) return null;

  const optimizationUnavailable = optimizationGoal !== null && !optimizationResultSet;
  const hasResult = optimizationResultSet !== null;

  const goal = optimizationResultSet?.goal ?? 'maxMoney';
  const status = optimizationResultSet?.status ?? 'unchanged';
  const currentResult = optimizationResultSet?.currentResult ?? result;
  const suggestions = optimizationResultSet?.suggestions ?? [];
  const suggestionsWithDifference = hasResult ? suggestions.filter((s) => !resultsAreEqual(currentResult, s.result)) : [];
  const suggestionsToShow = suggestionsWithDifference.length > 0 ? suggestionsWithDifference : suggestions;
  const seenKeys = new Set<string>();
  const effectiveSuggestions = suggestionsToShow.filter((s) => {
    const key = getSuggestionDedupKey(s);
    if (seenKeys.has(key)) return false;
    if (!shouldShowVariant(s, currentResult, goal)) return false;
    seenKeys.add(key);
    return true;
  });
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

  return (
    <>
      <AdoptConfirmDialog
        isOpen={showAdoptConfirm}
        onClose={() => setShowAdoptConfirm(false)}
        onConfirm={() => {
          if (selectedSuggestion) {
            onAdoptOptimization(selectedSuggestion.plan);
            handleClose();
          }
        }}
        currentResult={currentResult}
        optimizedResult={selectedSuggestion?.result ?? currentResult}
        formatCurrency={formatCurrency}
        formatCurrencySigned={formatCurrencySigned}
        deltaTotal={deltaTotal}
        deltaDuration={deltaMonths}
      />
      <Modal isOpen={isOpen} onClose={handleClose} title="Was ist dir wichtiger?" variant="softpill" scrollableContent>
        <div className="elterngeld-optimization-overlay-content">
          {/* Schritt 1: Zielauswahl */}
          <div className="elterngeld-optimization-overlay__goal-section">
            <p className="elterngeld-optimization-goal__intro">
              Wähle dein Ziel – wir suchen die beste passende Variante.
            </p>
            <div
              className="elterngeld-optimization-goal__options elterngeld-select-btn-group"
              role="radiogroup"
              aria-label="Ziel"
            >
              {MAIN_GOAL_OPTIONS.map((opt) => (
                <ElterngeldSelectButton
                  key={opt.value}
                  label={opt.label}
                  description={opt.description}
                  selected={mainGoal === opt.value}
                  onClick={() => handleGoalSelect(opt.value)}
                  ariaPressed={mainGoal === opt.value}
                />
              ))}
            </div>
            {!optimizationGoal && (
              <div className="next-steps__stack elterngeld-optimization-goal__actions">
                <Button
                  type="button"
                  variant="primary"
                  className="next-steps__button btn--softpill"
                  onClick={handleStartOptimization}
                >
                  Beste Variante finden
                </Button>
              </div>
            )}
          </div>

          {optimizationUnavailable && (
            <p className="elterngeld-optimization-overlay__unavailable">
              Optimierung für dieses Ziel ist nicht verfügbar.
            </p>
          )}

          {/* 2. Vorschlagskarten und Aktionen – wenn Ergebnis vorhanden */}
          {hasResult && (
          <Card className="still-daily-checklist__card elterngeld-calculation__optimization-block elterngeld-calculation__optimization-block--comparison">
            {isAlreadyOptimal ? (
              <>
                <h3 className="elterngeld-step__title">
                  {hasAnySuggestions
                    ? 'Für dieses Ziel keine Verbesserung möglich.'
                    : 'Dein aktueller Plan ist bereits optimal.'}
                </h3>
                <Button
                  type="button"
                  variant="secondary"
                  className="btn--softpill"
                  onClick={handleBackToGoal}
                >
                  {hasAnySuggestions ? 'Anderes Ziel wählen' : 'Schließen'}
                </Button>
              </>
            ) : (
              <>
                <h3 className="elterngeld-step__title">
                  Ich habe die beste passende Variante für dein Ziel gefunden.
                </h3>

                {hasSuggestions && (
                  <div className="elterngeld-optimization-overlay__suggestion-list-wrap">
                    <div className="elterngeld-calculation__suggestion-list" role="list">
                      {(showAllVariants ? effectiveSuggestions : effectiveSuggestions.slice(0, 1)).map((s, idx) => {
                        const impactLines = getImpactLinesUserFriendly(currentResult, s.result, formatCurrencySigned, goal, s);
                        const isSelected = idx === clampedIndex || (!showAllVariants && idx === 0);
                        const displayIdx = showAllVariants ? idx : 0;
                        return (
                          <button
                            key={displayIdx}
                            type="button"
                            role="listitem"
                            className={`elterngeld-calculation__suggestion-card ${isSelected ? 'elterngeld-calculation__suggestion-card--selected' : ''}`}
                            onClick={() => setSelectedSuggestionIndex(displayIdx)}
                          >
                            {isSelected && !showAllVariants && (
                              <span className="elterngeld-calculation__suggestion-card-badge" aria-label="Empfohlen">
                                Empfohlen
                              </span>
                            )}
                            <span className="elterngeld-calculation__suggestion-main-signal">
                              {impactLines.length > 0 ? impactLines[0] : 'Variante prüfen'}
                            </span>
                            {displayIdx === 0 && (() => {
                              const explanation = getMainRecommendationExplanation(currentResult, s.result, goal, s);
                              return explanation ? (
                                <p className="elterngeld-calculation__suggestion-hint">{explanation}</p>
                              ) : null;
                            })()}
                            {isSelected && (() => {
                              const optBreakdown = getOptimizationBreakdown(currentResult, s.result);
                              const calcBreakdown = getCalculationBreakdown(s.result);
                              if (optBreakdown.length === 0 && calcBreakdown.length === 0) return null;
                              return (
                                <div className="elterngeld-calculation__suggestion-beleg">
                                  {optBreakdown.length > 0 && (
                                    <div className="elterngeld-calculation__beleg-section">
                                      <span className="elterngeld-calculation__beleg-title">Was wurde geändert:</span>
                                      <ul className="elterngeld-calculation__beleg-list">
                                        {optBreakdown.map((line, i) => (
                                          <li key={i}>{line}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {calcBreakdown.length > 0 && (
                                    <div className="elterngeld-calculation__beleg-section">
                                      <span className="elterngeld-calculation__beleg-title">So wird das berechnet:</span>
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
                            <div className="elterngeld-calculation__suggestion-details">
                              {impactLines.length > 1 && (
                                <div className="elterngeld-calculation__suggestion-plan-changes elterngeld-calculation__suggestion-plan-changes--primary">
                                  {impactLines.slice(1).map((line, i) => (
                                    <span key={i} className="elterngeld-calculation__suggestion-plan-changes-line" title={line}>
                                      {line}
                                    </span>
                                  ))}
                                </div>
                              )}
                              <span className="elterngeld-calculation__suggestion-meta">
                                {formatCurrency(s.optimizedTotal)} · {s.optimizedDurationMonths} Monate
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="elterngeld-calculation__optimization-actions">
                  {selectedSuggestion && (
                    <Button
                      type="button"
                      variant="primary"
                      className="btn--softpill elterngeld-calculation__optimization-action-primary"
                      onClick={() => setShowAdoptConfirm(true)}
                    >
                      Vorschlag übernehmen
                    </Button>
                  )}
                  {effectiveSuggestions.length > 1 && !showAllVariants && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="btn--softpill"
                      onClick={() => setShowAllVariants(true)}
                    >
                      {effectiveSuggestions.length - 1} weitere Variante{effectiveSuggestions.length > 2 ? 'n' : ''} ansehen
                    </Button>
                  )}
                  <div className="elterngeld-calculation__optimization-actions-secondary">
                    <Button
                      type="button"
                      variant="secondary"
                      className="btn--softpill"
                      onClick={handleClose}
                    >
                      Beibehalten
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="btn--softpill"
                      onClick={handleBackToGoal}
                    >
                      Zurück
                    </Button>
                  </div>
                </div>
              </>
            )}
          </Card>
          )}
        </div>
      </Modal>
    </>
  );
};
