/**
 * Gemeinsame Teilzeit-UI wie im Schritt „Eltern & Arbeit“ (Checkbox + Wochenstunden + Hinweis).
 */

import React, { useState } from 'react';
import type { ElterngeldApplication, ElterngeldParent } from '../types/elterngeldTypes';
import { EMPTY_ELTERNGELD_PARENT } from '../types/elterngeldTypes';

export type PartTimeWeeklyHoursFieldProps = {
  hoursPerWeek?: number;
  onHoursChange: (value: number | undefined) => void;
};

/** Einzelnes Feld inkl. Hinweise (identisch zu StepElternArbeit). */
export function PartTimeWeeklyHoursField({ hoursPerWeek, onHoursChange }: PartTimeWeeklyHoursFieldProps) {
  return (
    <div className="elterngeld-step__hours-field">
      <label className="elterngeld-step__label">
        <span>Wochenstunden nach Geburt</span>
        <input
          type="number"
          min={0}
          max={60}
          step={0.5}
          value={hoursPerWeek ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            onHoursChange(v === '' ? undefined : parseFloat(v) || 0);
          }}
          placeholder="z.B. 30"
          className="elterngeld-step__number-input"
        />
      </label>
      <p className="elterngeld-step__hint elterngeld-step__hint--small">
        Für Partnerschaftsbonus: 24–32 Stunden pro Woche
      </p>
      {hoursPerWeek != null && (hoursPerWeek < 24 || hoursPerWeek > 32) && hoursPerWeek > 0 && (
        <p className="elterngeld-step__hint elterngeld-step__hint--warning">
          Nicht im Bereich für Partnerschaftsbonus
        </p>
      )}
    </div>
  );
}

type ElternArbeitPlannedPartTimeBlockProps = {
  plannedPartTime: boolean;
  hoursPerWeek?: number;
  onPlannedPartTimeChange: (value: boolean) => void;
  onHoursChange: (value: number | undefined) => void;
};

/**
 * Checkbox „Geplante Teilzeit nach Geburt“, Stundenfeld und aufklappbarer Hinweis – identisch zum Wizard.
 */
export function ElternArbeitPlannedPartTimeBlock({
  plannedPartTime,
  hoursPerWeek,
  onPlannedPartTimeChange,
  onHoursChange,
}: ElternArbeitPlannedPartTimeBlockProps) {
  const [showTeilzeitDetails, setShowTeilzeitDetails] = useState(false);

  return (
    <>
      <label className="elterngeld-step__label elterngeld-step__label--row">
        <input
          type="checkbox"
          checked={plannedPartTime}
          onChange={(e) => onPlannedPartTimeChange(e.target.checked)}
        />
        <span>Geplante Teilzeit nach Geburt</span>
      </label>
      {plannedPartTime && (
        <PartTimeWeeklyHoursField hoursPerWeek={hoursPerWeek} onHoursChange={onHoursChange} />
      )}
      <div className="elterngeld-hint elterngeld-hint--teilzeit">
        <p className="elterngeld-hint__text">Teilzeit kann die Höhe des Elterngeldes beeinflussen.</p>
        <button
          type="button"
          className="elterngeld-hint__toggle"
          onClick={() => setShowTeilzeitDetails((v) => !v)}
          aria-expanded={showTeilzeitDetails}
        >
          {showTeilzeitDetails ? 'Weniger anzeigen' : 'Mehr erfahren'}
        </button>
        {showTeilzeitDetails && (
          <div className="elterngeld-hint__details">
            <h4 className="elterngeld-hint__details-title">Teilzeit während Elterngeld</h4>
            <p className="elterngeld-hint__details-text">Teilzeit während des Elterngeldbezugs ist möglich.</p>
            <p className="elterngeld-hint__details-text">
              Wenn während des Elterngeldbezugs Einkommen erzielt wird, kann sich die Höhe des Elterngeldes verändern.
            </p>
            <p className="elterngeld-hint__details-text">
              Wenn beide Eltern gleichzeitig in Teilzeit arbeiten, können Partnerschaftsbonus-Monate möglich sein.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

type ElternArbeitPartTimeEditorProps = {
  values: ElterngeldApplication;
  onChange: (values: ElterngeldApplication) => void;
};

const updateApplicationParentA = (
  values: ElterngeldApplication,
  field: string,
  value: string | boolean | number | undefined
): ElterngeldApplication => ({
  ...values,
  parentA: { ...values.parentA, [field]: value },
});

const updateApplicationParentB = (
  values: ElterngeldApplication,
  field: string,
  value: string | boolean | number | undefined
): ElterngeldApplication => {
  const parentB = values.parentB ?? EMPTY_ELTERNGELD_PARENT;
  return {
    ...values,
    parentB: { ...parentB, [field]: value },
  };
};

/** Mutter- und ggf. Partner-Teilzeitblöcke (Überschriften + gleiche Interaktionen wie im Schritt „Eltern & Arbeit“). */
export function ElternArbeitPartTimeEditor({ values, onChange }: ElternArbeitPartTimeEditorProps) {
  const showFullParentB = values.applicantMode === 'both_parents';
  const parentB: ElterngeldParent = values.parentB ?? EMPTY_ELTERNGELD_PARENT;

  return (
    <div className="elterngeld-step__fields">
      <h4 className="elterngeld-step__section-title">Mutter</h4>
      <div id="elterngeld-step-eltern-arbeit-teilzeit">
        <ElternArbeitPlannedPartTimeBlock
          plannedPartTime={values.parentA.plannedPartTime}
          hoursPerWeek={values.parentA.hoursPerWeek}
          onPlannedPartTimeChange={(v) => onChange(updateApplicationParentA(values, 'plannedPartTime', v))}
          onHoursChange={(v) => onChange(updateApplicationParentA(values, 'hoursPerWeek', v))}
        />
      </div>
      {showFullParentB && (
        <>
          <h4 className="elterngeld-step__section-title">Partner / Partnerin</h4>
          <div>
            <ElternArbeitPlannedPartTimeBlock
              plannedPartTime={parentB.plannedPartTime}
              hoursPerWeek={parentB.hoursPerWeek}
              onPlannedPartTimeChange={(v) => onChange(updateApplicationParentB(values, 'plannedPartTime', v))}
              onHoursChange={(v) => onChange(updateApplicationParentB(values, 'hoursPerWeek', v))}
            />
          </div>
        </>
      )}
    </div>
  );
}
