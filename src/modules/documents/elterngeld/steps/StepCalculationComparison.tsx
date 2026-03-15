/**
 * Vergleichsansicht für zwei Elterngeld-Varianten.
 * Nutzt dieselbe Berechnungslogik wie die normale Ergebnisansicht.
 */

import React from 'react';
import { Card } from '../../../../shared/ui/Card';
import type { CalculationResult, ParentCalculationResult } from '../calculation';

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

const MODE_LABELS: Record<string, string> = {
  none: '–',
  basis: 'Basis',
  plus: 'Plus',
  partnerBonus: 'PartnerBonus',
};

function getAmountForMonth(parent: ParentCalculationResult, month: number): number {
  const r = parent.monthlyResults.find((m) => m.month === month);
  return r?.amount ?? 0;
}

function getModeForMonth(parent: ParentCalculationResult, month: number): string {
  const r = parent.monthlyResults.find((m) => m.month === month);
  return r ? (MODE_LABELS[r.mode] ?? r.mode) : '–';
}

type Props = {
  resultA: CalculationResult;
  resultB: CalculationResult;
  labelA?: string;
  labelB?: string;
};

export const StepCalculationComparison: React.FC<Props> = ({
  resultA,
  resultB,
  labelA = 'Aktueller Plan',
  labelB = 'Vergleichsvariante',
}) => {
  const totalA = resultA.householdTotal;
  const totalB = resultB.householdTotal;
  const diff = totalB - totalA;

  const allMonths = Array.from({ length: 14 }, (_, i) => i + 1);
  const monthsWithActivity = allMonths.filter((month) => {
    const hasA = resultA.parents.some((p) => getAmountForMonth(p, month) > 0);
    const hasB = resultB.parents.some((p) => getAmountForMonth(p, month) > 0);
    return hasA || hasB;
  });

  return (
    <div className="elterngeld-comparison">
      <Card className="still-daily-checklist__card elterngeld-comparison__summary">
        <h3 className="elterngeld-step__title">Vergleich</h3>
        <div className="elterngeld-comparison__totals">
          <div className="elterngeld-comparison__total-block">
            <span className="elterngeld-comparison__total-label">{labelA}</span>
            <span className="elterngeld-comparison__total-value">{formatCurrency(totalA)}</span>
          </div>
          <div className="elterngeld-comparison__total-block">
            <span className="elterngeld-comparison__total-label">{labelB}</span>
            <span className="elterngeld-comparison__total-value">{formatCurrency(totalB)}</span>
          </div>
          <div
            className={`elterngeld-comparison__diff ${diff > 0 ? 'elterngeld-comparison__diff--more' : diff < 0 ? 'elterngeld-comparison__diff--less' : ''}`}
          >
            <span className="elterngeld-comparison__diff-label">Differenz</span>
            <span className="elterngeld-comparison__diff-value">
              {diff > 0 ? 'Mehr' : diff < 0 ? 'Weniger' : 'Gleich'}: {formatCurrencySigned(diff)}
            </span>
          </div>
        </div>
      </Card>

      <Card className="still-daily-checklist__card">
        <h3 className="elterngeld-step__title">Vergleich pro Lebensmonat</h3>
        <p className="elterngeld-step__hint elterngeld-step__hint--section">
          Unterschiede in diesen Lebensmonaten
        </p>
        <div className="elterngeld-comparison__table-wrap">
          <table className="elterngeld-calculation__table elterngeld-comparison__table">
            <thead>
              <tr>
                <th className="elterngeld-comparison__col-month elterngeld-comparison__th-wrap elterngeld-comparison__th-no-hyphen">
                  Lebens-
                  <br />
                  monat
                </th>
                <th className="elterngeld-comparison__col-person">Person</th>
                <th className="elterngeld-calculation__th-right elterngeld-comparison__col-amount elterngeld-comparison__th-wrap elterngeld-comparison__th-no-hyphen">
                  {labelA}
                </th>
                <th className="elterngeld-calculation__th-right elterngeld-comparison__col-amount elterngeld-comparison__th-wrap">
                  {labelB}
                </th>
                <th className="elterngeld-calculation__th-right elterngeld-comparison__col-amount">Diff.</th>
              </tr>
            </thead>
            <tbody>
              {monthsWithActivity.map((month) =>
                resultA.parents.map((parentA, idx) => {
                  const parentB = resultB.parents[idx];
                  if (!parentB) return null;
                  const amountA = getAmountForMonth(parentA, month);
                  const amountB = getAmountForMonth(parentB, month);
                  const monthDiff = amountB - amountA;
                  if (amountA === 0 && amountB === 0) return null;
                  const hasDiff = monthDiff !== 0;
                  return (
                    <tr
                      key={`${month}-${parentA.id}`}
                      className={hasDiff ? 'elterngeld-comparison__row--diff' : undefined}
                    >
                      <td className="elterngeld-comparison__col-month">{month}</td>
                      <td className="elterngeld-comparison__col-person">{parentA.label}</td>
                      <td className="elterngeld-calculation__td-right">
                        {amountA > 0 ? formatCurrency(amountA) : '–'}
                      </td>
                      <td className="elterngeld-calculation__td-right">
                        {amountB > 0 ? formatCurrency(amountB) : '–'}
                      </td>
                      <td className="elterngeld-calculation__td-right">
                        {hasDiff ? (
                          <span
                            className={
                              monthDiff > 0
                                ? 'elterngeld-comparison__cell--more'
                                : 'elterngeld-comparison__cell--less'
                            }
                          >
                            {formatCurrencySigned(monthDiff)}
                          </span>
                        ) : (
                          '–'
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {monthsWithActivity.length === 0 && (
          <p className="elterngeld-calculation__no-data">
            In beiden Varianten sind keine Bezugsmonate geplant.
          </p>
        )}
      </Card>
    </div>
  );
};
