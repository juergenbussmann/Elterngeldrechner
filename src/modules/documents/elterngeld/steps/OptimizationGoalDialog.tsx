/**
 * Dialog zur Auswahl des Optimierungsziels vor der Bezugsoptimierung.
 */

import React, { useState } from 'react';
import { Modal } from '../../../../shared/ui/Modal';
import { Button } from '../../../../shared/ui/Button';
import { UNSUPPORTED_GOALS } from '../calculation/elterngeldOptimization';

export type OptimizationGoal =
  | 'maxMoney'
  | 'longerDuration'
  | 'frontLoad'
  | 'balanced'
  | 'partnerBonus';

const GOAL_OPTIONS: {
  value: OptimizationGoal;
  label: string;
  description: string;
}[] = [
  {
    value: 'maxMoney',
    label: 'Mehr Gesamtauszahlung',
    description: 'Maximiert die geschätzte Gesamtsumme.',
  },
  {
    value: 'longerDuration',
    label: 'Längere Bezugsdauer',
    description: 'Verteilt den Bezug auf mehr Monate.',
  },
  {
    value: 'frontLoad',
    label: 'Höhere Zahlungen am Anfang',
    description: 'Bevorzugt höhere Zahlungen in den ersten Monaten.',
  },
  {
    value: 'balanced',
    label: 'Gleichmäßigere monatliche Zahlungen',
    description: 'Reduziert starke Schwankungen.',
  },
  {
    value: 'partnerBonus',
    label: 'Partnerschaftsbonus prüfen',
    description: 'Prüft, ob der Bonus sinnvoll nutzbar ist.',
  },
];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (goal: OptimizationGoal) => void;
};

export const OptimizationGoalDialog: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [selected, setSelected] = useState<OptimizationGoal>('maxMoney');

  const handleConfirm = () => {
    if (UNSUPPORTED_GOALS.includes(selected)) return;
    onConfirm(selected);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Was möchten Sie optimieren?"
      variant="softpill"
    >
      <>
        <div
          className="elterngeld-optimization-goal__options"
          role="radiogroup"
          aria-label="Optimierungsziel"
        >
          {GOAL_OPTIONS.map((opt) => {
            const isUnsupported = UNSUPPORTED_GOALS.includes(opt.value);
            return (
              <label
                key={opt.value}
                className={`settings-radio elterngeld-optimization-goal__option${isUnsupported ? ' elterngeld-optimization-goal__option--disabled' : ''}`}
              >
                <input
                  type="radio"
                  name="optimizationGoal"
                  value={opt.value}
                  checked={selected === opt.value}
                  onChange={() => !isUnsupported && setSelected(opt.value)}
                  disabled={isUnsupported}
                />
                <span className="elterngeld-optimization-goal__option-content">
                  <span className="elterngeld-optimization-goal__option-label">
                    {opt.label}
                  </span>
                  <span className="elterngeld-optimization-goal__option-desc">
                    {isUnsupported ? 'Derzeit noch nicht verfügbar.' : opt.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        <div className="next-steps__stack elterngeld-optimization-goal__actions">
          <Button
            type="button"
            variant="primary"
            className="next-steps__button btn--softpill"
            onClick={handleConfirm}
          >
            Optimierung starten
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="next-steps__button btn--softpill"
            onClick={onClose}
          >
            Abbrechen
          </Button>
        </div>
      </>
    </Modal>
  );
};
