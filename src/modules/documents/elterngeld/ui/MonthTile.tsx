/**
 * Einheitliche Monatskachel für Vorbereitung und Berechnung.
 * Verwendet in MonthGrid (Vorbereitung und Berechnung).
 */

import React from 'react';

export type MonthTileVariant =
  | 'none'
  | 'basis'
  | 'plus'
  | 'partnerBonus'
  | 'mother'
  | 'partner'
  | 'both';

export interface MonthTileProps {
  month: number;
  variant: MonthTileVariant;
  /** Primärer Text (z.B. "Mutter", "B", "–") */
  label: string;
  /** Optionaler Zusatztext (z.B. "Basis", "Plus", "Bonus") – "Bonus" = bereits als Bonusmonat gesetzt */
  subLabel?: string;
  clickable?: boolean;
  active?: boolean;
  hasWarning?: boolean;
  /** Temporär: Monat wurde kürzlich geändert */
  hasChanged?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
  /** Block-Radius für zusammenhängende Kacheln */
  blockClass?: 'single' | 'start' | 'middle' | 'end';
}

export const MonthTile: React.FC<MonthTileProps> = ({
  month,
  variant,
  label,
  subLabel,
  clickable,
  active,
  hasWarning,
  hasChanged,
  onClick,
  ariaLabel,
  blockClass = 'single',
}) => {
  const blockMod = blockClass ? ` elterngeld-tile--block-${blockClass}` : '';
  const className = `elterngeld-tile
    elterngeld-tile--${variant}
    ${blockMod}
    ${clickable ? ' elterngeld-tile--clickable' : ''}
    ${active ? ' elterngeld-tile--active' : ''}
    ${hasWarning ? ' elterngeld-tile--warning' : ''}
    ${hasChanged ? ' elterngeld-tile--changed' : ''}`;

  const content = (
    <>
      {hasChanged && <span className="elterngeld-tile__changed-dot" aria-label="geändert" title="Geändert" />}
      <span className="elterngeld-tile__num">{month}</span>
      <span className="elterngeld-tile__label">{label}</span>
      {subLabel && <span className="elterngeld-tile__sublabel">{subLabel}</span>}
      {variant === 'both' && (
        <span className="elterngeld-tile__bonus-hint">
          {subLabel === 'Bonus' ? 'Bonus' : 'Bonusfähig'}
        </span>
      )}
      {hasWarning && (
        <span className="elterngeld-tile__warning" aria-label="Hinweis" title="Bitte prüfen" />
      )}
    </>
  );

  const bonusHint = variant === 'both' ? (subLabel === 'Bonus' ? ' – Bonus' : ' – Bonusfähig') : '';
  const defaultAriaLabel =
    ariaLabel ??
    `Lebensmonat ${month}: ${label}${subLabel ? ` – ${subLabel}` : ''}${bonusHint}`;

  if (clickable && onClick) {
    return (
      <button
        type="button"
        className={className}
        onClick={onClick}
        aria-label={defaultAriaLabel}
        aria-current={active ? 'true' : undefined}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={className} role="listitem" aria-label={defaultAriaLabel}>
      {content}
    </div>
  );
};
