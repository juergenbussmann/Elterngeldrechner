import React from 'react';
import { Card } from '../../../../shared/ui/Card';
import { Button } from '../../../../shared/ui/Button';
import type { ElterngeldApplication } from '../types/elterngeldTypes';
import { getElterngeldDeadlineInfo } from '../elterngeldDeadlines';
import { GERMAN_STATES } from '../stateConfig';

const EMPLOYMENT_LABELS: Record<string, string> = {
  employed: 'Angestellt',
  self_employed: 'Selbstständig',
  mixed: 'Gemischt',
  none: 'Keine Erwerbstätigkeit',
};

const APPLICANT_MODE_LABELS: Record<string, string> = {
  single_applicant: 'Nur ich',
  both_parents: 'Beide Elternteile',
  single_parent: 'Ich bin alleinerziehend',
};

function formatDate(value?: string | null): string {
  if (!value) return '–';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '–' : d.toLocaleDateString('de-DE');
}

type Props = {
  values: ElterngeldApplication;
  onCreatePdf: () => void;
  isSubmitting: boolean;
  onNavigateToCalculation?: () => void;
};

export const StepSummary: React.FC<Props> = ({
  values,
  onCreatePdf,
  isSubmitting,
  onNavigateToCalculation,
}) => {
  const deadlineInfo = getElterngeldDeadlineInfo(values);
  const stateName =
    GERMAN_STATES.find((s) => s.stateCode === values.state)?.displayName || values.state || '–';
  const applicantMode = values.applicantMode;
  const showParentB = applicantMode === 'both_parents';
  const parentB = values.parentB;

  return (
    <Card className="still-daily-checklist__card">
      <h3 className="elterngeld-step__title">Zusammenfassung</h3>
      <div className="elterngeld-step__summary">
        <p><strong>Bundesland:</strong> {stateName}</p>
        <p><strong>Geburtsdatum:</strong> {formatDate(values.child.birthDate)}</p>
        <p><strong>ET (falls noch nicht geboren):</strong> {formatDate(values.child.expectedBirthDate)}</p>
        <p><strong>Wer beantragt:</strong> {APPLICANT_MODE_LABELS[applicantMode] ?? applicantMode}</p>
        <p><strong>Sie:</strong> {values.parentA.firstName} {values.parentA.lastName}</p>
        <p><strong>Ihre Beschäftigung:</strong> {EMPLOYMENT_LABELS[values.parentA.employmentType] ?? values.parentA.employmentType}</p>
        {showParentB && parentB && (
          <>
            <p><strong>Partner:</strong> {parentB.firstName} {parentB.lastName}</p>
            <p><strong>Beschäftigung Partner:</strong> {EMPLOYMENT_LABELS[parentB.employmentType] ?? parentB.employmentType}</p>
          </>
        )}
        <p><strong>Modell:</strong> {values.benefitPlan.model}</p>
        <p><strong>Ihre Monate:</strong> {values.benefitPlan.parentAMonths || '–'}</p>
        {showParentB && (
          <p><strong>Monate Partner:</strong> {values.benefitPlan.parentBMonths || '–'}</p>
        )}
        {showParentB && (
          <p><strong>Partnerschaftsbonus:</strong> {values.benefitPlan.partnershipBonus ? 'Ja' : 'Nein'}</p>
        )}
      </div>
      {deadlineInfo.deadlineLabel && (
        <p className="elterngeld-step__deadline">{deadlineInfo.deadlineLabel}</p>
      )}
      {deadlineInfo.noticeText && (
        <p className={`elterngeld-step__notice elterngeld-step__notice--${deadlineInfo.noticeLevel || 'tip'}`}>
          {deadlineInfo.noticeText}
        </p>
      )}
      <div className="elterngeld-step__summary-actions">
        <Button
          type="button"
          variant="primary"
          fullWidth
          className="next-steps__button btn--softpill"
          onClick={onCreatePdf}
          disabled={isSubmitting}
        >
          PDF erstellen
        </Button>
        {onNavigateToCalculation && (
          <Button
            type="button"
            variant="secondary"
            fullWidth
            className="next-steps__button btn--softpill"
            onClick={onNavigateToCalculation}
          >
            Weiter zur Elterngeld-Berechnung
          </Button>
        )}
      </div>
    </Card>
  );
};
