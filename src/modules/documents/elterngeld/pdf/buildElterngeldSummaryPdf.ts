/**
 * PDF-Generierung für Elterngeld-Vorbereitung.
 * Vorbereitungsdokument, kein offizieller Antrag.
 */

import { jsPDF } from 'jspdf';
import type { ElterngeldApplication } from '../types/elterngeldTypes';
import { GERMAN_STATES } from '../stateConfig';
import { getElterngeldDeadlineInfo, formatDateGerman, parseIsoDate } from '../elterngeldDeadlines';

const MARGIN = 25;
const PAGE_WIDTH = 210;
const TEXT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const LINE_HEIGHT = 6;

function addWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number
): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.setFontSize(fontSize);
  doc.text(lines, x, y);
  return y + lines.length * (fontSize * 0.4);
}

export function buildElterngeldSummaryPdf(values: ElterngeldApplication): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFont('helvetica');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  let y = MARGIN;

  doc.setFont('helvetica', 'bold');
  doc.text('Elterngeld-Vorbereitung', MARGIN, y);
  y += LINE_HEIGHT * 1.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const stateName = GERMAN_STATES.find((s) => s.stateCode === values.state)?.displayName || values.state || '–';
  y = addWrappedText(doc, `Bundesland: ${stateName}`, MARGIN, y, TEXT_WIDTH, 10);
  y += 3;

  const birthDate = parseIsoDate(values.child.birthDate);
  const birthStr = birthDate ? formatDateGerman(birthDate) : '–';
  const expectedDate = parseIsoDate(values.child.expectedBirthDate);
  const expectedStr = expectedDate ? formatDateGerman(expectedDate) : '–';
  y = addWrappedText(doc, `Geburtsdatum: ${birthStr}`, MARGIN, y, TEXT_WIDTH, 10);
  y = addWrappedText(doc, `Voraussichtlicher Geburtstermin: ${expectedStr}`, MARGIN, y + 2, TEXT_WIDTH, 10);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('Eltern', MARGIN, y);
  y += LINE_HEIGHT;
  doc.setFont('helvetica', 'normal');
  y = addWrappedText(
    doc,
    `Elternteil A: ${values.parentA.firstName} ${values.parentA.lastName}`,
    MARGIN,
    y,
    TEXT_WIDTH,
    10
  );
  y = addWrappedText(doc, `Beschäftigung: ${values.parentA.employmentType}`, MARGIN, y + 2, TEXT_WIDTH, 10);
  if (values.parentA.incomeBeforeBirth) {
    y = addWrappedText(doc, `Einkommen vor Geburt: ${values.parentA.incomeBeforeBirth}`, MARGIN, y + 2, TEXT_WIDTH, 10);
  }
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('Geplanter Elterngeld-Bezug', MARGIN, y);
  y += LINE_HEIGHT;
  doc.setFont('helvetica', 'normal');
  y = addWrappedText(doc, `Modell: ${values.benefitPlan.model}`, MARGIN, y, TEXT_WIDTH, 10);
  y = addWrappedText(doc, `Monate Elternteil A: ${values.benefitPlan.parentAMonths || '–'}`, MARGIN, y + 2, TEXT_WIDTH, 10);
  y = addWrappedText(doc, `Monate Elternteil B: ${values.benefitPlan.parentBMonths || '–'}`, MARGIN, y + 2, TEXT_WIDTH, 10);
  y = addWrappedText(doc, `Partnerschaftsbonus: ${values.benefitPlan.partnershipBonus ? 'Ja' : 'Nein'}`, MARGIN, y + 2, TEXT_WIDTH, 10);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('Unterlagen-Checkliste', MARGIN, y);
  y += LINE_HEIGHT;
  doc.setFont('helvetica', 'normal');
  const docs = ['Geburtsurkunde', 'Einkommensnachweise', 'Bankverbindung'];
  docs.forEach((d) => {
    y = addWrappedText(doc, `• ${d}`, MARGIN, y, TEXT_WIDTH, 10);
  });
  y += 5;

  const deadlineInfo = getElterngeldDeadlineInfo(values);
  if (deadlineInfo.deadlineLabel || deadlineInfo.noticeText) {
    doc.setFont('helvetica', 'bold');
    doc.text('Fristenhinweise', MARGIN, y);
    y += LINE_HEIGHT;
    doc.setFont('helvetica', 'normal');
    if (deadlineInfo.deadlineLabel) {
      y = addWrappedText(doc, deadlineInfo.deadlineLabel, MARGIN, y, TEXT_WIDTH, 10);
    }
    if (deadlineInfo.noticeText) {
      y = addWrappedText(doc, deadlineInfo.noticeText, MARGIN, y + 2, TEXT_WIDTH, 10);
    }
    y += 5;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  y = addWrappedText(
    doc,
    'Hinweis: Dies ist eine Vorbereitungsübersicht, kein offizieller Elterngeld-Antrag. Die Antragstellung erfolgt beim zuständigen Landesamt.',
    MARGIN,
    y + 5,
    TEXT_WIDTH,
    9
  );

  return doc.output('blob');
}
