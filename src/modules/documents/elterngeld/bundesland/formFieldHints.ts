/**
 * Ausfüllhinweise für die Antrags-Ausfüllhilfe (nur Darstellung).
 * Ergänzen leere Felder; optional profilspezifisch via layout.hintOverrides (s. resolveFormFieldHint).
 */

import type { ElterngeldFormFieldId } from './elterngeldFormFieldIds';
import { getBundeslandFormSectionALayout } from './formLayout/bundeslandFormLayoutRegistry';

/** Hinweise für alle Formularfeld-IDs, die in Abschnitt A vorkommen können. */
export const GENERIC_FORM_FIELD_HINTS: Readonly<Record<ElterngeldFormFieldId, string>> = {
  state:
    'Trag im Antrag das Bundesland ein, bei dem du Elterngeld beantragst – entsprechend deiner Wohn- bzw. Zuständigkeitssituation.',
  childBirthDate: 'Trag im Antrag das Geburtsdatum deines Kindes ein, sobald das Kind geboren ist.',
  childExpectedBirthDate:
    'Trag im Antrag den voraussichtlichen Geburtstermin ein, solange noch kein Geburtsdatum feststeht.',
  childMultipleBirth: 'Gib im Antrag an, ob eine Mehrlingsgeburt vorliegt.',
  parentAName: 'Trag im Antrag Vor- und Nachname der ersten antragstellenden Person ein.',
  parentAEmployment:
    'Gib im Antrag die Beschäftigung der ersten Person vor der Geburt an (z. B. angestellt, selbstständig, ohne Erwerb).',
  parentAIncomeBeforeBirth:
    'Trag im Antrag das relevante Nettoeinkommen der ersten Person vor der Geburt ein (wie im Formular gefordert).',
  parentAPartTime:
    'Gib im Antrag an, ob die erste Person nach der Geburt in Teilzeit arbeiten möchte und mit wie vielen Wochenstunden.',
  parentBName: 'Trag im Antrag Vor- und Nachname der zweiten Person ein.',
  parentBEmployment:
    'Gib im Antrag die Beschäftigung der zweiten Person vor der Geburt an (z. B. angestellt, selbstständig, ohne Erwerb).',
  parentBIncomeBeforeBirth:
    'Trag im Antrag das relevante Nettoeinkommen der zweiten Person vor der Geburt ein (wie im Formular gefordert).',
  parentBPartTime:
    'Gib im Antrag an, ob die zweite Person nach der Geburt in Teilzeit arbeiten möchte und mit wie vielen Wochenstunden.',
  applicantConstellation:
    'Gib im Antrag an, wer Elterngeld beantragt (eine Person, beide Eltern oder alleinerziehend).',
  benefitModel:
    'Wähle bzw. trage im Antrag das gewünschte Elterngeld-Modell ein (z. B. Basiselterngeld oder ElterngeldPlus).',
  benefitMonthsA: 'Trag im Antrag ein, über wie viele Monate die erste Person Elterngeld beziehen möchte.',
  benefitMonthsB: 'Trag im Antrag ein, über wie viele Monate die zweite Person Elterngeld beziehen möchte.',
  partnershipBonus:
    'Gib im Antrag an, ob ihr den Partnerschaftsbonus nutzen möchtet (sofern das für euren Plan vorgesehen ist).',
};

export function resolveFormFieldHint(
  fieldId: ElterngeldFormFieldId,
  stateCode: string | undefined
): string | null {
  const layout = getBundeslandFormSectionALayout(stateCode);
  const o = layout?.hintOverrides?.[fieldId];
  if (o) return o;
  return GENERIC_FORM_FIELD_HINTS[fieldId] ?? null;
}
