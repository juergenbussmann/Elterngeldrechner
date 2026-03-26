import { describe, it, expect } from 'vitest';
import {
  filterOfficialDefsWithoutLabelCollision,
  getOfficialFormOnlyFieldDefs,
} from './officialFormOnlyFields';
import type { ElterngeldDocumentFormSubsection } from '../../documentModel/elterngeldDocumentFormTypes';

describe('officialFormOnlyFields', () => {
  it('filterOfficialDefsWithoutLabelCollision: kein zweites Feld mit gleicher Bezeichnung wie App-Feld', () => {
    const defs = getOfficialFormOnlyFieldDefs('generic');
    const mockApp: ElterngeldDocumentFormSubsection[] = [
      {
        subsectionTitle: 'Test',
        fields: [
          {
            source: 'app',
            id: 'state',
            label: 'Bankverbindung (IBAN)',
            value: '',
            empty: true,
            hint: null,
          },
        ],
      },
    ];
    const filtered = filterOfficialDefsWithoutLabelCollision(defs, mockApp);
    expect(filtered.find((d) => d.displayKey === 'official_bank_iban')).toBeUndefined();
    expect(filtered.find((d) => d.displayKey === 'official_tax_identification')).toBeDefined();
  });
});
