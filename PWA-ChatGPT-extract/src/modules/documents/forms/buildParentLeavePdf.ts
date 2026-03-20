/**
 * PDF-Generierung für Elternzeit-Antrag.
 * DIN-5008-orientiertes Geschäftsbrief-Layout, A4 Hochformat.
 */

import { jsPDF } from 'jspdf';
import type { ParentLeaveLetterContent } from './buildParentLeaveDocument';

const MARGIN = 25;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const TEXT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const LINE_HEIGHT = 5;
const PARA_SPACING = 3;

/** Schreibt mehrzeiligen Text mit automatischem Umbruch und Seitenumbrüchen. Gibt die nächste Y-Position zurück. */
function addWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  fontSize: number,
  lineHeight: number
): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.setFontSize(fontSize);
  const bottomMargin = PAGE_HEIGHT - MARGIN;
  for (let i = 0; i < lines.length; i++) {
    if (y + lineHeight > bottomMargin) {
      doc.addPage();
      y = MARGIN;
    }
    doc.text(lines[i], x, y);
    y += lineHeight;
  }
  return y;
}

/** Schreibt Absenderblock oben links. */
function addSender(doc: jsPDF, content: ParentLeaveLetterContent): void {
  let y = MARGIN;
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  if (content.senderName) {
    doc.setFont('helvetica', 'bold');
    doc.text(content.senderName, MARGIN, y);
    y += LINE_HEIGHT;
  }
  if (content.senderAddress) {
    doc.setFont('helvetica', 'normal');
    const addrLines = doc.splitTextToSize(content.senderAddress, 70);
    doc.text(addrLines, MARGIN, y);
    y += addrLines.length * LINE_HEIGHT;
  }
}

/** Schreibt Ort, Datum rechtsbündig. */
function addPlaceDate(doc: jsPDF, place: string, date: string): void {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const text = place && date ? `${place}, ${date}` : place || date;
  if (text) {
    const x = PAGE_WIDTH - MARGIN - doc.getTextWidth(text);
    doc.text(text, x, MARGIN + 10);
  }
}

/** Schreibt Anschriftenfeld (Empfänger) für Fensterumschlag. DIN-5008: ca. 45mm von oben. */
function addRecipient(doc: jsPDF, content: ParentLeaveLetterContent): number {
  let y = 45;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  if (content.recipientName) {
    doc.text(content.recipientName, MARGIN, y);
    y += LINE_HEIGHT;
  }
  if (content.recipientAddress) {
    const lines = doc.splitTextToSize(content.recipientAddress, 85);
    doc.text(lines, MARGIN, y);
    y += lines.length * LINE_HEIGHT;
  }
  return y;
}

/** Prüft, ob neue Seite nötig ist, und fügt sie bei Bedarf ein. */
function ensureSpace(doc: jsPDF, currentY: number, needed: number): number {
  if (currentY + needed > PAGE_HEIGHT - MARGIN) {
    doc.addPage();
    return MARGIN;
  }
  return currentY;
}

/**
 * Erzeugt ein PDF-Blob aus dem Briefinhalt.
 */
export function buildParentLeavePdf(content: ParentLeaveLetterContent): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFont('helvetica');

  addSender(doc, content);
  addPlaceDate(doc, content.place, content.date);
  let y = addRecipient(doc, content);

  y += LINE_HEIGHT * 2;

  if (content.subject) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(content.subject, MARGIN, y);
    y += LINE_HEIGHT * 2;
  }

  if (content.salutation) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(content.salutation, MARGIN, y);
    y += LINE_HEIGHT * 2;
  }

  doc.setFontSize(10);
  const lineH = 5.5;

  for (const para of content.paragraphs) {
    y = ensureSpace(doc, y, lineH * 4);
    y = addWrappedText(doc, para, MARGIN, y, TEXT_WIDTH, 10, lineH);
    y += PARA_SPACING;
  }

  y += LINE_HEIGHT;

  if (content.closing) {
    y = ensureSpace(doc, y, lineH * 2);
    doc.text(content.closing, MARGIN, y);
    y += LINE_HEIGHT * 3;
  }

  y = ensureSpace(doc, y, lineH * 6);

  if (content.signatureName) {
    y += LINE_HEIGHT * 4;
    doc.text(content.signatureName, MARGIN, y);
  }

  return doc.output('blob');
}
