/**
 * Wizard-Schritt 1 der Ausgabestrecke: nur Zusammenfassungs-PDF.
 */

import React from 'react';
import { Card } from '../../../../shared/ui/Card';
import { Button } from '../../../../shared/ui/Button';
import type { ElterngeldApplication } from '../types/elterngeldTypes';
import type { CalculationResult } from '../calculation';
import { buildElterngeldDocumentModel } from '../documentModel/buildElterngeldDocumentModel';
import { formatDateGerman, parseIsoDate } from '../elterngeldDeadlines';

type Props = {
  values: ElterngeldApplication;
  liveResult?: CalculationResult | null;
  onCreatePdf: () => void | Promise<void>;
  isSubmitting: boolean;
};

export const StepDocumentsSummaryPdf: React.FC<Props> = ({
  values,
  liveResult,
  onCreatePdf,
  isSubmitting,
}) => {
  const model = buildElterngeldDocumentModel(values, liveResult);
  const birthDate = parseIsoDate(model.child.birthDate);
  const birthStr = birthDate ? formatDateGerman(birthDate) : '–';

  return (
    <Card className="still-daily-checklist__card elterngeld-documents__intro-card">
      <h3 className="elterngeld-step__title">PDF-Übersicht</h3>
      <p className="elterngeld-step__hint elterngeld-summary__forms-hint elterngeld-documents__lead">
        Erstelle eine zusammengefasste PDF-Vorbereitung mit deinen Angaben, dem geplanten Bezug und der
        Unterlagen-Checkliste. Das Dokument wird unter „Dokumente“ gespeichert.
      </p>
      <p className="elterngeld-step__hint elterngeld-summary__forms-hint">
        Als Nächstes gehst du die Checkliste Schritt für Schritt durch.
      </p>
      <div className="elterngeld-documents__overview elterngeld-step__hint elterngeld-summary__forms-hint">
        <p>
          <strong>Bundesland:</strong> {model.stateDisplayName}
        </p>
        <p>
          <strong>Geburt / Termin:</strong> {birthStr}
        </p>
      </div>
      <div className="next-steps__stack elterngeld-documents__output-actions">
        <Button
          type="button"
          variant="primary"
          fullWidth
          className="next-steps__button btn--softpill"
          onClick={() => void onCreatePdf()}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Wird erstellt…' : 'PDF Übersicht erstellen'}
        </Button>
      </div>
    </Card>
  );
};
