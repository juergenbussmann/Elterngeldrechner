import type { ElterngeldFormFieldId } from '../bundesland/elterngeldFormFieldIds';

/** Aus App/State befüllbare Felder (stabile `id` für Labels/Hints/Layout). */
export type AppBoundElterngeldDocumentFormField = {
  source: 'app';
  id: ElterngeldFormFieldId;
  label: string;
  value: string;
  empty: boolean;
  hint: string | null;
};

/**
 * Nur Darstellung: in den bekannten Elterngeld-Anträgen übliche Pflichtangaben ohne App-Mapping.
 * Kein Rückfluss in Wizard/State.
 */
export type OfficialFormOnlyElterngeldDocumentFormField = {
  source: 'official_form_only';
  displayKey: string;
  label: string;
  value: '';
  empty: true;
  hint: string;
};

export type ElterngeldDocumentFormField =
  | AppBoundElterngeldDocumentFormField
  | OfficialFormOnlyElterngeldDocumentFormField;

export function isAppBoundFormField(
  f: ElterngeldDocumentFormField
): f is AppBoundElterngeldDocumentFormField {
  return f.source === 'app';
}

export interface ElterngeldDocumentFormSubsection {
  subsectionTitle: string;
  fields: ElterngeldDocumentFormField[];
}

export interface ElterngeldDocumentFormSection {
  sectionCode: 'A';
  sectionHeading: string;
  subsections: ElterngeldDocumentFormSubsection[];
}
