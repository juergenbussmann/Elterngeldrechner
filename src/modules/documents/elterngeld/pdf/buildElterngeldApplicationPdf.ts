/**
 * PDF zur Antragsvorbereitung aus dem kanonischen Dokumentenmodell.
 * Formularnahe Ausfüllhilfe (A–E) — kein amtliches Originalformular.
 */

import { jsPDF } from 'jspdf';
import type { ElterngeldDocumentModel } from '../documentModel/buildElterngeldDocumentModel';
import {
  ANHANG_CHECKLIST_INTRO,
  ANHANG_CHECKLIST_TITLE,
  ANHANG_DEADLINES_TITLE,
  APPLICATION_FORM_DOCUMENT_TITLE,
  getApplicationFormIntroParagraph,
  APPLICATION_FORM_SECTION_C_TEXT,
  CALCULATION_UNAVAILABLE_BODY,
  CALCULATION_UNAVAILABLE_TITLE,
  SECTION_ANHANG_TITLE,
  SECTION_A_TITLE,
  SECTION_B_NO_DISTRIBUTION_HINT,
  SECTION_B_TITLE,
  SECTION_C_TITLE,
  SECTION_D_MISSING_CATEGORIES,
  SECTION_D_MISSING_HEADING,
  SECTION_D_TITLE,
  SECTION_E_LINES,
  SECTION_E_TITLE,
  SUBSECTION_CALCULATION,
} from '../applicationForm/elterngeldApplicationFormLabels';
import {
  ELTERNGELD_PDF_LINE_HEIGHT,
  ELTERNGELD_PDF_MARGIN,
  ELTERNGELD_PDF_TEXT_WIDTH,
  elterngeldPdfAddWrappedText,
  elterngeldPdfEnsurePageSpace,
  elterngeldPdfFormatCurrency,
} from './elterngeldPdfCommon';
import { elterngeldPdfRenderMonthDistributionSection } from './elterngeldPdfMonthDistributionSection';

function fieldLine(doc: jsPDF, label: string, value: string, y: number, fontSize: number): number {
  const text = `${label}: ${value || '–'}`;
  return elterngeldPdfAddWrappedText(doc, text, ELTERNGELD_PDF_MARGIN, y, ELTERNGELD_PDF_TEXT_WIDTH, fontSize);
}

/** Wie mapped Formularfeld: bei leerem App-Wert nur „Bezeichnung:“ ohne Platzhalter. */
function mappedFormFieldLine(doc: jsPDF, label: string, value: string, y: number, fontSize: number): number {
  const text = value === '' ? `${label}:` : `${label}: ${value}`;
  return elterngeldPdfAddWrappedText(doc, text, ELTERNGELD_PDF_MARGIN, y, ELTERNGELD_PDF_TEXT_WIDTH, fontSize);
}

function renderMappedFormSectionA(doc: jsPDF, model: ElterngeldDocumentModel, y: number): number {
  const sec = model.formSections.find((s) => s.sectionCode === 'A');
  const heading = sec?.sectionHeading ?? SECTION_A_TITLE;
  y = majorSectionHeading(doc, heading, y, false);
  if (!sec) return y;
  for (const sub of sec.subsections) {
    y = elterngeldPdfEnsurePageSpace(doc, y);
    y = subsectionHeading(doc, sub.subsectionTitle, y);
    for (const f of sub.fields) {
      y = mappedFormFieldLine(doc, f.label, f.value, y, 10);
      y += 2;
    }
    y += 4;
  }
  return y;
}

/** Hauptabschnitt A–E: fett, größer, mit Abstand darunter. */
function majorSectionHeading(doc: jsPDF, title: string, y: number, addSpacingBefore: boolean): number {
  if (addSpacingBefore) {
    y += 10;
  }
  y = elterngeldPdfEnsurePageSpace(doc, y, 34);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(title, ELTERNGELD_PDF_MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  return y + ELTERNGELD_PDF_LINE_HEIGHT * 2;
}

function subsectionHeading(doc: jsPDF, title: string, y: number): number {
  y = elterngeldPdfEnsurePageSpace(doc, y, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(title, ELTERNGELD_PDF_MARGIN, y);
  doc.setFont('helvetica', 'normal');
  return y + ELTERNGELD_PDF_LINE_HEIGHT * 1.1;
}

export function buildElterngeldApplicationPdf(model: ElterngeldDocumentModel): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFont('helvetica');
  doc.setTextColor(0, 0, 0);

  let y = ELTERNGELD_PDF_MARGIN;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(APPLICATION_FORM_DOCUMENT_TITLE, ELTERNGELD_PDF_MARGIN, y);
  y += ELTERNGELD_PDF_LINE_HEIGHT * 1.8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  y = elterngeldPdfAddWrappedText(
    doc,
    getApplicationFormIntroParagraph(model),
    ELTERNGELD_PDF_MARGIN,
    y,
    ELTERNGELD_PDF_TEXT_WIDTH,
    9
  );
  y += 10;

  // ——— A. Gemappte Angaben (Bundesland → Formularbezeichnung) ———
  y = renderMappedFormSectionA(doc, model, y);
  y += 8;

  // ——— B. Ergebnis Ihrer Planung ———
  y = majorSectionHeading(doc, SECTION_B_TITLE, y, true);

  const hasMonthBezug = model.documentMonthDistribution.some(
    (e) => e.modeA !== 'none' || e.modeB !== 'none'
  );
  if (hasMonthBezug) {
    y = elterngeldPdfRenderMonthDistributionSection(doc, model, y);
  } else {
    doc.setFontSize(9);
    y = elterngeldPdfAddWrappedText(
      doc,
      SECTION_B_NO_DISTRIBUTION_HINT,
      ELTERNGELD_PDF_MARGIN,
      y,
      ELTERNGELD_PDF_TEXT_WIDTH,
      9
    );
    y += 6;
    doc.setFontSize(10);
  }

  y = subsectionHeading(doc, SUBSECTION_CALCULATION, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (model.calculation) {
    for (const pt of model.calculation.parentTotals) {
      y = fieldLine(doc, pt.label, elterngeldPdfFormatCurrency(pt.total), y, 10);
    }
    y = fieldLine(
      doc,
      'Haushalt gesamt (Schätzung)',
      elterngeldPdfFormatCurrency(model.calculation.householdTotal),
      y + 2,
      10
    );
  } else {
    doc.setFont('helvetica', 'bold');
    y = elterngeldPdfAddWrappedText(
      doc,
      CALCULATION_UNAVAILABLE_TITLE,
      ELTERNGELD_PDF_MARGIN,
      y,
      ELTERNGELD_PDF_TEXT_WIDTH,
      10
    );
    doc.setFont('helvetica', 'normal');
    y += 2;
    y = elterngeldPdfAddWrappedText(
      doc,
      CALCULATION_UNAVAILABLE_BODY,
      ELTERNGELD_PDF_MARGIN,
      y,
      ELTERNGELD_PDF_TEXT_WIDTH,
      10
    );
  }

  y += 10;

  // ——— C. So nutzen Sie diese Angaben im Antrag ———
  y = majorSectionHeading(doc, SECTION_C_TITLE, y, true);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y = elterngeldPdfAddWrappedText(
    doc,
    APPLICATION_FORM_SECTION_C_TEXT,
    ELTERNGELD_PDF_MARGIN,
    y,
    ELTERNGELD_PDF_TEXT_WIDTH,
    10
  );
  y += 10;

  // ——— D. Fehlende Angaben ———
  y = majorSectionHeading(doc, SECTION_D_TITLE, y, true);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  y = elterngeldPdfAddWrappedText(
    doc,
    SECTION_D_MISSING_HEADING,
    ELTERNGELD_PDF_MARGIN,
    y,
    ELTERNGELD_PDF_TEXT_WIDTH,
    10
  );
  doc.setFont('helvetica', 'normal');
  y += 5;
  for (const c of SECTION_D_MISSING_CATEGORIES) {
    y = elterngeldPdfEnsurePageSpace(doc, y, 14);
    y = elterngeldPdfAddWrappedText(doc, `• ${c}`, ELTERNGELD_PDF_MARGIN, y, ELTERNGELD_PDF_TEXT_WIDTH, 10);
    y += 2;
  }
  y += 8;

  // ——— E. Wichtiger Hinweis ———
  y = elterngeldPdfEnsurePageSpace(doc, y, 52);
  y = majorSectionHeading(doc, SECTION_E_TITLE, y, true);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  for (const line of SECTION_E_LINES) {
    doc.setFont('helvetica', 'bold');
    y = elterngeldPdfAddWrappedText(doc, line, ELTERNGELD_PDF_MARGIN, y, ELTERNGELD_PDF_TEXT_WIDTH, 10);
    doc.setFont('helvetica', 'normal');
    y += 3;
  }
  y += 10;

  // ——— Anhang (nach A–E, getrennt von „Fehlende Angaben“) ———
  y = elterngeldPdfEnsurePageSpace(doc, y, 36);
  y = majorSectionHeading(doc, SECTION_ANHANG_TITLE, y, true);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  y = subsectionHeading(doc, ANHANG_CHECKLIST_TITLE, y);
  y = elterngeldPdfAddWrappedText(
    doc,
    ANHANG_CHECKLIST_INTRO,
    ELTERNGELD_PDF_MARGIN,
    y,
    ELTERNGELD_PDF_TEXT_WIDTH,
    9
  );
  y += 4;
  for (const item of model.checklistItems) {
    y = elterngeldPdfEnsurePageSpace(doc, y, 12);
    y = elterngeldPdfAddWrappedText(doc, `• ${item}`, ELTERNGELD_PDF_MARGIN, y, ELTERNGELD_PDF_TEXT_WIDTH, 10);
  }

  const dl = model.deadlines;
  if (dl.deadlineLabel?.trim() || dl.noticeText?.trim()) {
    y += 6;
    y = elterngeldPdfEnsurePageSpace(doc, y, 28);
    y = subsectionHeading(doc, ANHANG_DEADLINES_TITLE, y);
    doc.setFont('helvetica', 'normal');
    if (dl.deadlineLabel?.trim()) {
      y = elterngeldPdfAddWrappedText(doc, dl.deadlineLabel.trim(), ELTERNGELD_PDF_MARGIN, y, ELTERNGELD_PDF_TEXT_WIDTH, 10);
    }
    if (dl.noticeText?.trim()) {
      y = elterngeldPdfAddWrappedText(
        doc,
        dl.noticeText.trim(),
        ELTERNGELD_PDF_MARGIN,
        y + (dl.deadlineLabel?.trim() ? 2 : 0),
        ELTERNGELD_PDF_TEXT_WIDTH,
        10
      );
    }
  }

  return doc.output('blob');
}
