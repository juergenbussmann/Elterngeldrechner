import React from 'react';
import { Card } from '../../../../shared/ui/Card';
import { TextInput } from '../../../../shared/ui/TextInput';
import { SelectionField } from '../../../../shared/ui/SelectionModal';
import {
  isBirthDateDisabled,
  isExpectedBirthDateDisabled,
  applyBirthDateChange,
  applyExpectedBirthDateChange,
} from '../../../../shared/lib/birthDateFields';
import type { ElterngeldApplication } from '../types/elterngeldTypes';
import { GERMAN_STATES } from '../stateConfig';

type Props = {
  values: ElterngeldApplication;
  onChange: (values: ElterngeldApplication) => void;
};

const STATE_OPTIONS = GERMAN_STATES.map((s) => ({ value: s.stateCode, label: s.displayName }));

export const StepBasicData: React.FC<Props> = ({ values, onChange }) => {
  const update = (path: string, value: string | boolean) => {
    const [root, ...rest] = path.split('.');
    if (root === 'child') {
      onChange({
        ...values,
        child: { ...values.child, [rest[0]]: value },
      });
    } else if (root === 'state') {
      onChange({ ...values, state: value as string });
    }
  };

  const birthDisabled = isBirthDateDisabled(
    values.child.birthDate,
    values.child.expectedBirthDate
  );
  const expectedDisabled = isExpectedBirthDateDisabled(
    values.child.birthDate,
    values.child.expectedBirthDate
  );

  const handleBirthDateChange = (v: string) => {
    const next = applyBirthDateChange(v, values.child.expectedBirthDate);
    onChange({
      ...values,
      child: { ...values.child, birthDate: next.birthDate, expectedBirthDate: next.expectedBirthDate },
    });
  };

  const handleExpectedBirthDateChange = (v: string) => {
    const next = applyExpectedBirthDateChange(values.child.birthDate, v);
    onChange({
      ...values,
      child: { ...values.child, birthDate: next.birthDate, expectedBirthDate: next.expectedBirthDate },
    });
  };

  return (
    <Card className="still-daily-checklist__card">
      <h3 className="elterngeld-step__title">Grunddaten</h3>
      <div className="elterngeld-step__fields">
        <SelectionField
          label="Bundesland"
          placeholder="– Bitte wählen –"
          value={values.state}
          options={STATE_OPTIONS}
          onChange={(v) => update('state', v)}
        />
        <label className={`elterngeld-step__label${birthDisabled ? ' elterngeld-step__label--disabled' : ''}`}>
          <span>Geburt des Kindes</span>
          <TextInput
            type="date"
            value={values.child.birthDate}
            onChange={(e) => handleBirthDateChange(e.target.value)}
            disabled={birthDisabled}
            aria-disabled={birthDisabled}
          />
          {birthDisabled && (
            <span className="elterngeld-step__hint">
              Sobald ein voraussichtlicher Geburtstermin eingetragen ist, wird dieses Feld deaktiviert.
            </span>
          )}
        </label>
        <label className={`elterngeld-step__label${expectedDisabled ? ' elterngeld-step__label--disabled' : ''}`}>
          <span>Voraussichtlicher Geburtstermin</span>
          <TextInput
            type="date"
            value={values.child.expectedBirthDate}
            onChange={(e) => handleExpectedBirthDateChange(e.target.value)}
            disabled={expectedDisabled}
            aria-disabled={expectedDisabled}
          />
          {expectedDisabled && (
            <span className="elterngeld-step__hint">
              Sobald ein Geburtsdatum eingetragen ist, wird dieses Feld deaktiviert.
            </span>
          )}
        </label>
        <label className="elterngeld-step__label elterngeld-step__label--row">
          <input
            type="checkbox"
            checked={values.child.multipleBirth}
            onChange={(e) => update('child.multipleBirth', e.target.checked)}
          />
          <span>Mehrlingsgeburt</span>
        </label>
      </div>
    </Card>
  );
};
