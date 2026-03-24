import { describe, it, expect } from 'vitest';
import { buildElterngeldSummaryPdf } from './buildElterngeldSummaryPdf';
import { INITIAL_ELTERNGELD_APPLICATION } from '../types/elterngeldTypes';

describe('buildElterngeldSummaryPdf', () => {
  it('erzeugt ein nicht-leeres PDF-Blob aus dem kanonischen Modell', async () => {
    const blob = buildElterngeldSummaryPdf({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'BY',
      parentA: { ...INITIAL_ELTERNGELD_APPLICATION.parentA, firstName: 'A', lastName: 'B' },
    });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(500);
    expect(blob.type).toBe('application/pdf');
  });
});
