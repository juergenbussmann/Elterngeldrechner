import type { FormProfileSubsectionGroup } from './formProfileTypes';
import {
  DEFAULT_FORM_SUBSECTION_ORDER,
  DEFAULT_FORM_SUBSECTION_TITLES,
} from '../formLayout/genericFormSectionADefaults';

/** Generische fünf Blöcke (bisherige App-Struktur), wenn kein spezifischeres Profil greift. */
export const GENERIC_FORM_PROFILE_SUBSECTION_GROUPS: readonly FormProfileSubsectionGroup[] =
  DEFAULT_FORM_SUBSECTION_ORDER.map((key) => ({
    displayTitle: DEFAULT_FORM_SUBSECTION_TITLES[key],
    keys: [key],
  }));
