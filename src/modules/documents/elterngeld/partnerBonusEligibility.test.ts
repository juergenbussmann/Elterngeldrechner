import { describe, it, expect } from 'vitest';
import { isPartnerBonusPartTimeHoursEligible } from './partnerBonusEligibility';
import { INITIAL_ELTERNGELD_APPLICATION } from './types/elterngeldTypes';

describe('isPartnerBonusPartTimeHoursEligible', () => {
  it('gibt bei single_applicant true zurück (kein Paar-Bonus-Kontext)', () => {
    expect(
      isPartnerBonusPartTimeHoursEligible({
        ...INITIAL_ELTERNGELD_APPLICATION,
        applicantMode: 'single_applicant',
      })
    ).toBe(true);
  });

  it('ist false bei both_parents, wenn eine Partei außerhalb 24–32 h liegt', () => {
    expect(
      isPartnerBonusPartTimeHoursEligible({
        ...INITIAL_ELTERNGELD_APPLICATION,
        applicantMode: 'both_parents',
        parentA: { ...INITIAL_ELTERNGELD_APPLICATION.parentA, hoursPerWeek: 40 },
        parentB: { ...INITIAL_ELTERNGELD_APPLICATION.parentA, hoursPerWeek: 28 },
      })
    ).toBe(false);
  });

  it('ist false bei both_parents, wenn Stunden fehlen', () => {
    expect(
      isPartnerBonusPartTimeHoursEligible({
        ...INITIAL_ELTERNGELD_APPLICATION,
        applicantMode: 'both_parents',
        parentA: { ...INITIAL_ELTERNGELD_APPLICATION.parentA, hoursPerWeek: undefined },
        parentB: { ...INITIAL_ELTERNGELD_APPLICATION.parentA, hoursPerWeek: 28 },
      })
    ).toBe(false);
  });

  it('ist true bei both_parents und 24–32 h für beide', () => {
    expect(
      isPartnerBonusPartTimeHoursEligible({
        ...INITIAL_ELTERNGELD_APPLICATION,
        applicantMode: 'both_parents',
        parentA: { ...INITIAL_ELTERNGELD_APPLICATION.parentA, hoursPerWeek: 24 },
        parentB: { ...INITIAL_ELTERNGELD_APPLICATION.parentA, hoursPerWeek: 32 },
      })
    ).toBe(true);
  });
});
