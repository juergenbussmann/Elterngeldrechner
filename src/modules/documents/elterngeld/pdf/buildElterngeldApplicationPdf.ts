/**
 * PDF zur Antragsvorbereitung aus dem kanonischen Dokumentenmodell.
 * Formularnahe Ausfüllhilfe (A–E) — kein amtliches Originalformular.
 */

import { jsPDF } from 'jspdf';
import type { ElterngeldDocumentModel } from '../documentModel/buildElterngeldDocumentModel';
import type { MonthModeForDistribution } from '../types/elterngeldTypes';
import { formatDateGerman, parseIsoDate } from '../elterngeldDeadlines';
import {
  ELTERNGELD_PDF_LINE_HEIGHT,
  ELTERNGELD_PDF_MARGIN,
  ELTERNGELD_PDF_TEXT_WIDTH,
  elterngeldPdfAddWrappedText,
  elterngeldPdfFormatCurrency,
} from './elterngeldPdfCommon';

const PDF_SAFE_BOTTOM_MM = 272;

const APPLICANT_MODE_LABEL: Record<string, string> = {
  single_applicant: 'Nur ein Elternteil beantragt',
  both_parents: 'Beide Elternteile',
  single_parent: 'Alleinerziehend',
};

/** Lesbare Labels für im Modell gespeicherte Beschäftigungstypen (keine neuen Inhalte). */
const EMPLOYMENT_TYPE_LABEL: Record<string, string> = {
  employed: 'Angestellt',
  self_employed: 'Selbstständig',
  mixed: 'Gemischt (angestellt und selbstständig)',
  none: 'Keine Erwerbstätigkeit',
};

/** Lesbare Labels für das gewählte Bezugsmodell in der App. */
const BENEFIT_MODEL_LABEL: Record<string, string> = {
  basis: 'Basiselterngeld',
  plus: 'ElterngeldPlus',
  mixed: 'Gemischt (Basiselterngeld und ElterngeldPlus in der App)',
};

function formatApplicantMode(mode: string): string {
  return APPLICANT_MODE_LABEL[mode] ?? mode;
}

function formatEmploymentType(value: string): string {
  return EMPLOYMENT_TYPE_LABEL[value] ?? value;
}

function formatBenefitModel(value: string): string {
  return BENEFIT_MODEL_LABEL[value] ?? value;
}

function formatMonthMode(mode: MonthModeForDistribution): string {
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

/** Eine Zeile pro Lebensmonat aus dem Modell – keine Zusammenfassung über mehrere Monate. */
function formatConcreteMonthLines(
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
    out.push(`  ${labelA} und ${labelB}: jeweils ${formatMonthMode(modeA)}`);
  } else {
    out.push(`  ${labelA}: ${formatMonthMode(modeA)}`);
    out.push(`  ${labelB}: ${formatMonthMode(modeB)}`);
  }
  return out;
}

function fieldLine(doc: jsPDF, label: string, value: string, y: number, fontSize: number): number {
  const text = `${label}: ${value || '–'}`;
  return elterngeldPdfAddWrappedText(doc, text, ELTERNGELD_PDF_MARGIN, y, ELTERNGELD_PDF_TEXT_WIDTH, fontSize);
}

function ensurePageSpace(doc: jsPDF, y: number, reserveMm = 36): number {
  if (y <= PDF_SAFE_BOTTOM_MM - reserveMm) return y;
  doc.addPage();
  return ELTERNGELD_PDF_MARGIN;
}

/** Hauptabschnitt A–E: fett, größer, mit Abstand darunter. */
function majorSectionHeading(doc: jsPDF, title: string, y: number, addSpacingBefore: boolean): number {
  if (addSpacingBefore) {
    y += 10;
  }
  y = ensurePageSpace(doc, y, 34);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(title, ELTERNGELD_PDF_MARGIN, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  return y + ELTERNGELD_PDF_LINE_HEIGHT * 2;
}

function subsectionHeading(doc: jsPDF, title: string, y: number): number {
  y = ensurePageSpace(doc, y, 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(title, ELTERNGELD_PDF_MARGIN, y);
  doc.setFont('helvetica', 'normal');
  return y + ELTERNGELD_PDF_LINE_HEIGHT * 1.1;
}

function renderConcreteMonthDistribution(
  doc: jsPDF,
  model: ElterngeldDocumentModel,
  y: number
): number {
  const dist = model.benefitPlan.concreteMonthDistribution;
  if (!dist?.length) return y;

  y = subsectionHeading(doc, 'Monatliche Aufteilung (Ihre Planung in der App)', y);
  doc.setFontSize(9);
  y = elterngeldPdfAddWrappedText(
    doc,
    'Diese Übersicht zeigt der Reihe nach jeden Lebensmonat Ihres Kindes und welche Elternperson in der App für diesen Monat welche Leistungsart vorgesehen hat (Basiselterngeld, ElterngeldPlus oder Partnerschaftsbonus bzw. kein Bezug).',
    ELTERNGELD_PDF_MARGIN,
    y,
    ELTERNGELD_PDF_TEXT_WIDTH,
    9
  );
  y += 2;
  y = elterngeldPdfAddWrappedText(
    doc,
    'Übernehmen Sie diese geplante Aufteilung im echten Antrag in den dafür vorgesehenen Angaben zum Elterngeld-Bezug.',
    ELTERNGELD_PDF_MARGIN,
    y,
    ELTERNGELD_PDF_TEXT_WIDTH,
    9
  );
  y += 4;
  const sorted = [...dist].sort((a, b) => a.month - b.month);
  for (const entry of sorted) {
    const lines = formatConcreteMonthLines(model, entry.month, entry.modeA, entry.modeB);
    y = ensurePageSpace(doc, y, 10 + lines.length * 5);
    for (const line of lines) {
      y = elterngeldPdfAddWrappedText(doc, line, ELTERNGELD_PDF_MARGIN, y, ELTERNGELD_PDF_TEXT_WIDTH, 9);
    }
    y += 3;
  }
  y = elterngeldPdfAddWrappedText(
    doc,
    'Hinweis: Wie genau Bezugsmonate in Papier- oder Online-Anträgen einzutragen sind, hängt von Vorgaben Ihres Bundeslandes ab; Person, Lebensmonat und Leistungsart aus der Liste bleiben Ihre Orientierung.',
    ELTERNGELD_PDF_MARGIN,
    y,
    ELTERNGELD_PDF_TEXT_WIDTH,
    9
  );
  y += 6;
  doc.setFontSize(10);
  return y;
}

export function buildElterngeldApplicationPdf(model: ElterngeldDocumentModel): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFont('helvetica');
  doc.setTextColor(0, 0, 0);

  let y = ELTERNGELD_PDF_MARGIN;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Elterngeld – Ausfüllhilfe für den Antrag', ELTERNGELD_PDF_MARGIN, y);
  y += ELTERNGELD_PDF_LINE_HEIGHT * 1.8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  y = elterngeldPdfAddWrappedText(
    doc,
    'Dieses Dokument strukturiert Ihre Planung aus der App als Ausfüllhilfe für den echten Elterngeld-Antrag. Es ersetzt keine Formulare und kein Online-Portal. Die Abschnitte A bis E führen Sie Schritt für Schritt.',
    ELTERNGELD_PDF_MARGIN,
    y,
    ELTERNGELD_PDF_TEXT_WIDTH,
    9
  );
  y += 10;

  // ——— A. Angaben aus Ihrer Planung ———
  y = majorSectionHeading(doc, 'A. Angaben aus Ihrer Planung', y, false);

  y = subsectionHeading(doc, 'Bundesland', y);
  y = fieldLine(doc, 'Bundesland (laut Angaben)', model.stateDisplayName, y, 10);
  y += 5;

  y = ensurePageSpace(doc, y);
  y = subsectionHeading(doc, 'Kind', y);
  const birthDate = parseIsoDate(model.child.birthDate);
  const birthStr = birthDate ? formatDateGerman(birthDate) : '–';
  const expectedDate = parseIsoDate(model.child.expectedBirthDate);
  const expectedStr = expectedDate ? formatDateGerman(expectedDate) : '–';
  y = fieldLine(doc, 'Geburtsdatum', birthStr, y, 10);
  y = fieldLine(doc, 'Voraussichtlicher Geburtstermin', expectedStr, y + 2, 10);
  y = fieldLine(doc, 'Mehrlingsgeburt', model.child.multipleBirth ? 'Ja' : 'Nein', y + 2, 10);
  y += 5;

  y = ensurePageSpace(doc, y);
  y = subsectionHeading(doc, 'Eltern', y);
  y = fieldLine(
    doc,
    'Erste antragstellende Person – Name',
    `${model.parentA.firstName} ${model.parentA.lastName}`.trim() || '–',
    y,
    10
  );
  y = fieldLine(doc, 'Erste Person – Beschäftigung', formatEmploymentType(model.parentA.employmentType), y + 2, 10);
  y = fieldLine(
    doc,
    'Erste Person – Nettoeinkommen vor der Geburt (Angabe aus der App)',
    model.parentA.incomeBeforeBirth || '–',
    y + 2,
    10
  );
  y = fieldLine(
    doc,
    'Erste Person – geplante Teilzeit nach der Geburt / Wochenstunden',
    model.parentA.plannedPartTime
      ? model.parentA.hoursPerWeek != null
        ? `${model.parentA.hoursPerWeek} h/Woche`
        : 'Ja, Stunden nicht angegeben'
      : 'Nein',
    y + 2,
    10
  );

  if (model.parentB) {
    y += 4;
    y = fieldLine(
      doc,
      'Zweite Person – Name',
      `${model.parentB.firstName} ${model.parentB.lastName}`.trim() || '–',
      y,
      10
    );
    y = fieldLine(doc, 'Zweite Person – Beschäftigung', formatEmploymentType(model.parentB.employmentType), y + 2, 10);
    y = fieldLine(
      doc,
      'Zweite Person – Nettoeinkommen vor der Geburt (Angabe aus der App)',
      model.parentB.incomeBeforeBirth || '–',
      y + 2,
      10
    );
    y = fieldLine(
      doc,
      'Zweite Person – geplante Teilzeit nach der Geburt / Wochenstunden',
      model.parentB.plannedPartTime
        ? model.parentB.hoursPerWeek != null
          ? `${model.parentB.hoursPerWeek} h/Woche`
          : 'Ja, Stunden nicht angegeben'
        : 'Nein',
      y + 2,
      10
    );
  }

  y += 5;
  y = ensurePageSpace(doc, y);
  y = subsectionHeading(doc, 'Antragsteller-Konstellation', y);
  y = fieldLine(doc, 'Wer beantragt (laut App)', formatApplicantMode(model.applicantMode), y, 10);
  y += 5;

  y = ensurePageSpace(doc, y);
  y = subsectionHeading(doc, 'Bezug (Überblick aus der App)', y);
  y = fieldLine(doc, 'Gewähltes Modell', formatBenefitModel(model.benefitPlan.model), y, 10);
  y = fieldLine(doc, 'Anzahl Bezugsmonate – erste Person (Angabe)', model.benefitPlan.parentAMonths || '–', y + 2, 10);
  y = fieldLine(doc, 'Anzahl Bezugsmonate – zweite Person (Angabe)', model.benefitPlan.parentBMonths || '–', y + 2, 10);
  y = fieldLine(
    doc,
    'Partnerschaftsbonus vorgesehen',
    model.benefitPlan.partnershipBonus ? 'Ja' : 'Nein',
    y + 2,
    10
  );

  y += 8;

  // ——— B. Ergebnis Ihrer Planung ———
  y = majorSectionHeading(doc, 'B. Ergebnis Ihrer Planung', y, true);

  const hasDist = Boolean(model.benefitPlan.concreteMonthDistribution?.length);
  if (hasDist) {
    y = renderConcreteMonthDistribution(doc, model, y);
  } else {
    doc.setFontSize(9);
    y = elterngeldPdfAddWrappedText(
      doc,
      'Es liegt keine monatsweise Detailaufteilung aus der App vor; der Überblick zu Bezug und Monatszahlen steht in Abschnitt A.',
      ELTERNGELD_PDF_MARGIN,
      y,
      ELTERNGELD_PDF_TEXT_WIDTH,
      9
    );
    y += 6;
    doc.setFontSize(10);
  }

  y = subsectionHeading(doc, 'Orientierung: unverbindliche Schätzung', y);
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
      'Keine belastbare Schätzung verfügbar.',
      ELTERNGELD_PDF_MARGIN,
      y,
      ELTERNGELD_PDF_TEXT_WIDTH,
      10
    );
    doc.setFont('helvetica', 'normal');
    y += 2;
    y = elterngeldPdfAddWrappedText(
      doc,
      'Die App konnte dazu keine Beträge berechnen – etwa weil Angaben fehlen oder die Prüfung in der App nicht erfolgreich war.',
      ELTERNGELD_PDF_MARGIN,
      y,
      ELTERNGELD_PDF_TEXT_WIDTH,
      10
    );
  }

  y += 10;

  // ——— C. So nutzen Sie diese Angaben im Antrag ———
  y = majorSectionHeading(doc, 'C. So nutzen Sie diese Angaben im Antrag', y, true);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const cNarrative =
    'Halten Sie beim Ausfüllen Ihres echten Antrags Abschnitt A und B dieser Ausfüllhilfe bereit. Ordnen Sie die dortigen Angaben thematisch zu: zuerst zu Kind und Eltern, dann zu Einkommen und zur geplanten Aufteilung des Elterngelds. Wenn eine Monatsliste in Abschnitt B steht, entspricht sie der Reihenfolge und Aufteilung Ihrer Planung in der App – tragen Sie sie im Antrag entsprechend ein, soweit dessen Aufbau das vorsieht. Die geschätzten Beträge dienen nur zur Orientierung; maßgeblich ist später die Prüfung durch die Elterngeldstelle.';
  y = elterngeldPdfAddWrappedText(doc, cNarrative, ELTERNGELD_PDF_MARGIN, y, ELTERNGELD_PDF_TEXT_WIDTH, 10);
  y += 10;

  // ——— D. Fehlende Angaben ———
  y = majorSectionHeading(doc, 'D. Fehlende Angaben', y, true);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  y = elterngeldPdfAddWrappedText(
    doc,
    'Diese Angaben müssen Sie im Antrag zusätzlich ergänzen',
    ELTERNGELD_PDF_MARGIN,
    y,
    ELTERNGELD_PDF_TEXT_WIDTH,
    10
  );
  doc.setFont('helvetica', 'normal');
  y += 5;
  const dCats = [
    'Persönliche Daten',
    'Bankverbindung',
    'Steuer- und Versicherungsdaten',
    'Detaillierte Einkommensangaben',
    'Nachweise',
  ];
  for (const c of dCats) {
    y = ensurePageSpace(doc, y, 14);
    y = elterngeldPdfAddWrappedText(doc, `• ${c}`, ELTERNGELD_PDF_MARGIN, y, ELTERNGELD_PDF_TEXT_WIDTH, 10);
    y += 2;
  }
  y += 8;

  // ——— E. Wichtiger Hinweis ———
  y = ensurePageSpace(doc, y, 52);
  y = majorSectionHeading(doc, 'E. Wichtiger Hinweis', y, true);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const eBlock = [
    'Dieses Dokument ist eine Ausfüllhilfe und kein offizieller Antrag.',
    'Die Prüfung und Entscheidung erfolgt durch die Elterngeldstelle.',
    'Die endgültige Höhe des Elterngelds wird dort berechnet.',
    'Alle Angaben und Schätzwerte hier dienen nur zur Orientierung.',
  ];
  for (const line of eBlock) {
    doc.setFont('helvetica', 'bold');
    y = elterngeldPdfAddWrappedText(doc, line, ELTERNGELD_PDF_MARGIN, y, ELTERNGELD_PDF_TEXT_WIDTH, 10);
    doc.setFont('helvetica', 'normal');
    y += 3;
  }
  y += 10;

  // ——— Anhang (nach A–E, getrennt von „Fehlende Angaben“) ———
  y = ensurePageSpace(doc, y, 36);
  y = majorSectionHeading(doc, 'Anhang', y, true);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  y = subsectionHeading(doc, 'Unterlagen-Checkliste', y);
  y = elterngeldPdfAddWrappedText(
    doc,
    'Die folgende Liste stammt aus der App und nennt typische Unterlagen – sie ist nicht mit dem Abschnitt „Fehlende Angaben“ (noch nicht erfasste Formularfelder) dasselbe.',
    ELTERNGELD_PDF_MARGIN,
    y,
    ELTERNGELD_PDF_TEXT_WIDTH,
    9
  );
  y += 4;
  for (const item of model.checklistItems) {
    y = ensurePageSpace(doc, y, 12);
    y = elterngeldPdfAddWrappedText(doc, `• ${item}`, ELTERNGELD_PDF_MARGIN, y, ELTERNGELD_PDF_TEXT_WIDTH, 10);
  }

  const dl = model.deadlines;
  if (dl.deadlineLabel?.trim() || dl.noticeText?.trim()) {
    y += 6;
    y = ensurePageSpace(doc, y, 28);
    y = subsectionHeading(doc, 'Fristen und Hinweise (aus der App)', y);
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
