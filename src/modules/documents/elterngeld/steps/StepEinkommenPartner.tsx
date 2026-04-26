/**
 * Einzelabfrage: Einkommen Partner / Partnerin.
 * Verwendet ausschließlich parentB.incomeBeforeBirth.
 * Bei single_parent: Hinweis „entfällt“ + Weiter.
 */

import React from 'react';
import { Card } from '../../../../shared/ui/Card';
import { TextInput } from '../../../../shared/ui/TextInput';
import type { ElterngeldApplication } from '../types/elterngeldTypes';
import { EMPTY_ELTERNGELD_PARENT } from '../types/elterngeldTypes';

type Props = {
  values: ElterngeldApplication;
  onChange: (values: ElterngeldApplication) => void;
};

export const StepEinkommenPartner: React.FC<Props> = ({ values, onChange }) => {
  const showPartnerIncome = values.applicantMode === 'both_parents' && values.parentB;

  const update = (v: string) => {
    const parentB = values.parentB ?? EMPTY_ELTERNGELD_PARENT;
    onChange({
      ...values,
      parentB: { ...parentB, incomeBeforeBirth: v },
    });
  };

  if (!showPartnerIncome) {
    return (
      <Card className="still-daily-checklist__card">
        <h3 className="elterngeld-step__title">Partner / Partnerin</h3>
        <p className="elterngeld-step__hint elterngeld-step__hint--section">
          Diese Angabe entfällt bei Alleinerziehenden oder wenn nur ein Elternteil beantragt.
        </p>
      </Card>
    );
  }

  return (
    <Card className="still-daily-checklist__card">
      <h3 className="elterngeld-step__title">Partner / Partnerin</h3>
      <label className="elterngeld-step__label">
        <span>Nettoeinkommen vor Geburt</span>
        <TextInput
          type="text"
          value={values.parentB.incomeBeforeBirth}
          onChange={(e) => update(e.target.value)}
          placeholder="z. B. 2500"
        />
      </label>
      <p className="elterngeld-step__hint elterngeld-step__hint--section">
        Das Elterngeld beträgt ungefähr 65 % des Nettoeinkommens.
      </p>
    </Card>
  );
};
