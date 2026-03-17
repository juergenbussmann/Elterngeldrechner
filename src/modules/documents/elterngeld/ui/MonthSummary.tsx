/**
 * Monatszusammenfassung – kompakte Übersicht der Planverteilung.
 * Berechnet aus bestehendem Plan, keine neue Logik.
 */

import React from 'react';
import type { MonthGridItem } from './MonthGrid';

export interface MonthSummaryCounts {
  mother: number;
  partner: number;
  bonus: number;
  total: number;
}

export function computeMonthSummary(items: MonthGridItem[]): MonthSummaryCounts {
  let mother = 0;
  let partner = 0;
  let bonus = 0;
  for (const item of items) {
    if (item.state === 'mother') mother++;
    else if (item.state === 'partner') partner++;
    else if (item.state === 'both') bonus++;
  }
  return {
    mother,
    partner,
    bonus,
    total: mother + partner + bonus,
  };
}

export interface MonthSummaryProps {
  items: MonthGridItem[];
  compact?: boolean;
}

export const MonthSummary: React.FC<MonthSummaryProps> = ({ items, compact }) => {
  const { mother, partner, bonus, total } = computeMonthSummary(items);

  return (
    <div className={`elterngeld-month-summary ${compact ? 'elterngeld-month-summary--compact' : ''}`}>
      <h4 className="elterngeld-month-summary__title">Monatsübersicht</h4>
      <p className="elterngeld-month-summary__hint">
        Oben: sichtbare Lebensmonate im aktuellen Ausschnitt. Unten: berechnete Zuordnungen im Gesamtplan.
      </p>
      <div className="elterngeld-month-summary__grid">
        <span className="elterngeld-month-summary__row">
          <span className="elterngeld-month-summary__label">Zuordnungen Mutter:</span>
          <span className="elterngeld-month-summary__value">{mother} Monate</span>
        </span>
        <span className="elterngeld-month-summary__row">
          <span className="elterngeld-month-summary__label">Zuordnungen Partner:</span>
          <span className="elterngeld-month-summary__value">{partner} Monate</span>
        </span>
        <span className="elterngeld-month-summary__row">
          <span className="elterngeld-month-summary__label">Bonus:</span>
          <span className="elterngeld-month-summary__value">{bonus} Monate</span>
        </span>
        <span className="elterngeld-month-summary__row elterngeld-month-summary__row--total">
          <span className="elterngeld-month-summary__label">Gesamt:</span>
          <span className="elterngeld-month-summary__value">{total} Monate</span>
        </span>
      </div>
    </div>
  );
};
