/**
 * Visuelle Monats-Timeline pro Elternteil.
 * Zeigt die Bezugsmodi der Lebensmonate als kompakte Kacheln.
 * Länge und Lücken werden aus den übergebenen Daten abgeleitet.
 */

import React, { useMemo } from 'react';
import type { MonthMode } from './calculation';

export interface MonthTimelineItem {
  month: number;
  mode: MonthMode;
  hasWarning?: boolean;
}

export interface MonthTimelineProps {
  months: MonthTimelineItem[];
  label?: string;
  /** Optionale Obergrenze (z. B. 14 oder 28). Ohne Angabe: höchster vorhandener Monat. */
  maxMonth?: number;
}

const MODE_SHORT: Record<MonthMode, string> = {
  none: '–',
  basis: 'B',
  plus: 'P',
  partnerBonus: 'PB',
};

const MODE_TITLE: Record<MonthMode, string> = {
  none: 'Kein Bezug',
  basis: 'Basiselterngeld',
  plus: 'ElterngeldPlus',
  partnerBonus: 'Partnerschaftsbonus',
};

export const MonthTimeline: React.FC<MonthTimelineProps> = ({ months, label, maxMonth: maxMonthProp }) => {
  const displayMonths = useMemo(() => {
    const dataMax = months.length > 0 ? Math.max(...months.map((m) => m.month)) : 0;
    const upper = maxMonthProp ?? dataMax;
    if (upper < 1) return [];

    const byMonth = new Map(months.map((m) => [m.month, m]));
    const result: MonthTimelineItem[] = [];
    for (let i = 1; i <= upper; i++) {
      const existing = byMonth.get(i);
      result.push(
        existing ?? { month: i, mode: 'none' as MonthMode, hasWarning: false }
      );
    }
    return result;
  }, [months, maxMonthProp]);

  return (
    <div className="month-timeline">
      {label && (
        <p className="month-timeline__label">{label}</p>
      )}
      <div
        className={`month-timeline__row${displayMonths.length > 16 ? ' month-timeline__row--scrollable' : ''}`}
        role="list"
        aria-label={label ?? 'Lebensmonate des Kindes'}
      >
        {displayMonths.map(({ month, mode, hasWarning }) => (
          <div
            key={month}
            role="listitem"
            className={`month-timeline__tile
              month-timeline__tile--${mode}
              ${hasWarning ? ' month-timeline__tile--warning' : ''}`}
            title={`Lebensmonat ${month}: ${MODE_TITLE[mode]}${hasWarning ? ' (Hinweis: prüfen)' : ''}`}
          >
            <span className="month-timeline__month-num" aria-hidden="true">
              {month}
            </span>
            <span
              className="month-timeline__mode-badge"
              aria-label={MODE_TITLE[mode]}
            >
              {MODE_SHORT[mode]}
            </span>
            {hasWarning && (
              <span
                className="month-timeline__warning-dot"
                aria-label="Hinweis"
                title="Bitte prüfen (z. B. Stunden)"
              />
            )}
          </div>
        ))}
      </div>
      <p className="month-timeline__legend" aria-hidden="true">
        Lebensmonate 1–14 · B=Basis · P=Plus · PB=PartnerBonus · – = kein Bezug geplant
      </p>
    </div>
  );
};
