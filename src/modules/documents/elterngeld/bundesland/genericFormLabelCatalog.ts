/**
 * Generische Feldbezeichnungen = bisheriger Wortlaut in Ausfüllhilfe/PDF (eine Quelle).
 * Andere Bundesländer und NRW ohne spezifischen Override nutzen diese Texte.
 */

import type { ElterngeldFormFieldId } from './elterngeldFormFieldIds';

export const GENERIC_FORM_LABELS: Record<ElterngeldFormFieldId, string> = {
  state: 'Bundesland (laut Angaben)',
  childBirthDate: 'Geburtsdatum',
  childExpectedBirthDate: 'Voraussichtlicher Geburtstermin',
  childMultipleBirth: 'Mehrlingsgeburt',
  parentAName: 'Erste antragstellende Person – Name',
  parentAEmployment: 'Erste Person – Beschäftigung',
  parentAIncomeBeforeBirth: 'Erste Person – Nettoeinkommen vor der Geburt (Angabe aus der App)',
  parentAPartTime: 'Erste Person – geplante Teilzeit nach der Geburt / Wochenstunden',
  parentBName: 'Zweite Person – Name',
  parentBEmployment: 'Zweite Person – Beschäftigung',
  parentBIncomeBeforeBirth: 'Zweite Person – Nettoeinkommen vor der Geburt (Angabe aus der App)',
  parentBPartTime: 'Zweite Person – geplante Teilzeit nach der Geburt / Wochenstunden',
  applicantConstellation: 'Wer beantragt (laut App)',
  benefitModel: 'Gewähltes Modell',
  benefitMonthsA: 'Anzahl Bezugsmonate – erste Person (Angabe)',
  benefitMonthsB: 'Anzahl Bezugsmonate – zweite Person (Angabe)',
  partnershipBonus: 'Partnerschaftsbonus vorgesehen',
};
