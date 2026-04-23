import React, { useState, useCallback } from 'react';
import type { SelectionOption } from './SelectionModal';
import { SelectionModal } from './SelectionModal';
import './SelectionField.css';

export interface SelectionFieldProps {
  label: string;
  placeholder?: string;
  value?: string;
  options: SelectionOption[];
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  hint?: string;
  /** CSS class for the wrapper */
  className?: string;
  /** Match documents-form styling */
  variant?: 'default' | 'documents-form';
}

export const SelectionField: React.FC<SelectionFieldProps> = ({
  label,
  placeholder = '– Bitte wählen –',
  value,
  options,
  onChange,
  required,
  error,
  hint,
  className = '',
  variant = 'default',
}) => {
  const [open, setOpen] = useState(false);

  const displayLabel = options.find((o) => o.value === value)?.label ?? null;
  const displayValue = displayLabel || placeholder;

  const handleSelect = useCallback(
    (v: string) => {
      onChange(v);
      setOpen(false);
    },
    [onChange]
  );

  const baseClass = variant === 'documents-form' ? 'selection-field--documents-form' : '';

  return (
    <div className={`selection-field ${baseClass} ${className}`.trim()}>
      <div className="selection-field__label-row">
        <span className="selection-field__label">
          {label}
          {required && <span className="selection-field__required"> *</span>}
        </span>
        {hint && <span className="selection-field__hint">{hint}</span>}
        {error && <span className="selection-field__error">{error}</span>}
      </div>
      <button
        type="button"
        className={`selection-field__trigger${!value ? ' selection-field__trigger--placeholder' : ''}`}
        onClick={() => setOpen(true)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={!!error}
        aria-label={label}
      >
        <span className="selection-field__trigger-text">{displayValue}</span>
        <span className="selection-field__trigger-chevron" aria-hidden="true">
          ▼
        </span>
      </button>
      <SelectionModal
        open={open}
        title={label}
        options={options}
        value={value}
        onSelect={handleSelect}
        onClose={() => setOpen(false)}
        sheetClassName={
          variant === 'documents-form' ? 'selection-modal__sheet--parental-leave-gold' : undefined
        }
      />
    </div>
  );
};
