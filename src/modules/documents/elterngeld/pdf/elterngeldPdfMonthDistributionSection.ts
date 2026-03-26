/**
 * PDF-Block: detaillierte Monatsaufstellung pro Lebensmonat (nur Ausfüllhilfe-PDF).
 */

import type { jsPDF } from 'jspdf';
import type { ElterngeldDocumentModel } from '../documentModel/buildElterngeldDocumentModel';
import {
  formatConcreteMonthLines,
  MONTH_DISTRIBUTION_FOOTNOTE,
  MONTH_DISTRIBUTION_INTRO_LINES,
  SUBSECTION_MONTHLY_SPLIT,
} from '../applicationForm/elterngeldApplicationFormLabels';
import {
  ELTERNGELD_PDF_LINE_HEIGHT,
  ELTERNGELD_PDF_MARGIN,
  ELTERNGELD_PDF_TEXT_WIDTH,
  elterngeldPdfAddWrappedText,
  elterngeldPdfEnsurePageSpace,
} from './elterngeldPdfCommon';

function subsectionHeading(doc: jsPDF, title: string, y: number): number {
  y = elterngeldPdfEnsurePageSpace(doc, y, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(title, ELTERNGELD_PDF_MARGIN, y);
  doc.setFont('helvetica', 'normal');
  return y + ELTERNGELD_PDF_LINE_HEIGHT * 1.1;
}

export function elterngeldPdfRenderMonthDistributionSection(
  doc: jsPDF,
  model: ElterngeldDocumentModel,
  y: number
): number {
  const dist = model.documentMonthDistribution;
  const hasBezug = dist.some((e) => e.modeA !== 'none' || e.modeB !== 'none');
  if (!hasBezug) return y;

  y = subsectionHeading(doc, SUBSECTION_MONTHLY_SPLIT, y);
  doc.setFontSize(9);
  y = elterngeldPdfAddWrappedText(
    doc,
    MONTH_DISTRIBUTION_INTRO_LINES[0],
    ELTERNGELD_PDF_MARGIN,
    y,
    ELTERNGELD_PDF_TEXT_WIDTH,
    9
  );
  y += 2;
  y = elterngeldPdfAddWrappedText(
    doc,
    MONTH_DISTRIBUTION_INTRO_LINES[1],
    ELTERNGELD_PDF_MARGIN,
    y,
    ELTERNGELD_PDF_TEXT_WIDTH,
    9
  );
  y += 4;
  const sorted = [...dist].sort((a, b) => a.month - b.month);
  for (const entry of sorted) {
    const lines = formatConcreteMonthLines(model, entry.month, entry.modeA, entry.modeB);
    y = elterngeldPdfEnsurePageSpace(doc, y, 10 + lines.length * 5);
    for (const line of lines) {
      y = elterngeldPdfAddWrappedText(doc, line, ELTERNGELD_PDF_MARGIN, y, ELTERNGELD_PDF_TEXT_WIDTH, 9);
    }
    y += 3;
  }
  y = elterngeldPdfAddWrappedText(
    doc,
    MONTH_DISTRIBUTION_FOOTNOTE,
    ELTERNGELD_PDF_MARGIN,
    y,
    ELTERNGELD_PDF_TEXT_WIDTH,
    9
  );
  y += 6;
  doc.setFontSize(10);
  return y;
}
