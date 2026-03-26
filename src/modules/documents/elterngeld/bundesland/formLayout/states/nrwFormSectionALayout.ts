/**
 * Formularfamilie nrw_like (NRW + BW) – Label-Overrides für Kind-Felder.
 * Bezug: u. a. Familienportal NRW „Antragsformular BEEG NRW Stand Mai 2025“ (Formular 1).
 */

import type { BundeslandFormSectionALayout } from '../bundeslandFormLayoutTypes';

export const NRW_FORM_SECTION_A_LAYOUT: BundeslandFormSectionALayout = {
  source: {
    title: 'Antragsformular BEEG NRW (Formular 1, Auszug)',
    url: 'https://www.familienportal.nrw/sites/default/files/2025-03/Antragsformular%20BEEG%20NRW%20Stand%20Mai%202025.pdf',
  },
  subsectionOrder: ['bundesland', 'kind', 'eltern', 'antragstellung', 'bezug'],
  labelOverrides: {
    childBirthDate: 'Geburtsdatum des Kindes',
    childExpectedBirthDate: 'Voraussichtlicher Tag der Entbindung',
  },
  hintOverrides: {
    childBirthDate: 'Trag im Antrag das Geburtsdatum des Kindes ein (sofern das Kind bereits geboren ist).',
    childExpectedBirthDate:
      'Trag im Antrag den voraussichtlichen Tag der Entbindung ein, wenn noch kein Geburtsdatum feststeht.',
  },
};
