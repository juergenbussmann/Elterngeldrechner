/**
 * Einheitlicher Auswahlbutton für Elterngeld-Screens.
 * Mutter / Partner / Beide / Kein Bezug, Modell-Auswahl, etc.
 * Zustände: normal, aktiv, deaktiviert.
 */

import React from 'react';

export type SelectButtonVariant = 'mother' | 'partner' | 'both' | 'none' | 'default';

export interface ElterngeldSelectButtonProps {
  label: string;
  /** Optionale Beschreibung (z.B. für applicant-mode-card) */
  description?: string;
  selected?: boolean;
  disabled?: boolean;
  variant?: SelectButtonVariant;
  showCheck?: boolean;
  onClick?: () => void;
  ariaPressed?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const ElterngeldSelectButton: React.FC<ElterngeldSelectButtonProps> = ({
  label,
  description,
  selected = false,
  disabled = false,
  variant = 'default',
  showCheck = true,
  onClick,
  ariaPressed,
  className = '',
  children,
}) => {
  const baseClass = 'elterngeld-select-btn';
  const variantClass = variant !== 'default' ? ` elterngeld-select-btn--${variant}` : '';
  const stateClass = selected ? ' elterngeld-select-btn--selected' : '';
  const disabledClass = disabled ? ' elterngeld-select-btn--disabled' : '';

  const fullClassName = `${baseClass}${variantClass}${stateClass}${disabledClass} ${className}`.trim();

  const content = (
    <>
      <span className="elterngeld-select-btn__label">
        <span className="elterngeld-select-btn__title">{label}</span>
        {description && <span className="elterngeld-select-btn__description">{description}</span>}
      </span>
      {selected && showCheck && <span className="elterngeld-select-btn__check" aria-hidden>✓</span>}
      {children}
    </>
  );

  if (onClick && !disabled) {
    return (
      <button
        type="button"
        className={fullClassName}
        onClick={onClick}
        aria-pressed={ariaPressed ?? selected}
        disabled={disabled}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={fullClassName} aria-disabled={disabled}>
      {content}
    </div>
  );
};
