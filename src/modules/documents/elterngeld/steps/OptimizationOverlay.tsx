/**
 * Overlay zur Optimierungsdarstellung im Planungsscreen.
 * Nutzt denselben Step-Flow wie die Calculation-Page.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../../../../shared/ui/Modal';
import { Card } from '../../../../shared/ui/Card';
import { Button } from '../../../../shared/ui/Button';
import { ElterngeldSelectButton } from '../ui/ElterngeldSelectButton';
import { MAIN_GOAL_OPTIONS } from './OptimizationGoalDialog';
import { StepOptimizationBlock } from './StepCalculationResult';
import { ElternArbeitPartTimeEditor } from './PartTimeWeeklyHoursField';
import type { ElterngeldCalculationPlan, CalculationResult } from '../calculation';
import type { OptimizationGoal } from '../calculation/elterngeldOptimization';
import type { ElterngeldApplication } from '../types/elterngeldTypes';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCurrencySigned(amount: number): string {
  const formatted = formatCurrency(Math.abs(amount));
  if (amount > 0) return `+${formatted}`;
  if (amount < 0) return `−${formatted}`;
  return formatted;
}

function countBezugMonths(result: CalculationResult): number {
  const months = new Set<number>();
  for (const p of result.parents) {
    for (const r of p.monthlyResults) {
      if (r.mode !== 'none' || r.amount > 0) months.add(r.month);
    }
  }
  return months.size;
}

function hasPartnerBonus(result: CalculationResult): boolean {
  return result.parents.some((p) =>
    p.monthlyResults.some((m) => m.mode === 'partnerBonus')
  );
}

type OptimizationOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  plan: ElterngeldCalculationPlan;
  result: CalculationResult;
  hasAnySuggestions: boolean;
  onAdoptOptimization: (plan: ElterngeldCalculationPlan) => void;
  /** Optional: Führt zur Monatsübersicht (Overlay schließen + Scroll zu Monatsplan) */
  onNavigateToMonthEditing?: () => void;
  /** Optional: Vergleichsbasis für Deltas (Konsistenz mit Calculation-Page) */
  originalPlanForOptimization?: ElterngeldCalculationPlan | null;
  originalResultForOptimization?: CalculationResult | null;
  lastAdoptedPlan?: ElterngeldCalculationPlan | null;
  lastAdoptedResult?: CalculationResult | null;
  /** false: keine Partnerbonus-Optimierungs-/Teilzeit-„Mit Bonus“-Variante (24–32 h). Standard true. */
  partnerBonusHoursEligible?: boolean;
  /** Optional: zur Anpassung der Wochenstunden (z. B. Rechner ohne Vorbereitung). */
  onNavigateToPartTimeSettings?: () => void;
  /** Wenn gesetzt: Teilzeitstunden-Dialog im Overlay (schreibt in denselben State wie der Wizard). */
  application?: ElterngeldApplication;
  onApplicationChange?: (next: ElterngeldApplication) => void;
};

export const OptimizationOverlay: React.FC<OptimizationOverlayProps> = ({
  isOpen,
  onClose,
  plan,
  result,
  onAdoptOptimization,
  onNavigateToMonthEditing,
  originalPlanForOptimization,
  originalResultForOptimization,
  lastAdoptedPlan,
  lastAdoptedResult,
  partnerBonusHoursEligible = true,
  onNavigateToPartTimeSettings,
  application,
  onApplicationChange,
}) => {
  const [view, setView] = useState<'entry' | 'strategy'>('entry');
  const [selectedGoal, setSelectedGoal] = useState<'maxMoney' | 'longerDuration' | 'frontLoad'>('maxMoney');
  const [partTimeHoursModalOpen, setPartTimeHoursModalOpen] = useState(false);
  const [partTimeEditGeneration, setPartTimeEditGeneration] = useState(0);

  const canEditPartTimeInOverlay = Boolean(application && onApplicationChange);

  const openPartTimeHoursEditor = useCallback(() => {
    if (canEditPartTimeInOverlay) {
      setPartTimeHoursModalOpen(true);
    } else {
      onNavigateToPartTimeSettings?.();
    }
  }, [canEditPartTimeInOverlay, onNavigateToPartTimeSettings]);

  useEffect(() => {
    if (!isOpen) {
      setView('entry');
      setPartTimeHoursModalOpen(false);
      setPartTimeEditGeneration(0);
    } else {
      setSelectedGoal('maxMoney');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setView('entry');
    onClose();
  };

  if (view === 'strategy') {
    return (
      <>
        <Modal isOpen={isOpen} onClose={handleClose} title="Aufteilung prüfen" variant="softpill" scrollableContent hideFooter>
          <div className="elterngeld-screen elterngeld-optimization-overlay-content">
            <StepOptimizationBlock
              plan={plan}
              result={result}
              originalPlanForOptimization={originalPlanForOptimization}
              originalResultForOptimization={originalResultForOptimization}
              lastAdoptedPlan={lastAdoptedPlan}
              lastAdoptedResult={lastAdoptedResult}
              formatCurrency={formatCurrency}
              formatCurrencySigned={formatCurrencySigned}
              countBezugMonths={countBezugMonths}
              hasPartnerBonus={hasPartnerBonus}
              onAdoptOptimization={(p) => {
                onAdoptOptimization(p);
                handleClose();
              }}
              onBackToOptimization={handleClose}
              onNavigateToMonthEditing={onNavigateToMonthEditing}
              skipToStrategyStep
              hideDiscardButton
              hideBackButton
              onBackToGoalSelection={() => setView('entry')}
              optimizationGoal={selectedGoal as OptimizationGoal}
              partnerBonusHoursEligible={partnerBonusHoursEligible}
              onNavigateToPartTimeSettings={openPartTimeHoursEditor}
              partTimeEditGeneration={partTimeEditGeneration}
              elterngeldApplicationForAdoption={application ?? null}
            />
          </div>
        </Modal>
        {canEditPartTimeInOverlay && application && onApplicationChange && (
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
              data-testid="elterngeld-optimization-part-time-hours-modal"
            >
              <p className="elterngeld-step__hint">
                Geänderte Teilzeitstunden wirken auf den aktuellen Plan, die Vergleichsbasis und die Alternativvarianten
                mit Plus oder Partnerschaftsbonus (je Elternteil eure Stunden aus dem Plan; ohne Eintrag 28 Stunden als
                Fallback).
              </p>
              <Card className="still-daily-checklist__card elterngeld-plan__summary-card" role="article">
                <ElternArbeitPartTimeEditor
                  values={application}
                  onChange={(next) => {
                    onApplicationChange?.(next);
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
        )}
      </>
    );
  }

  const bezugMonths = countBezugMonths(result);
  const bonusMonths = result.parents.reduce(
    (sum, p) => sum + p.monthlyResults.filter((r) => r.mode === 'partnerBonus').length,
    0
  );

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Aufteilung prüfen" variant="softpill" scrollableContent hideFooter>
      <div className="elterngeld-screen elterngeld-optimization-overlay-content">
        <Card className="elterngeld-plan__summary-card still-daily-checklist__card" role="article">
          <h3 className="elterngeld-step__title">Aktueller Plan</h3>
          <p className="elterngeld-step__hint">
            Dein aktueller Plan mit geschätztem Betrag und Dauer. Du vergleichst Varianten – dein Plan bleibt unverändert, bis du ihn übernimmst.
          </p>
          <div className="elterngeld-plan__summary-rows">
            <div className="elterngeld-plan__summary-row">
              <span className="elterngeld-plan__summary-label">Gesamtbetrag</span>
              <span className="elterngeld-plan__summary-value">{formatCurrency(result.householdTotal)}</span>
            </div>
            <div className="elterngeld-plan__summary-row">
              <span className="elterngeld-plan__summary-label">Dauer</span>
              <span className="elterngeld-plan__summary-value">{bezugMonths} Monate</span>
            </div>
            {bonusMonths > 0 && (
              <div className="elterngeld-plan__summary-row">
                <span className="elterngeld-plan__summary-label">Bonusmonate</span>
                <span className="elterngeld-plan__summary-value">{bonusMonths} Bonusmonate</span>
              </div>
            )}
          </div>
        </Card>
        <div className="elterngeld-optimization-goal__section">
          <p className="elterngeld-optimization-goal__intro">Was ist dir wichtiger?</p>
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
                selected={selectedGoal === opt.value}
                onClick={() => setSelectedGoal(opt.value)}
                ariaPressed={selectedGoal === opt.value}
              />
            ))}
          </div>
        </div>
        <div className="next-steps__stack elterngeld-optimization-goal__actions">
          <Button
            type="button"
            variant="primary"
            className="next-steps__button btn--softpill"
            onClick={() => setView('strategy')}
          >
            Varianten vergleichen
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="next-steps__button btn--softpill"
            onClick={handleClose}
          >
            Optimierung schließen
          </Button>
        </div>
      </div>
    </Modal>
  );
};
