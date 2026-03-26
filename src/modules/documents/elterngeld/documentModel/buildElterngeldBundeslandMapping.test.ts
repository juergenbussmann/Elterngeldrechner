import { describe, it, expect, vi } from 'vitest';

vi.mock('../bundesland/elterngeldBundeslandRegistry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../bundesland/elterngeldBundeslandRegistry')>();
  return {
    ...actual,
    resolveBundeslandForDocuments: (raw: string | undefined) => {
      if (raw === 'Z9') {
        return {
          stateCode: 'Z9',
          displayName: 'Testbundesland',
          isKnownBundesland: true,
          tier: 'generic' as const,
          additionalDocumentHints: ['Zusatznachweis laut Land'],
          stateNotes: 'Hinweis nur für Tests.',
          documentOutputKinds: ['landesformular'],
        };
      }
      return actual.resolveBundeslandForDocuments(raw);
    },
  };
});

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
