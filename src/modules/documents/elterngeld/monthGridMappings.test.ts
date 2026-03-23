/**
 * Test für das Mapping von concreteMonthDistribution zu MonthGridItems.
 * Belegter Fall: 1–4 Beide/Bonus, 5–24 nur Mutter/Plus (modeB fehlt).
 */

import { describe, it, expect } from 'vitest';
import { getMonthGridItemsFromValues } from './monthGridMappings';
import type { ElterngeldApplication } from './types/elterngeldTypes';

describe('getMonthGridItemsFromValues – concreteMonthDistribution', () => {
  it('1–4 Beide/Bonus, 5–24 Mutter/Plus wenn modeB für 5–24 fehlt', () => {
    const values: ElterngeldApplication = {
      state: '',
      applicantMode: 'both_parents',
      child: { birthDate: '2025-03-01', expectedBirthDate: '', multipleBirth: false },
      parentA: { firstName: '', lastName: '', employmentType: 'employed', incomeBeforeBirth: '1200', plannedPartTime: true },
      parentB: { firstName: '', lastName: '', employmentType: 'employed', incomeBeforeBirth: '3500', plannedPartTime: false },
      benefitPlan: {
        model: 'plus',
        parentAMonths: '24',
        parentBMonths: '4',
        partnershipBonus: true,
        concreteMonthDistribution: [
          { month: 1, modeA: 'partnerBonus', modeB: 'partnerBonus' },
          { month: 2, modeA: 'partnerBonus', modeB: 'partnerBonus' },
          { month: 3, modeA: 'partnerBonus', modeB: 'partnerBonus' },
          { month: 4, modeA: 'partnerBonus', modeB: 'partnerBonus' },
          ...Array.from({ length: 20 }, (_, i) => ({
            month: 5 + i,
            modeA: 'plus' as const,
            modeB: undefined as unknown as 'none',
          })),
        ],
      },
    };

    const items = getMonthGridItemsFromValues(values, 24);

    expect(items.length).toBe(24);
    for (let i = 0; i < 4; i++) {
      expect(items[i]).toEqual({ month: i + 1, state: 'both', label: 'Beide', subLabel: 'Bonus' });
    }
    for (let i = 4; i < 24; i++) {
      expect(items[i]).toEqual({ month: i + 1, state: 'mother', label: 'Mutter', subLabel: 'Plus' });
    }
  });
});
