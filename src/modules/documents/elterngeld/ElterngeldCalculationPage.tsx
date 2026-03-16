/**
 * Elterngeld-Berechnung – unverbindliche Schätzung.
 * Klar abgegrenzt von Vorbereitung und Antrag.
 * Unterstützt Variantenvergleich (Aktueller Plan vs. Alternative Variante).
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { SectionHeader } from '../../../shared/ui/SectionHeader';
import { Button } from '../../../shared/ui/Button';
import { usePhase } from '../../../core/phase/usePhase';
import { getChildDateContext } from '../../../shared/lib/childDateContext';
import { useNotifications } from '../../../shared/lib/notifications';
import { addDocument } from '../application/service';
import type { ElterngeldCalculationPlan, CalculationResult } from './calculation';
import type { NavigateToInputTarget } from './steps/StepCalculationResult';
import { createDefaultPlan, calculatePlan, duplicatePlan } from './calculation';
import {
  loadCalculationPlan,
  saveCalculationPlan,
  clearCalculationPlan,
  loadVariantBPlan,
  saveVariantBPlan,
  clearVariantBPlan,
  isPlanEmpty,
  plansAreEqual,
} from './infra/calculationPlanStorage';
import { Card } from '../../../shared/ui/Card';
import { buildElterngeldCalculationPdf } from './pdf/buildElterngeldCalculationPdf';
import { StepCalculationInput } from './steps/StepCalculationInput';
import { StepCalculationResult } from './steps/StepCalculationResult';
import { StepCalculationComparison } from './steps/StepCalculationComparison';
import {
  OptimizationGoalDialog,
  type OptimizationGoal,
} from './steps/OptimizationGoalDialog';
import { ElterngeldFlowStepper } from './ElterngeldFlowStepper';
import { ElterngeldSelectButton } from './ui/ElterngeldSelectButton';
import { ElterngeldLiveCard } from './ui/ElterngeldLiveCard';
import './ElterngeldWizardPage.css';
import './ElterngeldFlowStepper.css';
import './ui/elterngeld-ui.css';
import '../../checklists/styles/softpill-buttons-in-cards.css';
import '../../checklists/styles/softpill-cards.css';

type View = 'input' | 'result' | 'compare';
type EditingVariant = 'A' | 'B';

type LocationState = { fromPreparation?: ElterngeldCalculationPlan } | null;

function getInitialPlan(
  fromPreparation: ElterngeldCalculationPlan | undefined,
  birthOrDue: string
): ElterngeldCalculationPlan {
  const persisted = loadCalculationPlan();
  if (persisted) return persisted;
  if (fromPreparation) return fromPreparation;
  return createDefaultPlan(birthOrDue, true);
}

function hasDataConflict(
  persisted: ElterngeldCalculationPlan | null,
  fromPreparation: ElterngeldCalculationPlan | undefined
): boolean {
  return Boolean(
    persisted &&
      fromPreparation &&
      !isPlanEmpty(persisted) &&
      !isPlanEmpty(fromPreparation) &&
      !plansAreEqual(persisted, fromPreparation)
  );
}

export const ElterngeldCalculationPage: React.FC = () => {
  const { profile } = usePhase();
  const { showToast } = useNotifications();
  const location = useLocation();
  const child = getChildDateContext(profile);
  const birthOrDue = child.effectiveDate ?? '';

  const fromPreparation = (location.state as LocationState)?.fromPreparation;
  const persisted = loadCalculationPlan();
  const conflictDetected = hasDataConflict(persisted, fromPreparation);

  const [conflictResolved, setConflictResolved] = useState(!conflictDetected);
  const [view, setView] = useState<View>('input');
  const [editingVariant, setEditingVariant] = useState<EditingVariant>('A');
  const [plan, setPlan] = useState<ElterngeldCalculationPlan>(() => {
    if (conflictDetected) return persisted!;
    return getInitialPlan(fromPreparation, birthOrDue);
  });
  const [planB, setPlanB] = useState<ElterngeldCalculationPlan | null>(() => {
    const loaded = loadVariantBPlan();
    return loaded && !isPlanEmpty(loaded) ? loaded : null;
  });
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [planUsedForResult, setPlanUsedForResult] = useState<ElterngeldCalculationPlan | null>(null);
  const [optimizationGoal, setOptimizationGoal] = useState<OptimizationGoal | undefined>();
  const [optimizationStatus, setOptimizationStatus] = useState<'idle' | 'proposed' | 'adopted'>('idle');
  const [showOptimizationGoalDialog, setShowOptimizationGoalDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [variantBIsOutdated, setVariantBIsOutdated] = useState(false);
  const [optimizationAdoptedInSession, setOptimizationAdoptedInSession] = useState(false);
  const [navigateTarget, setNavigateTarget] = useState<NavigateToInputTarget | null>(null);

  const currentPlan = editingVariant === 'A' ? plan : planB!;
  const setCurrentPlan = editingVariant === 'A' ? setPlan : setPlanB;

  const liveResult = useMemo(() => {
    if (isPlanEmpty(currentPlan)) return null;
    try {
      return calculatePlan(currentPlan);
    } catch {
      return null;
    }
  }, [currentPlan]);

  const handleCalculate = useCallback(() => {
    setOptimizationGoal(undefined);
    setOptimizationStatus('idle');
    setNavigateTarget(null);
    const res = calculatePlan(currentPlan);
    setPlanUsedForResult(currentPlan);
    setResult(res);
    setView('result');
  }, [currentPlan]);

  const handleRunOptimization = useCallback(
    (goal: OptimizationGoal) => {
      setNavigateTarget(null);
      const res = calculatePlan(currentPlan);
      setOptimizationGoal(goal);
      setOptimizationStatus('proposed');
      setPlanUsedForResult(currentPlan);
      setResult(res);
      setView('result');
    },
    [currentPlan]
  );

  const handleDiscardOptimization = useCallback(() => {
    setOptimizationGoal(undefined);
    setOptimizationStatus('idle');
  }, []);

  const handleShowComparison = useCallback(() => {
    if (!planB) return;
    setNavigateTarget(null);
    setResult(null);
    setView('compare');
  }, [planB]);

  useEffect(() => {
    if (!isPlanEmpty(plan)) {
      saveCalculationPlan(plan);
    }
  }, [plan]);

  useEffect(() => {
    if (planB && !isPlanEmpty(planB)) {
      saveVariantBPlan(planB);
    }
  }, [planB]);

  useEffect(() => {
    if (view === 'result') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [view]);

  const handleBack = useCallback(() => {
    setNavigateTarget(null);
    setView('input');
  }, []);

  const handleNavigateToInput = useCallback((target: NavigateToInputTarget) => {
    setNavigateTarget(target);
    setView('input');
  }, []);

  const handleReset = useCallback(() => {
    clearCalculationPlan();
    clearVariantBPlan();
    setPlan(createDefaultPlan(birthOrDue, true));
    setPlanB(null);
    setPlanUsedForResult(null);
    setOptimizationGoal(undefined);
    setOptimizationStatus('idle');
    setShowOptimizationGoalDialog(false);
    setOptimizationAdoptedInSession(false);
    setVariantBIsOutdated(false);
    setView('input');
    setResult(null);
    setEditingVariant('A');
    setConflictResolved(true);
    showToast('Berechnung zurückgesetzt', { kind: 'success', durationMs: 3000 });
  }, [birthOrDue, showToast]);

  const handleCreateVariantB = useCallback(() => {
    const copy = duplicatePlan(plan);
    setPlanB(copy);
    setVariantBIsOutdated(false);
    setEditingVariant('B');
    showToast('Alternative Variante erstellt. Sie können sie jetzt anpassen.', {
      kind: 'success',
      durationMs: 3000,
    });
  }, [plan, showToast]);

  const handleRemoveVariantB = useCallback(() => {
    clearVariantBPlan();
    setPlanB(null);
    setVariantBIsOutdated(false);
    setEditingVariant('A');
    setView('input');
    setResult(null);
    showToast('Alternative Variante entfernt.', { kind: 'success', durationMs: 2000 });
  }, [showToast]);

  const handleAdoptOptimization = useCallback(
    (optimizedPlan: ElterngeldCalculationPlan) => {
      const previousPlan = planUsedForResult;
      if (!previousPlan) return;
      setPlanB(previousPlan);
      setPlan(optimizedPlan);
      setPlanUsedForResult(optimizedPlan);
      setResult(calculatePlan(optimizedPlan));
      setEditingVariant('A');
      setVariantBIsOutdated(false);
      setOptimizationStatus('adopted');
      setOptimizationAdoptedInSession(true);
      showToast('Optimierung übernommen und Berechnung aktualisiert.', {
        kind: 'success',
        durationMs: 4000,
      });
    },
    [planUsedForResult, showToast]
  );

  const handleRevertToOriginalPlan = useCallback(() => {
    if (!planB) return;
    setPlan(planB);
    setPlanB(plan);
    setOptimizationAdoptedInSession(false);
    showToast('Zum ursprünglichen Plan gewechselt.', { kind: 'success', durationMs: 3000 });
  }, [plan, planB, showToast]);

  const handleUsePersisted = useCallback(() => {
    setConflictResolved(true);
  }, []);

  const handleUseFromPreparation = useCallback(() => {
    if (!fromPreparation) return;
    setPlan(fromPreparation);
    saveCalculationPlan(fromPreparation);
    const hasB = planB && !isPlanEmpty(planB);
    if (hasB) setVariantBIsOutdated(true);
    setConflictResolved(true);
    setView('input');
    setResult(null);
    showToast(
      hasB
        ? 'Aktueller Plan wurde aktualisiert. Ihre alternative Variante bleibt erhalten.'
        : 'Neue Vorbereitungsdaten wurden übernommen.',
      { kind: 'success', durationMs: 3000 }
    );
  }, [fromPreparation, planB, showToast]);

  const handleUseFromPreparationAndResetB = useCallback(() => {
    if (!fromPreparation) return;
    setPlan(fromPreparation);
    saveCalculationPlan(fromPreparation);
    clearVariantBPlan();
    setPlanB(null);
    setVariantBIsOutdated(false);
    setEditingVariant('A');
    setConflictResolved(true);
    setView('input');
    setResult(null);
    showToast('Beide Varianten wurden neu gestartet.', { kind: 'success', durationMs: 3000 });
  }, [fromPreparation, showToast]);

  const handleCreatePdf = useCallback(async () => {
    if (!result) return;
    setIsSubmitting(true);
    try {
      if (import.meta.env.DEV) console.time('[documents] PDF build (ElterngeldCalculation)');
      const blob = buildElterngeldCalculationPdf(result);
      if (import.meta.env.DEV) console.timeEnd('[documents] PDF build (ElterngeldCalculation)');
      await addDocument({
        title: 'Elterngeld-Berechnung',
        createdAt: new Date().toISOString(),
        mimeType: 'application/pdf',
        blob,
      });
      showToast('documents.elterngeld.pdfCreated', { kind: 'success', durationMs: 5000 });
    } catch (err) {
      console.error('[elterngeld-calculation] PDF creation failed', err);
      showToast('documents.elterngeld.pdfError', { kind: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [result, showToast]);

  return (
    <div className="screen-placeholder elterngeld-screen">
      <section className="next-steps next-steps--plain elterngeld__section">
        <SectionHeader as="h1" title="Elterngeld-Berechnung" />
        <ElterngeldFlowStepper currentStep={view === 'input' ? 2 : 3} />
        <p className="elterngeld-calculation__subtitle">
          Unverbindliche Schätzung – Orientierung für Ihre Planung
        </p>
        <p className="elterngeld-calculation__storage-hint">
          ✓ Deine Angaben werden automatisch lokal gespeichert.
        </p>

        {conflictDetected && !conflictResolved && (
          <Card className="still-daily-checklist__card elterngeld-calculation__conflict-card">
            <p className="elterngeld-calculation__conflict-text">
              {planB && !isPlanEmpty(planB)
                ? 'Sie haben bereits einen gespeicherten Plan und eine alternative Variante. Gleichzeitig liegen neue Daten aus der Vorbereitung vor. Was möchten Sie verwenden?'
                : 'Sie haben bereits einen gespeicherten Berechnungsstand. Gleichzeitig liegen neue Daten aus der Vorbereitung vor. Was möchten Sie verwenden?'}
            </p>
            <div className="elterngeld-calculation__conflict-actions">
              <Button
                type="button"
                variant="primary"
                className="btn--softpill"
                onClick={handleUsePersisted}
              >
                {planB && !isPlanEmpty(planB)
                  ? 'Bestehende Varianten fortsetzen'
                  : 'Gespeicherten Stand fortsetzen'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="btn--softpill"
                onClick={handleUseFromPreparation}
              >
                Aktuellen Plan mit neuen Vorbereitungsdaten ersetzen
              </Button>
              {planB && !isPlanEmpty(planB) && (
                <Button
                  type="button"
                  variant="ghost"
                  className="btn--softpill elterngeld-calculation__conflict-action--reset"
                  onClick={handleUseFromPreparationAndResetB}
                >
                  Beide Varianten neu starten
                </Button>
              )}
            </div>
            {planB && !isPlanEmpty(planB) && (
              <p className="elterngeld-calculation__conflict-hint">
                Bei „Aktuellen Plan ersetzen“ bleibt Ihre alternative Variante erhalten. Sie basiert
                möglicherweise nicht mehr auf der neuen Grundlage.
              </p>
            )}
          </Card>
        )}

        {conflictResolved && view === 'input' && (
          <>
            {liveResult && <ElterngeldLiveCard result={liveResult} />}
            {planB && (
              <div className="elterngeld-variant-tabs elterngeld-select-btn-row" role="tablist">
                <ElterngeldSelectButton
                  label="Aktueller Plan"
                  selected={editingVariant === 'A'}
                  showCheck={false}
                  onClick={() => setEditingVariant('A')}
                  ariaPressed={editingVariant === 'A'}
                  className="elterngeld-variant-select-btn"
                />
                <ElterngeldSelectButton
                  label="Alternative Variante"
                  selected={editingVariant === 'B'}
                  showCheck={false}
                  onClick={() => setEditingVariant('B')}
                  ariaPressed={editingVariant === 'B'}
                  className="elterngeld-variant-select-btn"
                >
                  {variantBIsOutdated && (
                    <span className="elterngeld-variant-tab__badge">älterer Stand</span>
                  )}
                </ElterngeldSelectButton>
              </div>
            )}
            {variantBIsOutdated && editingVariant === 'B' && (
              <div className="elterngeld-variant-outdated-hint">
                <p>
                  Diese alternative Variante basiert auf einem älteren Vorbereitungsstand. Der aktuelle
                  Plan wurde bereits mit neuen Daten aus der Vorbereitung aktualisiert.
                </p>
                <p className="elterngeld-variant-outdated-hint__secondary">
                  Sie können die Variante weiterhin vergleichen oder neu erstellen.
                </p>
              </div>
            )}
            {optimizationAdoptedInSession && editingVariant === 'A' && (
              <Card className="still-daily-checklist__card elterngeld-calculation__optimization-adopted-hint">
                <p className="elterngeld-calculation__optimization-adopted-text">
                  Die Eingaben wurden anhand der optimierten Strategie aktualisiert.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="btn--softpill"
                  onClick={handleRevertToOriginalPlan}
                >
                  Zum ursprünglichen Plan zurückkehren
                </Button>
              </Card>
            )}
            <StepCalculationInput
              plan={editingVariant === 'A' ? plan : planB!}
              onChange={editingVariant === 'A' ? setPlan : (p) => setPlanB(p)}
              initialFocusMonth={
                navigateTarget && 'focusMonth' in navigateTarget ? navigateTarget.focusMonth : null
              }
              initialScrollTo={
                navigateTarget && 'focusSection' in navigateTarget
                  ? navigateTarget.focusSection
                  : navigateTarget && 'focusMonth' in navigateTarget
                    ? 'monatsplan'
                    : null
              }
            />
            <div className="next-steps__stack elterngeld-nav elterngeld-nav--with-variants">
              <Button
                type="button"
                variant="primary"
                className="next-steps__button btn--softpill"
                onClick={handleCalculate}
              >
                Zur Berechnung
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="next-steps__button btn--softpill"
                onClick={() => setShowOptimizationGoalDialog(true)}
              >
                Bezugsoptimierung prüfen
              </Button>
              {planB && (
                <Button
                  type="button"
                  variant="secondary"
                  className="next-steps__button btn--softpill"
                  onClick={handleShowComparison}
                >
                  Varianten vergleichen
                </Button>
              )}
              {!planB && (
                <Button
                  type="button"
                  variant="ghost"
                  className="next-steps__button"
                  onClick={handleCreateVariantB}
                >
                  Alternative Variante erstellen
                </Button>
              )}
              {planB && (
                <Button
                  type="button"
                  variant="ghost"
                  className="next-steps__button elterngeld-nav__remove-variant"
                  onClick={handleRemoveVariantB}
                >
                  Alternative entfernen
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                className="next-steps__button"
                onClick={handleReset}
              >
                Neu beginnen
              </Button>
            </div>
          </>
        )}

        {conflictResolved && view === 'compare' && planB && (
          <>
            <StepCalculationComparison
              resultA={calculatePlan(plan)}
              resultB={calculatePlan(planB)}
              labelA={optimizationStatus === 'adopted' ? 'Optimierte Strategie' : 'Aktueller Plan'}
              labelB={optimizationStatus === 'adopted' ? 'Ursprünglicher Plan' : 'Vergleichsvariante'}
            />
            <div className="next-steps__stack elterngeld-nav">
              <Button
                type="button"
                variant="secondary"
                className="next-steps__button btn--softpill"
                onClick={handleBack}
              >
                Zurück zur Eingabe
              </Button>
            </div>
          </>
        )}

        <OptimizationGoalDialog
          isOpen={showOptimizationGoalDialog}
          onClose={() => setShowOptimizationGoalDialog(false)}
          onConfirm={handleRunOptimization}
        />

        {conflictResolved && view === 'result' && result && (
          <>
            <StepCalculationResult
              result={result}
              plan={planUsedForResult}
              planB={planB}
              optimizationGoal={optimizationGoal}
              optimizationStatus={optimizationStatus}
              onAdoptOptimization={handleAdoptOptimization}
              onDiscardOptimization={handleDiscardOptimization}
              onShowCompareOriginal={planB ? handleShowComparison : undefined}
              onCreatePdf={handleCreatePdf}
              isSubmitting={isSubmitting}
              onOpenOptimizationGoal={() => setShowOptimizationGoalDialog(true)}
              onNavigateToInput={handleNavigateToInput}
            />
            <div className="next-steps__stack elterngeld-nav">
              {optimizationGoal && (
                <Button
                  type="button"
                  variant="secondary"
                  className="next-steps__button btn--softpill"
                  onClick={() => setShowOptimizationGoalDialog(true)}
                >
                  Zurück zur Optimierung
                </Button>
              )}
              {planB && (
                <Button
                  type="button"
                  variant="secondary"
                  className="next-steps__button btn--softpill"
                  onClick={handleShowComparison}
                >
                  {optimizationStatus === 'adopted'
                    ? 'Ursprünglichen Plan vergleichen'
                    : 'Varianten vergleichen'}
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                className="next-steps__button btn--softpill"
                onClick={handleBack}
              >
                Zurück zur Eingabe
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
};
