/**
 * PDF-Generierung für Elterngeld-Berechnung (unverbindliche Schätzung).
 */

import { jsPDF } from 'jspdf';
import type { CalculationResult } from '../calculation';

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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const MODE_LABELS: Record<string, string> = {
  none: '–',
  basis: 'Basiselterngeld',
  plus: 'ElterngeldPlus',
  partnerBonus: 'Partnerschaftsbonus',
};

export function buildElterngeldCalculationPdf(result: CalculationResult): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFont('helvetica');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  let y = MARGIN;

  doc.setFont('helvetica', 'bold');
  doc.text('Elterngeld-Berechnung – Unverbindliche Schätzung', MARGIN, y);
  y += LINE_HEIGHT * 1.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  y = addWrappedText(doc, result.meta.disclaimer, MARGIN, y, TEXT_WIDTH, 9);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Berechnungsergebnis', MARGIN, y);
  y += LINE_HEIGHT;

  doc.setFont('helvetica', 'normal');
  for (const parent of result.parents) {
    const hasData = parent.monthlyResults.some((r) => r.mode !== 'none' || r.amount > 0);
    if (!hasData) continue;

    doc.setFont('helvetica', 'bold');
    doc.text(`${parent.label}:`, MARGIN, y);
    y += LINE_HEIGHT;
    doc.setFont('helvetica', 'normal');

    for (const r of parent.monthlyResults.filter((m) => m.mode !== 'none' || m.amount > 0)) {
      const modeLabel = MODE_LABELS[r.mode] ?? r.mode;
      doc.text(`  Lebensmonat ${r.month} (${modeLabel}): ${formatCurrency(r.amount)}`, MARGIN, y);
      y += LINE_HEIGHT;
    }
    doc.text(`  Gesamt: ${formatCurrency(parent.total)}`, MARGIN, y);
    y += LINE_HEIGHT + 2;
  }

  doc.setFont('helvetica', 'bold');
  doc.text(`Haushaltsgesamtsumme: ${formatCurrency(result.householdTotal)}`, MARGIN, y);
  y += LINE_HEIGHT * 1.5;

  if (result.validation.warnings.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('Hinweise', MARGIN, y);
    y += LINE_HEIGHT;
    doc.setFont('helvetica', 'normal');
    for (const w of result.validation.warnings) {
      y = addWrappedText(doc, `• ${w}`, MARGIN, y, TEXT_WIDTH, 9);
      y += 2;
    }
    y += 3;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  y = addWrappedText(
    doc,
    'Diese Berechnung ist eine unverbindliche Schätzung. Die endgültige Entscheidung trifft die zuständige Elterngeldstelle.',
    MARGIN,
    y + 5,
    TEXT_WIDTH,
    8
  );

  return doc.output('blob');
}
