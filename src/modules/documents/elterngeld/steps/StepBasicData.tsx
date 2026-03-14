import React from 'react';
import { Card } from '../../../../shared/ui/Card';
import { TextInput } from '../../../../shared/ui/TextInput';
import { SelectionField } from '../../../../shared/ui/SelectionModal';
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
        <label className="elterngeld-step__label">
          <span>Geburtsdatum des Kindes</span>
          <TextInput
            type="date"
            value={values.child.birthDate}
            onChange={(e) => update('child.birthDate', e.target.value)}
          />
        </label>
        <label className="elterngeld-step__label">
          <span>Voraussichtlicher Geburtstermin (falls noch nicht geboren)</span>
          <TextInput
            type="date"
            value={values.child.expectedBirthDate}
            onChange={(e) => update('child.expectedBirthDate', e.target.value)}
          />
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
