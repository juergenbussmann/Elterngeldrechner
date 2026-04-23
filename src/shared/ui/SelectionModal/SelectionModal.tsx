import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../lib/i18n';
import './SelectionModal.css';

export interface SelectionOption {
  value: string;
  label: string;
  description?: string;
}

export interface SelectionModalProps {
  open: boolean;
  title: string;
  options: SelectionOption[];
  value?: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  /** Extra class on the sheet panel (e.g. Elternzeit-Flow gold-standard sheet). */
  sheetClassName?: string;
}

export const SelectionModal: React.FC<SelectionModalProps> = ({
  open,
  title,
  options,
  value,
  onSelect,
  onClose,
  sheetClassName,
}) => {
  const { t } = useI18n();
  const listRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (open && listRef.current) {
      const selected = listRef.current.querySelector('[data-selected="true"]');
      selected?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    }
  }, [open, value]);

  if (!open) return null;

  const modalContent = (
    <div
      className="selection-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="selection-modal-title"
      onKeyDown={handleKeyDown}
    >
      <div className="selection-modal__backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className={['selection-modal__sheet', sheetClassName].filter(Boolean).join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="selection-modal__handle" aria-hidden="true" />
        <header className="selection-modal__header">
          <h2 id="selection-modal-title" className="selection-modal__title">
            {title}
          </h2>
          <button
            type="button"
            className="selection-modal__close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </header>
        <div
          ref={listRef}
          className="selection-modal__list"
          role="listbox"
          aria-label={title}
        >
          {options.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                data-selected={isSelected ? 'true' : undefined}
                className={`selection-modal__option${isSelected ? ' selection-modal__option--selected' : ''}`}
                onClick={() => {
                  onSelect(opt.value);
                  onClose();
                }}
              >
                <span className="selection-modal__option-label">{opt.label}</span>
                {opt.description && (
                  <span className="selection-modal__option-desc">{opt.description}</span>
                )}
                {isSelected && (
                  <span className="selection-modal__option-check" aria-hidden="true">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
