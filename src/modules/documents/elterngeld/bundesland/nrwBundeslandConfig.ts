/**
 * Landesspezifische Dokumenten-/Ausgabe-Konfiguration nur für Nordrhein-Westfalen.
 * Keine Inhalte für andere Bundesländer hier ableiten — Resolver nutzt generisch.
 */

import { ELTERNGELD_APPLICATION_PDF_OUTPUT_KIND } from '../documentModel/elterngeldOutputKindConstants';
import type { BundeslandDocumentProfile } from './bundeslandTypes';

export const NRW_DOCUMENT_PROFILE: BundeslandDocumentProfile = {
  tier: 'nrw',
  documentOutputKinds: [ELTERNGELD_APPLICATION_PDF_OUTPUT_KIND],
};
