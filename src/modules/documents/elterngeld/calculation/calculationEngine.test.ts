/**
 * Tests für die Elterngeld-Berechnungslogik.
 */

import { describe, it, expect } from 'vitest';
import {
  getReplacementRate,
  clamp,
  calculateSiblingBonus,
  calculateMonthlyElterngeld,
  calculatePlan,
} from './calculationEngine';
import type { ElterngeldCalculationPlan } from './types';

describe('getReplacementRate', () => {
  it('returns 0 for zero income', () => {
    expect(getReplacementRate(0)).toBe(0);
  });

  it('returns ~92% for 500 € (unter 1000: +0,1% pro 2€)', () => {
    expect(getReplacementRate(500)).toBe(0.92);
  });

  it('returns ~77% for 800 €', () => {
    expect(getReplacementRate(800)).toBe(0.77);
  });

  it('returns 67% for 1000-1200 €', () => {
    expect(getReplacementRate(1000)).toBe(0.67);
    expect(getReplacementRate(1100)).toBe(0.67);
    expect(getReplacementRate(1200)).toBe(0.67);
  });

  it('returns linear 67%→65% für 1200-1240 €', () => {
    expect(getReplacementRate(1201)).toBeCloseTo(0.6695, 2);
    expect(getReplacementRate(1240)).toBe(0.65);
  });

  it('returns 65% for income above 1240 €', () => {
    expect(getReplacementRate(1300)).toBe(0.65);
    expect(getReplacementRate(2000)).toBe(0.65);
  });
});

describe('clamp', () => {
  it('clamps value to min-max range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('calculateSiblingBonus', () => {
  it('returns 0 for zero amount', () => {
    expect(calculateSiblingBonus(0)).toBe(0);
  });

  it('returns at least 75 for small amounts', () => {
    expect(calculateSiblingBonus(500)).toBe(75);
  });

  it('returns 10% for larger amounts', () => {
    expect(calculateSiblingBonus(1000)).toBe(100);
  });
});

describe('calculateMonthlyElterngeld', () => {
  it('calculates basis correctly', () => {
    const out = calculateMonthlyElterngeld({
      type: 'basis',
      incomeBeforeNet: 2000,
      incomeDuringNet: 0,
      hoursPerWeek: 0,
      hasSiblingBonus: false,
      additionalChildren: 0,
    });
    expect(out.amount).toBeGreaterThanOrEqual(300);
    expect(out.amount).toBeLessThanOrEqual(1800);
  });

  it('adds sibling bonus when requested', () => {
    const without = calculateMonthlyElterngeld({
      type: 'basis',
      incomeBeforeNet: 2000,
      incomeDuringNet: 0,
      hoursPerWeek: 0,
      hasSiblingBonus: false,
      additionalChildren: 0,
    });
    const withBonus = calculateMonthlyElterngeld({
      type: 'basis',
      incomeBeforeNet: 2000,
      incomeDuringNet: 0,
      hoursPerWeek: 0,
      hasSiblingBonus: true,
      additionalChildren: 0,
    });
    expect(withBonus.amount).toBeGreaterThan(without.amount);
  });

  it('warns when hours > 32 for plus/partnerBonus', () => {
    const out = calculateMonthlyElterngeld({
      type: 'plus',
      incomeBeforeNet: 2000,
      incomeDuringNet: 500,
      hoursPerWeek: 35,
      hasSiblingBonus: false,
      additionalChildren: 0,
    });
    expect(out.warnings.length).toBeGreaterThan(0);
    expect(out.warnings.some((w) => w.includes('32'))).toBe(true);
  });

  describe('ElterngeldPlus mit Einkommen während Bezug', () => {
    it('Fall 1: incomeDuring=0 → Plus ≈ Hälfte des Basis', () => {
      const basis = calculateMonthlyElterngeld({
        type: 'basis',
        incomeBeforeNet: 2000,
        incomeDuringNet: 0,
        hoursPerWeek: 0,
        hasSiblingBonus: false,
        additionalChildren: 0,
      });
      const plus = calculateMonthlyElterngeld({
        type: 'plus',
        incomeBeforeNet: 2000,
        incomeDuringNet: 0,
        hoursPerWeek: 0,
        hasSiblingBonus: false,
        additionalChildren: 0,
      });
      expect(basis.amount).toBe(1300);
      expect(plus.amount).toBe(650);
      expect(plus.breakdown?.theoreticalBaseClamp).toBe(1300);
      expect(plus.breakdown?.maxPlus).toBe(650);
    });

    it('Fall 2: incomeDuring=1000 → Verlust 1000, Plus ≈ 335', () => {
      const plus = calculateMonthlyElterngeld({
        type: 'plus',
        incomeBeforeNet: 2000,
        incomeDuringNet: 1000,
        hoursPerWeek: 0,
        hasSiblingBonus: false,
        additionalChildren: 0,
      });
      expect(plus.breakdown?.loss).toBe(1000);
      expect(plus.amount).toBe(325);
    });

    it('Fall 3: incomeDuring=1900 → sehr geringer Verlust, Plus = Mindestbetrag 150', () => {
      const plus = calculateMonthlyElterngeld({
        type: 'plus',
        incomeBeforeNet: 2000,
        incomeDuringNet: 1900,
        hoursPerWeek: 0,
        hasSiblingBonus: false,
        additionalChildren: 0,
      });
      expect(plus.breakdown?.loss).toBe(100);
      expect(plus.amount).toBe(150);
      expect(plus.breakdown?.appliedMin).toBe(150);
    });
  });
});

describe('calculatePlan', () => {
  it('returns valid structure', () => {
    const plan: ElterngeldCalculationPlan = {
      childBirthDate: '2025-01-15',
      parents: [
        {
          id: 'p1',
          label: 'Sie',
          incomeBeforeNet: 2500,
          months: [
            { month: 1, mode: 'basis', incomeDuringNet: 0, hoursPerWeek: 0 },
            { month: 2, mode: 'basis', incomeDuringNet: 0, hoursPerWeek: 0 },
          ],
        },
      ],
      hasSiblingBonus: false,
      additionalChildren: 0,
    };
    const result = calculatePlan(plan);
    expect(result.parents).toHaveLength(1);
    expect(result.parents[0].monthlyResults).toHaveLength(2);
    expect(result.householdTotal).toBeGreaterThan(0);
    expect(result.meta.isEstimate).toBe(true);
    expect(result.meta.disclaimer).toContain('Unverbindliche Schätzung');
  });

  it('reports error when childBirthDate is missing', () => {
    const plan: ElterngeldCalculationPlan = {
      childBirthDate: '',
      parents: [
        {
          id: 'p1',
          label: 'Sie',
          incomeBeforeNet: 2500,
          months: [{ month: 1, mode: 'basis', incomeDuringNet: 0, hoursPerWeek: 0 }],
        },
      ],
      hasSiblingBonus: false,
      additionalChildren: 0,
    };
    const result = calculatePlan(plan);
    expect(result.validation.errors.length).toBeGreaterThan(0);
    expect(result.validation.errors.some((e) => e.includes('Geburtsdatum'))).toBe(true);
  });

  describe('Einkommensgrenze (zvE)', () => {
    it('Paar >175.000 € geschätztes Jahreseinkommen → kein Anspruch', () => {
      const plan: ElterngeldCalculationPlan = {
        childBirthDate: '2025-01-15',
        parents: [
          {
            id: 'p1',
            label: 'Sie',
            incomeBeforeNet: 10_000,
            months: [{ month: 1, mode: 'basis', incomeDuringNet: 0, hoursPerWeek: 0 }],
          },
          {
            id: 'p2',
            label: 'Partner',
            incomeBeforeNet: 5_500,
            months: [{ month: 1, mode: 'basis', incomeDuringNet: 0, hoursPerWeek: 0 }],
          },
        ],
        hasSiblingBonus: false,
        additionalChildren: 0,
      };
      const result = calculatePlan(plan);
      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors.some((e) => e.includes('zulässigen Grenze'))).toBe(true);
      expect(result.validation.errors.some((e) => e.includes('Paaren'))).toBe(true);
      expect(result.householdTotal).toBe(0);
    });

    it('Alleinerziehende/r >150.000 € geschätztes Jahreseinkommen → kein Anspruch', () => {
      const plan: ElterngeldCalculationPlan = {
        childBirthDate: '2025-01-15',
        parents: [
          {
            id: 'p1',
            label: 'Sie',
            incomeBeforeNet: 13_000,
            months: [{ month: 1, mode: 'basis', incomeDuringNet: 0, hoursPerWeek: 0 }],
          },
        ],
        hasSiblingBonus: false,
        additionalChildren: 0,
      };
      const result = calculatePlan(plan);
      expect(result.validation.isValid).toBe(false);
      expect(result.validation.errors.some((e) => e.includes('zulässigen Grenze'))).toBe(true);
      expect(result.validation.errors.some((e) => e.includes('Alleinerziehenden'))).toBe(true);
      expect(result.householdTotal).toBe(0);
    });

    it('Paar genau 175.000 € → Berechnung erfolgt (Grenze exklusiv)', () => {
      const plan: ElterngeldCalculationPlan = {
        childBirthDate: '2025-01-15',
        parents: [
          {
            id: 'p1',
            label: 'Sie',
            incomeBeforeNet: 7_291,
            months: [{ month: 1, mode: 'basis', incomeDuringNet: 0, hoursPerWeek: 0 }],
          },
          {
            id: 'p2',
            label: 'Partner',
            incomeBeforeNet: 7_292,
            months: [{ month: 1, mode: 'basis', incomeDuringNet: 0, hoursPerWeek: 0 }],
          },
        ],
        hasSiblingBonus: false,
        additionalChildren: 0,
      };
      const result = calculatePlan(plan);
      expect(result.validation.isValid).toBe(true);
      expect(result.householdTotal).toBeGreaterThan(0);
    });

    it('transparencyHints enthalten Jahresgrenze und Schätzungshinweis', () => {
      const plan: ElterngeldCalculationPlan = {
        childBirthDate: '2025-01-15',
        parents: [
          { id: 'p1', label: 'Sie', incomeBeforeNet: 2500, months: [{ month: 1, mode: 'basis', incomeDuringNet: 0, hoursPerWeek: 0 }] },
        ],
        hasSiblingBonus: false,
        additionalChildren: 0,
      };
      const result = calculatePlan(plan);
      expect(result.meta.transparencyHints).toBeDefined();
      expect(result.meta.transparencyHints!.some((h) => h.includes('175.000') && h.includes('150.000'))).toBe(true);
      expect(result.meta.transparencyHints!.some((h) => h.includes('Monatsangaben'))).toBe(true);
    });
  });
});
