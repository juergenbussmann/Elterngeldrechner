import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import {
  loadPreparation,
  savePreparation,
  clearPreparation,
  isPreparationEmpty,
} from './infra/elterngeldPreparationStorage';
import { Card } from '../../../shared/ui/Card';
import { StepBasicData } from './steps/StepBasicData';
import { StepParents } from './steps/StepParents';
import { StepPlan } from './steps/StepPlan';
import { StepDocuments } from './steps/StepDocuments';
import { StepSummary } from './steps/StepSummary';
import { ElterngeldFlowStepper } from './ElterngeldFlowStepper';
import { buildElterngeldSummaryPdf } from './pdf/buildElterngeldSummaryPdf';
import './ElterngeldWizardPage.css';
import './ElterngeldFlowStepper.css';
import '../../checklists/styles/softpill-buttons-in-cards.css';
import '../../checklists/styles/softpill-cards.css';

const CALCULATION_REQUIRED_ERROR =
  'Bitte geben Sie ein Geburtsdatum oder einen voraussichtlichen Geburtstermin an.';

const STEPS = [
  { id: 'basic', title: 'Grunddaten', component: StepBasicData },
  { id: 'parents', title: 'Eltern & Arbeit', component: StepParents },
  { id: 'plan', title: 'Elterngeld-Plan', component: StepPlan },
  { id: 'documents', title: 'Unterlagen', component: StepDocuments },
  { id: 'summary', title: 'Zusammenfassung', component: StepSummary },
] as const;

export const ElterngeldWizardPage: React.FC = () => {
  const { profile, actions } = usePhase();
  const { goTo } = useNavigation();
  const { showToast } = useNotifications();
  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<ElterngeldApplication>(() => {
    const persisted = loadPreparation();
    const base = persisted ?? INITIAL_ELTERNGELD_APPLICATION;
    const childDates = getInitialBirthDateValues(profile, base.child);
    return { ...base, child: { ...base.child, ...childDates } };
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement | null>(null);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  const handleNext = useCallback(() => {
    setCalculationError(null);
    if (isLastStep) return;
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }, [isLastStep]);

  const handleBack = useCallback(() => {
    setCalculationError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  const handleNavigateToCalculation = useCallback(() => {
    setCalculationError(null);
    const birthDate = values.child.birthDate?.trim();
    const expectedDate = values.child.expectedBirthDate?.trim();
    if (!birthDate && !expectedDate) {
      setCalculationError(CALCULATION_REQUIRED_ERROR);
      setStepIndex(0);
      requestAnimationFrame(() => {
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
      return;
    }
    const plan = applicationToCalculationPlan(values);
    goTo('/documents/elterngeld-calculation', { state: { fromPreparation: plan } });
  }, [values, goTo]);

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
    setCalculationError(null);
    showToast('Vorbereitung zurückgesetzt', { kind: 'success', durationMs: 3000 });
  }, [profile, showToast]);

  const handleCreatePdf = useCallback(async () => {
    setIsSubmitting(true);
    try {
      if (import.meta.env.DEV) console.time('[documents] PDF build (ElterngeldSummary)');
      const blob = buildElterngeldSummaryPdf(values);
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
  }, [values, showToast]);

  if (showSuccess) {
    return (
      <div className="screen-placeholder elterngeld-screen">
        <section className="next-steps next-steps--plain elterngeld__section">
          <SectionHeader as="h1" title="Elterngeld vorbereiten" />
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

  return (
    <div className="screen-placeholder elterngeld-screen">
      <section className="next-steps next-steps--plain elterngeld__section">
        <SectionHeader as="h1" title="Elterngeld vorbereiten" />
        <ElterngeldFlowStepper currentStep={1} />
        <div className="elterngeld-progress">
          Schritt {stepIndex + 1} von {STEPS.length}
        </div>
        {calculationError && (
          <p
            ref={errorRef}
            className="elterngeld-step__notice elterngeld-step__notice--warning"
            role="alert"
          >
            {calculationError}
          </p>
        )}
        {step.id === 'basic' && (
          <StepBasicData values={values} onChange={setValues} />
        )}
        {step.id === 'parents' && (
          <StepParents values={values} onChange={setValues} />
        )}
        {step.id === 'plan' && (
          <StepPlan values={values} onChange={setValues} />
        )}
        {step.id === 'documents' && (
          <StepDocuments values={values} />
        )}
        {step.id === 'summary' && (
          <StepSummary
            values={values}
            onCreatePdf={handleCreatePdf}
            isSubmitting={isSubmitting}
            onNavigateToCalculation={handleNavigateToCalculation}
          />
        )}
        {step.id !== 'summary' && (
          <div className="next-steps__stack elterngeld-actions">
            <Button
              type="button"
              variant="secondary"
              className="next-steps__button btn--softpill"
              onClick={handleBack}
              disabled={stepIndex === 0}
            >
              Zurück
            </Button>
            <Button
              type="button"
              variant="primary"
              className="next-steps__button btn--softpill"
              onClick={handleNext}
            >
              Weiter
            </Button>
          </div>
        )}
        <div className="next-steps__stack elterngeld-actions elterngeld-actions--tertiary">
          <Button
            type="button"
            variant="ghost"
            className="next-steps__button"
            onClick={handleReset}
          >
            Neu beginnen
          </Button>
        </div>
      </section>
    </div>
  );
};
