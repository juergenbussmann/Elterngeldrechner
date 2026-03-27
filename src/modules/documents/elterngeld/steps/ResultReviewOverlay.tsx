/**
 * Vollständige Ergebnis- und Optimierungsdarstellung im Wizard (Modal).
 * Nutzt StepCalculationResult als einzige Quelle für Anzeige, buildOptimizationResult-basierte
 * Vorschläge (über StepOptimizationBlock) und dieselbe Übernahme-Guards wie der Alt-Flow.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Modal } from '../../../../shared/ui/Modal';
import { Card } from '../../../../shared/ui/Card';
import { Button } from '../../../../shared/ui/Button';
import { ElterngeldSelectButton } from '../ui/ElterngeldSelectButton';
import { MAIN_GOAL_OPTIONS } from './OptimizationGoalDialog';
import {
  StepCalculationResult,
  type NavigateToInputTarget,
} from './StepCalculationResult';
import { ElternArbeitPartTimeEditor } from './PartTimeWeeklyHoursField';
import { applicationToCalculationPlan } from '../applicationToCalculationPlan';
import { applyCombinedSelection, type ElterngeldCalculationPlan, type CalculationResult } from '../calculation';
import { mergePlanIntoPreparation } from '../planToApplicationMerge';
import type { OptimizationGoal } from '../calculation/elterngeldOptimization';
import type { ElterngeldApplication } from '../types/elterngeldTypes';

export type ResultReviewOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  values: ElterngeldApplication;
  result: CalculationResult;
  plan: ElterngeldCalculationPlan;
  onApplicationChange: (next: ElterngeldApplication) => void;
  onAdoptOptimization: (plan: ElterngeldCalculationPlan) => void;
  onNavigateToInput: (target: NavigateToInputTarget) => void;
  partnerBonusHoursEligible?: boolean;
};

export const ResultReviewOverlay: React.FC<ResultReviewOverlayProps> = ({
  isOpen,
  onClose,
  values,
  result,
  plan,
  onApplicationChange,
  onAdoptOptimization,
  onNavigateToInput,
  partnerBonusHoursEligible = true,
}) => {
  const [optimizationGoal, setOptimizationGoal] = useState<OptimizationGoal | undefined>(undefined);
  const [partTimeHoursModalOpen, setPartTimeHoursModalOpen] = useState(false);
  const [partTimeEditGeneration, setPartTimeEditGeneration] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setOptimizationGoal(undefined);
      setPartTimeHoursModalOpen(false);
      setPartTimeEditGeneration(0);
    }
  }, [isOpen]);

  const openPartTimeEditor = useCallback(() => {
    setPartTimeHoursModalOpen(true);
  }, []);

  const hasPartner = values.applicantMode === 'both_parents';

  const handleApplyPartnerBonusFix = useCallback(
    (month: number, _fix: 'switchToPlus' | 'setBoth' | 'setBonusMonth') => {
      const basePlan = applicationToCalculationPlan(values);
      const updated = applyCombinedSelection(basePlan, month, { who: 'both', mode: 'partnerBonus' }, hasPartner);
      onApplicationChange(mergePlanIntoPreparation(values, updated));
    },
    [values, onApplicationChange, hasPartner]
  );

  const handleApplyPartnerBonusFixMultiple = useCallback(
    (months: number[]) => {
      if (months.length === 0) return;
      let next = applicationToCalculationPlan(values);
      for (const m of months) {
        next = applyCombinedSelection(next, m, { who: 'both', mode: 'partnerBonus' }, hasPartner);
      }
      onApplicationChange(mergePlanIntoPreparation(values, next));
    },
    [values, onApplicationChange, hasPartner]
  );

  const handleApplyCreatePartnerOverlap = useCallback(
    (suggestedPlan: ElterngeldCalculationPlan) => {
      onApplicationChange(mergePlanIntoPreparation(values, suggestedPlan));
    },
    [values, onApplicationChange]
  );

  const handleDiscardOptimization = useCallback(() => {
    setOptimizationGoal(undefined);
  }, []);

  const handleAdoptOptimization = useCallback(
    (p: ElterngeldCalculationPlan) => {
      onAdoptOptimization(p);
      setOptimizationGoal(undefined);
    },
    [onAdoptOptimization]
  );

  if (!isOpen) return null;

  const showGoalPicker = result.validation.errors.length === 0;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Ergebnis prüfen" variant="softpill" scrollableContent hideFooter>
        <div className="elterngeld-screen elterngeld-optimization-overlay-content">
          {showGoalPicker && (
            <Card className="still-daily-checklist__card elterngeld-plan__summary-card" role="article">
              <h3 className="elterngeld-step__title">Ziel für Alternativen</h3>
              <p className="elterngeld-step__hint">
                Optional: Wähle ein Ziel, um Vorschläge zu vergleichen – dieselbe Logik wie bei „Aufteilung
                prüfen“. Übernahmen erfolgen wie dort über die Bestätigung und schreiben in deine
                Vorbereitung.
              </p>
              <div
                className="elterngeld-optimization-goal__options elterngeld-select-btn-group"
                role="radiogroup"
                aria-label="Ziel für Optimierungsvorschläge"
              >
                {MAIN_GOAL_OPTIONS.map((opt) => (
                  <ElterngeldSelectButton
                    key={opt.value}
                    label={opt.label}
                    description={opt.description}
                    selected={optimizationGoal === opt.value}
                    onClick={() => setOptimizationGoal(opt.value as OptimizationGoal)}
                    ariaPressed={optimizationGoal === opt.value}
                  />
                ))}
              </div>
              {optimizationGoal != null && (
                <div className="next-steps__stack elterngeld-optimization-goal__actions">
                  <Button
                    type="button"
                    variant="secondary"
                    className="next-steps__button btn--softpill"
                    onClick={handleDiscardOptimization}
                  >
                    Nur Ergebnis anzeigen
                  </Button>
                </div>
              )}
            </Card>
          )}

          <StepCalculationResult
            result={result}
            plan={plan}
            optimizationGoal={optimizationGoal}
            optimizationStatus="idle"
            originalPlanForOptimization={plan}
            originalResultForOptimization={result}
            onAdoptOptimization={handleAdoptOptimization}
            onDiscardOptimization={handleDiscardOptimization}
            onBackFromOptimization={handleDiscardOptimization}
            onNavigateToInput={onNavigateToInput}
            onNavigateToMonthEditing={() => {
              onClose();
              onNavigateToInput({ focusSection: 'monatsplan' });
            }}
            onNavigateToPartTimeSettings={openPartTimeEditor}
            partnerBonusHoursEligible={partnerBonusHoursEligible}
            partTimeEditGeneration={partTimeEditGeneration}
            onApplyPartnerBonusFix={handleApplyPartnerBonusFix}
            onApplyPartnerBonusFixMultiple={handleApplyPartnerBonusFixMultiple}
            onApplyCreatePartnerOverlap={handleApplyCreatePartnerOverlap}
            elterngeldApplicationForAdoption={values}
          />

          <div className="next-steps__stack elterngeld-optimization-goal__actions">
            <Button type="button" variant="primary" className="next-steps__button btn--softpill" onClick={onClose}>
              Schließen
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={partTimeHoursModalOpen}
        onClose={() => setPartTimeHoursModalOpen(false)}
        title="Teilzeitstunden anpassen"
        variant="softpill"
        scrollableContent
        hideFooter
      >
        <div
          className="elterngeld-optimization-overlay-content"
          data-testid="elterngeld-result-review-part-time-hours-modal"
        >
          <p className="elterngeld-step__hint">
            Geänderte Teilzeitstunden wirken auf den aktuellen Plan, die Vergleichsbasis und die angezeigten
            Alternativvarianten.
          </p>
          <Card className="still-daily-checklist__card elterngeld-plan__summary-card" role="article">
            <ElternArbeitPartTimeEditor
              values={values}
              onChange={(next) => {
                onApplicationChange(next);
                setPartTimeEditGeneration((g) => g + 1);
              }}
            />
          </Card>
          <div className="next-steps__stack elterngeld-optimization-goal__actions">
            <Button
              type="button"
              variant="primary"
              className="next-steps__button btn--softpill"
              onClick={() => setPartTimeHoursModalOpen(false)}
            >
              Fertig
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
