import React from 'react';
import { Card } from '../../../../shared/ui/Card';
import { TextInput } from '../../../../shared/ui/TextInput';
import { SelectionField } from '../../../../shared/ui/SelectionModal';
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
  {
    value: 'single_applicant',
    label: 'Nur ich',
    description: 'Ein Elternteil beantragt Elterngeld',
  },
  {
    value: 'both_parents',
    label: 'Beide Elternteile',
    description: 'Beide Elternteile planen Elterngeld',
  },
  {
    value: 'single_parent',
    label: 'Ich bin alleinerziehend',
    description: 'Elterngeld als alleinerziehende Person',
  },
];

type Props = {
  values: ElterngeldApplication;
  onChange: (values: ElterngeldApplication) => void;
};

export const StepParents: React.FC<Props> = ({ values, onChange }) => {
  const updateParentA = (field: string, value: string | boolean) => {
    onChange({
      ...values,
      parentA: { ...values.parentA, [field]: value },
    });
  };

  const updateParentB = (field: string, value: string | boolean) => {
    const parentB = values.parentB ?? EMPTY_ELTERNGELD_PARENT;
    onChange({
      ...values,
      parentB: { ...parentB, [field]: value },
    });
  };

  const updateApplicantMode = (mode: ApplicantMode) => {
    if (mode === 'single_parent') {
      onChange({
        ...values,
        applicantMode: mode,
        parentB: null,
      });
    } else {
      const parentB = values.parentB ?? EMPTY_ELTERNGELD_PARENT;
      onChange({
        ...values,
        applicantMode: mode,
        parentB,
      });
    }
  };

  const showParentB = values.applicantMode === 'single_applicant' || values.applicantMode === 'both_parents';
  const showFullParentB = values.applicantMode === 'both_parents';
  const parentB: ElterngeldParent = values.parentB ?? EMPTY_ELTERNGELD_PARENT;

  return (
    <Card className="still-daily-checklist__card">
      <h3 className="elterngeld-step__title">Eltern & Arbeit</h3>
      <div className="elterngeld-step__fields">
        <div className="elterngeld-step__label">
          <span>Wer beantragt Elterngeld?</span>
          <div className="applicant-mode-options">
            {APPLICANT_MODE_OPTIONS.map((opt) => {
              const isSelected = values.applicantMode === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`applicant-mode-card${isSelected ? ' applicant-mode-card--selected' : ''}`}
                  onClick={() => updateApplicantMode(opt.value)}
                  aria-pressed={isSelected}
                >
                  <span className="applicant-mode-card__title">{opt.label}</span>
                  <span className="applicant-mode-card__description">{opt.description}</span>
                  {isSelected && (
                    <span className="applicant-mode-card__check" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="elterngeld-step__hint elterngeld-step__hint--below">
            Diese Angabe hilft bei der späteren Planung der Elterngeld-Monate.
          </p>
        </div>

        <h4 className="elterngeld-step__section-title">Elternteil A</h4>
        <label className="elterngeld-step__label">
          <span>Elternteil A – Vorname</span>
          <TextInput
            value={values.parentA.firstName}
            onChange={(e) => updateParentA('firstName', e.target.value)}
          />
        </label>
        <label className="elterngeld-step__label">
          <span>Elternteil A – Nachname</span>
          <TextInput
            value={values.parentA.lastName}
            onChange={(e) => updateParentA('lastName', e.target.value)}
          />
        </label>
        <SelectionField
          label="Beschäftigungsart"
          placeholder="– Bitte wählen –"
          value={values.parentA.employmentType}
          options={EMPLOYMENT_OPTIONS}
          onChange={(v) => updateParentA('employmentType', v)}
        />
        <label className="elterngeld-step__label">
          <span>Einkommen vor Geburt (optional)</span>
          <TextInput
            type="text"
            value={values.parentA.incomeBeforeBirth}
            onChange={(e) => updateParentA('incomeBeforeBirth', e.target.value)}
            placeholder="z. B. monatlich netto"
          />
        </label>
        <label className="elterngeld-step__label elterngeld-step__label--row">
          <input
            type="checkbox"
            checked={values.parentA.plannedPartTime}
            onChange={(e) => updateParentA('plannedPartTime', e.target.checked)}
          />
          <span>Geplante Teilzeit nach Geburt</span>
        </label>

        {showParentB && (
          <>
            <h4 className="elterngeld-step__section-title">Elternteil B</h4>
            <label className="elterngeld-step__label">
              <span>Elternteil B – Vorname</span>
              <TextInput
                value={parentB.firstName}
                onChange={(e) => updateParentB('firstName', e.target.value)}
              />
            </label>
            <label className="elterngeld-step__label">
              <span>Elternteil B – Nachname</span>
              <TextInput
                value={parentB.lastName}
                onChange={(e) => updateParentB('lastName', e.target.value)}
              />
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
                <label className="elterngeld-step__label">
                  <span>Einkommen vor Geburt (optional)</span>
                  <TextInput
                    type="text"
                    value={parentB.incomeBeforeBirth}
                    onChange={(e) => updateParentB('incomeBeforeBirth', e.target.value)}
                    placeholder="z. B. monatlich netto"
                  />
                </label>
                <label className="elterngeld-step__label elterngeld-step__label--row">
                  <input
                    type="checkbox"
                    checked={parentB.plannedPartTime}
                    onChange={(e) => updateParentB('plannedPartTime', e.target.checked)}
                  />
                  <span>Geplante Teilzeit nach Geburt</span>
                </label>
              </>
            )}
          </>
        )}
      </div>
    </Card>
  );
};
