/**
 * Schritt Geburt & Kind.
 * Verwendet ausschließlich: birthDate, expectedBirthDate, multipleBirth, state.
 */

import React from 'react';
import { Card } from '../../../../shared/ui/Card';
import { TextInput } from '../../../../shared/ui/TextInput';
import { SelectionField } from '../../../../shared/ui/SelectionModal';
import { ElterngeldSelectButton } from '../ui/ElterngeldSelectButton';
import {
  applyBirthDateChange,
  applyExpectedBirthDateChange,
} from '../../../../shared/lib/birthDateFields';
import type { ElterngeldApplication } from '../types/elterngeldTypes';
import { GERMAN_STATES } from '../stateConfig';

const STATE_OPTIONS = GERMAN_STATES.map((s) => ({ value: s.stateCode, label: s.displayName }));

type Props = {
  values: ElterngeldApplication;
  onChange: (values: ElterngeldApplication) => void;
};

export const StepGeburtKind: React.FC<Props> = ({ values, onChange }) => {
  const birthDate = values.child.birthDate?.trim() || '';
  const expectedDate = values.child.expectedBirthDate?.trim() || '';
  const displayValue = birthDate || expectedDate;

  const handleDateChange = (v: string) => {
    const trimmed = v?.trim() ?? '';
    if (!trimmed) {
      onChange({
        ...values,
        child: { ...values.child, birthDate: '', expectedBirthDate: '' },
      });
      return;
    }
    const date = new Date(trimmed);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    if (date <= today) {
      const next = applyBirthDateChange(trimmed, expectedDate);
      onChange({
        ...values,
        child: { ...values.child, birthDate: next.birthDate, expectedBirthDate: next.expectedBirthDate },
      });
    } else {
      const next = applyExpectedBirthDateChange(birthDate, trimmed);
      onChange({
        ...values,
        child: { ...values.child, birthDate: next.birthDate, expectedBirthDate: next.expectedBirthDate },
      });
    }
  };

  const setMultipleBirth = (v: boolean) => {
    onChange({
      ...values,
      child: { ...values.child, multipleBirth: v },
    });
  };

  return (
    <Card className="still-daily-checklist__card">
      <h3 className="elterngeld-step__title">Geburt & Kind</h3>
      <div className="elterngeld-step__fields">
        <label className="elterngeld-step__label">
          <span>Wann wird dein Kind geboren?</span>
          <TextInput
            type="date"
            value={displayValue}
            onChange={(e) => handleDateChange(e.target.value)}
          />
        </label>
        <div className="elterngeld-step__label">
          <span>Handelt es sich um Zwillinge oder Mehrlinge?</span>
          <div className="elterngeld-select-btn-row">
            <ElterngeldSelectButton
              label="Nein"
              selected={!values.child.multipleBirth}
              showCheck={false}
              onClick={() => setMultipleBirth(false)}
              ariaPressed={!values.child.multipleBirth}
              className="elterngeld-select-btn--compact"
            />
            <ElterngeldSelectButton
              label="Zwillinge / Mehrlinge"
              selected={values.child.multipleBirth}
              showCheck={false}
              onClick={() => setMultipleBirth(true)}
              ariaPressed={values.child.multipleBirth}
              className="elterngeld-select-btn--compact"
            />
          </div>
        </div>
        <SelectionField
          label="Bundesland"
          placeholder="– Bitte wählen –"
          value={values.state}
          options={STATE_OPTIONS}
          onChange={(v) => onChange({ ...values, state: v })}
        />
      </div>
    </Card>
  );
};
