/**
 * Statuszeile über der Monatsansicht.
 * Zeigt den aktuell ausgewählten Monat und seinen Zustand (wer bezieht, welcher Modus).
 */

import React from 'react';

export type MonthStatusWho = 'mother' | 'partner' | 'both' | 'none';
export type MonthStatusMode = 'basis' | 'plus' | 'partnerBonus' | 'none';

const WHO_LABELS: Record<MonthStatusWho, string> = {
  mother: 'Mutter',
  partner: 'Partner',
  both: 'Beide',
  none: 'Kein Bezug',
};

const MODE_LABELS: Record<MonthStatusMode, string> = {
  basis: 'Basiselterngeld',
  plus: 'ElterngeldPlus',
  partnerBonus: 'Partnerschaftsbonus',
  none: '',
};

export interface MonthStatusBarProps {
  /** Aktuell ausgewählter Monat (null = keiner) */
  activeMonth: number | null;
  /** Wer bezieht in diesem Monat */
  who: MonthStatusWho;
  /** Modus (nur relevant bei who !== 'none') */
  mode?: MonthStatusMode;
  /** Optionale Legende unter der Statuszeile anzeigen */
  showLegend?: boolean;
}

export const MonthStatusBar: React.FC<MonthStatusBarProps> = ({
  activeMonth,
  who,
  mode = 'none',
  showLegend = false,
}) => {
  const statusText =
    who === 'none'
      ? WHO_LABELS.none
      : mode && mode !== 'none'
        ? `${WHO_LABELS[who]} · ${MODE_LABELS[mode]}`
        : WHO_LABELS[who];

  return (
    <div className="elterngeld-month-status-bar">
      <p className="elterngeld-month-status-bar__line" aria-live="polite">
        {activeMonth !== null ? (
          <>
            <span className="elterngeld-month-status-bar__prefix">
              Auswahl für Lebensmonat {activeMonth}
            </span>
            <span className="elterngeld-month-status-bar__status">{statusText}</span>
          </>
        ) : (
          <span className="elterngeld-month-status-bar__placeholder">
            Klicke auf einen Monat zur Auswahl
          </span>
        )}
      </p>
      {showLegend && (
        <p className="elterngeld-month-status-bar__legend" aria-hidden="true">
          Mutter = nur Mutter bezieht · Partner = nur Partner bezieht · Beide = beide beziehen · Kein Bezug = kein Elterngeld in diesem Monat
        </p>
      )}
    </div>
  );
};
