/**
 * Zentrale Monatskomponente für Vorbereitung und Berechnung.
 * Zeigt eine Liste von Lebensmonaten mit UI-Zustand (mother | partner | both | none).
 * Verwendet MonthTile.
 */

import React from 'react';
import { MonthTile } from './MonthTile';

export type MonthGridState = 'mother' | 'partner' | 'both' | 'none';

export interface MonthGridItem {
  month: number;
  state: MonthGridState;
  label: string;
  subLabel?: string;
  hasWarning?: boolean;
}

export interface MonthGridProps {
  items: MonthGridItem[];
  onMonthClick?: (month: number) => void;
  activeMonth?: number;
  /** Temporär markierter Monat (z. B. kürzlich geändert) */
  changedMonth?: number | null;
  legend?: string;
}

export const MonthGrid: React.FC<MonthGridProps> = ({
  items,
  onMonthClick,
  activeMonth,
  changedMonth,
  legend = 'Klicke auf einen Monat, um die Zuordnung zu ändern.',
}) => {
  return (
    <div className="elterngeld-month-grid">
      <div
        className={`elterngeld-tile-grid${items.length > 16 ? ' elterngeld-tile-grid--scrollable' : ''}`}
        role="list"
        aria-label="Lebensmonate – Zuordnung"
      >
        {items.map(({ month, state, label, subLabel, hasWarning }) => {
          const isActive = activeMonth !== undefined && activeMonth === month;
          const isChanged = changedMonth !== undefined && changedMonth !== null && changedMonth === month;
          const ariaLabel = `${label}${subLabel ? ` – ${subLabel}` : ''}`;

          return (
            <MonthTile
              key={month}
              month={month}
              variant={state}
              label={label}
              subLabel={subLabel}
              clickable={!!onMonthClick}
              active={isActive}
              hasWarning={hasWarning}
              hasChanged={isChanged}
              onClick={onMonthClick ? () => onMonthClick(month) : undefined}
              ariaLabel={`Lebensmonat ${month}: ${ariaLabel}.${onMonthClick ? ' Klicken zum Ändern.' : ''}`}
            />
          );
        })}
      </div>
      {legend ? (
        <p className="elterngeld-tile-legend" aria-hidden="true">
          {legend}
        </p>
      ) : null}
    </div>
  );
};
