/**
 * Wizard-Schritt 3 der Ausgabestrecke: nur Antragsvorbereitung-PDF (wenn laut Modell verfügbar).
 */

import React, { useMemo } from 'react';
import { Card } from '../../../../shared/ui/Card';
import { Button } from '../../../../shared/ui/Button';
import type { ElterngeldApplication } from '../types/elterngeldTypes';
import type { CalculationResult } from '../calculation';
import { buildElterngeldDocumentModel } from '../documentModel/buildElterngeldDocumentModel';
import { getElterngeldDocumentOutputRows } from '../documentModel/elterngeldDocumentOutputs';

type Props = {
  values: ElterngeldApplication;
  liveResult?: CalculationResult | null;
  onCreateApplicationPdf: () => void | Promise<void>;
  isApplicationPdfSubmitting: boolean;
};

export const StepDocumentsApplicationPdf: React.FC<Props> = ({
  values,
  liveResult,
  onCreateApplicationPdf,
  isApplicationPdfSubmitting,
}) => {
  const model = useMemo(() => buildElterngeldDocumentModel(values, liveResult), [values, liveResult]);
  const outputRows = useMemo(() => getElterngeldDocumentOutputRows(model), [model]);
  const applicationRow = outputRows.find((r) => r.action === 'applicationPdf');
  const placeholderRow = outputRows.find((r) => r.id === 'output-form-state');

  return (
    <Card className="still-daily-checklist__card elterngeld-documents__intro-card">
      <h3 className="elterngeld-step__title">Antragsvorbereitung</h3>
      {applicationRow ? (
        <>
          <p className="elterngeld-step__hint elterngeld-summary__forms-hint elterngeld-documents__lead">
            {applicationRow.description}
          </p>
          <p className="elterngeld-step__hint elterngeld-summary__forms-hint">
            <span className={`elterngeld-documents__status elterngeld-documents__status--${applicationRow.status}`}>
              {applicationRow.statusLabel}
            </span>
          </p>
          <div className="elterngeld-documents__output-actions">
            <Button
              type="button"
              variant="primary"
              fullWidth
              className="next-steps__button btn--softpill"
              onClick={() => void onCreateApplicationPdf()}
              disabled={isApplicationPdfSubmitting}
            >
              {isApplicationPdfSubmitting ? 'Wird erstellt…' : 'Antragsvorbereitung (PDF) erstellen'}
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="elterngeld-step__hint elterngeld-summary__forms-hint elterngeld-documents__lead">
            {placeholderRow?.description ??
              'Für dein Bundesland ist diese PDF-Antragshilfe in der App noch nicht freigeschaltet. Nutze die Zusammenfassung (PDF) und die offiziellen Formulare deiner Elterngeldstelle.'}
          </p>
          {placeholderRow ? (
            <p className="elterngeld-step__hint elterngeld-summary__forms-hint">
              <span className={`elterngeld-documents__status elterngeld-documents__status--${placeholderRow.status}`}>
                {placeholderRow.statusLabel}
              </span>
            </p>
          ) : null}
          <p className="elterngeld-step__notice elterngeld-step__notice--tip">
            Die Beantragung selbst erfolgt nur bei der zuständigen Elterngeldstelle mit deren Formularen — nicht über
            diese App.
          </p>
        </>
      )}
    </Card>
  );
};
