/**
 * Wizard-Sammelspeicherung: kompaktes Kurzüberblick-PDF + ausführliche Ausfüllhilfe-PDF (inkl. Monatsaufstellung).
 * Inhaltlich getrennte Builder — keine doppelte Monatslogik in der Zusammenfassung.
 */

import { addDocument } from '../application/service';
import { buildElterngeldDocumentModel } from './documentModel/buildElterngeldDocumentModel';
import { buildElterngeldApplicationPdf } from './pdf/buildElterngeldApplicationPdf';
import { buildElterngeldSummaryPdf } from './pdf/buildElterngeldSummaryPdf';
import type { ElterngeldApplication } from './types/elterngeldTypes';
import type { CalculationResult } from './calculation';

export async function saveElterngeldWizardPdfBundle(
  values: ElterngeldApplication,
  liveResult: CalculationResult | null | undefined
): Promise<void> {
  const summaryBlob = buildElterngeldSummaryPdf(values, liveResult);
  await addDocument({
    title: 'Elterngeld-Vorbereitung – Kurzüberblick',
    createdAt: new Date().toISOString(),
    mimeType: 'application/pdf',
    blob: summaryBlob,
  });

  const model = buildElterngeldDocumentModel(values, liveResult);
  const applicationBlob = buildElterngeldApplicationPdf(model);
  await addDocument({
    title: 'Elterngeld-Antragsvorbereitung – Ausfüllhilfe (PDF)',
    createdAt: new Date().toISOString(),
    mimeType: 'application/pdf',
    blob: applicationBlob,
  });
}
