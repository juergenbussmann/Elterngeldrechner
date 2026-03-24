/**
 * Gemeinsame jsPDF-Hilfen für Elterngeld-PDFs (Layout nur).
 */

import type { jsPDF } from 'jspdf';

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
