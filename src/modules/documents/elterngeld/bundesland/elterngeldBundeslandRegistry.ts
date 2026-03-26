/**
 * Zentrale Auflösung des Bundeslandes für Dokumentenmodell, PDF und Ausfüllhilfe.
 * Unbekannte Codes: generisches Profil — niemals NRW-Extras oder NRW-Titel.
 */

import type { BundeslandDocumentProfile, BundeslandTier } from './bundeslandTypes';
import { GERMAN_BUNDESLAENDER } from './germanStates';
import { NRW_DOCUMENT_PROFILE } from './nrwBundeslandConfig';

export type { BundeslandDocumentProfile, BundeslandTier };

const GENERIC_DOCUMENT_PROFILE: BundeslandDocumentProfile = {
  tier: 'generic',
  documentOutputKinds: [],
};

function documentProfileForKnownCode(stateCode: string): BundeslandDocumentProfile {
  if (stateCode === 'NW') return NRW_DOCUMENT_PROFILE;
  return GENERIC_DOCUMENT_PROFILE;
}

export interface ResolvedBundeslandForDocuments extends BundeslandDocumentProfile {
  stateCode: string;
  displayName: string;
  isKnownBundesland: boolean;
}

export function resolveBundeslandForDocuments(raw: string | undefined): ResolvedBundeslandForDocuments {
  const input = raw?.trim() ?? '';
  if (!input) {
    return {
      stateCode: '',
      displayName: '–',
      isKnownBundesland: false,
      ...GENERIC_DOCUMENT_PROFILE,
      documentOutputKinds: [],
    };
  }

  const meta = GERMAN_BUNDESLAENDER.find((s) => s.stateCode === input);

  if (!meta) {
    return {
      stateCode: input,
      displayName: input,
      isKnownBundesland: false,
      ...GENERIC_DOCUMENT_PROFILE,
      documentOutputKinds: [],
    };
  }

  const profile = documentProfileForKnownCode(meta.stateCode);

  return {
    stateCode: meta.stateCode,
    displayName: meta.displayName,
    isKnownBundesland: true,
    tier: profile.tier,
    additionalDocumentHints: profile.additionalDocumentHints,
    stateNotes: profile.stateNotes,
    applicationInfoUrl: profile.applicationInfoUrl,
    supportsDigitalFlow: profile.supportsDigitalFlow,
    documentOutputKinds: profile.documentOutputKinds,
  };
}
