import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { SectionHeader } from '../../../shared/ui/SectionHeader';
import { Button } from '../../../shared/ui/Button';
import { usePhase } from '../../../core/phase/usePhase';
import { getInitialBirthDateValues } from '../../../shared/lib/birthDateFields';
import { useNotifications } from '../../../shared/lib/notifications';
import type { ElterngeldApplication } from './types/elterngeldTypes';
import { INITIAL_ELTERNGELD_APPLICATION } from './types/elterngeldTypes';
import { applicationToCalculationPlan } from './applicationToCalculationPlan';
import { calculatePlan } from './calculation';
import {
  loadPreparation,
  savePreparation,
  clearPreparation,
  isPreparationEmpty,
} from './infra/elterngeldPreparationStorage';
import { StepIntro } from './steps/StepIntro';
import { StepGeburtKind } from './steps/StepGeburtKind';
import { StepEinkommen } from './steps/StepEinkommen';
import { StepElternArbeit } from './steps/StepElternArbeit';
import { StepPlan } from './steps/StepPlan';
import { StepSummary } from './steps/StepSummary';
import { StepDocumentsDataOverview } from './steps/StepDocumentsDataOverview';
import { StepDocumentsPdfBundle } from './steps/StepDocumentsPdfBundle';
import { OptimizationOverlay } from './steps/OptimizationOverlay';
import { buildOptimizationResult, parseOptimizationAdoptedBaselineMap } from './calculation/elterngeldOptimization';
import { mergePlanIntoPreparation } from './planToApplicationMerge';
import { isPartnerBonusPartTimeHoursEligible } from './partnerBonusEligibility';
import { saveElterngeldWizardPdfBundle } from './saveElterngeldWizardPdfBundle';
import { ElterngeldLiveCard } from './ui/ElterngeldLiveCard';
import { useBegleitungPlus } from '../../../core/begleitungPlus';
import { ElterngeldFlowAccessBlocked } from './ElterngeldFlowAccessBlocked';
import './ElterngeldWizardPage.css';
import './ui/elterngeld-ui.css';
import '../../../styles/softpill-buttons-in-cards.css';
import '../../../styles/softpill-cards.css';

const WIZARD_STEPS = [
  { id: 'geburtKind', title: 'Geburt & Kind' },
  { id: 'einkommen', title: 'Einkommen' },
  { id: 'elternArbeit', title: 'Eltern & Arbeit' },
  { id: 'plan', title: 'Monate planen' },
  { id: 'summary', title: 'Zusammenfassung' },
  { id: 'documentsDataOverview', title: 'Daten für Dokumente' },
  { id: 'documentsPdfBundle', title: 'Antrag vorbereiten' },
] as const;

const TOTAL_STEPS = 8; /* Intro + 7 Wizard-Schritte */

export const ElterngeldWizardPage: React.FC = () => {
  const { isPlus, isYearly } = useBegleitungPlus();
  if (!isPlus || !isYearly) {
    return <ElterngeldFlowAccessBlocked variant={isPlus ? 'monthly' : 'free'} />;
  }
  return <ElterngeldWizardPageBody />;
};

const ElterngeldWizardPageBody: React.FC = () => {
  const { profile, actions } = usePhase();
  const { showToast } = useNotifications();
  const [wizardStarted, setWizardStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<ElterngeldApplication>(() => {
    const persisted = loadPreparation();
    const base = persisted ?? INITIAL_ELTERNGELD_APPLICATION;
    const childDates = getInitialBirthDateValues(profile, base.child);
    return {
      ...INITIAL_ELTERNGELD_APPLICATION,
      ...base,
      child: { ...INITIAL_ELTERNGELD_APPLICATION.child, ...base.child, ...childDates },
      parentA: { ...INITIAL_ELTERNGELD_APPLICATION.parentA, ...base.parentA },
      parentB: base.parentB ? { ...INITIAL_ELTERNGELD_APPLICATION.parentA, ...base.parentB } : null,
      benefitPlan: { ...INITIAL_ELTERNGELD_APPLICATION.benefitPlan, ...base.benefitPlan },
    };
  });
  const [isDocumentsBundleSubmitting, setIsDocumentsBundleSubmitting] = useState(false);
  const [documentsBundleSaved, setDocumentsBundleSaved] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [scrollToId, setScrollToId] = useState<string | null>(null);
  const [showOptimizationOverlay, setShowOptimizationOverlay] = useState(false);

  const closeOptimizationOverlay = useCallback(() => {
    setShowOptimizationOverlay(false);
  }, []);
  const errorRef = useRef<HTMLParagraphElement | null>(null);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const step = WIZARD_STEPS[stepIndex] ?? WIZARD_STEPS[0];
  const isLastStep = stepIndex === WIZARD_STEPS.length - 1;
  const currentStepNumber = stepIndex + 2; /* Intro = 1, Basic = 2, ... */
  const prevStepIdRef = useRef<string>(step.id);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [stepIndex, wizardStarted]);

  useEffect(() => {
    if (prevStepIdRef.current === 'documentsPdfBundle' && step.id !== 'documentsPdfBundle') {
      setDocumentsBundleSaved(false);
    }
    prevStepIdRef.current = step.id;
  }, [step.id]);

  const planForOptimization = useMemo(() => applicationToCalculationPlan(values), [values]);

  const liveResult = useMemo(() => {
    const birthDate = planForOptimization.childBirthDate?.trim();
    if (!birthDate) return null;
    try {
      return calculatePlan(planForOptimization);
    } catch {
      return null;
    }
  }, [planForOptimization]);

  const partnerBonusHoursEligible = useMemo(() => isPartnerBonusPartTimeHoursEligible(values), [values]);

  const optimizationSummary = useMemo(() => {
    if (!liveResult || liveResult.validation.errors.length > 0) return { hasAnySuggestions: false, partnerBonusSuggestion: null };
    try {
      const goals = ['maxMoney', 'longerDuration', 'frontLoad', 'partnerBonus'] as const;
      let hasAnySuggestions = false;
      let partnerBonusSuggestion = null;
      for (const goal of goals) {
        if (goal === 'partnerBonus' && !partnerBonusHoursEligible) continue;
        const outcome = buildOptimizationResult(planForOptimization, liveResult, goal, {
          adoptedBaselineGoals: parseOptimizationAdoptedBaselineMap(
            values.benefitPlan.optimizationAdoptedBaselineGoals
          ),
        });
        if ('status' in outcome && outcome.status === 'unsupported') continue;
        const ors = outcome as { currentResult: typeof liveResult; suggestions: { status: string; result: typeof liveResult }[] };
        const hasImproved = ors.suggestions.some((s) => s.status === 'improved');
        if (hasImproved) hasAnySuggestions = true;
        if (goal === 'partnerBonus' && ors.suggestions.length > 0 && ors.suggestions[0].status === 'improved') {
          partnerBonusSuggestion = ors.suggestions[0];
        }
      }
      return { hasAnySuggestions, partnerBonusSuggestion };
    } catch {
      return { hasAnySuggestions: false, partnerBonusSuggestion: null };
    }
  }, [planForOptimization, liveResult, partnerBonusHoursEligible, values.benefitPlan.optimizationAdoptedBaselineGoals]);

  const handleNext = useCallback(() => {
    setCalculationError(null);
    if (isLastStep) return;
    setStepIndex((i) => Math.min(i + 1, WIZARD_STEPS.length - 1));
  }, [isLastStep]);

  const handleBack = useCallback(() => {
    setCalculationError(null);
    if (stepIndex === 0) {
      setWizardStarted(false);
      return;
    }
    setStepIndex((i) => i - 1);
  }, [stepIndex]);

  // Profil → Formular: Wenn Profil sich ändert (z.B. in Einstellungen), Kind-Datumsfelder nachziehen
  useEffect(() => {
    const nextChild = getInitialBirthDateValues(profile, undefined);
    const hasValidBirthDate =
      nextChild.birthDate?.trim() || nextChild.expectedBirthDate?.trim();
    if (!hasValidBirthDate) return;

    const current = valuesRef.current.child;
    const currentBirth = current.birthDate?.trim() || '';
    const currentExpected = current.expectedBirthDate?.trim() || '';
    const needsUpdate =
      nextChild.birthDate !== currentBirth || nextChild.expectedBirthDate !== currentExpected;
    if (!needsUpdate) return;

    setValues((prev) => ({
      ...prev,
      child: {
        ...prev.child,
        birthDate: nextChild.birthDate,
        expectedBirthDate: nextChild.expectedBirthDate,
      },
    }));
  }, [profile]);

  useEffect(() => {
    if (!scrollToId || !step?.id) return;
    const id = scrollToId;
    const t = setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setScrollToId(null);
    }, 200);
    return () => clearTimeout(t);
  }, [scrollToId, step?.id]);

  useEffect(() => {
    if (!isPreparationEmpty(values)) {
      savePreparation(values);
    }
    // Kind-Daten ins zentrale Profil syncen (Startseite liest daraus)
    const bd = values.child.birthDate?.trim();
    const ebd = values.child.expectedBirthDate?.trim();
    if (bd) {
      actions.setBirthDate(bd);
    } else if (ebd) {
      actions.setDueDate(ebd);
    } else {
      actions.clear();
    }
  }, [values, actions]);

  const handleReset = useCallback(() => {
    clearPreparation();
    const initial = INITIAL_ELTERNGELD_APPLICATION;
    const childDates = getInitialBirthDateValues(profile, initial.child);
    setValues({ ...initial, child: { ...initial.child, ...childDates } });
    setStepIndex(0);
    setWizardStarted(false);
    setCalculationError(null);
    setDocumentsBundleSaved(false);
    showToast('Vorbereitung zurückgesetzt', { kind: 'success', durationMs: 3000 });
  }, [profile, showToast]);

  const handleStartWizard = useCallback(() => {
    setWizardStarted(true);
    setStepIndex(0);
  }, []);

  const handleSaveAllDocumentPdfs = useCallback(async () => {
    setIsDocumentsBundleSubmitting(true);
    try {
      if (import.meta.env.DEV) console.time('[documents] PDF bundle (Elterngeld)');
      await saveElterngeldWizardPdfBundle(values, liveResult);
      if (import.meta.env.DEV) console.timeEnd('[documents] PDF bundle (Elterngeld)');
      showToast('documents.elterngeld.pdfCreated', { kind: 'success', durationMs: 5000 });
      setDocumentsBundleSaved(true);
    } catch (err) {
      console.error('[elterngeld] PDF bundle save failed', err);
      showToast('documents.elterngeld.pdfError', { kind: 'error' });
    } finally {
      setIsDocumentsBundleSubmitting(false);
    }
  }, [values, liveResult, showToast]);

  if (!wizardStarted) {
    return (
      <div className="screen-placeholder elterngeld-screen elterngeld-screen--intro">
        <section className="elterngeld-intro-screen" aria-label="Elterngeld Einstieg">
          <StepIntro onStart={handleStartWizard} onReset={handleReset} />
        </section>
      </div>
    );
  }

  return (
    <div className="screen-placeholder elterngeld-screen">
      <section className="next-steps next-steps--plain elterngeld__section">
        <SectionHeader as="h1" title="Elterngeld planen" />
        <div className="elterngeld-wizard-progress">
          <p className="elterngeld-wizard-progress__label">Schritt {currentStepNumber} von {TOTAL_STEPS}</p>
          <div className="elterngeld-wizard-progress__bar" role="progressbar" aria-valuenow={currentStepNumber} aria-valuemin={1} aria-valuemax={TOTAL_STEPS}>
            <div className="elterngeld-wizard-progress__fill" style={{ width: `${(currentStepNumber / TOTAL_STEPS) * 100}%` }} />
          </div>
        </div>
        <p className="elterngeld-autosave-message">✓ Deine Angaben werden automatisch lokal gespeichert.</p>

        {liveResult && <ElterngeldLiveCard result={liveResult} />}

        {calculationError && (
          <p
            ref={errorRef}
            className="elterngeld-step__notice elterngeld-step__notice--warning"
            role="alert"
          >
            {calculationError}
          </p>
        )}
        {step.id === 'geburtKind' && (
          <StepGeburtKind values={values} onChange={setValues} />
        )}
        {step.id === 'einkommen' && (
          <StepEinkommen values={values} onChange={setValues} />
        )}
        {step.id === 'elternArbeit' && (
          <StepElternArbeit values={values} onChange={setValues} />
        )}
        {step.id === 'plan' && (
          <StepPlan
            values={values}
            onChange={setValues}
            onNavigateToStep={(stepId, idToScroll) => {
              const idx = WIZARD_STEPS.findIndex((s) => s.id === stepId);
              if (idx >= 0) {
                setStepIndex(idx);
                setScrollToId(idToScroll ?? null);
              }
            }}
            partnerBonusHoursEligible={partnerBonusHoursEligible}
            onApplyBonusFix={() =>
              showToast('Ich habe die Monate für den Partnerschaftsbonus angepasst.', {
                kind: 'success',
                durationMs: 3000,
              })
            }
          />
        )}
        {step.id === 'summary' && (
          <StepSummary
            values={values}
            onBackToPlan={() => setStepIndex(WIZARD_STEPS.findIndex((s) => s.id === 'plan'))}
            onOpenOptimization={() => setShowOptimizationOverlay(true)}
            onProceedToDocuments={handleNext}
            liveResult={liveResult}
          />
        )}
        {step.id === 'documentsDataOverview' && (
          <StepDocumentsDataOverview values={values} liveResult={liveResult} />
        )}
        {step.id === 'documentsPdfBundle' && (
          <StepDocumentsPdfBundle
            values={values}
            liveResult={liveResult}
            onSaveAllPdfs={handleSaveAllDocumentPdfs}
            isSubmitting={isDocumentsBundleSubmitting}
            saveComplete={documentsBundleSaved}
          />
        )}
        {step.id !== 'summary' && (
          <div className="next-steps__stack elterngeld-actions">
            <Button
              type="button"
              variant="secondary"
              className="next-steps__button btn--softpill elterngeld-actions__secondary"
              onClick={handleBack}
            >
              Zurück
            </Button>
            {step.id === 'documentsDataOverview' ? (
              <Button
                type="button"
                variant="primary"
                className="next-steps__button btn--softpill elterngeld-actions__primary"
                onClick={handleNext}
              >
                Weiter zu PDFs
              </Button>
            ) : null}
            {!isLastStep && step.id !== 'documentsDataOverview' ? (
              <Button
                type="button"
                variant="primary"
                className="next-steps__button btn--softpill elterngeld-actions__primary"
                onClick={handleNext}
              >
                {step.id === 'plan' && liveResult && liveResult.validation.errors.length === 0
                  ? 'Weiter zum Ergebnis'
                  : 'Weiter'}
              </Button>
            ) : null}
          </div>
        )}
        <div className="next-steps__stack elterngeld-actions elterngeld-actions--tertiary">
          <Button
            type="button"
            variant="ghost"
            className="next-steps__button elterngeld-actions__reset"
            onClick={handleReset}
          >
            Neu beginnen
          </Button>
        </div>

        {step.id === 'summary' &&
          liveResult &&
          liveResult.validation.errors.length === 0 && (
            <OptimizationOverlay
              isOpen={showOptimizationOverlay}
              onClose={closeOptimizationOverlay}
              plan={planForOptimization}
              result={liveResult}
              hasAnySuggestions={optimizationSummary.hasAnySuggestions ?? false}
              partnerBonusHoursEligible={partnerBonusHoursEligible}
              application={values}
              onApplicationChange={setValues}
              onAdoptOptimization={(plan, adoptedGoal, adoptedResult) => {
                setValues((prev) =>
                  mergePlanIntoPreparation(
                    prev,
                    plan,
                    adoptedGoal
                      ? {
                          adoptedOptimizationGoal: adoptedGoal,
                          adoptedOptimizationResult: adoptedResult,
                        }
                      : undefined
                  )
                );
                closeOptimizationOverlay();
              }}
              originalPlanForOptimization={planForOptimization}
              originalResultForOptimization={liveResult}
              onNavigateToMonthEditing={() => {
                closeOptimizationOverlay();
                const planIdx = WIZARD_STEPS.findIndex((s) => s.id === 'plan');
                if (planIdx >= 0) {
                  setStepIndex(planIdx);
                  setScrollToId('elterngeld-plan-month-grid');
                }
              }}
              onNavigateToLeistungSettings={() => {
                closeOptimizationOverlay();
                const planIdx = WIZARD_STEPS.findIndex((s) => s.id === 'plan');
                if (planIdx >= 0) {
                  setStepIndex(planIdx);
                  setScrollToId('elterngeld-plan-leistung');
                }
              }}
            />
          )}
      </section>
    </div>
  );
};
