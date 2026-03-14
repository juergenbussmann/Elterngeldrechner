/**
 * Generiert den Elternzeit-Dokumenttext je nach Falltyp.
 * Juristisch neutral, höflich und sachlich.
 * Defensiv: keine Exceptions bei fehlenden optionalen Feldern.
 */

import type { ParentLeaveRequestType, ParentLeaveChangeType } from './parentalLeaveHelpers';
import { formatLeaveDuration } from './parentalLeaveHelpers';
import type { ParentLeaveFormValues } from './formsConfig';

export interface GeneratedDocument {
  title: string;
  body: string;
  category: 'documents';
  type: 'parental_leave';
  createdAtIso: string;
}

/** Strukturierter Inhalt für PDF-Generierung (DIN-5008-Geschäftsbrief). */
export interface ParentLeaveLetterContent {
  title: string;
  pdfFileName: string;
  senderName: string;
  senderAddress: string;
  recipientName: string;
  recipientAddress: string;
  place: string;
  date: string;
  subject: string;
  salutation: string;
  paragraphs: string[];
  closing: string;
  signatureName: string;
  createdAtIso: string;
}

function safeText(value?: string | null): string {
  return value?.trim() ?? '';
}

function formatAddress(values: ParentLeaveFormValues): string {
  const parts = [safeText(values.address), safeText(values.postalCode), safeText(values.city)].filter(Boolean);
  return parts.join(', ') || '';
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function buildHeader(values: ParentLeaveFormValues): string[] {
  const lines: string[] = [];
  const name = safeText(values.name);
  if (name) lines.push(name);
  const addr = formatAddress(values);
  if (addr) lines.push(addr);
  return lines;
}

function buildEmployerBlock(values: ParentLeaveFormValues): string[] {
  const lines: string[] = [];
  const employer = safeText(values.employer);
  if (employer) lines.push(employer);
  const employerAddr = safeText(values.employerAddress);
  if (employerAddr) lines.push(employerAddr);
  return lines;
}

function buildChildBlock(values: ParentLeaveFormValues): string[] {
  const lines: string[] = [];
  const childName = safeText(values.childName);
  if (childName) {
    lines.push(`Bezug: Kind ${childName}`);
    const bd = formatDate(values.birthDate);
    if (bd) lines.push(`Geburtsdatum: ${bd}`);
    if (!values.birthDate) {
      const ebd = formatDate(values.expectedBirthDate);
      if (ebd) lines.push(`Voraussichtliches Geburtsdatum: ${ebd}`);
    }
  }
  return lines;
}

function buildBasicLeave(values: ParentLeaveFormValues): string[] {
  const lines: string[] = [];
  const startDate = values.startDate ?? '';
  const endDate = values.endDate ?? '';
  const duration = formatLeaveDuration(startDate, endDate);
  const startFormatted = formatDate(startDate);
  const endFormatted = formatDate(endDate);

  lines.push('');
  lines.push('Betreff: Anmeldung / Antrag auf Elternzeit');
  lines.push('');
  lines.push(...buildChildBlock(values));
  lines.push('');
  lines.push(
    `Hiermit melde ich die Elternzeit für den Zeitraum vom ${startFormatted || '-'} bis ${endFormatted || '-'} an.`
  );
  if (duration) {
    lines.push(`Die Dauer der Elternzeit beträgt ${duration}.`);
  }
  lines.push('');
  lines.push('Ich bitte um eine schriftliche Bestätigung meines Antrags.');
  lines.push('');
  lines.push('Mit freundlichen Grüßen');
  return lines;
}

function buildPartTimeLeave(values: ParentLeaveFormValues): string[] {
  const lines: string[] = [];
  const startDate = values.startDate ?? '';
  const endDate = values.endDate ?? '';
  const duration = formatLeaveDuration(startDate, endDate);
  const startFormatted = formatDate(startDate);
  const endFormatted = formatDate(endDate);

  lines.push('');
  lines.push('Betreff: Anmeldung Elternzeit und Antrag auf Teilzeit während der Elternzeit');
  lines.push('');
  lines.push(...buildChildBlock(values));
  lines.push('');
  lines.push(
    `Hiermit melde ich die Elternzeit für den Zeitraum vom ${startFormatted || '-'} bis ${endFormatted || '-'} an.`
  );
  if (duration) lines.push(`Die Dauer der Elternzeit beträgt ${duration}.`);
  lines.push('');
  lines.push('Zusätzlich beantrage ich Teilzeit während der Elternzeit:');
  lines.push(`- Gewünschte Wochenstunden: ${safeText(values.weeklyHours) || '-'}`);
  lines.push(`- Gewünschte Verteilung der Arbeitszeit: ${safeText(values.workDistribution) || '-'}`);
  const schedule = safeText(values.optionalDesiredSchedule);
  if (schedule) lines.push(`- Gewünschter Zeitplan: ${schedule}`);
  lines.push('');
  lines.push('Ich bitte um Prüfung und schriftliche Bestätigung.');
  lines.push('');
  lines.push('Mit freundlichen Grüßen');
  return lines;
}

function buildChangeExtendEndEarly(
  values: ParentLeaveFormValues,
  changeType: ParentLeaveChangeType
): string[] {
  const lines: string[] = [];
  const prevStart = formatDate(values.previousStartDate);
  const prevEnd = formatDate(values.previousEndDate);
  const newEnd = formatDate(values.newEndDate);
  const newRequestedEnd = formatDate(values.newRequestedEndDate);

  lines.push('');
  if (changeType === 'change') {
    lines.push('Betreff: Änderung der angemeldeten Elternzeit');
  } else if (changeType === 'extend') {
    lines.push('Betreff: Verlängerung der Elternzeit');
  } else {
    lines.push('Betreff: Vorzeitige Beendigung der Elternzeit');
  }
  lines.push('');
  lines.push(...buildChildBlock(values));
  lines.push('');
  lines.push(
    `Bisher angemeldete Elternzeit: vom ${prevStart || '-'} bis ${prevEnd || '-'}.`
  );
  lines.push('');

  if (changeType === 'change') {
    lines.push(`Ich bitte um Anpassung der Elternzeit. Neues gewünschtes Ende: ${newEnd || '-'}.`);
  } else if (changeType === 'extend') {
    lines.push(`Ich bitte um Verlängerung der Elternzeit. Neues gewünschtes Ende: ${newEnd || '-'}.`);
  } else {
    lines.push(
      `Ich bitte um vorzeitige Beendigung der Elternzeit zum ${newRequestedEnd || '-'}.`
    );
  }
  const reason = safeText(values.reasonOptional);
  if (reason) lines.push(`Grund: ${reason}`);
  lines.push('');
  lines.push('Ich bitte um schriftliche Bestätigung.');
  lines.push('');
  lines.push('Mit freundlichen Grüßen');
  return lines;
}

function buildLatePeriod(values: ParentLeaveFormValues): string[] {
  const lines: string[] = [];
  const startDate = values.requestedLateStartDate ?? '';
  const endDate = values.requestedLateEndDate ?? '';
  const duration = formatLeaveDuration(startDate, endDate);
  const startFormatted = formatDate(startDate);
  const endFormatted = formatDate(endDate);

  lines.push('');
  lines.push('Betreff: Anmeldung Elternzeit für späteren Zeitraum');
  lines.push('');
  lines.push(...buildChildBlock(values));
  lines.push('');
  lines.push(
    `Hiermit melde ich die Elternzeit für den Zeitraum vom ${startFormatted || '-'} bis ${endFormatted || '-'} an.`
  );
  if (duration) lines.push(`Die Dauer beträgt ${duration}.`);
  const explanation = safeText(values.latePeriodExplanation);
  if (explanation) {
    lines.push('');
    lines.push(`Erläuterung: ${explanation}`);
  }
  lines.push('');
  lines.push('Ich bitte um schriftliche Bestätigung meines Antrags.');
  lines.push('');
  lines.push('Mit freundlichen Grüßen');
  return lines;
}

/**
 * Generiert das vollständige Dokument.
 * Defensiv: wirft keine Exception, auch bei ungültigen oder fehlenden Werten.
 */
export function buildParentLeaveDocument(values: ParentLeaveFormValues): GeneratedDocument {
  const createdAtIso = new Date().toISOString();
  const createdAtPlace = safeText(values.createdAtPlace);
  const createdAtDate = formatDate(values.createdAtDate);

  const header = buildHeader(values);
  const employerBlock = buildEmployerBlock(values);

  const rt = (values.requestType ?? '') as ParentLeaveRequestType;
  const ct = (values.changeType ?? 'change') as ParentLeaveChangeType;

  let bodyParts: string[] = [];
  try {
    switch (rt) {
      case 'basic_leave':
        bodyParts = buildBasicLeave(values);
        break;
      case 'leave_with_part_time':
        bodyParts = buildPartTimeLeave(values);
        break;
      case 'change_extend_end_early':
        bodyParts = buildChangeExtendEndEarly(values, ct);
        break;
      case 'late_period':
        bodyParts = buildLatePeriod(values);
        break;
      default:
        bodyParts = buildBasicLeave(values);
    }
  } catch (err) {
    console.error('[parental-leave] buildParentLeaveDocument: builder failed', err);
    bodyParts = ['Fehler beim Erstellen des Dokuments. Bitte versuchen Sie es erneut.'];
  }

  const placeDateLine =
    createdAtPlace || createdAtDate
      ? [createdAtPlace && createdAtDate ? `${createdAtPlace}, ${createdAtDate}` : createdAtPlace || createdAtDate]
      : [];

  const bodyLines = [...header, '', ...employerBlock, '', ...placeDateLine, ...bodyParts];
  const body = bodyLines.join('\n') || 'Elternzeit-Antrag';
  const title = getDocumentTitle(values) || 'Elternzeit-Antrag';

  return {
    title,
    body,
    category: 'documents',
    type: 'parental_leave',
    createdAtIso,
  };
}

function getDocumentTitle(values: ParentLeaveFormValues): string {
  const rt = (values.requestType ?? '') as ParentLeaveRequestType;
  const ct = (values.changeType ?? '') as ParentLeaveChangeType | undefined;
  const suffix = safeText(values.childName) ? ` – ${safeText(values.childName)}` : '';

  switch (rt) {
    case 'basic_leave':
      return `Elternzeit-Antrag${suffix}`;
    case 'leave_with_part_time':
      return `Elternzeit mit Teilzeit${suffix}`;
    case 'change_extend_end_early':
      if (ct === 'change') return `Elternzeit Änderung${suffix}`;
      if (ct === 'extend') return `Elternzeit Verlängerung${suffix}`;
      if (ct === 'end_early') return `Elternzeit vorzeitige Beendigung${suffix}`;
      return `Elternzeit Änderung${suffix}`;
    case 'late_period':
      return `Elternzeit späterer Zeitraum${suffix}`;
    default:
      return `Elternzeit-Antrag${suffix}`;
  }
}

function getPdfFileName(values: ParentLeaveFormValues): string {
  const rt = (values.requestType ?? '') as ParentLeaveRequestType;
  const ct = (values.changeType ?? '') as ParentLeaveChangeType | undefined;

  switch (rt) {
    case 'basic_leave':
      return 'Elternzeit-Antrag.pdf';
    case 'leave_with_part_time':
      return 'Elternzeit mit Teilzeit.pdf';
    case 'change_extend_end_early':
      if (ct === 'change') return 'Elternzeit Änderung.pdf';
      if (ct === 'extend') return 'Elternzeit Verlängerung.pdf';
      if (ct === 'end_early') return 'Elternzeit vorzeitige Beendigung.pdf';
      return 'Elternzeit Änderung.pdf';
    case 'late_period':
      return 'Elternzeit späterer Zeitraum.pdf';
    default:
      return 'Elternzeit-Antrag.pdf';
  }
}

function getLetterContentBasicLeave(values: ParentLeaveFormValues): { subject: string; paragraphs: string[] } {
  const startFormatted = formatDate(values.startDate);
  const endFormatted = formatDate(values.endDate);
  const duration = formatLeaveDuration(values.startDate ?? '', values.endDate ?? '');
  const childLines = buildChildBlock(values);

  const paragraphs: string[] = [];
  if (childLines.length > 0) {
    paragraphs.push(childLines.join('\n'));
  }
  paragraphs.push(
    `Hiermit melde ich die Elternzeit für den Zeitraum vom ${startFormatted || '-'} bis ${endFormatted || '-'} an.`
  );
  if (duration) paragraphs.push(`Die Dauer der Elternzeit beträgt ${duration}.`);
  paragraphs.push('Ich bitte um eine schriftliche Bestätigung meines Antrags.');

  return { subject: 'Anmeldung / Antrag auf Elternzeit', paragraphs };
}

function getLetterContentPartTime(values: ParentLeaveFormValues): { subject: string; paragraphs: string[] } {
  const startFormatted = formatDate(values.startDate);
  const endFormatted = formatDate(values.endDate);
  const duration = formatLeaveDuration(values.startDate ?? '', values.endDate ?? '');
  const childLines = buildChildBlock(values);

  const paragraphs: string[] = [];
  if (childLines.length > 0) paragraphs.push(childLines.join('\n'));
  paragraphs.push(
    `Hiermit melde ich die Elternzeit für den Zeitraum vom ${startFormatted || '-'} bis ${endFormatted || '-'} an.`
  );
  if (duration) paragraphs.push(`Die Dauer der Elternzeit beträgt ${duration}.`);
  paragraphs.push('Zusätzlich beantrage ich Teilzeit während der Elternzeit:');
  paragraphs.push(`- Gewünschte Wochenstunden: ${safeText(values.weeklyHours) || '-'}`);
  paragraphs.push(`- Gewünschte Verteilung der Arbeitszeit: ${safeText(values.workDistribution) || '-'}`);
  const schedule = safeText(values.optionalDesiredSchedule);
  if (schedule) paragraphs.push(`- Gewünschter Zeitplan: ${schedule}`);
  paragraphs.push('Ich bitte um Prüfung und schriftliche Bestätigung.');

  return { subject: 'Anmeldung Elternzeit und Antrag auf Teilzeit während der Elternzeit', paragraphs };
}

function getLetterContentChangeExtend(
  values: ParentLeaveFormValues,
  changeType: ParentLeaveChangeType
): { subject: string; paragraphs: string[] } {
  const prevStart = formatDate(values.previousStartDate);
  const prevEnd = formatDate(values.previousEndDate);
  const newEnd = formatDate(values.newEndDate);
  const newRequestedEnd = formatDate(values.newRequestedEndDate);
  const childLines = buildChildBlock(values);

  const paragraphs: string[] = [];
  if (childLines.length > 0) paragraphs.push(childLines.join('\n'));
  paragraphs.push(`Bisher angemeldete Elternzeit: vom ${prevStart || '-'} bis ${prevEnd || '-'}.`);

  if (changeType === 'change') {
    paragraphs.push(`Ich bitte um Anpassung der Elternzeit. Neues gewünschtes Ende: ${newEnd || '-'}.`);
  } else if (changeType === 'extend') {
    paragraphs.push(`Ich bitte um Verlängerung der Elternzeit. Neues gewünschtes Ende: ${newEnd || '-'}.`);
  } else {
    paragraphs.push(`Ich bitte um vorzeitige Beendigung der Elternzeit zum ${newRequestedEnd || '-'}.`);
  }
  const reason = safeText(values.reasonOptional);
  if (reason) paragraphs.push(`Grund: ${reason}`);
  paragraphs.push('Ich bitte um schriftliche Bestätigung.');

  const subject =
    changeType === 'change'
      ? 'Änderung der angemeldeten Elternzeit'
      : changeType === 'extend'
        ? 'Verlängerung der Elternzeit'
        : 'Vorzeitige Beendigung der Elternzeit';

  return { subject, paragraphs };
}

function getLetterContentLatePeriod(values: ParentLeaveFormValues): { subject: string; paragraphs: string[] } {
  const startFormatted = formatDate(values.requestedLateStartDate);
  const endFormatted = formatDate(values.requestedLateEndDate);
  const duration = formatLeaveDuration(
    values.requestedLateStartDate ?? '',
    values.requestedLateEndDate ?? ''
  );
  const childLines = buildChildBlock(values);

  const paragraphs: string[] = [];
  if (childLines.length > 0) paragraphs.push(childLines.join('\n'));
  paragraphs.push(
    `Hiermit melde ich die Elternzeit für den Zeitraum vom ${startFormatted || '-'} bis ${endFormatted || '-'} an.`
  );
  if (duration) paragraphs.push(`Die Dauer beträgt ${duration}.`);
  const explanation = safeText(values.latePeriodExplanation);
  if (explanation) paragraphs.push(`Erläuterung: ${explanation}`);
  paragraphs.push('Ich bitte um schriftliche Bestätigung meines Antrags.');

  return { subject: 'Anmeldung Elternzeit für späteren Zeitraum', paragraphs };
}

/**
 * Liefert strukturierten Briefinhalt für PDF-Generierung.
 */
export function getParentLeaveLetterContent(values: ParentLeaveFormValues): ParentLeaveLetterContent {
  const createdAtIso = new Date().toISOString();
  const place = safeText(values.createdAtPlace);
  const date = formatDate(values.createdAtDate);
  const rt = (values.requestType ?? '') as ParentLeaveRequestType;
  const ct = (values.changeType ?? 'change') as ParentLeaveChangeType;

  let subject = 'Elternzeit-Antrag';
  let paragraphs: string[] = [];

  try {
    switch (rt) {
      case 'basic_leave':
        ({ subject, paragraphs } = getLetterContentBasicLeave(values));
        break;
      case 'leave_with_part_time':
        ({ subject, paragraphs } = getLetterContentPartTime(values));
        break;
      case 'change_extend_end_early':
        ({ subject, paragraphs } = getLetterContentChangeExtend(values, ct));
        break;
      case 'late_period':
        ({ subject, paragraphs } = getLetterContentLatePeriod(values));
        break;
      default:
        ({ subject, paragraphs } = getLetterContentBasicLeave(values));
    }
  } catch (err) {
    console.error('[parental-leave] getParentLeaveLetterContent failed', err);
    paragraphs = ['Fehler beim Erstellen des Dokuments. Bitte versuchen Sie es erneut.'];
  }

  const senderAddress = formatAddress(values);

  return {
    title: getDocumentTitle(values) || 'Elternzeit-Antrag',
    pdfFileName: getPdfFileName(values),
    senderName: safeText(values.name),
    senderAddress,
    recipientName: safeText(values.employer),
    recipientAddress: safeText(values.employerAddress),
    place,
    date,
    subject,
    salutation: 'Sehr geehrte Damen und Herren,',
    paragraphs,
    closing: 'Mit freundlichen Grüßen',
    signatureName: safeText(values.name),
    createdAtIso,
  };
}
