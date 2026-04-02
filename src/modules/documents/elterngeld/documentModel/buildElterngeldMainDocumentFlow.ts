/**
 * Hauptteil der Ausfüllhilfe in Lesereihenfolge: Formularblöcke, dann Monate/Schätzung, dann Platzhalter Bank/Steuer.
 */

import type { FormularProfil } from '../bundesland/formProfiles/formProfileTypes';
import type { ElterngeldDocumentFormSubsection } from './elterngeldDocumentFormTypes';
import { DOCUMENT_FLOW_KEYS, getProfileFormSubsectionFlowOrder } from './formDocumentFlowOrder';

export type ElterngeldMainDocumentBlock =
  | { kind: 'form_subsection'; subsection: ElterngeldDocumentFormSubsection }
  | { kind: 'month_distribution' }
  | { kind: 'calculation' }
  | { kind: 'official_form_only'; subsection: ElterngeldDocumentFormSubsection };

export function sortAppSubsectionsByProfile(
  subsections: ElterngeldDocumentFormSubsection[],
  profil: FormularProfil
): ElterngeldDocumentFormSubsection[] {
  const order = getProfileFormSubsectionFlowOrder(profil);
  return [...subsections].sort((a, b) => {
    const ka = a.documentFlowKey ?? '';
    const kb = b.documentFlowKey ?? '';
    const ia = order.indexOf(ka as (typeof order)[number]);
    const ib = order.indexOf(kb as (typeof order)[number]);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
}

export function buildMainDocumentFlow(
  appSubsectionsSorted: ElterngeldDocumentFormSubsection[],
  officialSubsection: ElterngeldDocumentFormSubsection | null,
  options: { hasCalculation: boolean }
): ElterngeldMainDocumentBlock[] {
  const blocks: ElterngeldMainDocumentBlock[] = [];
  let insertedAfterBezug = false;

  for (const subsection of appSubsectionsSorted) {
    blocks.push({ kind: 'form_subsection', subsection });
    if (subsection.documentFlowKey === DOCUMENT_FLOW_KEYS.bezug) {
      blocks.push({ kind: 'month_distribution' });
      if (options.hasCalculation) blocks.push({ kind: 'calculation' });
      insertedAfterBezug = true;
    }
  }

  if (!insertedAfterBezug) {
    blocks.push({ kind: 'month_distribution' });
    if (options.hasCalculation) blocks.push({ kind: 'calculation' });
  }

  if (officialSubsection) {
    blocks.push({ kind: 'official_form_only', subsection: officialSubsection });
  }

  return blocks;
}
