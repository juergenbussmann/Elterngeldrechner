import { describe, it, expect } from 'vitest';
import {
  APPLICATION_FORM_INTRO_PARAGRAPH,
  getApplicationFormIntroParagraph,
} from './elterngeldApplicationFormLabels';
import type { ElterngeldDocumentModel } from '../documentModel/buildElterngeldDocumentModel';

function stubModel(partial: Partial<ElterngeldDocumentModel>): ElterngeldDocumentModel {
  return {
    stateCode: '',
    stateDisplayName: '–',
    isKnownBundesland: false,
    bundeslandTier: 'generic',
    applicantMode: 'single_applicant',
    parentA: {
      firstName: '',
      lastName: '',
      employmentType: 'employed',
      incomeBeforeBirth: '',
      plannedPartTime: false,
    },
    parentB: null,
    child: { birthDate: '', expectedBirthDate: '', multipleBirth: false },
    benefitPlan: {
      model: 'basis',
      parentAMonths: '',
      parentBMonths: '',
      partnershipBonus: false,
    },
    deadlines: { noticeLevel: 'tip', noticeText: '' },
    checklistItems: [],
    documentOutputKinds: [],
    stateNotes: undefined,
    calculation: null,
    documentMonthDistribution: [],
    formSections: [],
    ...partial,
  };
}

describe('getApplicationFormIntroParagraph', () => {
  it('BY: nur Basistext, kein Nordrhein-Westfalen', () => {
    const t = getApplicationFormIntroParagraph(
      stubModel({
        stateCode: 'BY',
        stateDisplayName: 'Bayern',
        isKnownBundesland: true,
        bundeslandTier: 'generic',
      })
    );
    expect(t).toBe(APPLICATION_FORM_INTRO_PARAGRAPH);
    expect(t).not.toMatch(/Nordrhein-Westfalen/i);
  });

  it('NW: NRW-Einordnung', () => {
    const t = getApplicationFormIntroParagraph(
      stubModel({
        stateCode: 'NW',
        stateDisplayName: 'Nordrhein-Westfalen',
        isKnownBundesland: true,
        bundeslandTier: 'nrw',
      })
    );
    expect(t).toContain('Nordrhein-Westfalen');
    expect(t).toContain(APPLICATION_FORM_INTRO_PARAGRAPH);
  });

  it('unbekannt: allgemeiner Hinweis, kein NRW', () => {
    const t = getApplicationFormIntroParagraph(
      stubModel({
        stateCode: 'ZZ',
        stateDisplayName: 'ZZ',
        isKnownBundesland: false,
        bundeslandTier: 'generic',
      })
    );
    expect(t).not.toMatch(/Nordrhein-Westfalen/i);
    expect(t.length).toBeGreaterThan(APPLICATION_FORM_INTRO_PARAGRAPH.length);
  });
});
