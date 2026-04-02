/**
 * PDF zur Antragsvorbereitung aus dem kanonischen Dokumentenmodell.
 * Durchgehend formularnahe Ausfüllhilfe, danach Hinweise, Anhang und fehlende Antragsangaben — kein amtliches Originalformular.
 */

import { jsPDF } from 'jspdf';
import {
  filterChecklistItemsForUnterlagenDisplay,
  getBaseChecklistAntragsangabenNichtInApp,
  type ElterngeldDocumentModel,
} from '../documentModel/buildElterngeldDocumentModel';
import {
  ANHANG_CHECKLIST_INTRO,
  ANHANG_CHECKLIST_TITLE,
  ANHANG_DEADLINES_TITLE,
  APPLICATION_FORM_DOCUMENT_TITLE,
  getApplicationFormIntroParagraph,
  APPLICATION_FORM_SECTION_C_LINES,
  CALCULATION_UNAVAILABLE_BODY,
  CALCULATION_UNAVAILABLE_TITLE,
  SECTION_ANHANG_TITLE,
  SECTION_A_TITLE,
  SECTION_B_NO_DISTRIBUTION_HINT,
  SECTION_C_TITLE,
  SECTION_E_LINES,
  SECTION_E_TITLE,
  SECTION_MISSING_FOR_APPLICATION_FURTHER_INTRO,
  SECTION_MISSING_FOR_APPLICATION_INTRO_ANGABEN,
  SECTION_MISSING_FOR_APPLICATION_TITLE,
  SECTION_MISSING_FOR_APPLICATION_FURTHER_ITEMS,
  SECTION_MISSING_PLANNING_COVERED_ITEMS,
  SECTION_MISSING_PLANNING_COVERED_TITLE,
  SUBSECTION_CALCULATION,
  SUBSECTION_MONTHLY_SPLIT,
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
import type { ElterngeldDocumentFormField } from '../documentModel/elterngeldDocumentFormTypes';

function fieldLine(doc: jsPDF, label: string, value: string, y: number, fontSize: number): number {
  const text = `${label}: ${value || '–'}`;
  return elterngeldPdfAddWrappedText(doc, text, ELTERNGELD_PDF_MARGIN, y, ELTERNGELD_PDF_TEXT_WIDTH, fontSize);
}

/** Mapped Formularfeld: Wert oder bei Leere Ausfüllhinweis in Anführungszeichen (kein echter Antragsinhalt). */
function mappedFormFieldLine(doc: jsPDF, field: ElterngeldDocumentFormField, y: number, fontSize: number): number {
  let text: string;
  if (field.value !== '') {
    text = `${field.label}: ${field.value}`;
  } else if (field.source === 'official_form_only') {
    text = `${field.label}:\n„${field.hint}“`;
  } else if (field.hint) {
    text = `${field.label}:\n„${field.hint}“`;
  } else {
    text = `${field.label}:`;
  }
  return elterngeldPdfAddWrappedText(doc, text, ELTERNGELD_PDF_MARGIN, y, ELTERNGELD_PDF_TEXT_WIDTH, fontSize);
}

function renderCalculationSubsection(doc: jsPDF, model: ElterngeldDocumentModel, y: number): number {
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
  return y;
}

/** Hauptteil: formularnahe Unterblöcke, direkt nach Bezug Monats-/Schätzung, zuletzt Bank/Steuer-Platzhalter. */
function renderMainDocumentFlow(doc: jsPDF, model: ElterngeldDocumentModel, y: number): number {
  const hasMonthBezug = model.documentMonthDistribution.some(
    (e) => e.modeA !== 'none' || e.modeB !== 'none'
  );
  y = majorSectionHeading(doc, SECTION_A_TITLE, y, false);
  for (const block of model.mainDocumentFlow) {
    y = elterngeldPdfEnsurePageSpace(doc, y);
    switch (block.kind) {
      case 'form_subsection':
      case 'official_form_only': {
        const sub = block.subsection;
        y = subsectionHeading(doc, sub.subsectionTitle, y);
        for (const f of sub.fields) {
          y = mappedFormFieldLine(doc, f, y, 10);
          y += 2;
        }
        y += 4;
        break;
      }
      case 'month_distribution':
        if (hasMonthBezug) {
          y = elterngeldPdfRenderMonthDistributionSection(doc, model, y);
        } else {
          y = subsectionHeading(doc, SUBSECTION_MONTHLY_SPLIT, y);
          doc.setFont('helvetica', 'normal');
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
        break;
      case 'calculation':
        y = renderCalculationSubsection(doc, model, y);
        break;
    }
  }
  return y;
}

/** Hauptabschnitt: fett, größer, mit Abstand darunter. */
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

/** Abschluss: nicht erfasste Antragsangaben aus `ELTERNGELD_BASE_DOCUMENT_CHECKLIST` (nur Darstellung). */
function renderMissingForApplicationClosingSection(doc: jsPDF, y: number): number {
  const antragsangabenNichtInApp = getBaseChecklistAntragsangabenNichtInApp();

  y = majorSectionHeading(doc, SECTION_MISSING_FOR_APPLICATION_TITLE, y, true);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  y = elterngeldPdfAddWrappedText(
    doc,
    SECTION_MISSING_FOR_APPLICATION_INTRO_ANGABEN,
    ELTERNGELD_PDF_MARGIN,
    y,
    ELTERNGELD_PDF_TEXT_WIDTH,
    10
  );
  y += 4;
  for (const item of antragsangabenNichtInApp) {
    y = elterngeldPdfEnsurePageSpace(doc, y, 12);
    y = elterngeldPdfAddWrappedText(doc, `• ${item}`, ELTERNGELD_PDF_MARGIN, y, ELTERNGELD_PDF_TEXT_WIDTH, 10);
    y += 2;
  }
  y += 6;

  y = elterngeldPdfAddWrappedText(
    doc,
    SECTION_MISSING_FOR_APPLICATION_FURTHER_INTRO,
    ELTERNGELD_PDF_MARGIN,
    y,
    ELTERNGELD_PDF_TEXT_WIDTH,
    10
  );
  y += 4;
  for (const item of SECTION_MISSING_FOR_APPLICATION_FURTHER_ITEMS) {
    y = elterngeldPdfEnsurePageSpace(doc, y, 12);
    y = elterngeldPdfAddWrappedText(doc, `• ${item}`, ELTERNGELD_PDF_MARGIN, y, ELTERNGELD_PDF_TEXT_WIDTH, 10);
    y += 2;
  }
  y += 6;

  y = subsectionHeading(doc, SECTION_MISSING_PLANNING_COVERED_TITLE, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  for (const item of SECTION_MISSING_PLANNING_COVERED_ITEMS) {
    y = elterngeldPdfEnsurePageSpace(doc, y, 12);
    y = elterngeldPdfAddWrappedText(doc, `✔ ${item}`, ELTERNGELD_PDF_MARGIN, y, ELTERNGELD_PDF_TEXT_WIDTH, 10);
    y += 2;
  }

  return y;
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

  // ——— Hauptteil: formularnahe Angaben inkl. Bezug, Monate, Schätzung, Platzhalter Bank/Steuer ———
  y = renderMainDocumentFlow(doc, model, y);
  y += 8;

  // ——— Hinweise zum Übertrag in den Antrag ———
  y = majorSectionHeading(doc, SECTION_C_TITLE, y, true);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  for (const line of APPLICATION_FORM_SECTION_C_LINES) {
    y = elterngeldPdfEnsurePageSpace(doc, y, 14);
    y = elterngeldPdfAddWrappedText(doc, line, ELTERNGELD_PDF_MARGIN, y, ELTERNGELD_PDF_TEXT_WIDTH, 10);
    y += 2;
  }
  y += 10;

  // ——— D. Wichtiger Hinweis ———
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

  // ——— Anhang (Unterlagen, Fristen; anschließend nur nicht erfasste Formularangaben) ———
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
  for (const item of filterChecklistItemsForUnterlagenDisplay(model.checklistItems)) {
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

  y += 8;
  y = renderMissingForApplicationClosingSection(doc, y);

  return doc.output('blob');
}
