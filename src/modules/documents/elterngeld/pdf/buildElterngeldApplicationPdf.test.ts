import { describe, it, expect } from 'vitest';
import { buildElterngeldApplicationPdf } from './buildElterngeldApplicationPdf';
import { buildElterngeldDocumentModel } from '../documentModel/buildElterngeldDocumentModel';
import { INITIAL_ELTERNGELD_APPLICATION } from '../types/elterngeldTypes';

describe('buildElterngeldApplicationPdf', () => {
  it('erzeugt ein PDF-Blob aus dem Dokumentenmodell', () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'NW',
      parentA: {
        ...INITIAL_ELTERNGELD_APPLICATION.parentA,
        firstName: 'Test',
        lastName: 'Person',
        incomeBeforeBirth: '2500',
      },
      child: {
        ...INITIAL_ELTERNGELD_APPLICATION.child,
        birthDate: '2024-06-01',
        expectedBirthDate: '',
        multipleBirth: false,
      },
    });
    const blob = buildElterngeldApplicationPdf(model);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(800);
    expect(blob.type).toBe('application/pdf');
  });
});
