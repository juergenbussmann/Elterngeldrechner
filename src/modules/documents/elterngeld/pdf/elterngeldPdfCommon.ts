/**
 * Gemeinsame jsPDF-Hilfen für Elterngeld-PDFs (Layout nur).
 */

import type { jsPDF } from 'jspdf';
import type { ElterngeldDocumentModel } from '../documentModel/buildElterngeldDocumentModel';
import type { MonthModeForDistribution } from '../types/elterngeldTypes';

const EMPLOYMENT_TYPE_LABEL: Record<string, string> = {
  employed: 'Angestellt',
  self_employed: 'Selbstständig',
  mixed: 'Gemischt (angestellt und selbstständig)',
  none: 'Keine Erwerbstätigkeit',
};

const BENEFIT_MODEL_LABEL: Record<string, string> = {
  basis: 'Basiselterngeld',
  plus: 'ElterngeldPlus',
  mixed: 'Gemischt (Basiselterngeld und ElterngeldPlus in der App)',
};

export function elterngeldPdfFormatEmploymentType(value: string): string {
  return EMPLOYMENT_TYPE_LABEL[value] ?? value;
}

export function elterngeldPdfFormatBenefitModel(value: string): string {
  return BENEFIT_MODEL_LABEL[value] ?? value;
}

export function elterngeldPdfFormatMonthMode(mode: MonthModeForDistribution): string {
  switch (mode) {
    case 'none':
      return 'Kein Bezug';
    case 'basis':
      return 'Basiselterngeld';
    case 'plus':
      return 'ElterngeldPlus';
    case 'partnerBonus':
      return 'Partnerschaftsbonus';
    default:
      return mode;
  }
}

function parentDisplayLabel(firstName: string, lastName: string, fallback: string): string {
  const n = `${firstName} ${lastName}`.trim();
  return n || fallback;
}

/** Pro Eintrag in concreteMonthDistribution — nur Darstellung, keine zusätzliche Logik. */
export function elterngeldPdfConcreteMonthLines(
  model: ElterngeldDocumentModel,
  month: number,
  modeA: MonthModeForDistribution,
  modeB: MonthModeForDistribution
): string[] {
  const labelA = parentDisplayLabel(
    model.parentA.firstName,
    model.parentA.lastName,
    'Erste antragstellende Person'
  );
  const labelB = model.parentB
    ? parentDisplayLabel(model.parentB.firstName, model.parentB.lastName, 'Zweite Elternperson')
    : 'Zweite Elternperson (in der App ohne Eintrag)';

  const out: string[] = [`Lebensmonat ${month}`];
  if (modeA === modeB) {
    out.push(`  ${labelA} und ${labelB}: jeweils ${elterngeldPdfFormatMonthMode(modeA)}`);
  } else {
    out.push(`  ${labelA}: ${elterngeldPdfFormatMonthMode(modeA)}`);
    out.push(`  ${labelB}: ${elterngeldPdfFormatMonthMode(modeB)}`);
  }
  return out;
}

export const ELTERNGELD_PDF_MARGIN = 25;
export const ELTERNGELD_PDF_PAGE_WIDTH = 210;
export const ELTERNGELD_PDF_TEXT_WIDTH = ELTERNGELD_PDF_PAGE_WIDTH - 2 * ELTERNGELD_PDF_MARGIN;
export const ELTERNGELD_PDF_LINE_HEIGHT = 6;

export function elterngeldPdfAddWrappedText(
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

export function elterngeldPdfFormatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
