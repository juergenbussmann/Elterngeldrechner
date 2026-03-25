/**
 * Elterngeld-Berechnung – unverbindliche Schätzung.
 * Klar abgegrenzt von Vorbereitung und Antrag.
 * Unterstützt Variantenvergleich (Aktueller Plan vs. Alternative Variante).
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigation } from '../../../shared/lib/navigation/useNavigation';
import { SectionHeader } from '../../../shared/ui/SectionHeader';
import { Button } from '../../../shared/ui/Button';
import { usePhase } from '../../../core/phase/usePhase';
import { getChildDateContext } from '../../../shared/lib/childDateContext';
import { useNotifications } from '../../../shared/lib/notifications';
import { addDocument } from '../application/service';
import type { ElterngeldCalculationPlan, CalculationResult } from './calculation';
import { createDefaultPlan, calculatePlan, duplicatePlan, applyCombinedSelection } from './calculation';
import type { NavigateToInputTarget } from './steps/StepCalculationResult';
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
import { loadPreparation, savePreparation, isPreparationEmpty } from './infra/elterngeldPreparationStorage';
import { applicationToCalculationPlan } from './applicationToCalculationPlan';
import { mergePlanIntoPreparation } from './planToApplicationMerge';
import { EditOriginDialog } from './steps/EditOriginDialog';
import { Card } from '../../../shared/ui/Card';
import { buildElterngeldCalculationPdf } from './pdf/buildElterngeldCalculationPdf';
import { StepCalculationInput } from './steps/StepCalculationInput';
import { StepCalculationResult } from './steps/StepCalculationResult';
import { StepCalculationComparison } from './steps/StepCalculationComparison';
import { MAIN_GOAL_OPTIONS } from './steps/OptimizationGoalDialog';
import type { OptimizationGoal } from './calculation/elterngeldOptimization';
import { ElterngeldFlowStepper } from './ElterngeldFlowStepper';
import { ElterngeldSelectButton } from './ui/ElterngeldSelectButton';
import { ElterngeldLiveCard } from './ui/ElterngeldLiveCard';
import './ElterngeldWizardPage.css';
import './ElterngeldFlowStepper.css';
import './ui/elterngeld-ui.css';
import '../../checklists/styles/softpill-buttons-in-cards.css';
import '../../checklists/styles/softpill-cards.css';

type View = 'goal' | 'input' | 'result' | 'compare';
type EditingVariant = 'A' | 'B';

type LocationState = {
  fromPreparation?: ElterngeldCalculationPlan;
  /** Nur Wizard „Ergebnis prüfen“: direkt kanonischer Ergebnis-/Prüfpfad (kein Konflikt-Panel, kein Legacy-Zielschritt „Was ist dir wichtiger?“). */
  fromWizardErgebnisPruefen?: boolean;
} | null;

/**
 * Ermittelt den initialen Berechnungsplan.
 * Priorität: Vorbereitung (führend) > persistierter Plan > Default.
 * Keine doppelte Eingabe – Vorbereitungsdaten werden übernommen.
 */
function getInitialPlan(
  fromPreparation: ElterngeldCalculationPlan | undefined,
  birthOrDue: string
): ElterngeldCalculationPlan {
  // 1. Explizit aus Vorbereitung: Nutzer kam von Wizard → Vorbereitung ist führend
  if (fromPreparation) return fromPreparation;

  // 2. Gespeicherte Vorbereitung: Bei direkter Navigation oder ohne location.state
  const preparation = loadPreparation();
  if (preparation && !isPreparationEmpty(preparation)) {
    return applicationToCalculationPlan(preparation);
  }

  // 3. Persistierter Berechnungsstand (keine Vorbereitung vorhanden)
  const persisted = loadCalculationPlan();
  if (persisted) return persisted;

  // 4. Fallback: Default-Plan
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
  const { goTo } = useNavigation();
  const location = useLocation();
  const child = getChildDateContext(profile);
  const birthOrDue = child.effectiveDate ?? '';

  const locationState = (location.state as LocationState) ?? null;
  const fromPreparation = locationState?.fromPreparation;
  const fromWizardErgebnisPruefen = locationState?.fromWizardErgebnisPruefen === true;
  const persisted = loadCalculationPlan();
  const conflictDetected = hasDataConflict(persisted, fromPreparation);
  /** Einstieg nur über StepSummary „Ergebnis prüfen“ (Wizard setzt Flag + Plan in location.state). */
  const wizardErgebnisDirectEntry =
    Boolean(fromWizardErgebnisPruefen && fromPreparation != null);

  const wizardErgebnisInitialResult: CalculationResult | null =
    wizardErgebnisDirectEntry && fromPreparation
      ? (() => {
          try {
            return calculatePlan(fromPreparation);
          } catch {
            return null;
          }
        })()
      : null;

  const [conflictResolved, setConflictResolved] = useState(
    !conflictDetected || wizardErgebnisDirectEntry
  );
  const [usingPreparationFlow, setUsingPreparationFlow] = useState(() => {
    if (wizardErgebnisDirectEntry) return true;
    return !!fromPreparation && !conflictDetected;
  });
  const [view, setView] = useState<View>(() => {
    if (wizardErgebnisDirectEntry) {
      return wizardErgebnisInitialResult ? 'result' : 'input';
    }
    if (fromPreparation && !conflictDetected) return 'goal';
    return 'input';
  });
  const [editingVariant, setEditingVariant] = useState<EditingVariant>('A');
  const [plan, setPlan] = useState<ElterngeldCalculationPlan>(() => {
    // Bei Konflikt: Vorbereitung ist führend – fromPreparation als Standard
    if (conflictDetected && fromPreparation) return fromPreparation;
    if (conflictDetected) return persisted!;
    return getInitialPlan(fromPreparation, birthOrDue);
  });
  const [planB, setPlanB] = useState<ElterngeldCalculationPlan | null>(() => {
    const loaded = loadVariantBPlan();
    return loaded && !isPlanEmpty(loaded) ? loaded : null;
  });
  const [result, setResult] = useState<CalculationResult | null>(wizardErgebnisInitialResult);
  const [planUsedForResult, setPlanUsedForResult] = useState<ElterngeldCalculationPlan | null>(() =>
    wizardErgebnisDirectEntry && fromPreparation ? fromPreparation : null
  );
  const [optimizationGoal, setOptimizationGoal] = useState<OptimizationGoal | undefined>();
  const [optimizationStatus, setOptimizationStatus] = useState<'idle' | 'proposed' | 'adopted'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [variantBIsOutdated, setVariantBIsOutdated] = useState(() => {
    if (!wizardErgebnisDirectEntry) return false;
    const b = loadVariantBPlan();
    return Boolean(b && !isPlanEmpty(b));
  });
  const [optimizationAdoptedInSession, setOptimizationAdoptedInSession] = useState(false);
  const [originalPlanForOptimization, setOriginalPlanForOptimization] = useState<ElterngeldCalculationPlan | null>(null);
  const [originalResultForOptimization, setOriginalResultForOptimization] = useState<CalculationResult | null>(null);
  const [lastAdoptedPlan, setLastAdoptedPlan] = useState<ElterngeldCalculationPlan | null>(null);
  const [lastAdoptedResult, setLastAdoptedResult] = useState<CalculationResult | null>(null);
  const [navigateTarget, setNavigateTarget] = useState<NavigateToInputTarget | null>(null);
  const [showEditOriginDialog, setShowEditOriginDialog] = useState(false);
  const [sessionChoiceKeepAsComparison, setSessionChoiceKeepAsComparison] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<'maxMoney' | 'longerDuration' | 'frontLoad'>('maxMoney');

  const planFromPreparationRef = useRef<ElterngeldCalculationPlan | null>(null);
  const planOriginFromPreparationRef = useRef(false);
  const initOriginRef = useRef(false);

  useEffect(() => {
    if (!wizardErgebnisDirectEntry || !fromPreparation) return;
    saveCalculationPlan(fromPreparation);
  }, [wizardErgebnisDirectEntry, fromPreparation]);

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
    if (initOriginRef.current) return;
    initOriginRef.current = true;
    const usedFromPrep = fromPreparation != null;
    const prep = loadPreparation();
    const usedFromStored = !usedFromPrep && prep != null && !isPreparationEmpty(prep);
    if (usedFromPrep) {
      planFromPreparationRef.current = fromPreparation!;
      planOriginFromPreparationRef.current = true;
    } else if (usedFromStored && prep) {
      planFromPreparationRef.current = applicationToCalculationPlan(prep);
      planOriginFromPreparationRef.current = true;
    }
  }, [fromPreparation]);

  useEffect(() => {
    if (!planOriginFromPreparationRef.current || sessionChoiceKeepAsComparison) return;
    if (editingVariant !== 'A') return;
    const origin = planFromPreparationRef.current;
    if (!origin || plansAreEqual(plan, origin)) return;
    setShowEditOriginDialog(true);
  }, [plan, editingVariant, sessionChoiceKeepAsComparison]);

  const handleUpdatePreparation = useCallback(() => {
    const prep = loadPreparation();
    if (!prep) return;
    const merged = mergePlanIntoPreparation(prep, plan);
    savePreparation(merged);
    planFromPreparationRef.current = plan;
    setShowEditOriginDialog(false);
    showToast('Vorbereitung wurde aktualisiert.', { kind: 'success', durationMs: 3000 });
  }, [plan, showToast]);

  const handleKeepAsComparison = useCallback(() => {
    setSessionChoiceKeepAsComparison(true);
    setShowEditOriginDialog(false);
    showToast('Änderung gilt nur für diese Berechnung. Vorbereitung bleibt unverändert.', {
      kind: 'success',
      durationMs: 3000,
    });
  }, [showToast]);

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

  useEffect(() => {
    if (fromWizardErgebnisPruefen) return;
    if (usingPreparationFlow && view === 'input') {
      setView('goal');
    }
  }, [usingPreparationFlow, view, fromWizardErgebnisPruefen]);

  const handleBack = useCallback(() => {
    setNavigateTarget(null);
    setView(fromPreparation ? 'goal' : 'input');
  }, [fromPreparation]);

  const handleGoalToPlan = useCallback(() => {
    if (usingPreparationFlow) {
      setOptimizationGoal(selectedGoal);
      const res = calculatePlan(plan);
      setPlanUsedForResult(plan);
      setResult(res);
      setView('result');
    } else {
      setView('input');
    }
  }, [usingPreparationFlow, plan, selectedGoal]);

  const handleNavigateToInput = useCallback((target: NavigateToInputTarget) => {
    setNavigateTarget(target);
    setView('input');
  }, []);

  const handleApplyPartnerBonusFix = useCallback(
    (month: number, fix: 'switchToPlus' | 'setBoth' | 'setBonusMonth') => {
      const hasPartner = plan.parents.length > 1;
      const updated = applyCombinedSelection(plan, month, { who: 'both', mode: 'partnerBonus' }, hasPartner);
      setPlan(updated);
      saveCalculationPlan(updated);
      setNavigateTarget({ focusMonth: month, changedMonth: month });
      setView('input');
      showToast('Monat angepasst. Prüfen Sie die Änderung im Plan.', { kind: 'success', durationMs: 3000 });
    },
    [plan, showToast]
  );

  const handleApplyPartnerBonusFixMultiple = useCallback(
    (months: number[]) => {
      if (months.length === 0) return;
      const hasPartner = plan.parents.length > 1;
      let updated = plan;
      for (const m of months) {
        updated = applyCombinedSelection(updated, m, { who: 'both', mode: 'partnerBonus' }, hasPartner);
      }
      setPlan(updated);
      saveCalculationPlan(updated);
      const firstM = months[0];
      setNavigateTarget({ focusMonth: firstM, changedMonth: firstM });
      setView('input');
      showToast('Ich habe die Monate als Bonusmonate gesetzt.', { kind: 'success', durationMs: 3000 });
    },
    [plan, showToast]
  );

  const handleApplyCreatePartnerOverlap = useCallback(
    (suggestedPlan: ElterngeldCalculationPlan) => {
      setPlan(suggestedPlan);
      saveCalculationPlan(suggestedPlan);
      setPlanUsedForResult(suggestedPlan);
      setResult(calculatePlan(suggestedPlan));
      setView('input');
      setNavigateTarget({ focusSection: 'monatsplan' });
      showToast('Ich habe gemeinsame Monate für beide Eltern erstellt.', { kind: 'success', durationMs: 3000 });
    },
    [showToast]
  );

  const handleReset = useCallback(() => {
    clearCalculationPlan();
    clearVariantBPlan();
    setSessionChoiceKeepAsComparison(false);
    setShowEditOriginDialog(false);
    // Vorbereitung ist führend: Wenn vorhanden, daraus Plan bauen (keine abweichenden Defaults)
    const preparation = loadPreparation();
    const planToUse =
      preparation && !isPreparationEmpty(preparation)
        ? applicationToCalculationPlan(preparation)
        : createDefaultPlan(birthOrDue, true);
    setPlan(planToUse);
    setPlanB(null);
    if (preparation && !isPreparationEmpty(preparation)) {
      planFromPreparationRef.current = planToUse;
      planOriginFromPreparationRef.current = true;
      setUsingPreparationFlow(true);
      setView('goal');
    } else {
      planFromPreparationRef.current = null;
      planOriginFromPreparationRef.current = false;
      setUsingPreparationFlow(false);
      setView('input');
    }
    setPlanUsedForResult(null);
    setOptimizationGoal(undefined);
    setOptimizationStatus('idle');
    setOriginalPlanForOptimization(null);
    setOriginalResultForOptimization(null);
    setLastAdoptedPlan(null);
    setLastAdoptedResult(null);
    setOptimizationAdoptedInSession(false);
    setVariantBIsOutdated(false);
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
      const adoptedResult = calculatePlan(optimizedPlan);
      setPlanB(previousPlan);
      setPlan(optimizedPlan);
      setPlanUsedForResult(optimizedPlan);
      setResult(adoptedResult);
      setLastAdoptedPlan(optimizedPlan);
      setLastAdoptedResult(adoptedResult);
      setEditingVariant('A');
      setVariantBIsOutdated(false);
      setOptimizationStatus('adopted');
      setOptimizationAdoptedInSession(true);
      showToast('Vorschlag übernommen – Plan aktualisiert.', {
        kind: 'success',
        durationMs: 4000,
      });
    },
    [planUsedForResult, showToast]
  );

  const handleRevertToOriginalPlan = useCallback(() => {
    if (!planB) return;
    const originalPlan = planB;
    const adoptedPlan = plan;
    setPlan(originalPlan);
    setPlanB(adoptedPlan);
    setResult(calculatePlan(originalPlan));
    setPlanUsedForResult(originalPlan);
    setOptimizationStatus('idle');
    setOptimizationAdoptedInSession(false);
    showToast('Zum ursprünglichen Plan gewechselt.', { kind: 'success', durationMs: 3000 });
  }, [plan, planB, showToast]);

  const handleUsePersisted = useCallback(() => {
    setConflictResolved(true);
    setUsingPreparationFlow(false);
  }, []);

  const handleUseFromPreparation = useCallback(() => {
    if (!fromPreparation) return;
    setPlan(fromPreparation);
    saveCalculationPlan(fromPreparation);
    planFromPreparationRef.current = fromPreparation;
    planOriginFromPreparationRef.current = true;
    setSessionChoiceKeepAsComparison(false);
    setUsingPreparationFlow(true);
    const hasB = planB && !isPlanEmpty(planB);
    if (hasB) setVariantBIsOutdated(true);
    setConflictResolved(true);
    setView('goal');
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
    planFromPreparationRef.current = fromPreparation;
    planOriginFromPreparationRef.current = true;
    setSessionChoiceKeepAsComparison(false);
    setUsingPreparationFlow(true);
    clearVariantBPlan();
    setPlanB(null);
    setVariantBIsOutdated(false);
    setEditingVariant('A');
    setConflictResolved(true);
    setView('goal');
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
      <section
        className={`next-steps next-steps--plain elterngeld__section ${view === 'result' ? 'elterngeld-calculation__in-optimization' : ''}`}
      >
        <SectionHeader as="h1" title="Elterngeld planen" />
        {!fromWizardErgebnisPruefen && (
          <ElterngeldFlowStepper currentStep={view === 'goal' ? 1 : view === 'input' ? 2 : 3} />
        )}
        <p className="elterngeld-calculation__subtitle">
          Orientierung für deine Planung – keine amtliche Prüfung
        </p>
        {view !== 'goal' && (
          <p className="elterngeld-calculation__storage-hint">
            ✓ Deine Angaben werden automatisch lokal gespeichert.
          </p>
        )}

        {conflictDetected && !conflictResolved && (
          <Card className="still-daily-checklist__card elterngeld-calculation__conflict-card">
            <p className="elterngeld-calculation__conflict-text">
              {planB && !isPlanEmpty(planB)
                ? 'Du hast bereits einen gespeicherten Plan und eine alternative Variante. Gleichzeitig liegen neue Daten aus der Vorbereitung vor. Was möchtest du verwenden?'
                : 'Du hast bereits einen gespeicherten Plan. Gleichzeitig liegen neue Daten aus der Vorbereitung vor. Was möchtest du verwenden?'}
            </p>
            <div className="next-steps__stack elterngeld-calculation__conflict-actions">
              <Button
                type="button"
                variant="primary"
                className="btn--softpill"
                onClick={handleUseFromPreparation}
              >
                Vorbereitungsdaten übernehmen (empfohlen)
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="btn--softpill"
                onClick={handleUsePersisted}
              >
                {planB && !isPlanEmpty(planB)
                  ? 'Bestehende Varianten fortsetzen'
                  : 'Gespeicherten Stand fortsetzen'}
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
                Bei „Aktuellen Plan ersetzen“ bleibt deine alternative Variante erhalten. Sie basiert
                möglicherweise nicht mehr auf der neuen Grundlage.
              </p>
            )}
          </Card>
        )}

        {conflictResolved && view === 'goal' && (
          <Card className="still-daily-checklist__card elterngeld-calculation__goal-card">
            <h3 className="elterngeld-step__title">Was ist dir wichtiger?</h3>
            <p className="elterngeld-optimization-goal__intro">
              Wähle dein Ziel – danach siehst du das Ergebnis.
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
                  selected={selectedGoal === opt.value}
                  onClick={() => setSelectedGoal(opt.value)}
                  ariaPressed={selectedGoal === opt.value}
                />
              ))}
            </div>
            <div className="next-steps__stack elterngeld-optimization-goal__actions">
              <Button
                type="button"
                variant="primary"
                className="next-steps__button btn--softpill"
                onClick={handleGoalToPlan}
              >
                Weiter zur Planung
              </Button>
            </div>
          </Card>
        )}

        {conflictResolved && view === 'input' && !usingPreparationFlow && (
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
              <Card className="still-daily-checklist__card elterngeld-calculation__optimization-adopted-hint elterngeld-calculation__adopted-hint--compact">
                <p className="elterngeld-calculation__optimization-adopted-text">
                  {lastAdoptedPlan && !plansAreEqual(plan, lastAdoptedPlan)
                    ? 'Geändert – Ihr habt den Plan nach der Übernahme noch angepasst.'
                    : 'Aktueller Plan – Ihr könnt ihn anpassen oder zum ursprünglichen Plan zurückkehren.'}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  className="btn--softpill elterngeld-calculation__revert-btn"
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
              initialChangedMonth={
                navigateTarget && 'focusMonth' in navigateTarget && 'changedMonth' in navigateTarget
                  ? navigateTarget.changedMonth ?? null
                  : null
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
                Ergebnis prüfen
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
              {!isPreparationEmpty(loadPreparation()) && (
                <Button
                  type="button"
                  variant="secondary"
                  className="next-steps__button btn--softpill"
                  onClick={() => goTo('/documents/elterngeld')}
                >
                  Zurück zur Vorbereitung
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

        {conflictResolved && view === 'compare' && planB && !usingPreparationFlow && (
          <>
            <StepCalculationComparison
              resultA={calculatePlan(plan)}
              resultB={calculatePlan(planB)}
              labelA={optimizationStatus === 'adopted' ? 'Übernommener Vorschlag' : 'Aktueller Plan'}
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

        <EditOriginDialog
          isOpen={showEditOriginDialog}
          onUpdatePreparation={handleUpdatePreparation}
          onKeepAsComparison={handleKeepAsComparison}
        />

        {conflictResolved && view === 'result' && result && (
          <>
            <StepCalculationResult
              result={result}
              plan={plan}
              planB={planB}
              optimizationGoal={optimizationGoal}
              optimizationStatus={optimizationStatus}
              originalPlanForOptimization={originalPlanForOptimization}
              originalResultForOptimization={originalResultForOptimization}
              lastAdoptedPlan={lastAdoptedPlan}
              lastAdoptedResult={lastAdoptedResult}
              onAdoptOptimization={handleAdoptOptimization}
              onDiscardOptimization={handleDiscardOptimization}
              onShowCompareOriginal={planB ? handleShowComparison : undefined}
              onCreatePdf={handleCreatePdf}
              isSubmitting={isSubmitting}
              onBackFromOptimization={handleBack}
              onNavigateToInput={usingPreparationFlow ? undefined : handleNavigateToInput}
              onApplyPartnerBonusFix={handleApplyPartnerBonusFix}
              onApplyPartnerBonusFixMultiple={handleApplyPartnerBonusFixMultiple}
              onApplyCreatePartnerOverlap={handleApplyCreatePartnerOverlap}
              elterngeldApplicationForAdoption={
                !isPreparationEmpty(loadPreparation()) ? loadPreparation() : null
              }
            />
            <div className="next-steps__stack elterngeld-nav">
              {optimizationGoal && (
                <Button
                  type="button"
                  variant="secondary"
                  className="next-steps__button btn--softpill"
                  onClick={handleDiscardOptimization}
                >
                  Optimierung schließen
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
                {usingPreparationFlow ? 'Zurück zur Zielauswahl' : 'Zurück zur Eingabe'}
              </Button>
              {!isPreparationEmpty(loadPreparation()) && (
                <Button
                  type="button"
                  variant="secondary"
                  className="next-steps__button btn--softpill"
                  onClick={() => goTo('/documents/elterngeld')}
                >
                  Zurück zur Vorbereitung
                </Button>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
};
