import type { FormProfileSubsectionGroup } from './formProfileTypes';

/**
 * Einheitlicher 1–13-Antrag (NI, RLP, ST, SH, HH, HB): Abschnittstitel aus verifiziertem PDF-Text
 * (v. a. MS Niedersachsen / RLP MFFKI / gleiche Fassung „Antragsversion August 2025“).
 * Nur die von der App befüllbaren Blöcke; „Bundesland“ ist kein amtlich nummerierter Abschnitt.
 * Antragsteller-Konstellation im Original zu „2. Angaben zu den Eltern“ (z. B. „Wer stellt den Antrag?“) — hier zusammengefasst.
 */
export const ONE_TO_THIRTEEN_FORM_PROFILE_SUBSECTION_GROUPS: readonly FormProfileSubsectionGroup[] = [
  { displayTitle: 'Bundesland', keys: ['bundesland'] },
  { displayTitle: '1. Angaben zum Kind', keys: ['kind'] },
  { displayTitle: '2. Angaben zu den Eltern', keys: ['eltern', 'antragstellung'] },
  { displayTitle: '10. Planung der Elterngeld-Monate', keys: ['bezug'] },
] as const;
