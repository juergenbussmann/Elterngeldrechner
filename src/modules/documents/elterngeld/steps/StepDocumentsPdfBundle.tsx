/**
 * Wizard Schritt: vollständige Antrags-Ausfüllhilfe (A–E) als Vorschau + PDF-Speicherung (bestehende Builder).
 */

import React, { useMemo } from 'react';
import { Card } from '../../../../shared/ui/Card';
import { Button } from '../../../../shared/ui/Button';
import { useNavigation } from '../../../../shared/lib/navigation/useNavigation';
import { ElterngeldApplicationFormFillHelperPreview } from '../applicationForm/ElterngeldApplicationFormFillHelperPreview';
import { APPLICATION_FORM_DOCUMENT_TITLE } from '../applicationForm/elterngeldApplicationFormLabels';
import { buildElterngeldDocumentModel } from '../documentModel/buildElterngeldDocumentModel';
import { getElterngeldDocumentOutputRows } from '../documentModel/elterngeldDocumentOutputs';
import type { ElterngeldApplication } from '../types/elterngeldTypes';
import type { CalculationResult } from '../calculation';

type Props = {
  values: ElterngeldApplication;
  liveResult?: CalculationResult | null;
  onSaveAllPdfs: () => void | Promise<void>;
  isSubmitting: boolean;
  saveComplete: boolean;
};

export const StepDocumentsPdfBundle: React.FC<Props> = ({
  values,
  liveResult,
  onSaveAllPdfs,
  isSubmitting,
  saveComplete,
}) => {
  const { goTo } = useNavigation();
  const model = useMemo(() => buildElterngeldDocumentModel(values, liveResult), [values, liveResult]);
  const rows = useMemo(() => getElterngeldDocumentOutputRows(model), [model]);

  const summaryRow = rows.find((r) => r.action === 'summaryPdf');
  const applicationRow = rows.find((r) => r.action === 'applicationPdf');

  return (
    <div className="elterngeld-documents-data-stack">
      <ElterngeldApplicationFormFillHelperPreview model={model} />

      <Card className="still-daily-checklist__card">
        <h3 className="elterngeld-step__title">PDFs für „Dokumente“</h3>
        <p className="elterngeld-step__hint elterngeld-summary__forms-hint elterngeld-documents__lead">
          Oben: Vorschau der Ausfüllhilfe wie im PDF „{APPLICATION_FORM_DOCUMENT_TITLE}“ (inkl. Monatsaufstellung). Mit dem
          Button speicherst du zwei getrennte PDFs: einen kompakten Kurzüberblick ohne Monatsliste und die ausführliche
          Ausfüllhilfe mit Lebensmonaten.
        </p>
        <div className="elterngeld-documents__output-list" role="list">
          {summaryRow && (
            <div className="elterngeld-documents__output-head" role="listitem">
              <h4 className="elterngeld-documents__output-title">{summaryRow.title}</h4>
              <span
                className={`elterngeld-documents__status elterngeld-documents__status--${summaryRow.status}`}
                aria-label={summaryRow.statusLabel}
              >
                {summaryRow.statusLabel}
              </span>
            </div>
          )}
          {summaryRow && <p className="elterngeld-documents__output-desc">{summaryRow.description}</p>}

          {applicationRow ? (
            <>
              <div className="elterngeld-documents__output-head" role="listitem">
                <h4 className="elterngeld-documents__output-title">{applicationRow.title}</h4>
                <span
                  className={`elterngeld-documents__status elterngeld-documents__status--${applicationRow.status}`}
                  aria-label={applicationRow.statusLabel}
                >
                  {applicationRow.statusLabel}
                </span>
              </div>
              <p className="elterngeld-documents__output-desc">{applicationRow.description}</p>
            </>
          ) : null}
        </div>

        {saveComplete ? (
          <>
            <p className="elterngeld-success-text">
              Kurzüberblick und Ausfüllhilfe wurden als zwei unterschiedliche PDFs in „Dokumente“ gespeichert.
            </p>
            <div className="next-steps__stack elterngeld-documents__output-actions">
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
          </>
        ) : (
          <div className="next-steps__stack elterngeld-documents__output-actions">
            <Button
              type="button"
              variant="primary"
              fullWidth
              className="next-steps__button btn--softpill"
              onClick={() => void onSaveAllPdfs()}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Wird gespeichert…' : 'Alle in Dokumente speichern'}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};
