import type { FormProfileSubsectionGroup } from './formProfileTypes';

/**
 * 16-Abschnitte-Variante (Berlin, Sachsen): gleiche App-Blöcke wie 1–13, aber Planung laut PDF unter Abschnitt 11
 * („11. Planung der Elterngeld-Monate“ — Freistaat Sachsen Antragsversion 04/2024 / Berlin bundeseinheitlich ab 01.04.2024).
 */
export const SIXTEEN_FORM_PROFILE_SUBSECTION_GROUPS: readonly FormProfileSubsectionGroup[] = [
  { displayTitle: 'Bundesland', keys: ['bundesland'] },
  { displayTitle: '1. Angaben zum Kind', keys: ['kind'] },
  { displayTitle: '2. Angaben zu den Eltern', keys: ['eltern', 'antragstellung'] },
  { displayTitle: '11. Planung der Elterngeld-Monate', keys: ['bezug'] },
] as const;
