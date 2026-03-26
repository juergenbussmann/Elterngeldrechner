/**
 * Landesspezifische Label-/Feldreihenfolge für Abschnitt A (Overrides zum generischen Katalog).
 * Formularfamilie nrw_like (NRW + BW) teilt sich ein Layout; keine NRW-Overrides für andere Profile.
 */

import type { BundeslandFormSectionALayout } from './bundeslandFormLayoutTypes';
import { getFormularProfil } from '../formProfiles/formProfileTypes';
import { NRW_FORM_SECTION_A_LAYOUT } from './states/nrwFormSectionALayout';
import { ONE_TO_THIRTEEN_FORM_SECTION_A_LAYOUT } from './states/oneToThirteenFormSectionALayout';

/** Zusätzliche Overrides pro ISO-Code, falls ein Land innerhalb einer Familie abweicht. */
const FORM_SECTION_A_LAYOUT_BY_STATE: Partial<
  Readonly<Record<string, BundeslandFormSectionALayout>>
> = {};

export function getBundeslandFormSectionALayout(
  stateCode: string | undefined
): BundeslandFormSectionALayout | undefined {
  const c = stateCode?.trim();
  if (!c) return undefined;
  const byState = FORM_SECTION_A_LAYOUT_BY_STATE[c];
  if (byState) return byState;
  const profil = getFormularProfil(c);
  if (profil === 'nrw_like') return NRW_FORM_SECTION_A_LAYOUT;
  if (profil === 'one_to_thirteen') return ONE_TO_THIRTEEN_FORM_SECTION_A_LAYOUT;
  return undefined;
}
