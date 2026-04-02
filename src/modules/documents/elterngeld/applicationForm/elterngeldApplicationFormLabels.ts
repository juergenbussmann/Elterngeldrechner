/**
 * Einheitliche Texte und Formatierungen für die Antrags-Ausfüllhilfe:
 * durchgehender formularnaher Hauptteil, danach Hinweise, Anhang und fehlende Antragsangaben.
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
  'Dieses Dokument strukturiert Ihre Planung aus der App als Ausfüllhilfe für den echten Elterngeld-Antrag. Es ersetzt keine Formulare und kein Online-Portal. Die folgenden Angaben sind in einer formularnahen Reihenfolge dargestellt — in der Reihenfolge, in der sie im Antrag typischerweise benötigt werden. Anschließend folgen Hinweise zum Übertrag in den Antrag, der Anhang (Unterlagen, Fristen) und eine Übersicht fehlender Antragsangaben.';

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
    return `${base} Für Nordrhein-Westfalen orientiert sich die Gliederung an den dort üblichen Antragsunterlagen; es handelt sich nicht um ein behördliches Originalformular.`;
  }
  return base;
}

/** Hauptüberschrift für den durchgehenden formularnahen Teil (PDF/Vorschau). */
export const SECTION_A_TITLE = 'Ihre Angaben in Antragsreihenfolge';
export const SECTION_C_TITLE = 'C. So nutzen Sie diese Angaben im Antrag';
/** Rechtlicher Hinweis (früher E., nach Entfall des generischen „Fehlende Angaben“-Blocks als D.). */
export const SECTION_E_TITLE = 'D. Wichtiger Hinweis';
export const SECTION_ANHANG_TITLE = 'Anhang';

export const SUBSECTION_MONTHLY_SPLIT = 'Zum Bezug: monatliche Aufteilung (Ihre Planung in der App)';

export const MONTH_DISTRIBUTION_INTRO_LINES = [
  'Diese Übersicht zeigt der Reihe nach jeden Lebensmonat Ihres Kindes und welche Elternperson in der App für diesen Monat welche Leistungsart vorgesehen hat (Basiselterngeld, ElterngeldPlus oder Partnerschaftsbonus bzw. kein Bezug).',
  'Übernehmen Sie diese geplante Aufteilung im echten Antrag in den dafür vorgesehenen Angaben zum Elterngeld-Bezug.',
] as const;

export const MONTH_DISTRIBUTION_FOOTNOTE =
  'Hinweis: Wie genau Bezugsmonate in Papier- oder Online-Anträgen einzutragen sind, hängt von Vorgaben Ihres Bundeslandes ab; Person, Lebensmonat und Leistungsart aus der Liste bleiben Ihre Orientierung.';

export const SECTION_B_NO_DISTRIBUTION_HINT =
  'Es liegt keine monatsweise Detailaufteilung aus der App vor; der Überblick zu Bezug und Monatszahlen steht in den vorstehenden Angaben zum Bezug.';

export const SUBSECTION_CALCULATION = 'Zum Bezug: unverbindliche Schätzung (Orientierung)';

export const CALCULATION_UNAVAILABLE_TITLE = 'Keine belastbare Schätzung verfügbar.';
export const CALCULATION_UNAVAILABLE_BODY =
  'Die App konnte dazu keine Beträge berechnen – etwa weil Angaben fehlen oder die Prüfung in der App nicht erfolgreich war.';

/** Abschnitt C – kurze Blöcke (Reihenfolge für Vorschau und PDF). */
export const APPLICATION_FORM_SECTION_C_LINES = [
  'Bereiten Sie beim Ausfüllen Ihres Antrags folgende Angaben vor:',
  '1. Grundlagen',
  '• Angaben zu Kind und Eltern (in der formularnahen Übersicht oben)',
  '2. Einkommen',
  '• Einkommen vor der Geburt',
  '3. Bezug und Planung',
  '• Aufteilung der geplanten Monate und ggf. Schätzung (direkt im Anschluss an die Bezugsangaben)',
  'Übertragung in den Antrag',
  '• Übernehmen Sie die Angaben entsprechend Ihrer Planung in die vorgesehenen Felder',
  '• Falls im Antrag eine Monatsliste enthalten ist, orientieren Sie sich an der Reihenfolge Ihrer Planung in der App',
  'Hinweis',
  '• Die Beträge sind eine unverbindliche Schätzung',
  '• Die endgültige Prüfung erfolgt durch die Elterngeldstelle',
] as const;

/** Abschließende Übersicht am Dokumentende (PDF + Vorschau); Listenpositionen aus `ELTERNGELD_BASE_DOCUMENT_CHECKLIST`. */
export const SECTION_MISSING_FOR_APPLICATION_TITLE = 'Fehlende Angaben für den Antrag';

export const SECTION_MISSING_FOR_APPLICATION_INTRO_ANGABEN =
  'Folgende Angaben sind für den Antrag erforderlich, werden aber nicht in dieser Planung erfasst:';

export const SECTION_MISSING_FOR_APPLICATION_FURTHER_INTRO =
  'Weitere Angaben können je nach Situation erforderlich sein, z. B.:';

export const SECTION_MISSING_FOR_APPLICATION_FURTHER_ITEMS = [
  'Krankenkasse',
  'Angaben zum Arbeitgeber',
  'ggf. Angaben zum Mutterschaftsgeld',
] as const;

export const SECTION_MISSING_PLANNING_COVERED_TITLE = 'Bereits durch die Planung abgedeckt:';

export const SECTION_MISSING_PLANNING_COVERED_ITEMS = ['Einkommen', 'Bezugsmonate', 'Modellwahl'] as const;

export const SECTION_E_LINES = [
  'Dieses Dokument ist eine formularnahe Ausfüllhilfe und kein offizieller Antrag.',
  'Die Prüfung und Entscheidung erfolgt durch die Elterngeldstelle.',
  'Die endgültige Höhe des Elterngelds wird dort berechnet.',
  'Alle Angaben und Schätzwerte hier dienen nur zur Orientierung.',
] as const;

export const ANHANG_CHECKLIST_TITLE = 'Unterlagen-Checkliste';

export const ANHANG_CHECKLIST_INTRO =
  'Die folgende Liste nennt typische Unterlagen inklusive bundeslandspezifischer Ergänzungen. Steuer-ID und Bankverbindung fehlen bewusst hier — sie sind keine Unterlagen, sondern im Antrag einzutragende Angaben und werden nur im anschließenden Abschnitt „Fehlende Angaben für den Antrag“ aufgeführt.';

export const ANHANG_DEADLINES_TITLE = 'Fristen und Hinweise (aus der App)';
