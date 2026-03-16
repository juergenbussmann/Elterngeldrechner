/**
 * Einzelabfrage: Einkommen Mutter.
 * Verwendet ausschließlich parentA.incomeBeforeBirth.
 */

import React from 'react';
import { Card } from '../../../../shared/ui/Card';
import { TextInput } from '../../../../shared/ui/TextInput';
import type { ElterngeldApplication } from '../types/elterngeldTypes';

type Props = {
  values: ElterngeldApplication;
  onChange: (values: ElterngeldApplication) => void;
};

export const StepEinkommenMutter: React.FC<Props> = ({ values, onChange }) => {
  const update = (v: string) => {
    onChange({
      ...values,
      parentA: { ...values.parentA, incomeBeforeBirth: v },
    });
  };

  return (
    <Card className="still-daily-checklist__card">
      <h3 className="elterngeld-step__title">Mutter</h3>
      <label className="elterngeld-step__label">
        <span>Nettoeinkommen vor Geburt</span>
        <TextInput
          type="text"
          value={values.parentA.incomeBeforeBirth}
          onChange={(e) => update(e.target.value)}
          placeholder="z. B. 2500"
        />
      </label>
      <p className="elterngeld-step__hint elterngeld-step__hint--section">
        Das Elterngeld beträgt ungefähr 65 % des Nettoeinkommens.
      </p>
    </Card>
  );
};
