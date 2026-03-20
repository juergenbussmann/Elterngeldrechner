/**
 * Eingabefeld für Einkommensbeträge (€).
 * - Feld darf leer sein (keine erzwungene 0)
 * - €-Zeichen als visueller Hinweis, tritt bei Eingabe in den Hintergrund
 * - Modellwert: 0 wenn leer, sonst parseFloat
 */

import React from 'react';
import { TextInput } from '../../../../shared/ui/TextInput';

function parseNum(value: string | undefined): number {
  const s = String(value ?? '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

export interface IncomeInputProps {
  value: number | undefined;
  onChange: (value: number) => void;
  placeholder?: string;
  min?: number;
  step?: number;
  id?: string;
  'aria-label'?: string;
}

export const IncomeInput: React.FC<IncomeInputProps> = ({
  value,
  onChange,
  placeholder,
  min = 0,
  step = 100,
  id,
  'aria-label': ariaLabel,
}) => {
  const displayValue = value === 0 || value === undefined || value === null ? '' : String(value);
  const hasValue = displayValue !== '';

  return (
    <span className="elterngeld-income-input">
      <span
        className={`elterngeld-income-input__prefix ${hasValue ? 'elterngeld-income-input__prefix--faded' : ''}`}
        aria-hidden
      >
        €
      </span>
      <TextInput
        id={id}
        type="number"
        min={min}
        step={step}
        value={displayValue}
        onChange={(e) => onChange(parseNum(e.target.value))}
        placeholder={placeholder}
        className="elterngeld-income-input__field"
        aria-label={ariaLabel}
      />
    </span>
  );
};
