/**
 * Ergebnisdarstellung der Elterngeld-Berechnung.
 * Klarer Optimierungsblock mit zielabhängiger Darstellung.
 */

import React, { useMemo } from 'react';
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
  type OptimizationGoal,
  type OptimizationOutcome,
  type OptimizationResult,
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

function formatMetricValue(
  opt: OptimizationResult,
  value: number
): string {
  if (opt.goal === 'longerDuration' || opt.metricLabel.includes('Monate')) {
    return `${Math.round(value)} Monate`;
  }
  if (opt.metricLabel.includes('Standardabweichung')) {
    return formatCurrency(value);
  }
  return formatCurrency(value);
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
  onCreatePdf,
  isSubmitting = false,
}) => {
  const { parents, householdTotal, validation, meta } = result;

  const optimizationOutcome = useMemo((): OptimizationOutcome | null => {
    if (!plan || !optimizationGoal || validation.errors.length > 0) return null;
    return buildOptimizationResult(plan, result, optimizationGoal);
  }, [plan, result, optimizationGoal, validation.errors.length]);

  const optimizationResult = optimizationOutcome?.result;
  const isOptimizationAdopted =
    optimizationStatus === 'adopted' ||
    Boolean(
      plan &&
        optimizationResult &&
        plansAreEqual(optimizationResult.plan, plan)
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

      {/* Optimierungsblock: nur angezeigt wenn Optimierung geprüft wurde (nicht bei Validierungsfehlern) */}
      {optimizationGoal && validation.errors.length === 0 && optimizationOutcome && (
        <>
          {optimizationOutcome.status === 'improved' && optimizationResult && !isOptimizationAdopted && (
            <Card className="still-daily-checklist__card elterngeld-calculation__optimization-block elterngeld-calculation__optimization-block--proposed">
              <h3 className="elterngeld-step__title">Optimierungsvorschlag</h3>
              <p className="elterngeld-calculation__optimization-goal">
                <strong>Optimierungsziel:</strong> {GOAL_LABELS[optimizationGoal]}
              </p>
              <p className="elterngeld-step__hint elterngeld-step__hint--section">
                {optimizationResult.explanation}
              </p>
              <div className="elterngeld-calculation__optimization-metrics">
                <h4 className="elterngeld-calculation__optimization-metrics-title">Optimiert wurde</h4>
                <div className="elterngeld-calculation__optimization-metric-row">
                  <span>{optimizationResult.metricLabel}:</span>
                  <span>
                    {formatMetricValue(optimizationResult, optimizationResult.currentMetricValue)} →{' '}
                    {formatMetricValue(optimizationResult, optimizationResult.optimizedMetricValue)}
                    {optimizationResult.deltaValue !== 0 && (
                      <span
                        className={
                          optimizationResult.deltaValue > 0
                            ? 'elterngeld-calculation__optimization-diff elterngeld-calculation__optimization-diff--more'
                            : 'elterngeld-calculation__optimization-diff elterngeld-calculation__optimization-diff--less'
                        }
                      >
                        {' '}
                        ({optimizationResult.goal === 'longerDuration'
                          ? `+${optimizationResult.deltaValue} Monate`
                          : optimizationResult.goal === 'balanced'
                            ? 'geringere Schwankung'
                            : formatCurrencySigned(optimizationResult.deltaValue)})
                      </span>
                    )}
                  </span>
                </div>
                <ul className="elterngeld-calculation__optimization-improvements">
                  {optimizationResult.improvements.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="elterngeld-calculation__optimization-comparison">
                <div className="elterngeld-calculation__optimization-row">
                  <span className="elterngeld-calculation__optimization-label">Aktueller Plan</span>
                  <span className="elterngeld-calculation__optimization-value">
                    {formatCurrency(optimizationResult.currentTotal)}
                  </span>
                </div>
                <div className="elterngeld-calculation__optimization-row elterngeld-calculation__optimization-row--better">
                  <span className="elterngeld-calculation__optimization-label">Optimierte Strategie</span>
                  <span className="elterngeld-calculation__optimization-value">
                    {formatCurrency(optimizationResult.optimizedTotal)}
                    <span className="elterngeld-calculation__optimization-diff elterngeld-calculation__optimization-diff--more">
                      {' '}
                      ({formatCurrencySigned(optimizationResult.optimizedTotal - optimizationResult.currentTotal)})
                    </span>
                  </span>
                </div>
              </div>
              <p className="elterngeld-calculation__suggestion-hint">
                Dies ist ein Vorschlag. Die Monatsformulare werden erst nach Übernahme aktualisiert.
              </p>
              <div className="elterngeld-calculation__optimization-actions">
                {onAdoptOptimization && (
                  <Button
                    type="button"
                    variant="primary"
                    className="btn--softpill"
                    onClick={() => onAdoptOptimization(optimizationResult.plan)}
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
            </Card>
          )}

          {optimizationOutcome.status === 'improved' && optimizationResult && isOptimizationAdopted && (
            <Card className="still-daily-checklist__card elterngeld-calculation__optimization-block elterngeld-calculation__optimization-block--adopted">
              <h3 className="elterngeld-step__title">Aktive Berechnung</h3>
              <p className="elterngeld-calculation__adopted-banner">
                Aktive Berechnung basiert auf der optimierten Strategie.
              </p>
              <p className="elterngeld-step__hint elterngeld-step__hint--section">
                Der ursprüngliche Plan wurde als Vergleichsvariante gespeichert.
              </p>
            </Card>
          )}

          {optimizationOutcome.status === 'checked_but_not_better' && (
            <Card className="still-daily-checklist__card elterngeld-calculation__optimization-block elterngeld-calculation__optimization-block--no-better">
              <h3 className="elterngeld-step__title">Optimierungsziel: {GOAL_LABELS[optimizationGoal]}</h3>
              <p className="elterngeld-calculation__optimization-no-better">
                Ihr aktueller Plan ist für das gewählte Ziel bereits optimal.
              </p>
            </Card>
          )}

          {optimizationOutcome.status === 'no_candidate' && (
            <Card className="still-daily-checklist__card elterngeld-calculation__optimization-block elterngeld-calculation__optimization-block--no-candidate">
              <h3 className="elterngeld-step__title">Optimierungsziel: {GOAL_LABELS[optimizationGoal]}</h3>
              <p className="elterngeld-calculation__optimization-no-candidate">
                Für dieses Optimierungsziel konnte aus Ihrer aktuellen Planung keine automatische Vergleichsstrategie gebildet werden.
              </p>
            </Card>
          )}

          {optimizationOutcome.status === 'unsupported' && (
            <Card className="still-daily-checklist__card elterngeld-calculation__optimization-block elterngeld-calculation__optimization-block--unsupported">
              <h3 className="elterngeld-step__title">Optimierungsziel: {GOAL_LABELS[optimizationGoal]}</h3>
              <p className="elterngeld-calculation__optimization-unsupported">
                Dieses Optimierungsziel ist derzeit noch nicht vollständig unterstützt.
              </p>
            </Card>
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
