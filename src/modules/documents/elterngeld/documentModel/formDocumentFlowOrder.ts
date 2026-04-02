/**
 * Lesereihenfolge des Hauptteils der Ausfüllhilfe (PDF/Vorschau) je Formularprofil.
 * Ableitung aus bestehender Profil-Struktur in buildElterngeldFormSections — keine neuen fachlichen Felder.
 */

import type { FormularProfil } from '../bundesland/formProfiles/formProfileTypes';

/** Stabile Schlüssel je Unterabschnitt; muss mit documentFlowKey in buildElterngeldFormSections übereinstimmen. */
export const DOCUMENT_FLOW_KEYS = {
  bundesland: 'bundesland',
  kind: 'kind',
  /** generic: Eltern-Stammdaten-Block */
  eltern: 'eltern',
  antragstellung: 'antragstellung',
  bezug: 'bezug',
  /** NRW/BW: erster Elternblock (1.2 inkl. Antragstellung, erste Person) */
  nrwPrimaryParent: 'nrw_primary_parent',
  /** NRW/BW: Formular-3-Auszug zweite Person */
  nrwSecondParent: 'nrw_second_parent',
  /** 1–13 / 16: Abschnitt 2 Eltern inkl. Wer stellt Antrag */
  elternBlock2: 'eltern_block_2',
  einkommenVorGeburt: 'einkommen_vor_geburt',
  elternzeitTeilzeit: 'elternzeit_teilzeit',
  /** Hessen: getrennt Antragstellung vor Eltern-Stamm */
  hessenAntragstellung: 'hessen_antragstellung',
  hessenElternStamm: 'hessen_eltern_stamm',
} as const;

export type DocumentFlowKey = (typeof DOCUMENT_FLOW_KEYS)[keyof typeof DOCUMENT_FLOW_KEYS];

/**
 * Reihenfolge der Formular-Unterabschnitte vor Monats-/Schätzungsblock.
 * Entspricht der logischen Abfolge der jeweiligen Formularfamilie im Code (s. buildElterngeldFormSections).
 */
export const PROFILE_FORM_SUBSECTION_FLOW_ORDER: Record<FormularProfil, readonly DocumentFlowKey[]> = {
  generic: [
    DOCUMENT_FLOW_KEYS.bundesland,
    DOCUMENT_FLOW_KEYS.kind,
    DOCUMENT_FLOW_KEYS.eltern,
    DOCUMENT_FLOW_KEYS.antragstellung,
    DOCUMENT_FLOW_KEYS.bezug,
  ],
  nrw_like: [
    DOCUMENT_FLOW_KEYS.bundesland,
    DOCUMENT_FLOW_KEYS.kind,
    DOCUMENT_FLOW_KEYS.nrwPrimaryParent,
    DOCUMENT_FLOW_KEYS.nrwSecondParent,
    DOCUMENT_FLOW_KEYS.bezug,
  ],
  one_to_thirteen: [
    DOCUMENT_FLOW_KEYS.bundesland,
    DOCUMENT_FLOW_KEYS.kind,
    DOCUMENT_FLOW_KEYS.elternBlock2,
    DOCUMENT_FLOW_KEYS.einkommenVorGeburt,
    DOCUMENT_FLOW_KEYS.elternzeitTeilzeit,
    DOCUMENT_FLOW_KEYS.bezug,
  ],
  sixteen: [
    DOCUMENT_FLOW_KEYS.bundesland,
    DOCUMENT_FLOW_KEYS.kind,
    DOCUMENT_FLOW_KEYS.elternBlock2,
    DOCUMENT_FLOW_KEYS.einkommenVorGeburt,
    DOCUMENT_FLOW_KEYS.elternzeitTeilzeit,
    DOCUMENT_FLOW_KEYS.bezug,
  ],
  hessen: [
    DOCUMENT_FLOW_KEYS.bundesland,
    DOCUMENT_FLOW_KEYS.kind,
    DOCUMENT_FLOW_KEYS.hessenAntragstellung,
    DOCUMENT_FLOW_KEYS.hessenElternStamm,
    DOCUMENT_FLOW_KEYS.einkommenVorGeburt,
    DOCUMENT_FLOW_KEYS.elternzeitTeilzeit,
    DOCUMENT_FLOW_KEYS.bezug,
  ],
};

export function getProfileFormSubsectionFlowOrder(profil: FormularProfil): readonly DocumentFlowKey[] {
  return PROFILE_FORM_SUBSECTION_FLOW_ORDER[profil];
}
