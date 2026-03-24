import { describe, it, expect } from 'vitest';
import { buildElterngeldDocumentModel, ELTERNGELD_BASE_DOCUMENT_CHECKLIST } from './buildElterngeldDocumentModel';
import { INITIAL_ELTERNGELD_APPLICATION } from '../types/elterngeldTypes';

describe('buildElterngeldDocumentModel', () => {
  it('maps state code to display name via GERMAN_STATES', () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'NI',
    });
    expect(model.stateCode).toBe('NI');
    expect(model.stateDisplayName).toBe('Niedersachsen');
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
