/**
 * Bundesland-Anzeige für den Wizard (Dropdown) — Angaben stammen aus germanStates;
 * bundeslandspezifische Extras kommen ausschließlich über resolveBundeslandForDocuments.
 */

import { GERMAN_BUNDESLAENDER } from './bundesland/germanStates';
import { resolveBundeslandForDocuments } from './bundesland/elterngeldBundeslandRegistry';

export interface StateConfig {
  stateCode: string;
  displayName: string;
  notes?: string;
  applicationInfoUrl?: string;
  supportsDigitalFlow?: boolean;
  additionalDocumentHints?: string[];
  documentOutputKinds?: string[];
}

export const GERMAN_STATES: StateConfig[] = GERMAN_BUNDESLAENDER.map((m) => {
  const r = resolveBundeslandForDocuments(m.stateCode);
  const out: StateConfig = {
    stateCode: m.stateCode,
    displayName: m.displayName,
  };
  if (r.additionalDocumentHints?.length) {
    out.additionalDocumentHints = [...r.additionalDocumentHints];
  }
  if (r.stateNotes) out.notes = r.stateNotes;
  if (r.applicationInfoUrl) out.applicationInfoUrl = r.applicationInfoUrl;
  if (r.supportsDigitalFlow) out.supportsDigitalFlow = r.supportsDigitalFlow;
  if (r.documentOutputKinds.length) {
    out.documentOutputKinds = [...r.documentOutputKinds];
  }
  return out;
});
