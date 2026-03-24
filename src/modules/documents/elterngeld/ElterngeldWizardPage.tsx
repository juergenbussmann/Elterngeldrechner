import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { SectionHeader } from '../../../shared/ui/SectionHeader';
import { Button } from '../../../shared/ui/Button';
import { usePhase } from '../../../core/phase/usePhase';
import { useNavigation } from '../../../shared/lib/navigation/useNavigation';
import { getInitialBirthDateValues } from '../../../shared/lib/birthDateFields';
import { useNotifications } from '../../../shared/lib/notifications';
import { addDocument } from '../application/service';
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
import { Card } from '../../../shared/ui/Card';
import { StepIntro } from './steps/StepIntro';
import { StepGeburtKind } from './steps/StepGeburtKind';
import { StepEinkommen } from './steps/StepEinkommen';
import { StepElternArbeit } from './steps/StepElternArbeit';
import { StepPlan } from './steps/StepPlan';
import { StepSummary } from './steps/StepSummary';
import { StepDocuments } from './steps/StepDocuments';
import { OptimizationOverlay } from './steps/OptimizationOverlay';
import { ResultReviewOverlay } from './steps/ResultReviewOverlay';
import { buildOptimizationResult } from './calculation/elterngeldOptimization';
import { mergePlanIntoPreparation } from './planToApplicationMerge';
import { isPartnerBonusPartTimeHoursEligible } from './partnerBonusEligibility';
import { buildElterngeldSummaryPdf } from './pdf/buildElterngeldSummaryPdf';
import { buildElterngeldApplicationPdf } from './pdf/buildElterngeldApplicationPdf';
import { buildElterngeldDocumentModel } from './documentModel/buildElterngeldDocumentModel';
import { ElterngeldLiveCard } from './ui/ElterngeldLiveCard';
import './ElterngeldWizardPage.css';
import './ElterngeldFlowStepper.css';
import './ui/elterngeld-ui.css';
import '../../checklists/styles/softpill-buttons-in-cards.css';
import '../../checklists/styles/softpill-cards.css';

const CALCULATION_REQUIRED_ERROR =
  'Bitte geben Sie ein Geburtsdatum oder einen voraussichtlichen Geburtstermin an.';

const WIZARD_STEPS = [
  { id: 'geburtKind', title: 'Geburt & Kind' },
  { id: 'einkommen', title: 'Einkommen' },
  { id: 'elternArbeit', title: 'Eltern & Arbeit' },
  { id: 'plan', title: 'Monate planen' },
  { id: 'summary', title: 'Zusammenfassung' },
  { id: 'documents', title: 'Dokumente' },
] as const;

const TOTAL_STEPS = 7; /* Intro + 6 Wizard-Schritte */

export const ElterngeldWizardPage: React.FC = () => {
  const { profile, actions } = usePhase();
  const { goTo } = useNavigation();
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
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplicationPdfSubmitting, setIsApplicationPdfSubmitting] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [scrollToId, setScrollToId] = useState<string | null>(null);
  const [showOptimizationOverlay, setShowOptimizationOverlay] = useState(false);
  const [showResultReviewOverlay, setShowResultReviewOverlay] = useState(false);

  const closeOptimizationOverlay = useCallback(() => {
    setShowOptimizationOverlay(false);
  }, []);

  const openOptimizationFromPlan = useCallback((open: boolean) => {
    setShowOptimizationOverlay(open);
  }, []);
  const errorRef = useRef<HTMLParagraphElement | null>(null);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const step = WIZARD_STEPS[stepIndex] ?? WIZARD_STEPS[0];
  const isLastStep = stepIndex === WIZARD_STEPS.length - 1;
  const currentStepNumber = stepIndex + 2; /* Intro = 1, Basic = 2, ... */

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [stepIndex, wizardStarted]);

  useEffect(() => {
    if (step.id !== 'summary') setShowResultReviewOverlay(false);
  }, [step.id]);

  const liveResult = useMemo(() => {
    const birthDate = values.child.birthDate?.trim() || values.child.expectedBirthDate?.trim();
    if (!birthDate) return null;
    try {
      const plan = applicationToCalculationPlan(values);
      return calculatePlan(plan);
    } catch {
      return null;
    }
  }, [values]);

  const planForOptimization = useMemo(() => applicationToCalculationPlan(values), [values]);

  const partnerBonusHoursEligible = useMemo(() => isPartnerBonusPartTimeHoursEligible(values), [values]);

  const optimizationSummary = useMemo(() => {
    if (!liveResult || liveResult.validation.errors.length > 0) return { hasAnySuggestions: false, partnerBonusSuggestion: null };
    try {
      const goals = ['maxMoney', 'longerDuration', 'frontLoad', 'partnerBonus'] as const;
      let hasAnySuggestions = false;
      let partnerBonusSuggestion = null;
      for (const goal of goals) {
        if (goal === 'partnerBonus' && !partnerBonusHoursEligible) continue;
        const outcome = buildOptimizationResult(planForOptimization, liveResult, goal);
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
  }, [planForOptimization, liveResult, partnerBonusHoursEligible]);

  const handleNext = useCallback(() => {
    setCalculationError(null);
    if (isLastStep) return;
    setStepIndex((i) => Math.min(i + 1, WIZARD_STEPS.length - 1));
  }, [isLastStep]);

  const handleBack = useCallback(() => {
    setCalculationError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  // Profil → Formular: Wenn Profil sich ändert (z.B. in Einstellungen), Kind-Datumsfelder nachziehen
  useEffect(() => {
    const expected = getInitialBirthDateValues(profile, undefined);
    const current = valuesRef.current.child;
    const currentBirth = current.birthDate?.trim() || '';
    const currentExpected = current.expectedBirthDate?.trim() || '';
    const needsUpdate =
      (expected.birthDate !== currentBirth) || (expected.expectedBirthDate !== currentExpected);
    if (needsUpdate) {
      setValues((prev) => ({
        ...prev,
        child: {
          ...prev.child,
          birthDate: expected.birthDate,
          expectedBirthDate: expected.expectedBirthDate,
        },
      }));
    }
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
    showToast('Vorbereitung zurückgesetzt', { kind: 'success', durationMs: 3000 });
  }, [profile, showToast]);

  const handleStartWizard = useCallback(() => {
    setWizardStarted(true);
    setStepIndex(0);
  }, []);

  const handleCreatePdf = useCallback(async () => {
    setIsSubmitting(true);
    try {
      if (import.meta.env.DEV) console.time('[documents] PDF build (ElterngeldSummary)');
      const blob = buildElterngeldSummaryPdf(values, liveResult);
      if (import.meta.env.DEV) console.timeEnd('[documents] PDF build (ElterngeldSummary)');
      await addDocument({
        title: 'Elterngeld-Vorbereitung',
        createdAt: new Date().toISOString(),
        mimeType: 'application/pdf',
        blob,
      });
      showToast('documents.elterngeld.pdfCreated', { kind: 'success', durationMs: 5000 });
      setShowSuccess(true);
    } catch (err) {
      console.error('[elterngeld] PDF creation failed', err);
      showToast('documents.elterngeld.pdfError', { kind: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  }, [values, liveResult, showToast]);

  const handleCreateApplicationPdf = useCallback(async () => {
    setIsApplicationPdfSubmitting(true);
    try {
      if (import.meta.env.DEV) console.time('[documents] PDF build (ElterngeldApplication)');
      const model = buildElterngeldDocumentModel(values, liveResult);
      const blob = buildElterngeldApplicationPdf(model);
      if (import.meta.env.DEV) console.timeEnd('[documents] PDF build (ElterngeldApplication)');
      await addDocument({
        title: 'Elterngeld-Antragsformular (Vorbereitung)',
        createdAt: new Date().toISOString(),
        mimeType: 'application/pdf',
        blob,
      });
      showToast('documents.elterngeld.pdfCreated', { kind: 'success', durationMs: 5000 });
      setShowSuccess(true);
    } catch (err) {
      console.error('[elterngeld] application PDF creation failed', err);
      showToast('documents.elterngeld.pdfError', { kind: 'error' });
    } finally {
      setIsApplicationPdfSubmitting(false);
    }
  }, [values, liveResult, showToast]);

  if (showSuccess) {
    return (
      <div className="screen-placeholder elterngeld-screen">
        <section className="next-steps next-steps--plain elterngeld__section">
          <SectionHeader as="h1" title="Elterngeld planen" />
          <Card className="still-daily-checklist__card">
            <p className="elterngeld-success-text">PDF erstellt und in „Dokumente“ gespeichert.</p>
            <Button
              type="button"
              variant="primary"
              fullWidth
              className="next-steps__button btn--softpill"
              onClick={() => goTo('/documents')}
            >
              Zu Dokumente
            </Button>
          </Card>
        </section>
      </div>
    );
  }

  if (!wizardStarted) {
    return (
      <div className="screen-placeholder elterngeld-screen">
        <section className="next-steps next-steps--plain elterngeld__section">
          <SectionHeader as="h1" title="Elterngeld planen" />
          <div className="elterngeld-wizard-progress">
            <p className="elterngeld-wizard-progress__label">Schritt 1 von {TOTAL_STEPS}</p>
            <div className="elterngeld-wizard-progress__bar" role="progressbar" aria-valuenow={1} aria-valuemin={1} aria-valuemax={TOTAL_STEPS}>
              <div className="elterngeld-wizard-progress__fill" style={{ width: `${(1 / TOTAL_STEPS) * 100}%` }} />
            </div>
          </div>
          <StepIntro onStart={handleStartWizard} />
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
            showOptimizationOverlay={showOptimizationOverlay}
            onShowOptimizationOverlay={openOptimizationFromPlan}
            optimizationSummary={optimizationSummary}
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
            onCreatePdf={handleCreatePdf}
            isSubmitting={isSubmitting}
            onBackToPlan={() => setStepIndex(WIZARD_STEPS.findIndex((s) => s.id === 'plan'))}
            onOpenOptimization={() => setShowOptimizationOverlay(true)}
            onNavigateToCalculation={() => setShowResultReviewOverlay(true)}
            onProceedToDocuments={() =>
              setStepIndex(WIZARD_STEPS.findIndex((s) => s.id === 'documents'))
            }
            liveResult={liveResult}
            optimizationSummary={optimizationSummary}
          />
        )}
        {step.id === 'documents' && (
          <StepDocuments
            values={values}
            liveResult={liveResult}
            onCreatePdf={handleCreatePdf}
            isSubmitting={isSubmitting}
            onCreateApplicationPdf={handleCreateApplicationPdf}
            isApplicationPdfSubmitting={isApplicationPdfSubmitting}
          />
        )}
        {step.id !== 'summary' && (
          <div className="next-steps__stack elterngeld-actions">
            <Button
              type="button"
              variant="secondary"
              className="next-steps__button btn--softpill elterngeld-actions__secondary"
              onClick={handleBack}
              disabled={stepIndex === 0}
            >
              Zurück
            </Button>
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

        {(step.id === 'plan' || step.id === 'summary') &&
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
              onAdoptOptimization={(plan) => {
                setValues((prev) => mergePlanIntoPreparation(prev, plan));
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
            />
          )}
        {step.id === 'summary' && liveResult && liveResult.validation.errors.length === 0 && (
          <ResultReviewOverlay
            isOpen={showResultReviewOverlay}
            onClose={() => setShowResultReviewOverlay(false)}
            values={values}
            result={liveResult}
          />
        )}
      </section>
    </div>
  );
};
