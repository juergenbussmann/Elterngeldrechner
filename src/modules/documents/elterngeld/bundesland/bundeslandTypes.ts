/**
 * Gemeinsame Typen für Bundesland-Resolver (ohne Zirkelbezüge zu NRW-Config).
 */

export type BundeslandTier = 'generic' | 'nrw';

export interface BundeslandDocumentProfile {
  readonly tier: BundeslandTier;
  readonly additionalDocumentHints?: readonly string[];
  readonly stateNotes?: string;
  readonly applicationInfoUrl?: string;
  readonly supportsDigitalFlow?: boolean;
  readonly documentOutputKinds: readonly string[];
}
