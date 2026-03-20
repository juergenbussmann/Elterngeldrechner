/**
 * Visueller Progress-Stepper für den Elterngeld-Gesamtflow.
 * Drei Schritte: Vorbereitung → Berechnung → Ergebnis
 */

import React from 'react';

export type ElterngeldFlowStep = 1 | 2 | 3;

const STEPS: { step: ElterngeldFlowStep; label: string; shortLabel: string }[] = [
  { step: 1, label: 'Vorbereitung', shortLabel: 'Vorber.' },
  { step: 2, label: 'Berechnung', shortLabel: 'Berech.' },
  { step: 3, label: 'Ergebnis', shortLabel: 'Ergebnis' },
];

export interface ElterngeldFlowStepperProps {
  /** Aktueller Schritt (1–3) */
  currentStep: ElterngeldFlowStep;
}

export const ElterngeldFlowStepper: React.FC<ElterngeldFlowStepperProps> = ({ currentStep }) => {
  return (
    <nav
      className="elterngeld-flow-stepper"
      aria-label="Fortschritt im Elterngeld-Flow"
    >
      <ol className="elterngeld-flow-stepper__list" role="list">
        {STEPS.map(({ step, label, shortLabel }, index) => {
          const isCompleted = step < currentStep;
          const isActive = step === currentStep;
          const isUpcoming = step > currentStep;

          return (
            <li
              key={step}
              className={`elterngeld-flow-stepper__item
                ${isCompleted ? ' elterngeld-flow-stepper__item--completed' : ''}
                ${isActive ? ' elterngeld-flow-stepper__item--active' : ''}
                ${isUpcoming ? ' elterngeld-flow-stepper__item--upcoming' : ''}`}
              aria-current={isActive ? 'step' : undefined}
            >
              {index > 0 && (
                <span
                  className={`elterngeld-flow-stepper__connector
                    ${isCompleted ? ' elterngeld-flow-stepper__connector--completed' : ''}`}
                  aria-hidden="true"
                />
              )}
              <span className="elterngeld-flow-stepper__marker">
                {isCompleted ? (
                  <span className="elterngeld-flow-stepper__check" aria-hidden="true">
                    ✓
                  </span>
                ) : (
                  <span className="elterngeld-flow-stepper__number">{step}</span>
                )}
              </span>
              <span className="elterngeld-flow-stepper__label">
                <span className="elterngeld-flow-stepper__label-full">{label}</span>
                <span className="elterngeld-flow-stepper__label-short">{shortLabel}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
