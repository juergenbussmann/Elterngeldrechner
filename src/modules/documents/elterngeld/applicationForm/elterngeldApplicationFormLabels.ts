/**
 * Einheitliche Texte und Formatierungen für die Antrags-Ausfüllhilfe (Abschnitte A–E + Anhang).
 * Genutzt von buildElterngeldApplicationPdf und der Screen-Vorschau im Wizard.
 */

import type { ElterngeldDocumentModel } from '../documentModel/buildElterngeldDocumentModel';
import type { MonthModeForDistribution } from '../types/elterngeldTypes';

export const APPLICANT_MODE_LABEL: Record<string, string> = {
  single_applicant: 'Nur ein Elternteil beantragt',
  both_parents: 'Beide Elternteile',
  single_parent: 'Alleinerziehend',
};

export const EMPLOYMENT_TYPE_LABEL: Record<string, string> = {
  employed: 'Angestellt',
  self_employed: 'Selbstständig',
  mixed: 'Gemischt (angestellt und selbstständig)',
  none: 'Keine Erwerbstätigkeit',
};

export const BENEFIT_MODEL_LABEL: Record<string, string> = {
  basis: 'Basiselterngeld',
  plus: 'ElterngeldPlus',
  mixed: 'Gemischt (Basiselterngeld und ElterngeldPlus in der App)',
};

export function formatApplicantMode(mode: string): string {
  return APPLICANT_MODE_LABEL[mode] ?? mode;
}

export function formatEmploymentType(value: string): string {
  return EMPLOYMENT_TYPE_LABEL[value] ?? value;
}

export function formatBenefitModel(value: string): string {
  return BENEFIT_MODEL_LABEL[value] ?? value;
}

export function formatMonthMode(mode: MonthModeForDistribution): string {
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

export function parentDisplayLabel(firstName: string, lastName: string, fallback: string): string {
  const n = `${firstName} ${lastName}`.trim();
  return n || fallback;
}

/** Eine Zeile pro Lebensmonat aus dem Modell – gleiche Logik wie im PDF. */
export function formatConcreteMonthLines(
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
    out.push(`${labelA} und ${labelB}: jeweils ${formatMonthMode(modeA)}`);
  } else {
    out.push(`${labelA}: ${formatMonthMode(modeA)}`);
    out.push(`${labelB}: ${formatMonthMode(modeB)}`);
  }
  return out;
}

export const APPLICATION_FORM_DOCUMENT_TITLE = 'Elterngeld – Ausfüllhilfe für den Antrag';

export const APPLICATION_FORM_INTRO_PARAGRAPH =
  'Dieses Dokument strukturiert Ihre Planung aus der App als Ausfüllhilfe für den echten Elterngeld-Antrag. Es ersetzt keine Formulare und kein Online-Portal. Die Abschnitte A bis E führen Sie Schritt für Schritt.';

/** Einleitung: abhängig vom aufgelösten Bundesland — kein NRW-Bezug außer bei bundeslandTier „nrw“. */
export function getApplicationFormIntroParagraph(model: ElterngeldDocumentModel): string {
  const base = APPLICATION_FORM_INTRO_PARAGRAPH;
  if (!model.stateCode.trim()) {
    return `${base} Hinweis: Ohne Bundesland (Schritt „Geburt & Kind“) sind keine bundeslandspezifischen Hinweise in der App möglich.`;
  }
  if (!model.isKnownBundesland) {
    return `${base} Das angegebene Bundesland steht nicht in der Auswahlliste dieser App; die Ausfüllhilfe bleibt allgemein. Bitte prüfen Sie die Vorgaben Ihrer Elterngeldstelle.`;
  }
  if (model.bundeslandTier === 'nrw') {
    return `${base} Für Nordrhein-Westfalen orientiert sich der Aufbau (A–E) an den dort üblichen Antragsunterlagen; es handelt sich nicht um ein behördliches Originalformular.`;
  }
  return base;
}

export const SECTION_A_TITLE = 'A. Angaben aus Ihrer Planung';
export const SECTION_B_TITLE = 'B. Ergebnis Ihrer Planung';
export const SECTION_C_TITLE = 'C. So nutzen Sie diese Angaben im Antrag';
export const SECTION_D_TITLE = 'D. Fehlende Angaben';
export const SECTION_E_TITLE = 'E. Wichtiger Hinweis';
export const SECTION_ANHANG_TITLE = 'Anhang';

export const SUBSECTION_MONTHLY_SPLIT = 'Monatliche Aufteilung (Ihre Planung in der App)';

export const MONTH_DISTRIBUTION_INTRO_LINES = [
  'Diese Übersicht zeigt der Reihe nach jeden Lebensmonat Ihres Kindes und welche Elternperson in der App für diesen Monat welche Leistungsart vorgesehen hat (Basiselterngeld, ElterngeldPlus oder Partnerschaftsbonus bzw. kein Bezug).',
  'Übernehmen Sie diese geplante Aufteilung im echten Antrag in den dafür vorgesehenen Angaben zum Elterngeld-Bezug.',
] as const;

export const MONTH_DISTRIBUTION_FOOTNOTE =
  'Hinweis: Wie genau Bezugsmonate in Papier- oder Online-Anträgen einzutragen sind, hängt von Vorgaben Ihres Bundeslandes ab; Person, Lebensmonat und Leistungsart aus der Liste bleiben Ihre Orientierung.';

export const SECTION_B_NO_DISTRIBUTION_HINT =
  'Es liegt keine monatsweise Detailaufteilung aus der App vor; der Überblick zu Bezug und Monatszahlen steht in Abschnitt A.';

export const SUBSECTION_CALCULATION = 'Orientierung: unverbindliche Schätzung';

export const CALCULATION_UNAVAILABLE_TITLE = 'Keine belastbare Schätzung verfügbar.';
export const CALCULATION_UNAVAILABLE_BODY =
  'Die App konnte dazu keine Beträge berechnen – etwa weil Angaben fehlen oder die Prüfung in der App nicht erfolgreich war.';

export const APPLICATION_FORM_SECTION_C_TEXT =
  'Halten Sie beim Ausfüllen Ihres echten Antrags Abschnitt A und B dieser Ausfüllhilfe bereit. Ordnen Sie die dortigen Angaben thematisch zu: zuerst zu Kind und Eltern, dann zu Einkommen und zur geplanten Aufteilung des Elterngelds. Wenn eine Monatsliste in Abschnitt B steht, entspricht sie der Reihenfolge und Aufteilung Ihrer Planung in der App – tragen Sie sie im Antrag entsprechend ein, soweit dessen Aufbau das vorsieht. Die geschätzten Beträge dienen nur zur Orientierung; maßgeblich ist später die Prüfung durch die Elterngeldstelle.';

export const SECTION_D_MISSING_HEADING = 'Diese Angaben müssen Sie im Antrag zusätzlich ergänzen';

export const SECTION_D_MISSING_CATEGORIES = [
  'Persönliche Daten',
  'Bankverbindung',
  'Steuer- und Versicherungsdaten',
  'Detaillierte Einkommensangaben',
  'Nachweise',
] as const;

export const SECTION_E_LINES = [
  'Dieses Dokument ist eine Ausfüllhilfe und kein offizieller Antrag.',
  'Die Prüfung und Entscheidung erfolgt durch die Elterngeldstelle.',
  'Die endgültige Höhe des Elterngelds wird dort berechnet.',
  'Alle Angaben und Schätzwerte hier dienen nur zur Orientierung.',
] as const;

export const ANHANG_CHECKLIST_TITLE = 'Unterlagen-Checkliste';

export const ANHANG_CHECKLIST_INTRO =
  'Die folgende Liste stammt aus der App und nennt typische Unterlagen – sie ist nicht mit dem Abschnitt „Fehlende Angaben“ (noch nicht erfasste Formularfelder) dasselbe.';

export const ANHANG_DEADLINES_TITLE = 'Fristen und Hinweise (aus der App)';
