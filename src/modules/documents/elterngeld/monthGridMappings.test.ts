/**
 * Test für das Mapping von concreteMonthDistribution zu MonthGridItems.
 * Belegter Fall: 1–4 Beide/Bonus, 5–24 nur Mutter/Plus (modeB fehlt).
 */

import { describe, it, expect } from 'vitest';
import {
  getExpandedMonthDistribution,
  getMonthGridItemsFromValues,
  resolveDocumentMonthDistribution,
} from './monthGridMappings';
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

describe('getExpandedMonthDistribution', () => {
  it('expandiert kurze concreteMonthDistribution auf maxMonths mit none für Lücken', () => {
    const values: ElterngeldApplication = {
      state: '',
      applicantMode: 'single_applicant',
      child: { birthDate: '', expectedBirthDate: '', multipleBirth: false },
      parentA: {
        firstName: '',
        lastName: '',
        employmentType: 'employed',
        incomeBeforeBirth: '',
        plannedPartTime: false,
      },
      parentB: null,
      benefitPlan: {
        model: 'plus',
        parentAMonths: '2',
        parentBMonths: '',
        partnershipBonus: false,
        concreteMonthDistribution: [
          { month: 1, modeA: 'plus', modeB: 'none' },
          { month: 2, modeA: 'plus', modeB: 'none' },
        ],
      },
    };
    const d = getExpandedMonthDistribution(values, 5);
    expect(d).toHaveLength(5);
    expect(d[0]?.modeA).toBe('plus');
    expect(d[1]?.modeA).toBe('plus');
    expect(d[2]?.modeA).toBe('none');
    expect(d[4]?.month).toBe(5);
  });

  it('ohne Distribution: gleiche Logik wie Count-Fallback', () => {
    const values: ElterngeldApplication = {
      state: '',
      applicantMode: 'single_applicant',
      child: { birthDate: '', expectedBirthDate: '', multipleBirth: false },
      parentA: {
        firstName: '',
        lastName: '',
        employmentType: 'employed',
        incomeBeforeBirth: '',
        plannedPartTime: false,
      },
      parentB: null,
      benefitPlan: {
        model: 'basis',
        parentAMonths: '2',
        parentBMonths: '',
        partnershipBonus: false,
      },
    };
    const d = getExpandedMonthDistribution(values, 14);
    expect(d[0]?.modeA).toBe('basis');
    expect(d[1]?.modeA).toBe('basis');
    expect(d[2]?.modeA).toBe('none');
  });
});

describe('resolveDocumentMonthDistribution', () => {
  it('nutzt concreteMonthDistribution wenn gesetzt', () => {
    const values: ElterngeldApplication = {
      state: '',
      applicantMode: 'both_parents',
      child: { birthDate: '2025-03-01', expectedBirthDate: '', multipleBirth: false },
      parentA: {
        firstName: '',
        lastName: '',
        employmentType: 'employed',
        incomeBeforeBirth: '',
        plannedPartTime: false,
      },
      parentB: {
        firstName: '',
        lastName: '',
        employmentType: 'employed',
        incomeBeforeBirth: '',
        plannedPartTime: false,
      },
      benefitPlan: {
        model: 'plus',
        parentAMonths: '24',
        parentBMonths: '4',
        partnershipBonus: true,
        concreteMonthDistribution: [
          { month: 1, modeA: 'partnerBonus', modeB: 'partnerBonus' },
          { month: 2, modeA: 'plus', modeB: 'none' },
        ],
      },
    };
    const d = resolveDocumentMonthDistribution(values, null, 24);
    expect(d[0]).toEqual({ month: 1, modeA: 'partnerBonus', modeB: 'partnerBonus' });
    expect(d[1]).toEqual({ month: 2, modeA: 'plus', modeB: 'none' });
    expect(d[2]).toEqual({ month: 3, modeA: 'none', modeB: 'none' });
  });

  it('Count-Fallback: erste Person Monate 1–3 Basis bei Modell basis', () => {
    const values: ElterngeldApplication = {
      state: '',
      applicantMode: 'single_applicant',
      child: { birthDate: '', expectedBirthDate: '', multipleBirth: false },
      parentA: {
        firstName: '',
        lastName: '',
        employmentType: 'employed',
        incomeBeforeBirth: '',
        plannedPartTime: false,
      },
      parentB: null,
      benefitPlan: {
        model: 'basis',
        parentAMonths: '3',
        parentBMonths: '',
        partnershipBonus: false,
      },
    };
    const d = resolveDocumentMonthDistribution(values, null, 14);
    expect(d.slice(0, 3).every((e) => e.modeA === 'basis')).toBe(true);
    expect(d[3]?.modeA).toBe('none');
  });
});
