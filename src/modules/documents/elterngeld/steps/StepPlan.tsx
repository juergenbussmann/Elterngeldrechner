import React from 'react';
import { Card } from '../../../../shared/ui/Card';
import { TextInput } from '../../../../shared/ui/TextInput';
import type { ElterngeldApplication, BenefitModel } from '../types/elterngeldTypes';

const MODEL_OPTIONS: { value: BenefitModel; label: string; description: string }[] = [
  {
    value: 'basis',
    label: 'Basiselterngeld',
    description:
      'Gut geeignet, wenn du nach der Geburt zunächst gar nicht oder nur sehr wenig arbeitest und das Elterngeld in kürzerer Zeit nutzen möchtest.',
  },
  {
    value: 'plus',
    label: 'ElterngeldPlus',
    description:
      'Gut geeignet, wenn du nach der Geburt in Teilzeit arbeiten möchtest oder den Bezug über einen längeren Zeitraum strecken willst.',
  },
  {
    value: 'mixed',
    label: 'Gemischt',
    description:
      'Gut geeignet, wenn du zuerst einige Monate vollständig zuhause bleiben möchtest und später mit Teilzeit weiterarbeiten willst.',
  },
];

type Props = {
  values: ElterngeldApplication;
  onChange: (values: ElterngeldApplication) => void;
};

export const StepPlan: React.FC<Props> = ({ values, onChange }) => {
  const update = (field: string, value: string | boolean) => {
    onChange({
      ...values,
      benefitPlan: { ...values.benefitPlan, [field]: value },
    });
  };

  return (
    <Card className="still-daily-checklist__card">
      <h3 className="elterngeld-step__title">Elterngeld-Plan</h3>
      <div className="elterngeld-step__fields">
        <div className="elterngeld-step__label">
          <span>Modell</span>
          <div className="benefit-model-options">
            {MODEL_OPTIONS.map((opt) => {
              const isSelected = values.benefitPlan.model === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`benefit-model-card${isSelected ? ' benefit-model-card--selected' : ''}`}
                  onClick={() => update('model', opt.value)}
                  aria-pressed={isSelected}
                >
                  <span className="benefit-model-card__title">{opt.label}</span>
                  <span className="benefit-model-card__description">{opt.description}</span>
                  {isSelected && (
                    <span className="benefit-model-card__check" aria-hidden="true">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="elterngeld-step__hint elterngeld-step__hint--below">
            Die genaue Aufteilung der Monate kannst du im nächsten Schritt festlegen.
          </p>
        </div>
        <label className="elterngeld-step__label">
          <span>Sie – geplante Monate</span>
          <TextInput
            type="text"
            value={values.benefitPlan.parentAMonths}
            onChange={(e) => update('parentAMonths', e.target.value)}
            placeholder="z. B. 12"
          />
        </label>
        {values.applicantMode === 'both_parents' && (
          <>
            <label className="elterngeld-step__label">
              <span>Partner – geplante Monate</span>
              <TextInput
                type="text"
                value={values.benefitPlan.parentBMonths}
                onChange={(e) => update('parentBMonths', e.target.value)}
                placeholder="z. B. 2"
              />
            </label>
            <label className="elterngeld-step__label elterngeld-step__label--row">
              <input
                type="checkbox"
                checked={values.benefitPlan.partnershipBonus}
                onChange={(e) => update('partnershipBonus', e.target.checked)}
              />
              <span>Partnerschaftsbonus</span>
            </label>
            <p className="elterngeld-step__hint elterngeld-step__hint--below">
              Der Partnerschaftsbonus kann zusätzliche ElterngeldPlus-Monate ermöglichen, wenn beide
              Elternteile gleichzeitig in Teilzeit arbeiten und die Voraussetzungen erfüllt sind.
              Dadurch kann sich der Bezugszeitraum verändern. Ob sich das finanziell lohnt, hängt von
              Einkommen, Arbeitszeit und der Verteilung der Monate ab.
            </p>
          </>
        )}
      </div>
    </Card>
  );
};
