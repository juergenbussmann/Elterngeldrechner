/**
 * Overlay zur Optimierungsdarstellung im Planungsscreen.
 * Nutzt denselben Step-Flow wie die Calculation-Page.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal } from '../../../../shared/ui/Modal';
import { Card } from '../../../../shared/ui/Card';
import { Button } from '../../../../shared/ui/Button';
import { ElterngeldSelectButton } from '../ui/ElterngeldSelectButton';
import { getOptimizationOverlayGoalOptions } from './OptimizationGoalDialog';
import { StepOptimizationBlock } from './StepCalculationResult';
import { ElternArbeitPartTimeEditor } from './PartTimeWeeklyHoursField';
import type { ElterngeldCalculationPlan, CalculationResult } from '../calculation';
import {
  buildOptimizationResult,
  parseOptimizationAdoptedBaselineMap,
  UNSUPPORTED_GOALS,
} from '../calculation/elterngeldOptimization';
import type { OptimizationGoal, OptimizationResultSet } from '../calculation/elterngeldOptimization';
import type { ElterngeldApplication, OptimizationAdoptableGoal } from '../types/elterngeldTypes';
import { unlockBegleitungPlus, useBegleitungPlus } from '../../../../core/settings/begleitungPlus';
import { OptimizationSuggestionsPaywall } from './OptimizationSuggestionsPaywall';

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
  /**
   * Wizard: wenn die Paywall bereits auf der Zusammenfassung sitzt, keine zweite Paywall
   * im Strategie-Modal (Varianten nach Freischaltung wie bisher).
   */
  suppressStrategyPaywall?: boolean;
  onAdoptOptimization: (
    plan: ElterngeldCalculationPlan,
    adoptedGoal?: OptimizationAdoptableGoal,
    adoptedResult?: CalculationResult
  ) => void;
  /** Optional: Führt zur Monatsübersicht (Overlay schließen + Scroll zu Monatsplan) */
  onNavigateToMonthEditing?: () => void;
  /** Optional: Führt zur Leistungswahl Basis/Plus (Overlay schließen + Scroll zu Leistungsblock) */
  onNavigateToLeistungSettings?: () => void;
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
  suppressStrategyPaywall = false,
  onAdoptOptimization,
  onNavigateToMonthEditing,
  onNavigateToLeistungSettings,
  originalPlanForOptimization,
  originalResultForOptimization,
  lastAdoptedPlan,
  lastAdoptedResult,
  partnerBonusHoursEligible = true,
  onNavigateToPartTimeSettings,
  application,
  onApplicationChange,
}) => {
  const hidePartnerschaftsbonusUi = application?.applicantMode === 'single_parent';
  const [view, setView] = useState<'entry' | 'strategy'>('entry');
  const [selectedGoal, setSelectedGoal] = useState<OptimizationGoal>('maxMoney');
  const [partTimeHoursModalOpen, setPartTimeHoursModalOpen] = useState(false);
  const [partTimeEditGeneration, setPartTimeEditGeneration] = useState(0);
  const plusUnlocked = useBegleitungPlus();

  const entryGoalOptions = useMemo(
    () =>
      getOptimizationOverlayGoalOptions({
        partnerBonusHoursEligible,
        hasSecondParent: result.parents.length >= 2,
        applicantMode: application?.applicantMode,
      }),
    [partnerBonusHoursEligible, result.parents.length, application?.applicantMode]
  );

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

  const optimizationResultSetForPaywall = useMemo((): OptimizationResultSet | null => {
    if (result.validation.errors.length > 0 || UNSUPPORTED_GOALS.includes(selectedGoal)) return null;
    const outcome = buildOptimizationResult(plan, result, selectedGoal, {
      adoptedBaselineGoals: parseOptimizationAdoptedBaselineMap(
        application?.benefitPlan.optimizationAdoptedBaselineGoals
      ),
    });
    if ('status' in outcome && outcome.status === 'unsupported') return null;
    return outcome as OptimizationResultSet;
  }, [
    plan,
    result,
    selectedGoal,
    result.validation.errors.length,
    application?.benefitPlan.optimizationAdoptedBaselineGoals,
  ]);

  const improvedForPaywall = useMemo(
    () => optimizationResultSetForPaywall?.suggestions.filter((s) => s.status === 'improved') ?? [],
    [optimizationResultSetForPaywall]
  );

  const showOptimizationPaywall =
    !suppressStrategyPaywall && view === 'strategy' && !plusUnlocked && improvedForPaywall.length > 0;

  const paywallMetrics = useMemo(() => {
    if (!optimizationResultSetForPaywall || improvedForPaywall.length === 0) return null;
    const currentY = optimizationResultSetForPaywall.currentResult.householdTotal;
    const bestZ = Math.max(...improvedForPaywall.map((s) => s.optimizedTotal));
    const deltaEuro = Math.round(bestZ - currentY);
    return { currentY, bestZ, deltaEuro };
  }, [optimizationResultSetForPaywall, improvedForPaywall]);

  const handleUnlockOptimization = useCallback(() => {
    unlockBegleitungPlus();
  }, []);

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
            {showOptimizationPaywall && paywallMetrics ? (
              <OptimizationSuggestionsPaywall
                formatCurrency={formatCurrency}
                headlineDeltaEuro={paywallMetrics.deltaEuro > 0 ? paywallMetrics.deltaEuro : null}
                currentTotal={paywallMetrics.currentY}
                bestOptimizedTotal={paywallMetrics.bestZ}
                improvedVariantCount={improvedForPaywall.length}
                onUnlock={handleUnlockOptimization}
                onBackToGoalSelection={() => setView('entry')}
              />
            ) : (
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
                onAdoptOptimization={(p, adoptGoalFromStep, adoptedResult) => {
                  const adoptGoal: OptimizationAdoptableGoal | undefined =
                    adoptGoalFromStep ??
                    (selectedGoal === 'maxMoney' ||
                    selectedGoal === 'longerDuration' ||
                    selectedGoal === 'frontLoad' ||
                    selectedGoal === 'partnerBonus'
                      ? selectedGoal
                      : undefined);
                  onAdoptOptimization(p, adoptGoal, adoptedResult);
                  handleClose();
                }}
                onBackToOptimization={handleClose}
                onNavigateToMonthEditing={onNavigateToMonthEditing}
                onNavigateToLeistungSettings={onNavigateToLeistungSettings}
                skipToStrategyStep
                hideDiscardButton
                hideBackButton
                onBackToGoalSelection={() => setView('entry')}
                optimizationGoal={selectedGoal}
                partnerBonusHoursEligible={partnerBonusHoursEligible}
                onNavigateToPartTimeSettings={openPartTimeHoursEditor}
                partTimeEditGeneration={partTimeEditGeneration}
                elterngeldApplicationForAdoption={application ?? null}
                hidePartnerschaftsbonusUi={hidePartnerschaftsbonusUi}
              />
            )}
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
                {hidePartnerschaftsbonusUi ? (
                  <>
                    Geänderte Teilzeitstunden wirken auf den aktuellen Plan und die Vergleichsbasis (Stunden aus dem
                    Plan; ohne Eintrag 28 Stunden als Fallback).
                  </>
                ) : (
                  <>
                    Geänderte Teilzeitstunden wirken auf den aktuellen Plan, die Vergleichsbasis und die Alternativvarianten
                    mit Plus oder Partnerschaftsbonus (je Elternteil eure Stunden aus dem Plan; ohne Eintrag 28 Stunden als
                    Fallback).
                  </>
                )}
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

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Aufteilung prüfen" variant="softpill" scrollableContent hideFooter>
      <div className="elterngeld-screen elterngeld-optimization-overlay-content">
        <div className="elterngeld-optimization-goal__section">
          <p className="elterngeld-optimization-goal__intro">
            Worauf sollen die Planvorschläge achten?
          </p>
          <div
            className="elterngeld-optimization-goal__options elterngeld-select-btn-group"
            role="radiogroup"
            aria-label="Ziel für Planvorschläge"
          >
            {entryGoalOptions.map((opt) => (
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
            Planvorschläge schließen
          </Button>
        </div>
      </div>
    </Modal>
  );
};
