/**
 * Formularfamilie one_to_thirteen (NI, RLP, ST, SH, HH, HB).
 * Label-Overrides nur wo die Profildoku die Vorlagenfrage benennt
 * (s. oneToThirteenFormProfileGroups.ts: Abschnitt „2. Angaben zu den Eltern“, u. a. „Wer stellt den Antrag?“).
 */

import type { BundeslandFormSectionALayout } from '../bundeslandFormLayoutTypes';

export const ONE_TO_THIRTEEN_FORM_SECTION_A_LAYOUT: BundeslandFormSectionALayout = {
  subsectionOrder: ['bundesland', 'kind', 'eltern', 'antragstellung', 'bezug'],
  labelOverrides: {
    applicantConstellation: 'Wer stellt den Antrag? (Angabe aus der App)',
  },
  hintOverrides: {
    applicantConstellation:
      'Trag im Antrag ein, wer den Antrag stellt – bei der Frage „Wer stellt den Antrag?“ im Abschnitt zu den Eltern.',
  },
};
