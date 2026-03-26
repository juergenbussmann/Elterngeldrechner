/**
 * Zusätzliche Darstellungsfelder für Abschnitt A (keine App-IDs, kein State).
 * Basis: dieselbe belastbare Erwartungslage wie ELTERNGELD_BASE_DOCUMENT_CHECKLIST
 * (Steuer-ID, Bankverbindung) in buildElterngeldDocumentModel — typische Elterngeldanträge.
 * Erweiterung nur mit belastbarer Quelle; bei Profilen zunächst gemeinsame Minimalmenge.
 */

import type { FormularProfil } from './formProfileTypes';
import type { OfficialFormOnlyElterngeldDocumentFormField } from '../../documentModel/elterngeldDocumentFormTypes';
import type { AppBoundElterngeldDocumentFormField } from '../../documentModel/elterngeldDocumentFormTypes';
import { isAppBoundFormField } from '../../documentModel/elterngeldDocumentFormTypes';
import type { ElterngeldDocumentFormSubsection } from '../../documentModel/elterngeldDocumentFormTypes';

export const SUBSECTION_TITLE_OFFICIAL_FORM_ONLY_FIELDS =
  'Weitere Angaben im Antragsformular (ohne App-Erfassung)';

export type OfficialFormOnlyFieldDef = {
  readonly displayKey: string;
  readonly label: string;
  readonly hint: string;
};

/** Gemeinsame, checklistengeführte Zusatzfelder — für alle Formularprofilfamilien. */
const OFFICIAL_EXTRAS_ALL_PROFILES: readonly OfficialFormOnlyFieldDef[] = [
  {
    displayKey: 'official_bank_iban',
    label: 'Bankverbindung (IBAN)',
    hint: 'Hier gehört deine Bankverbindung hinein (IBAN und Kontoinhaber wie im Antrag gefordert).',
  },
  {
    displayKey: 'official_tax_identification',
    label: 'Steuer-Identifikationsnummer',
    hint: 'Trage hier deine Steuer-Identifikationsnummer ein (elfstellig, wie im Antragsformular).',
  },
] as const;

/**
 * Profilspezifische Erweiterungen möglich; derzeit identische Liste (checklistengeführt).
 */
export function getOfficialFormOnlyFieldDefs(profil: FormularProfil): readonly OfficialFormOnlyFieldDef[] {
  switch (profil) {
    case 'nrw_like':
    case 'one_to_thirteen':
    case 'sixteen':
    case 'hessen':
    case 'generic':
    default:
      return OFFICIAL_EXTRAS_ALL_PROFILES;
  }
}

export function toOfficialFormOnlyDocumentField(
  def: OfficialFormOnlyFieldDef
): OfficialFormOnlyElterngeldDocumentFormField {
  return {
    source: 'official_form_only',
    displayKey: def.displayKey,
    label: def.label,
    value: '',
    empty: true,
    hint: def.hint,
  };
}

function collectAppBoundFields(sections: ElterngeldDocumentFormSubsection[]): AppBoundElterngeldDocumentFormField[] {
  const out: AppBoundElterngeldDocumentFormField[] = [];
  for (const s of sections) {
    for (const f of s.fields) {
      if (isAppBoundFormField(f)) out.push(f);
    }
  }
  return out;
}

/** Kein doppeltes Label neben einem App-Feld (gleiche sichtbare Bezeichnung). */
export function filterOfficialDefsWithoutLabelCollision(
  defs: readonly OfficialFormOnlyFieldDef[],
  appSections: ElterngeldDocumentFormSubsection[]
): OfficialFormOnlyFieldDef[] {
  const appLabels = new Set(
    collectAppBoundFields(appSections).map((f) => f.label.trim().toLowerCase())
  );
  return defs.filter((d) => !appLabels.has(d.label.trim().toLowerCase()));
}

export function buildOfficialFormOnlySubsection(profil: FormularProfil, appSectionsSoFar: ElterngeldDocumentFormSubsection[]): ElterngeldDocumentFormSubsection | null {
  const defs = filterOfficialDefsWithoutLabelCollision(getOfficialFormOnlyFieldDefs(profil), appSectionsSoFar);
  if (!defs.length) return null;
  return {
    subsectionTitle: SUBSECTION_TITLE_OFFICIAL_FORM_ONLY_FIELDS,
    fields: defs.map(toOfficialFormOnlyDocumentField),
  };
}
