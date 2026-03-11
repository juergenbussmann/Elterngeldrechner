import React from 'react';

export type ChecklistItemRowProps = {
  id: string;
  label: React.ReactNode;
  description?: string;
  checked: boolean;
  onChange: () => void;
  /** Prefix für input id, um Kollisionen zu vermeiden (z.B. "checklist", "erst", "still") */
  idPrefix?: string;
};

/**
 * SSoT: Einheitliches Rendering für Checkbox + Label + Description.
 * Alle Checklisten nutzen diese Komponente für konsistente Ausrichtung.
 */
export const ChecklistItemRow: React.FC<ChecklistItemRowProps> = ({
  id,
  label,
  description,
  checked,
  onChange,
  idPrefix = 'checklist',
}) => {
  const inputId = `${idPrefix}-${id}`;
  return (
    <div className="checklist-item">
      <label className="checklist-item__row">
        <input
          type="checkbox"
          id={inputId}
          className="checklist-item__checkbox"
          checked={checked}
          onChange={onChange}
        />
        <span className="checklist-item__content">
          <span className="checklist-item__label">{label}</span>
          {description ? (
            <span className="checklist-item__description ui-text-muted ui-text-sm">{description}</span>
          ) : null}
        </span>
      </label>
    </div>
  );
};
