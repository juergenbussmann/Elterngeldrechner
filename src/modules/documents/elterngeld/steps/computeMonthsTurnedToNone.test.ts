/**
 * Regressionscheck: Monatsraster wechselt nach Zähler-Anpassung zu „Kein Bezug“.
 */

import { describe, it, expect } from 'vitest';
import { getMonthGridItemsFromValues } from '../monthGridMappings';
import type { ElterngeldApplication } from '../types/elterngeldTypes';
import { INITIAL_ELTERNGELD_APPLICATION } from '../types/elterngeldTypes';

function computeMonthsTurnedToNone(
  beforeValues: ElterngeldApplication,
  afterValues: ElterngeldApplication,
  maxMonths: number
): number[] {
  const itemsBefore = getMonthGridItemsFromValues(beforeValues, maxMonths);
  const itemsAfter = getMonthGridItemsFromValues(afterValues, maxMonths);
  return itemsBefore
    .filter((row) => {
      const aft = itemsAfter.find((x) => x.month === row.month);
      return row.state !== 'none' && aft?.state === 'none';
    })
    .map((r) => r.month);
}

describe('computeMonthsTurnedToNone (Raster nach Bezugszähler)', () => {
  it('erkennt nachgelagerte Monate nach Verkürzen wie in assignMonth(none)', () => {
    const before: ElterngeldApplication = {
      ...INITIAL_ELTERNGELD_APPLICATION,
      applicantMode: 'both_parents',
      parentA: { ...INITIAL_ELTERNGELD_APPLICATION.parentA, incomeBeforeBirth: '2000' },
      parentB: { ...INITIAL_ELTERNGELD_APPLICATION.parentA, firstName: 'P', incomeBeforeBirth: '2000' },
      benefitPlan: {
        model: 'basis',
        parentAMonths: '8',
        parentBMonths: '8',
        partnershipBonus: false,
      },
    };
    const after: ElterngeldApplication = {
      ...before,
      benefitPlan: {
        ...before.benefitPlan,
        parentAMonths: '3',
        parentBMonths: String(Math.min(8, 4 - 1)),
        partnershipBonus: false,
      },
    };
    const maxMonths = 14;
    const turned = computeMonthsTurnedToNone(before, after, maxMonths);
    expect(turned.length).toBeGreaterThan(0);
    expect(turned.some((m) => m >= 5)).toBe(true);
  });
});
