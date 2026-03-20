/**
 * Einzelabfrage: Wann wird dein Kind geboren?
 * Verwendet ausschließlich birthDate und expectedBirthDate.
 */

import React from 'react';
import { Card } from '../../../../shared/ui/Card';
import { TextInput } from '../../../../shared/ui/TextInput';
import {
  applyBirthDateChange,
  applyExpectedBirthDateChange,
} from '../../../../shared/lib/birthDateFields';
import type { ElterngeldApplication } from '../types/elterngeldTypes';

type Props = {
  values: ElterngeldApplication;
  onChange: (values: ElterngeldApplication) => void;
};

export const StepGeburtstermin: React.FC<Props> = ({ values, onChange }) => {
  const birthDate = values.child.birthDate?.trim() || '';
  const expectedDate = values.child.expectedBirthDate?.trim() || '';
  const displayValue = birthDate || expectedDate;

  const handleChange = (v: string) => {
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

  return (
    <Card className="still-daily-checklist__card">
      <h3 className="elterngeld-step__title">Wann wird dein Kind geboren?</h3>
      <label className="elterngeld-step__label">
        <TextInput
          type="date"
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
        />
      </label>
    </Card>
  );
};
