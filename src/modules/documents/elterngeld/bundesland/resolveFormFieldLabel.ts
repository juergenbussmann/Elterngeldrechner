import type { ElterngeldFormFieldId } from './elterngeldFormFieldIds';
import { GENERIC_FORM_LABELS } from './genericFormLabelCatalog';
import { getBundeslandFormSectionALayout } from './formLayout/bundeslandFormLayoutRegistry';

/**
 * Aufgelöste Formularfeld-Bezeichnung für Ausfüllhilfe/PDF.
 * Overrides aus Registry (Formularfamilie nrw_like: NRW + BW); sonst generischer Katalog.
 */
export function resolveFormFieldLabel(
  fieldId: ElterngeldFormFieldId,
  stateCode: string | undefined
): string {
  const layout = getBundeslandFormSectionALayout(stateCode);
  const o = layout?.labelOverrides?.[fieldId];
  if (o) return o;
  return GENERIC_FORM_LABELS[fieldId];
}
