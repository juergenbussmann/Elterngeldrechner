import React from 'react';
import { Card } from '../../../../shared/ui/Card';
import { Button } from '../../../../shared/ui/Button';
import type { ElterngeldApplication } from '../types/elterngeldTypes';
import type { CalculationResult } from '../calculation';
import { getElterngeldDeadlineInfo } from '../elterngeldDeadlines';

function formatDate(value?: string | null): string {
  if (!value) return '–';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '–' : d.toLocaleDateString('de-DE');
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function countBezugMonths(parent: CalculationResult['parents'][0]): number {
  return parent.monthlyResults.filter((r) => r.mode !== 'none' || r.amount > 0).length;
}

type Props = {
  values: ElterngeldApplication;
  onCreatePdf: () => void;
  isSubmitting: boolean;
  onNavigateToCalculation?: () => void;
  onBackToPlan?: () => void;
  liveResult?: CalculationResult | null;
};

export const StepSummary: React.FC<Props> = ({
  values,
  onCreatePdf,
  isSubmitting,
  onNavigateToCalculation,
  onBackToPlan,
  liveResult,
}) => {
  const deadlineInfo = getElterngeldDeadlineInfo(values);
  const showParentB = values.applicantMode === 'both_parents';
  const birthDate = values.child.birthDate?.trim() || values.child.expectedBirthDate?.trim();

  return (
    <Card className="still-daily-checklist__card">
      <h3 className="elterngeld-step__title">Zusammenfassung</h3>
      <div className="elterngeld-step__summary">
        <p><strong>Geburt:</strong> {formatDate(birthDate)}</p>
        {liveResult && (
          <>
            <p><strong>Monate Mutter:</strong> {countBezugMonths(liveResult.parents[0])}</p>
            {liveResult.parents[1] && (
              <p><strong>Monate Partner:</strong> {countBezugMonths(liveResult.parents[1])}</p>
            )}
          </>
        )}
        {!liveResult && (
          <>
            <p><strong>Monate Mutter:</strong> {values.benefitPlan.parentAMonths || '–'}</p>
            {showParentB && (
              <p><strong>Monate Partner:</strong> {values.benefitPlan.parentBMonths || '–'}</p>
            )}
          </>
        )}
        <p className="elterngeld-step__summary-section-title"><strong>Voraussichtliches Elterngeld</strong></p>
        {liveResult ? (
          <>
            {liveResult.parents.map((p) => (
              <p key={p.id}><strong>{p.label}:</strong> {formatCurrency(p.total)}</p>
            ))}
            <p><strong>Gesamt:</strong> {formatCurrency(liveResult.householdTotal)}</p>
          </>
        ) : (
          <p>Bitte fülle die vorherigen Schritte aus, um die Schätzung zu sehen.</p>
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
        {onBackToPlan && (
          <Button
            type="button"
            variant="secondary"
            fullWidth
            className="next-steps__button btn--softpill elterngeld-step__back-to-plan"
            onClick={onBackToPlan}
          >
            Zurück zur Planung
          </Button>
        )}
        <Button
          type="button"
          variant="primary"
          fullWidth
          className="next-steps__button btn--softpill"
          onClick={onCreatePdf}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Wird erstellt…' : 'PDF Übersicht erstellen'}
        </Button>
        {onNavigateToCalculation && (
          <Button
            type="button"
            variant="secondary"
            fullWidth
            className="next-steps__button btn--softpill"
            onClick={onNavigateToCalculation}
          >
            Plan speichern – weiter zur Berechnung
          </Button>
        )}
      </div>
    </Card>
  );
};
