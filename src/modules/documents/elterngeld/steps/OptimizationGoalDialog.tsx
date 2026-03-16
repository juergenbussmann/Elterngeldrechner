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

const MAIN_GOAL_OPTIONS: {
  value: 'maxMoney' | 'longerDuration' | 'frontLoad';
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
    label: 'Am Anfang mehr Geld',
    description: 'Bevorzugt höhere Auszahlungen in den ersten Lebensmonaten.',
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
  const [mainGoal, setMainGoal] = useState<'maxMoney' | 'longerDuration' | 'frontLoad'>('maxMoney');
  const [includePartnerBonus, setIncludePartnerBonus] = useState(false);

  const handleConfirm = () => {
    const goalToRun: OptimizationGoal = includePartnerBonus ? 'partnerBonus' : mainGoal;
    if (UNSUPPORTED_GOALS.includes(goalToRun)) return;
    onConfirm(goalToRun);
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
        <p className="elterngeld-optimization-goal__intro">
          Wählen Sie Hauptziel und optional die Zusatzprüfung.
        </p>
        <div
          className="elterngeld-optimization-goal__options elterngeld-select-btn-group"
          role="radiogroup"
          aria-label="Hauptziel"
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
        <div className="elterngeld-optimization-goal__addon">
          <label className="elterngeld-step__label elterngeld-step__label--row">
            <input
              type="checkbox"
              checked={includePartnerBonus}
              onChange={(e) => setIncludePartnerBonus(e.target.checked)}
            />
            <span>
              <strong>Zusätzlich:</strong> Partnerschaftsbonus prüfen – ob der Bonus sinnvoll nutzbar ist
            </span>
          </label>
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
