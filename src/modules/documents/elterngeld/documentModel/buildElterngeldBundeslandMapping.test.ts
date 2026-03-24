import { describe, it, expect, vi } from 'vitest';

vi.mock('../stateConfig', () => ({
  GERMAN_STATES: [
    {
      stateCode: 'Z9',
      displayName: 'Testbundesland',
      additionalDocumentHints: ['Zusatznachweis laut Land'],
      documentOutputKinds: ['landesformular'],
      notes: 'Hinweis nur für Tests.',
    },
  ],
}));

import { buildElterngeldDocumentModel } from './buildElterngeldDocumentModel';
import { INITIAL_ELTERNGELD_APPLICATION } from '../types/elterngeldTypes';

describe('buildElterngeldDocumentModel Bundesland-Mapping', () => {
  it('merges additionalDocumentHints and exposes documentOutputKinds', () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'Z9',
    });
    expect(model.checklistItems).toContain('Zusatznachweis laut Land');
    expect(model.checklistItems[0]).toBe('Geburtsurkunde');
    expect(model.documentOutputKinds).toEqual(['landesformular']);
    expect(model.stateNotes).toBe('Hinweis nur für Tests.');
  });
});
