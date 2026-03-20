/**
 * Dialog zur Auswahl des Optimierungsziels vor der Bezugsoptimierung.
 * Hauptziele: Mehr Gesamtauszahlung, Längere Bezugsdauer.
 * Partnerbonus als zusätzliche Prüfoption.
 */

import React, { useState } from 'react';
import { Modal } from '../../../../shared/ui/Modal';
import { Button } from '../../../../shared/ui/Button';
import { ElterngeldSelectButton } from '../ui/ElterngeldSelectButton';
import { UNSUPPORTED_GOALS } from '../calculation/elterngeldOptimization';

export type OptimizationGoal =
  | 'maxMoney'
  | 'longerDuration'
  | 'frontLoad'
  | 'balanced'
  | 'partnerBonus';

export const MAIN_GOAL_OPTIONS: {
  value: 'maxMoney' | 'longerDuration' | 'frontLoad';
  label: string;
  description: string;
}[] = [
  { value: 'maxMoney', label: 'mehr Geld insgesamt', description: '' },
  { value: 'frontLoad', label: 'früher mehr Geld', description: '' },
  { value: 'longerDuration', label: 'länger verteilt', description: '' },
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
  const [mainGoal, setMainGoal] = useState<'maxMoney' | 'longerDuration' | 'frontLoad'>('maxMoney');

  const handleConfirm = () => {
    if (UNSUPPORTED_GOALS.includes(mainGoal)) return;
    onConfirm(mainGoal);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Was ist dir wichtiger?"
      variant="softpill"
    >
      <>
        <p className="elterngeld-optimization-goal__intro">
          Wähle dein Ziel – wir prüfen passende Varianten für deine Planung.
        </p>
        <div
          className="elterngeld-optimization-goal__options elterngeld-select-btn-group"
          role="radiogroup"
          aria-label="Ziel"
        >
          {MAIN_GOAL_OPTIONS.map((opt) => (
            <ElterngeldSelectButton
              key={opt.value}
              label={opt.label}
              description={opt.description}
              selected={mainGoal === opt.value}
              onClick={() => setMainGoal(opt.value)}
              ariaPressed={mainGoal === opt.value}
            />
          ))}
        </div>
        <div className="next-steps__stack elterngeld-optimization-goal__actions">
          <Button
            type="button"
            variant="primary"
            className="next-steps__button btn--softpill"
            onClick={handleConfirm}
          >
            Passende Variante finden
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
