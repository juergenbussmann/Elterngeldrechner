import type { FormProfileSubsectionGroup } from './formProfileTypes';

/**
 * Dreiformular (NRW, BW) — Formular 1, Unterpunkte aus NRW-PDF „Stand Mai 2025“ (1.1–1.3).
 * Formulare 2/3 betreffen elterntrennende Detailfragen; die App liefert dafür keine weiteren Felder in Abschnitt A.
 */
export const NRW_LIKE_FORM_PROFILE_SUBSECTION_GROUPS: readonly FormProfileSubsectionGroup[] = [
  { displayTitle: 'Bundesland', keys: ['bundesland'] },
  {
    displayTitle: '1.1 Angaben zum Kind, für das Elterngeld beantragt wird',
    keys: ['kind'],
  },
  {
    displayTitle: '1.2 Angaben zu beiden Elternteilen',
    keys: ['eltern', 'antragstellung'],
  },
  {
    displayTitle: '1.3 Angabe der Monate, für die Elterngeld beantragt wird (Bezugszeitraum)',
    keys: ['bezug'],
  },
] as const;
