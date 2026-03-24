/**
 * Generisches Antrags-PDF (Vorbereitung) aus dem kanonischen Dokumentenmodell.
 * Kein amtliches Landeseinzel-Formular — strukturierte Feldübersicht zum Mitführen/Abschreiben.
 */

import { jsPDF } from 'jspdf';
import type { ElterngeldDocumentModel } from '../documentModel/buildElterngeldDocumentModel';
import { formatDateGerman, parseIsoDate } from '../elterngeldDeadlines';
import {
  ELTERNGELD_PDF_LINE_HEIGHT,
  ELTERNGELD_PDF_MARGIN,
  ELTERNGELD_PDF_TEXT_WIDTH,
  elterngeldPdfAddWrappedText,
  elterngeldPdfFormatCurrency,
} from './elterngeldPdfCommon';

function fieldLine(doc: jsPDF, label: string, value: string, y: number, fontSize: number): number {
  const text = `${label}: ${value || '–'}`;
  return elterngeldPdfAddWrappedText(doc, text, ELTERNGELD_PDF_MARGIN, y, ELTERNGELD_PDF_TEXT_WIDTH, fontSize);
}

export function buildElterngeldApplicationPdf(model: ElterngeldDocumentModel): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFont('helvetica');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  let y = ELTERNGELD_PDF_MARGIN;

  doc.setFont('helvetica', 'bold');
  doc.text('Elterngeld – Antrag (Vorbereitungsausdruck)', ELTERNGELD_PDF_MARGIN, y);
  y += ELTERNGELD_PDF_LINE_HEIGHT * 1.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  y = elterngeldPdfAddWrappedText(
    doc,
    'Hinweis: Dies ist kein Originalformular der Elterngeldstelle. Es fasst deine Eingaben aus der App übersichtlich zusammen. Die offizielle Beantragung erfolgt beim zuständigen Amt mit den dort vorgegebenen Formularen.',
    ELTERNGELD_PDF_MARGIN,
    y,
    ELTERNGELD_PDF_TEXT_WIDTH,
    9
  );
  y += 6;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Zuständigkeit / Antragstellung', ELTERNGELD_PDF_MARGIN, y);
  y += ELTERNGELD_PDF_LINE_HEIGHT;
  doc.setFont('helvetica', 'normal');
  y = fieldLine(doc, 'Bundesland (laut Angaben)', model.stateDisplayName, y, 10);
  y = fieldLine(doc, 'Antragskontext', model.applicantMode, y + 2, 10);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('Kind', ELTERNGELD_PDF_MARGIN, y);
  y += ELTERNGELD_PDF_LINE_HEIGHT;
  doc.setFont('helvetica', 'normal');
  const birthDate = parseIsoDate(model.child.birthDate);
  const birthStr = birthDate ? formatDateGerman(birthDate) : '–';
  const expectedDate = parseIsoDate(model.child.expectedBirthDate);
  const expectedStr = expectedDate ? formatDateGerman(expectedDate) : '–';
  y = fieldLine(doc, 'Geburtsdatum', birthStr, y, 10);
  y = fieldLine(doc, 'Voraussichtlicher Geburtstermin', expectedStr, y + 2, 10);
  y = fieldLine(doc, 'Mehrlingsgeburt', model.child.multipleBirth ? 'Ja' : 'Nein', y + 2, 10);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('Antragsteller/in', ELTERNGELD_PDF_MARGIN, y);
  y += ELTERNGELD_PDF_LINE_HEIGHT;
  doc.setFont('helvetica', 'normal');
  y = fieldLine(
    doc,
    'Name',
    `${model.parentA.firstName} ${model.parentA.lastName}`.trim() || '–',
    y,
    10
  );
  y = fieldLine(doc, 'Beschäftigung', model.parentA.employmentType, y + 2, 10);
  y = fieldLine(doc, 'Einkommen vor Geburt (Angabe)', model.parentA.incomeBeforeBirth || '–', y + 2, 10);
  y = fieldLine(
    doc,
    'Geplante Teilzeit / Wochenstunden',
    model.parentA.plannedPartTime
      ? model.parentA.hoursPerWeek != null
        ? `${model.parentA.hoursPerWeek} h/Woche`
        : 'Ja'
      : 'Nein',
    y + 2,
    10
  );

  if (model.parentB) {
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Zweite Person (Partner/in)', ELTERNGELD_PDF_MARGIN, y);
    y += ELTERNGELD_PDF_LINE_HEIGHT;
    doc.setFont('helvetica', 'normal');
    y = fieldLine(
      doc,
      'Name',
      `${model.parentB.firstName} ${model.parentB.lastName}`.trim() || '–',
      y,
      10
    );
    y = fieldLine(doc, 'Beschäftigung', model.parentB.employmentType, y + 2, 10);
    y = fieldLine(doc, 'Einkommen vor Geburt (Angabe)', model.parentB.incomeBeforeBirth || '–', y + 2, 10);
    y = fieldLine(
      doc,
      'Geplante Teilzeit / Wochenstunden',
      model.parentB.plannedPartTime
        ? model.parentB.hoursPerWeek != null
          ? `${model.parentB.hoursPerWeek} h/Woche`
          : 'Ja'
        : 'Nein',
      y + 2,
      10
    );
  }

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Bezug / Planung', ELTERNGELD_PDF_MARGIN, y);
  y += ELTERNGELD_PDF_LINE_HEIGHT;
  doc.setFont('helvetica', 'normal');
  y = fieldLine(doc, 'Modell', model.benefitPlan.model, y, 10);
  y = fieldLine(doc, 'Ihre Monate (Angabe)', model.benefitPlan.parentAMonths || '–', y + 2, 10);
  y = fieldLine(doc, 'Monate Partner (Angabe)', model.benefitPlan.parentBMonths || '–', y + 2, 10);
  y = fieldLine(
    doc,
    'Partnerschaftsbonus',
    model.benefitPlan.partnershipBonus ? 'Ja' : 'Nein',
    y + 2,
    10
  );
  const dist = model.benefitPlan.concreteMonthDistribution;
  if (dist && dist.length > 0) {
    y += 2;
    y = elterngeldPdfAddWrappedText(
      doc,
      `Konkrete Monatsverteilung: ${dist.length} Monat(e) mit feiner Bezugsaufteilung (Details in der App).`,
      ELTERNGELD_PDF_MARGIN,
      y,
      ELTERNGELD_PDF_TEXT_WIDTH,
      10
    );
  }

  if (model.calculation) {
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Orientierung (unverbindliche Schätzung aus der App)', ELTERNGELD_PDF_MARGIN, y);
    y += ELTERNGELD_PDF_LINE_HEIGHT;
    doc.setFont('helvetica', 'normal');
    for (const pt of model.calculation.parentTotals) {
      y = fieldLine(doc, pt.label, elterngeldPdfFormatCurrency(pt.total), y, 10);
    }
    y = fieldLine(
      doc,
      'Haushalt gesamt',
      elterngeldPdfFormatCurrency(model.calculation.householdTotal),
      y + 2,
      10
    );
  }

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Nachweise / Checkliste (Auszug)', ELTERNGELD_PDF_MARGIN, y);
  y += ELTERNGELD_PDF_LINE_HEIGHT;
  doc.setFont('helvetica', 'normal');
  for (const item of model.checklistItems) {
    y = elterngeldPdfAddWrappedText(doc, `• ${item}`, ELTERNGELD_PDF_MARGIN, y, ELTERNGELD_PDF_TEXT_WIDTH, 10);
  }

  return doc.output('blob');
}
