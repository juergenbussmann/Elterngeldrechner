/**
 * Kompakte visuelle Monats-Timeline als Plan-Zusammenfassung.
 * Zeigt Lebensmonate 1–14 als farbige Segmente.
 * Nutzt dieselbe Zustandslogik und Farben wie MonthTile.
 */

import React from 'react';
import type { MonthGridItem } from './MonthGrid';

export interface PlanTimelineProps {
  items: MonthGridItem[];
  /** Optional: Klick auf Segment springt zum Monat */
  onMonthClick?: (month: number) => void;
  /** Optional: Monatsnummern anzeigen */
  showMonthNumbers?: boolean;
  /** Optional: Legende anzeigen */
  showLegend?: boolean;
  /** Optional: Kompakte Darstellung (weniger Höhe) */
  compact?: boolean;
}

const STATE_COLORS: Record<MonthGridItem['state'], string> = {
  none: 'var(--elterngeld-timeline-none, rgba(248, 250, 252, 0.95))',
  mother: 'var(--elterngeld-timeline-mother, rgba(37, 99, 235, 0.5))',
  partner: 'var(--elterngeld-timeline-partner, rgba(34, 197, 94, 0.5))',
  both: 'var(--elterngeld-timeline-both, rgba(168, 85, 247, 0.5))',
};

const STATE_BORDERS: Record<MonthGridItem['state'], string> = {
  none: 'var(--elterngeld-timeline-none-border, #e2e8f0)',
  mother: 'var(--elterngeld-timeline-mother-border, rgba(37, 99, 235, 0.6))',
  partner: 'var(--elterngeld-timeline-partner-border, rgba(34, 197, 94, 0.6))',
  both: 'var(--elterngeld-timeline-both-border, rgba(168, 85, 247, 0.6))',
};

export const PlanTimeline: React.FC<PlanTimelineProps> = ({
  items,
  onMonthClick,
  showMonthNumbers = false,
  showLegend = false,
  compact = false,
}) => {
  return (
    <div
      className={`elterngeld-plan-timeline ${compact ? 'elterngeld-plan-timeline--compact' : ''}`}
      role="img"
      aria-label="Plan-Zusammenfassung: Lebensmonate 1 bis 14"
    >
      <div
        className="elterngeld-plan-timeline__bar"
        role="list"
        aria-label="Lebensmonate"
      >
        {items.map(({ month, state, label, subLabel }) => {
          const style = {
            backgroundColor: STATE_COLORS[state],
            borderColor: STATE_BORDERS[state],
          };
          const content = (
            <>
              {showMonthNumbers && <span className="elterngeld-plan-timeline__num">{month}</span>}
              {!showMonthNumbers && (
                <span className="elterngeld-plan-timeline__tooltip" title={`LM ${month}: ${label}${subLabel ? ` – ${subLabel}` : ''}`} />
              )}
            </>
          );
          const ariaLabel = `Lebensmonat ${month}: ${label}${subLabel ? ` – ${subLabel}` : ''}`;

          if (onMonthClick) {
            return (
              <button
                key={month}
                type="button"
                className="elterngeld-plan-timeline__segment elterngeld-plan-timeline__segment--clickable"
                style={style}
                onClick={() => onMonthClick(month)}
                aria-label={ariaLabel}
                title={`LM ${month}: ${label}${subLabel ? ` – ${subLabel}` : ''}`}
              >
                {content}
              </button>
            );
          }

          return (
            <div
              key={month}
              className="elterngeld-plan-timeline__segment"
              style={style}
              role="listitem"
              aria-label={ariaLabel}
              title={`LM ${month}: ${label}${subLabel ? ` – ${subLabel}` : ''}`}
            >
              {content}
            </div>
          );
        })}
      </div>
      {showMonthNumbers && (
        <div className="elterngeld-plan-timeline__axis">
          {items.map(({ month }) => (
            <span key={month} className="elterngeld-plan-timeline__axis-num">
              {month}
            </span>
          ))}
        </div>
      )}
      {showLegend && (
        <div className="elterngeld-plan-timeline__legend">
          <span className="elterngeld-plan-timeline__legend-item elterngeld-plan-timeline__legend-item--mother">Mutter</span>
          <span className="elterngeld-plan-timeline__legend-item elterngeld-plan-timeline__legend-item--partner">Partner</span>
          <span className="elterngeld-plan-timeline__legend-item elterngeld-plan-timeline__legend-item--both">Beide</span>
          <span className="elterngeld-plan-timeline__legend-item elterngeld-plan-timeline__legend-item--none">Kein Bezug</span>
        </div>
      )}
    </div>
  );
};
