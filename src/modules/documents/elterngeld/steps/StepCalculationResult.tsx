/**
 * Ergebnisdarstellung der Elterngeld-Berechnung.
 * Klarer Optimierungsblock mit zielabhängiger Darstellung.
 */

import React, { useMemo, useState, useEffect } from 'react';
import { Card } from '../../../../shared/ui/Card';
import { Button } from '../../../../shared/ui/Button';
import { MonthTimeline } from '../MonthTimeline';
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
import { plansAreEqual, isPlanEmpty } from '../infra/calculationPlanStorage';

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

function getExplanationText(
  goal: OptimizationGoal,
  improved: boolean
): string {
  if (improved) {
    switch (goal) {
      case 'maxMoney':
        return 'Die optimierte Strategie erhöht die geschätzte Gesamtauszahlung.';
      case 'longerDuration':
        return 'Die optimierte Strategie verteilt den Bezug auf mehr Monate.';
      case 'partnerBonus':
        return 'Die optimierte Strategie nutzt den Partnerschaftsbonus günstiger.';
      default:
        return '';
    }
  }
  switch (goal) {
    case 'maxMoney':
      return 'Für die Maximierung der Gesamtauszahlung wurde keine bessere Strategie gefunden.';
    case 'longerDuration':
      return 'Für eine längere Bezugsdauer wurde keine bessere Strategie gefunden.';
    case 'partnerBonus':
      return 'Für den Partnerschaftsbonus wurde aus Ihrer aktuellen Planung keine günstigere automatische Variante abgeleitet.';
    default:
      return '';
  }
}

function getNoImprovementReason(goal: OptimizationGoal): string {
  switch (goal) {
    case 'maxMoney':
      return 'Eine Verschiebung von Bezugsmonaten zwischen den Eltern hätte keine höhere Gesamtauszahlung ergeben.';
    case 'longerDuration':
      return 'Aus den vorhandenen Basis-Monaten konnte keine längere Bezugsdauer durch Umwandlung in ElterngeldPlus entstehen.';
    case 'partnerBonus':
      return 'Es konnten keine ausreichend geeigneten überlappenden ElterngeldPlus-Monate gebildet werden.';
    default:
      return 'Es wurde keine bessere Variante gefunden. Ihr aktueller Plan bleibt unverändert.';
  }
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
};

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
}: OptimizationComparisonBlockProps) {
  const { goal, status, currentResult, suggestions } = optimizationResultSet;
  const selectedSuggestion = suggestions[selectedSuggestionIndex] ?? suggestions[0];
  const hasMultipleSuggestions = suggestions.length > 1;

  const currentTotal = currentResult.householdTotal;
  const currentDuration = countBezugMonths(currentResult);
  const currentPB = hasPartnerBonus(currentResult);

  const optimizedResult = selectedSuggestion?.result ?? currentResult;
  const optimizedTotal = selectedSuggestion?.optimizedTotal ?? currentTotal;
  const optimizedDuration = selectedSuggestion?.optimizedDurationMonths ?? countBezugMonths(optimizedResult);
  const optimizedPB = hasPartnerBonus(optimizedResult);

  const improved = status === 'improved' && selectedSuggestion?.status === 'improved';
  const deltaTotal = optimizedTotal - currentTotal;
  const deltaMonths = optimizedDuration - currentDuration;

  const differenzText = improved
    ? goal === 'longerDuration'
      ? `Verbesserung: +${deltaMonths} Monate`
      : `Verbesserung: ${formatCurrencySigned(deltaTotal)}`
    : 'Keine Verbesserung für das gewählte Ziel gefunden.';

  const blockTitle = improved ? 'Optimierungsvorschlag' : 'Optimierungsanalyse';

  const getSuggestionDeltaLabel = (s: OptimizationSuggestion): string => {
    if (s.status === 'improved') {
      if (goal === 'longerDuration') return `+${s.deltaValue} Monate`;
      if (goal === 'partnerBonus' && s.bonusUsed) return 'Partnerschaftsbonus nutzbar';
      return formatCurrencySigned(s.deltaValue);
    }
    return 'Keine Verbesserung';
  };

  return (
    <Card className="still-daily-checklist__card elterngeld-calculation__optimization-block elterngeld-calculation__optimization-block--comparison">
      <h3 className="elterngeld-step__title">{blockTitle}</h3>
      <p className="elterngeld-calculation__optimization-goal">
        Optimierungsziel: {GOAL_LABELS[goal]}
      </p>

      {hasMultipleSuggestions && (
        <div className="elterngeld-calculation__suggestion-list" role="list">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              type="button"
              role="listitem"
              className={`elterngeld-calculation__suggestion-card ${idx === selectedSuggestionIndex ? 'elterngeld-calculation__suggestion-card--selected' : ''}`}
              onClick={() => onSelectSuggestion(idx)}
            >
              <span className="elterngeld-calculation__suggestion-title">{s.title}</span>
              <span className="elterngeld-calculation__suggestion-delta">{getSuggestionDeltaLabel(s)}</span>
              <span className="elterngeld-calculation__suggestion-meta">
                {formatCurrency(s.optimizedTotal)} · {s.optimizedDurationMonths} Monate
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="elterngeld-calculation__optimization-compare-grid">
        <div className="elterngeld-calculation__optimization-compare-col">
          <h4 className="elterngeld-calculation__optimization-compare-col-title">Aktueller Plan</h4>
          <div className="elterngeld-calculation__optimization-compare-row">
            <span className="elterngeld-calculation__optimization-compare-label">Haushaltsgesamtsumme:</span>
            <span className="elterngeld-calculation__optimization-compare-value">{formatCurrency(currentTotal)}</span>
          </div>
          <div className="elterngeld-calculation__optimization-compare-row">
            <span className="elterngeld-calculation__optimization-compare-label">Bezugsdauer:</span>
            <span className="elterngeld-calculation__optimization-compare-value">{currentDuration} Monate</span>
          </div>
          {goal === 'partnerBonus' && (
            <div className="elterngeld-calculation__optimization-compare-row">
              <span className="elterngeld-calculation__optimization-compare-label">Partnerschaftsbonus:</span>
              <span className="elterngeld-calculation__optimization-compare-value">{currentPB ? 'ja' : 'nein'}</span>
            </div>
          )}
        </div>
        <div className="elterngeld-calculation__optimization-compare-col">
          <h4 className="elterngeld-calculation__optimization-compare-col-title">
            {improved ? 'Optimierte Strategie' : 'Geprüfte Vergleichsstrategie'}
          </h4>
          <div className="elterngeld-calculation__optimization-compare-row">
            <span className="elterngeld-calculation__optimization-compare-label">Haushaltsgesamtsumme:</span>
            <span className="elterngeld-calculation__optimization-compare-value">{formatCurrency(optimizedTotal)}</span>
          </div>
          <div className="elterngeld-calculation__optimization-compare-row">
            <span className="elterngeld-calculation__optimization-compare-label">Bezugsdauer:</span>
            <span className="elterngeld-calculation__optimization-compare-value">{optimizedDuration} Monate</span>
          </div>
          {goal === 'partnerBonus' && (
            <div className="elterngeld-calculation__optimization-compare-row">
              <span className="elterngeld-calculation__optimization-compare-label">Partnerschaftsbonus:</span>
              <span className="elterngeld-calculation__optimization-compare-value">{optimizedPB ? 'ja' : 'nein'}</span>
            </div>
          )}
        </div>
      </div>

      <div className="elterngeld-calculation__optimization-differenz">
        {differenzText}
      </div>

      {!improved && (
        <p className="elterngeld-calculation__optimization-no-improvement-hint">
          {getNoImprovementReason(goal)}
        </p>
      )}

      <p className="elterngeld-calculation__optimization-explanation">
        {getExplanationText(goal, improved)}
      </p>

      <div className="elterngeld-calculation__optimization-timelines">
        <div className="elterngeld-calculation__optimization-timeline-section">
          <p className="elterngeld-calculation__optimization-timeline-label">Aktueller Plan</p>
          {currentResult.parents.map((parent) => (
            <div key={parent.id} className="elterngeld-calculation__optimization-timeline-parent">
              <p className="elterngeld-calculation__optimization-timeline-parent-label">{parent.label}</p>
              <MonthTimeline
                months={parent.monthlyResults.map((r) => ({
                  month: r.month,
                  mode: r.mode,
                  hasWarning: r.warnings.length > 0,
                }))}
              />
            </div>
          ))}
        </div>
        <div className="elterngeld-calculation__optimization-timeline-section">
          <p className="elterngeld-calculation__optimization-timeline-label">
            {improved ? 'Optimierte Strategie' : 'Geprüfte Vergleichsstrategie'}
          </p>
          {optimizedResult.parents.map((parent) => (
            <div key={parent.id} className="elterngeld-calculation__optimization-timeline-parent">
              <p className="elterngeld-calculation__optimization-timeline-parent-label">{parent.label}</p>
              <MonthTimeline
                months={parent.monthlyResults.map((r) => ({
                  month: r.month,
                  mode: r.mode,
                  hasWarning: r.warnings.length > 0,
                }))}
              />
            </div>
          ))}
        </div>
      </div>

      {improved && selectedSuggestion && (
        <div className="elterngeld-calculation__optimization-actions">
          {onAdoptOptimization && (
            <Button
              type="button"
              variant="primary"
              className="btn--softpill"
              onClick={() => onAdoptOptimization(selectedSuggestion.plan)}
            >
              Optimierung übernehmen und Berechnung aktualisieren
            </Button>
          )}
          {onDiscardOptimization && (
            <Button
              type="button"
              variant="secondary"
              className="btn--softpill"
              onClick={onDiscardOptimization}
            >
              Vorschlag verwerfen
            </Button>
          )}
        </div>
      )}
    </Card>
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
}) => {
  const { parents, householdTotal, validation, meta } = result;

  const optimizationResultSet = useMemo((): OptimizationResultSet | null => {
    if (!plan || !optimizationGoal || validation.errors.length > 0) return null;
    const outcome = buildOptimizationResult(plan, result, optimizationGoal);
    if ('status' in outcome && outcome.status === 'unsupported') return null;
    return outcome as OptimizationResultSet;
  }, [plan, result, optimizationGoal, validation.errors.length]);

  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);

  useEffect(() => {
    setSelectedSuggestionIndex(0);
  }, [optimizationResultSet?.suggestions?.length, optimizationResultSet?.goal]);

  const selectedSuggestion = optimizationResultSet?.suggestions?.[selectedSuggestionIndex];
  const isOptimizationAdopted =
    optimizationStatus === 'adopted' ||
    Boolean(
      plan &&
        selectedSuggestion &&
        plansAreEqual(selectedSuggestion.plan, plan)
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
          {validation.errors.map((e, i) => (
            <p key={i}>{e}</p>
          ))}
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="elterngeld-calculation__validation elterngeld-calculation__validation--warning">
          {validation.warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      )}

      {parents.some((p) => p.monthlyResults.some((m) => m.mode === 'partnerBonus')) && (
        <p className="elterngeld-calculation__partner-bonus-hint">
          Der Partnerschaftsbonus kann zusätzliche Monate ermöglichen, ist aber kein pauschaler
          Zuschlag. Die finanzielle Wirkung hängt von Ihrer konkreten Verteilung ab.
        </p>
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
              />
            )}
          </>
        )}

      {parents.map((parent) => (
        <Card key={parent.id} className="still-daily-checklist__card">
          <h3 className="elterngeld-step__title">{parent.label}</h3>
          <MonthTimeline
            months={parent.monthlyResults.map((r) => ({
              month: r.month,
              mode: r.mode,
              hasWarning: r.warnings.length > 0,
            }))}
          />
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
                {parent.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
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
