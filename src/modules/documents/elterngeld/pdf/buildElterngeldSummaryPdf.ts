/**
 * Kompakte Zusammenfassung als PDF (kein amtlicher Antrag).
 * Ohne detaillierte Monatsaufstellung — diese liegt nur in buildElterngeldApplicationPdf.
 */

import { jsPDF } from 'jspdf';
import type { ElterngeldApplication } from '../types/elterngeldTypes';
import type { CalculationResult } from '../calculation';
import { formatDateGerman, parseIsoDate } from '../elterngeldDeadlines';
import { buildElterngeldDocumentModel } from '../documentModel/buildElterngeldDocumentModel';
import { formatApplicantMode } from '../applicationForm/elterngeldApplicationFormLabels';
import {
  ELTERNGELD_PDF_LINE_HEIGHT,
  ELTERNGELD_PDF_MARGIN,
  ELTERNGELD_PDF_TEXT_WIDTH,
  elterngeldPdfAddWrappedText,
  elterngeldPdfEnsurePageSpace,
  elterngeldPdfFormatBenefitModel,
  elterngeldPdfFormatCurrency,
  elterngeldPdfFormatEmploymentType,
} from './elterngeldPdfCommon';

export function buildElterngeldSummaryPdf(
  values: ElterngeldApplication,
  liveResult?: CalculationResult | null
): Blob {
  const model = buildElterngeldDocumentModel(values, liveResult);

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFont('helvetica');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  let y = ELTERNGELD_PDF_MARGIN;

  doc.setFont('helvetica', 'bold');
  doc.text('Elterngeld-Vorbereitung', ELTERNGELD_PDF_MARGIN, y);
  y += ELTERNGELD_PDF_LINE_HEIGHT * 1.2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  y = elterngeldPdfAddWrappedText(
    doc,
    'Kurzüberblick zu deinen Angaben — ohne Monatsliste. Die ausführliche Ausfüllhilfe mit Lebensmonaten ist ein separates PDF.',
    ELTERNGELD_PDF_MARGIN,
    y,
    ELTERNGELD_PDF_TEXT_WIDTH,
    9
  );
  y += 4;

  doc.setFontSize(10);
  y = elterngeldPdfAddWrappedText(
    doc,
    `Bundesland: ${model.stateDisplayName}`,
    ELTERNGELD_PDF_MARGIN,
    y,
    ELTERNGELD_PDF_TEXT_WIDTH,
    10
  );
  y = elterngeldPdfAddWrappedText(
    doc,
    `Antrag / Konstellation: ${formatApplicantMode(model.applicantMode)}`,
    ELTERNGELD_PDF_MARGIN,
    y + 2,
    ELTERNGELD_PDF_TEXT_WIDTH,
    10
  );
  y += 3;

  const birthDate = parseIsoDate(model.child.birthDate);
  const birthStr = birthDate ? formatDateGerman(birthDate) : '–';
  const expectedDate = parseIsoDate(model.child.expectedBirthDate);
  const expectedStr = expectedDate ? formatDateGerman(expectedDate) : '–';
  y = elterngeldPdfAddWrappedText(doc, `Geburtsdatum: ${birthStr}`, ELTERNGELD_PDF_MARGIN, y, ELTERNGELD_PDF_TEXT_WIDTH, 10);
  y = elterngeldPdfAddWrappedText(
    doc,
    `Voraussichtlicher Geburtstermin: ${expectedStr}`,
    ELTERNGELD_PDF_MARGIN,
    y + 2,
    ELTERNGELD_PDF_TEXT_WIDTH,
    10
  );
  y = elterngeldPdfAddWrappedText(
    doc,
    `Mehrlingsgeburt: ${model.child.multipleBirth ? 'Ja' : 'Nein'}`,
    ELTERNGELD_PDF_MARGIN,
    y + 2,
    ELTERNGELD_PDF_TEXT_WIDTH,
    10
  );
  y += 5;

  y = elterngeldPdfEnsurePageSpace(doc, y, 28);
  doc.setFont('helvetica', 'bold');
  doc.text('Eltern', ELTERNGELD_PDF_MARGIN, y);
  y += ELTERNGELD_PDF_LINE_HEIGHT;
  doc.setFont('helvetica', 'normal');
  y = elterngeldPdfAddWrappedText(
    doc,
    `Sie: ${model.parentA.firstName} ${model.parentA.lastName}`.trim() || 'Sie: –',
    ELTERNGELD_PDF_MARGIN,
    y,
    ELTERNGELD_PDF_TEXT_WIDTH,
    10
  );
  y = elterngeldPdfAddWrappedText(
    doc,
    `Beschäftigung: ${elterngeldPdfFormatEmploymentType(model.parentA.employmentType)}`,
    ELTERNGELD_PDF_MARGIN,
    y + 2,
    ELTERNGELD_PDF_TEXT_WIDTH,
    10
  );
  if (model.parentA.incomeBeforeBirth?.trim()) {
    y = elterngeldPdfAddWrappedText(
      doc,
      `Einkommen vor Geburt: ${model.parentA.incomeBeforeBirth}`,
      ELTERNGELD_PDF_MARGIN,
      y + 2,
      ELTERNGELD_PDF_TEXT_WIDTH,
      10
    );
  }
  if (model.parentB) {
    y += 3;
    y = elterngeldPdfAddWrappedText(
      doc,
      `Partner: ${model.parentB.firstName} ${model.parentB.lastName}`.trim() || 'Partner: –',
      ELTERNGELD_PDF_MARGIN,
      y,
      ELTERNGELD_PDF_TEXT_WIDTH,
      10
    );
    y = elterngeldPdfAddWrappedText(
      doc,
      `Beschäftigung: ${elterngeldPdfFormatEmploymentType(model.parentB.employmentType)}`,
      ELTERNGELD_PDF_MARGIN,
      y + 2,
      ELTERNGELD_PDF_TEXT_WIDTH,
      10
    );
    if (model.parentB.incomeBeforeBirth?.trim()) {
      y = elterngeldPdfAddWrappedText(
        doc,
        `Einkommen vor Geburt: ${model.parentB.incomeBeforeBirth}`,
        ELTERNGELD_PDF_MARGIN,
        y + 2,
        ELTERNGELD_PDF_TEXT_WIDTH,
        10
      );
    }
  }
  y += 5;

  y = elterngeldPdfEnsurePageSpace(doc, y, 36);
  doc.setFont('helvetica', 'bold');
  doc.text('Geplanter Elterngeld-Bezug (Überblick)', ELTERNGELD_PDF_MARGIN, y);
  y += ELTERNGELD_PDF_LINE_HEIGHT;
  doc.setFont('helvetica', 'normal');
  y = elterngeldPdfAddWrappedText(
    doc,
    `Modell: ${elterngeldPdfFormatBenefitModel(model.benefitPlan.model)}`,
    ELTERNGELD_PDF_MARGIN,
    y,
    ELTERNGELD_PDF_TEXT_WIDTH,
    10
  );
  y = elterngeldPdfAddWrappedText(
    doc,
    `Ihre Monate (Anzahl): ${model.benefitPlan.parentAMonths || '–'}`,
    ELTERNGELD_PDF_MARGIN,
    y + 2,
    ELTERNGELD_PDF_TEXT_WIDTH,
    10
  );
  y = elterngeldPdfAddWrappedText(
    doc,
    `Monate Partner (Anzahl): ${model.benefitPlan.parentBMonths || '–'}`,
    ELTERNGELD_PDF_MARGIN,
    y + 2,
    ELTERNGELD_PDF_TEXT_WIDTH,
    10
  );
  y = elterngeldPdfAddWrappedText(
    doc,
    `Partnerschaftsbonus: ${model.benefitPlan.partnershipBonus ? 'Ja' : 'Nein'}`,
    ELTERNGELD_PDF_MARGIN,
    y + 2,
    ELTERNGELD_PDF_TEXT_WIDTH,
    10
  );
  y += 5;

  if (model.calculation) {
    y = elterngeldPdfEnsurePageSpace(doc, y, 28);
    doc.setFont('helvetica', 'bold');
    doc.text('Orientierung (unverbindliche Schätzung)', ELTERNGELD_PDF_MARGIN, y);
    y += ELTERNGELD_PDF_LINE_HEIGHT;
    doc.setFont('helvetica', 'normal');
    for (const pt of model.calculation.parentTotals) {
      y = elterngeldPdfAddWrappedText(
        doc,
        `${pt.label}: ${elterngeldPdfFormatCurrency(pt.total)}`,
        ELTERNGELD_PDF_MARGIN,
        y,
        ELTERNGELD_PDF_TEXT_WIDTH,
        10
      );
    }
    y = elterngeldPdfAddWrappedText(
      doc,
      `Haushalt gesamt: ${elterngeldPdfFormatCurrency(model.calculation.householdTotal)}`,
      ELTERNGELD_PDF_MARGIN,
      y + 2,
      ELTERNGELD_PDF_TEXT_WIDTH,
      10
    );
    y += 5;
  }

  if (model.stateNotes?.trim()) {
    y = elterngeldPdfEnsurePageSpace(doc, y, 24);
    doc.setFont('helvetica', 'bold');
    doc.text('Hinweis zum Bundesland', ELTERNGELD_PDF_MARGIN, y);
    y += ELTERNGELD_PDF_LINE_HEIGHT;
    doc.setFont('helvetica', 'normal');
    y = elterngeldPdfAddWrappedText(doc, model.stateNotes.trim(), ELTERNGELD_PDF_MARGIN, y, ELTERNGELD_PDF_TEXT_WIDTH, 10);
    y += 5;
  }

  y = elterngeldPdfEnsurePageSpace(doc, y, 28);
  doc.setFont('helvetica', 'bold');
  doc.text('Unterlagen-Checkliste', ELTERNGELD_PDF_MARGIN, y);
  y += ELTERNGELD_PDF_LINE_HEIGHT;
  doc.setFont('helvetica', 'normal');
  for (const d of model.checklistItems) {
    y = elterngeldPdfEnsurePageSpace(doc, y, 14);
    y = elterngeldPdfAddWrappedText(doc, `• ${d}`, ELTERNGELD_PDF_MARGIN, y, ELTERNGELD_PDF_TEXT_WIDTH, 10);
  }
  y += 5;

  const deadlineInfo = model.deadlines;
  if (deadlineInfo.deadlineLabel || deadlineInfo.noticeText) {
    y = elterngeldPdfEnsurePageSpace(doc, y, 28);
    doc.setFont('helvetica', 'bold');
    doc.text('Fristenhinweise', ELTERNGELD_PDF_MARGIN, y);
    y += ELTERNGELD_PDF_LINE_HEIGHT;
    doc.setFont('helvetica', 'normal');
    if (deadlineInfo.deadlineLabel) {
      y = elterngeldPdfAddWrappedText(doc, deadlineInfo.deadlineLabel, ELTERNGELD_PDF_MARGIN, y, ELTERNGELD_PDF_TEXT_WIDTH, 10);
    }
    if (deadlineInfo.noticeText) {
      y = elterngeldPdfAddWrappedText(
        doc,
        deadlineInfo.noticeText,
        ELTERNGELD_PDF_MARGIN,
        y + 2,
        ELTERNGELD_PDF_TEXT_WIDTH,
        10
      );
    }
    y += 5;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  y = elterngeldPdfAddWrappedText(
    doc,
    'Hinweis: Dies ist eine kompakte Vorbereitungsübersicht, kein offizieller Elterngeld-Antrag. Die Antragstellung erfolgt beim zuständigen Landesamt.',
    ELTERNGELD_PDF_MARGIN,
    y + 5,
    ELTERNGELD_PDF_TEXT_WIDTH,
    9
  );

  return doc.output('blob');
}
