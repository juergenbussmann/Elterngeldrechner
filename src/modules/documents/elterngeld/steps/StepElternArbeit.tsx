/**
 * Schritt Eltern & Arbeit – Wer nimmt Elternzeit?
 * Antragsteller-Modus, Eltern-Daten und Erwerbstätigkeit (Einkommen ist in StepEinkommen).
 */

import React from 'react';
import { Card } from '../../../../shared/ui/Card';
import { TextInput } from '../../../../shared/ui/TextInput';
import { SelectionField } from '../../../../shared/ui/SelectionModal';
import { ElterngeldSelectButton } from '../ui/ElterngeldSelectButton';
import { ElternArbeitPlannedPartTimeBlock } from './PartTimeWeeklyHoursField';
import type {
  ElterngeldApplication,
  ElterngeldParent,
  EmploymentType,
  ApplicantMode,
} from '../types/elterngeldTypes';
import { EMPTY_ELTERNGELD_PARENT } from '../types/elterngeldTypes';

const EMPLOYMENT_OPTIONS = [
  { value: 'employed' as EmploymentType, label: 'Angestellt' },
  { value: 'self_employed' as EmploymentType, label: 'Selbstständig' },
  { value: 'mixed' as EmploymentType, label: 'Gemischt' },
  { value: 'none' as EmploymentType, label: 'Keine Erwerbstätigkeit' },
];

const APPLICANT_MODE_OPTIONS: { value: ApplicantMode; label: string; description: string }[] = [
  { value: 'single_applicant', label: 'Nur ich', description: 'Ein Elternteil beantragt Elterngeld' },
  { value: 'both_parents', label: 'Beide Elternteile', description: 'Beide Elternteile planen Elterngeld' },
  { value: 'single_parent', label: 'Ich bin alleinerziehend', description: 'Elterngeld als alleinerziehende Person' },
];

type Props = {
  values: ElterngeldApplication;
  onChange: (values: ElterngeldApplication) => void;
};

export const StepElternArbeit: React.FC<Props> = ({ values, onChange }) => {
  const updateParentA = (field: string, value: string | boolean | number | undefined) => {
    onChange({
      ...values,
      parentA: { ...values.parentA, [field]: value },
    });
  };

  const updateParentB = (field: string, value: string | boolean | number | undefined) => {
    const parentB = values.parentB ?? EMPTY_ELTERNGELD_PARENT;
    onChange({
      ...values,
      parentB: { ...parentB, [field]: value },
    });
  };

  const updateApplicantMode = (mode: ApplicantMode) => {
    if (mode === 'single_parent') {
      onChange({ ...values, applicantMode: mode, parentB: null });
    } else {
      const parentB = values.parentB ?? EMPTY_ELTERNGELD_PARENT;
      onChange({ ...values, applicantMode: mode, parentB });
    }
  };

  const showParentB = values.applicantMode === 'single_applicant' || values.applicantMode === 'both_parents';
  const showFullParentB = values.applicantMode === 'both_parents';
  const parentB: ElterngeldParent = values.parentB ?? EMPTY_ELTERNGELD_PARENT;

  return (
    <Card id="elterngeld-step-eltern-arbeit" className="still-daily-checklist__card">
      <h3 className="elterngeld-step__title">Wer nimmt Elternzeit?</h3>
      <div className="elterngeld-step__fields">
        <div className="elterngeld-step__label">
          <span>Wer beantragt Elterngeld?</span>
          <div className="elterngeld-select-btn-group">
            {APPLICANT_MODE_OPTIONS.map((opt) => (
              <ElterngeldSelectButton
                key={opt.value}
                label={opt.label}
                description={opt.description}
                selected={values.applicantMode === opt.value}
                onClick={() => updateApplicantMode(opt.value)}
                ariaPressed={values.applicantMode === opt.value}
              />
            ))}
          </div>
        </div>

        <h4 className="elterngeld-step__section-title">Mutter</h4>
        <label className="elterngeld-step__label">
          <span>Vorname</span>
          <TextInput value={values.parentA.firstName} onChange={(e) => updateParentA('firstName', e.target.value)} />
        </label>
        <label className="elterngeld-step__label">
          <span>Nachname</span>
          <TextInput value={values.parentA.lastName} onChange={(e) => updateParentA('lastName', e.target.value)} />
        </label>
        <SelectionField
          label="Beschäftigungsart"
          placeholder="– Bitte wählen –"
          value={values.parentA.employmentType}
          options={EMPLOYMENT_OPTIONS}
          onChange={(v) => updateParentA('employmentType', v)}
        />
        <div id="elterngeld-step-eltern-arbeit-teilzeit">
          <ElternArbeitPlannedPartTimeBlock
            plannedPartTime={values.parentA.plannedPartTime}
            hoursPerWeek={values.parentA.hoursPerWeek}
            onPlannedPartTimeChange={(v) => updateParentA('plannedPartTime', v)}
            onHoursChange={(v) => updateParentA('hoursPerWeek', v)}
          />
        </div>

        {showParentB && (
          <>
            <h4 className="elterngeld-step__section-title">Partner / Partnerin</h4>
            <label className="elterngeld-step__label">
              <span>Vorname</span>
              <TextInput value={parentB.firstName} onChange={(e) => updateParentB('firstName', e.target.value)} />
            </label>
            <label className="elterngeld-step__label">
              <span>Nachname</span>
              <TextInput value={parentB.lastName} onChange={(e) => updateParentB('lastName', e.target.value)} />
            </label>
            {showFullParentB && (
              <>
                <SelectionField
                  label="Beschäftigungsart"
                  placeholder="– Bitte wählen –"
                  value={parentB.employmentType}
                  options={EMPLOYMENT_OPTIONS}
                  onChange={(v) => updateParentB('employmentType', v)}
                />
                <div>
                  <ElternArbeitPlannedPartTimeBlock
                    plannedPartTime={parentB.plannedPartTime}
                    hoursPerWeek={parentB.hoursPerWeek}
                    onPlannedPartTimeChange={(v) => updateParentB('plannedPartTime', v)}
                    onHoursChange={(v) => updateParentB('hoursPerWeek', v)}
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Card>
  );
};
