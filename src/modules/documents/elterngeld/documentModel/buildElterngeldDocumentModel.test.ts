import { describe, it, expect } from 'vitest';
import { buildElterngeldDocumentModel, ELTERNGELD_BASE_DOCUMENT_CHECKLIST } from './buildElterngeldDocumentModel';
import { INITIAL_ELTERNGELD_APPLICATION } from '../types/elterngeldTypes';
import { ELTERNGELD_APPLICATION_PDF_OUTPUT_KIND } from './elterngeldOutputKindConstants';

describe('buildElterngeldDocumentModel', () => {
  it('maps state code to display name via Bundesland-Resolver', () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'NI',
    });
    expect(model.stateCode).toBe('NI');
    expect(model.stateDisplayName).toBe('Niedersachsen');
    expect(model.isKnownBundesland).toBe(true);
    expect(model.bundeslandTier).toBe('generic');
    expect(model.documentOutputKinds).toEqual([]);
  });

  it('NRW: bundeslandTier nrw und Kennzeichnung application_pdf', () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'NW',
    });
    expect(model.bundeslandTier).toBe('nrw');
    expect(model.documentOutputKinds).toContain(ELTERNGELD_APPLICATION_PDF_OUTPUT_KIND);
  });

  it('unbekannter Code: kein NRW-Fallback bei Ausgaben', () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'ZZ',
    });
    expect(model.isKnownBundesland).toBe(false);
    expect(model.bundeslandTier).toBe('generic');
    expect(model.documentOutputKinds).toEqual([]);
    expect(model.stateDisplayName).toBe('ZZ');
  });

  it('leeres Bundesland: wie Resolver, für Ausfüllhilfe erkennbar', () => {
    const model = buildElterngeldDocumentModel(INITIAL_ELTERNGELD_APPLICATION);
    expect(model.stateCode).toBe('');
    expect(model.stateDisplayName).toBe('–');
    expect(model.isKnownBundesland).toBe(false);
    expect(model.bundeslandTier).toBe('generic');
  });

  it('exposes applicant, child and benefitPlan from values', () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'BE',
      parentA: { ...INITIAL_ELTERNGELD_APPLICATION.parentA, firstName: 'Alex', lastName: 'Muster' },
      child: {
        ...INITIAL_ELTERNGELD_APPLICATION.child,
        birthDate: '2024-01-15',
        expectedBirthDate: '',
      },
      benefitPlan: {
        ...INITIAL_ELTERNGELD_APPLICATION.benefitPlan,
        model: 'plus',
        partnershipBonus: true,
      },
    });
    expect(model.parentA.firstName).toBe('Alex');
    expect(model.child.birthDate).toBe('2024-01-15');
    expect(model.benefitPlan.model).toBe('plus');
    expect(model.benefitPlan.partnershipBonus).toBe(true);
  });

  it('builds checklist from base list when state has no additionalDocumentHints', () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'HH',
    });
    expect(model.checklistItems).toEqual([...ELTERNGELD_BASE_DOCUMENT_CHECKLIST]);
  });

  it('includes deadlines from getElterngeldDeadlineInfo when birth data missing', () => {
    const model = buildElterngeldDocumentModel(INITIAL_ELTERNGELD_APPLICATION);
    expect(model.deadlines.noticeLevel).toBe('tip');
    expect(model.deadlines.noticeText).toContain('vorbereiten');
  });

  it('passes liveResult through for calculation snapshot when valid', () => {
    const liveResult = {
      parents: [
        { id: 'a', label: 'Elternteil A', monthlyResults: [], total: 1000, warnings: [] },
      ],
      householdTotal: 1000,
      validation: { isValid: true, errors: [], warnings: [] },
      meta: {
        isEstimate: true as const,
        disclaimer: 'Test',
      },
    };
    const model = buildElterngeldDocumentModel(INITIAL_ELTERNGELD_APPLICATION, liveResult);
    expect(model.calculation).not.toBeNull();
    expect(model.calculation?.householdTotal).toBe(1000);
    expect(model.calculation?.validationHasErrors).toBe(false);
  });

  it('setzt documentMonthDistribution für alle Lebensmonate (Count-Fallback)', () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'BE',
      benefitPlan: {
        ...INITIAL_ELTERNGELD_APPLICATION.benefitPlan,
        model: 'basis',
        parentAMonths: '6',
        parentBMonths: '0',
        partnershipBonus: false,
      },
    });
    expect(model.documentMonthDistribution).toHaveLength(14);
    expect(model.documentMonthDistribution[0]?.modeA).toBe('basis');
    expect(model.documentMonthDistribution[5]?.modeA).toBe('basis');
    expect(model.documentMonthDistribution[6]?.modeA).toBe('none');
  });

  it('omits calculation snapshot when liveResult has validation errors', () => {
    const liveResult = {
      parents: [],
      householdTotal: 0,
      validation: { isValid: false, errors: ['fehler'], warnings: [] },
      meta: {
        isEstimate: true as const,
        disclaimer: 'Test',
      },
    };
    const model = buildElterngeldDocumentModel(INITIAL_ELTERNGELD_APPLICATION, liveResult);
    expect(model.calculation).toBeNull();
  });
});
