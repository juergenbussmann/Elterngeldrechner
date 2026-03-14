import React, { useState, useCallback } from 'react';
import { SectionHeader } from '../../../shared/ui/SectionHeader';
import { Button } from '../../../shared/ui/Button';
import { useNavigation } from '../../../shared/lib/navigation/useNavigation';
import { useNotifications } from '../../../shared/lib/notifications';
import { addDocument } from '../application/service';
import type { ElterngeldApplication } from './types/elterngeldTypes';
import { INITIAL_ELTERNGELD_APPLICATION } from './types/elterngeldTypes';
import { StepBasicData } from './steps/StepBasicData';
import { StepParents } from './steps/StepParents';
import { StepPlan } from './steps/StepPlan';
import { StepDocuments } from './steps/StepDocuments';
import { StepSummary } from './steps/StepSummary';
import { buildElterngeldSummaryPdf } from './pdf/buildElterngeldSummaryPdf';
import './ElterngeldWizardPage.css';
import '../../checklists/styles/softpill-buttons-in-cards.css';
import '../../checklists/styles/softpill-cards.css';

const STEPS = [
  { id: 'basic', title: 'Grunddaten', component: StepBasicData },
  { id: 'parents', title: 'Eltern & Arbeit', component: StepParents },
  { id: 'plan', title: 'Elterngeld-Plan', component: StepPlan },
  { id: 'documents', title: 'Unterlagen', component: StepDocuments },
  { id: 'summary', title: 'Zusammenfassung', component: StepSummary },
] as const;

export const ElterngeldWizardPage: React.FC = () => {
  const { goTo } = useNavigation();
  const { showToast } = useNotifications();
  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<ElterngeldApplication>(INITIAL_ELTERNGELD_APPLICATION);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  const handleNext = useCallback(() => {
    if (isLastStep) return;
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }, [isLastStep]);

  const handleBack = useCallback(() => {
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  const handleCreatePdf = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const blob = buildElterngeldSummaryPdf(values);
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
          <div className="elterngeld-success-card still-daily-checklist__card">
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
          </div>
        </section>
      </div>
    );
  }

  const StepComponent = step.component;

  return (
    <div className="screen-placeholder elterngeld-screen">
      <section className="next-steps next-steps--plain elterngeld__section">
        <SectionHeader as="h1" title="Elterngeld vorbereiten" />
        <div className="elterngeld-progress">
          Schritt {stepIndex + 1} von {STEPS.length}
        </div>
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
          />
        )}
        {step.id !== 'summary' && (
          <div className="elterngeld-nav">
            <Button
              type="button"
              variant="ghost"
              onClick={handleBack}
              disabled={stepIndex === 0}
            >
              Zurück
            </Button>
            <Button
              type="button"
              variant="primary"
              className="btn--softpill"
              onClick={handleNext}
            >
              Weiter
            </Button>
          </div>
        )}
      </section>
    </div>
  );
};
