/**
 * Darstellung der Planänderungen: jeder geänderte Monat muss genau einmal vorkommen.
 */

import { describe, it, expect } from 'vitest';
import type { CalculationResult, MonthMode } from '../calculation';
import { getResultChangePreviewUserFriendly } from './StepCalculationResult';

function twoParentResult(
  monthModesA: Record<number, MonthMode>,
  monthModesB: Record<number, MonthMode>
): CalculationResult {
  const build = (id: string, label: string, monthModes: Record<number, MonthMode>) => ({
    id,
    label,
    monthlyResults: Object.keys(monthModes)
      .map((k) => {
        const month = Number(k);
        const mode = monthModes[month];
        return {
          month,
          mode,
          amount: mode === 'none' ? 0 : 100,
          warnings: [] as string[],
        };
      })
      .sort((a, b) => a.month - b.month),
    total: 1000,
    warnings: [] as string[],
  });
  return {
    parents: [build('a', 'Mutter', monthModesA), build('b', 'Partner', monthModesB)],
    householdTotal: 2000,
    validation: { isValid: true, errors: [], warnings: [] },
    meta: { isEstimate: true as const, disclaimer: '' },
  };
}

function singleParentResult(monthModes: Record<number, MonthMode>): CalculationResult {
  const monthlyResults = Object.keys(monthModes)
    .map((k) => {
      const month = Number(k);
      const mode = monthModes[month];
      return {
        month,
        mode,
        amount: mode === 'none' ? 0 : 100,
        warnings: [] as string[],
      };
    })
    .sort((a, b) => a.month - b.month);
  return {
    parents: [{ id: 'a', label: 'Mutter', monthlyResults, total: 1000, warnings: [] }],
    householdTotal: 1000,
    validation: { isValid: true, errors: [], warnings: [] },
    meta: { isEstimate: true as const, disclaimer: '' },
  };
}

describe('getResultChangePreviewUserFriendly', () => {
  it('füllt Lücken in der Monatsliste: fehlender LM zwischen zwei Bereichen wird verglichen und angezeigt', () => {
    const cur: Record<number, MonthMode> = {};
    for (let m = 14; m <= 24; m++) cur[m] = 'basis';
    const opt: Record<number, MonthMode> = {};
    for (let m = 14; m <= 17; m++) opt[m] = 'plus';
    for (let m = 19; m <= 24; m++) opt[m] = 'plus';

    const lines = getResultChangePreviewUserFriendly(singleParentResult(cur), singleParentResult(opt), 50);
    const text = lines.join('\n');
    expect(text).toMatch(/Monat 18\b/);
  });

  it('trennt einen abweichenden Monat zwischen zwei gleichen Bereichen (kein Verschwinden)', () => {
    const cur: Record<number, MonthMode> = {};
    for (let m = 14; m <= 24; m++) cur[m] = 'basis';
    cur[18] = 'plus';
    const opt: Record<number, MonthMode> = {};
    for (let m = 14; m <= 17; m++) opt[m] = 'plus';
    for (let m = 19; m <= 24; m++) opt[m] = 'plus';

    const lines = getResultChangePreviewUserFriendly(singleParentResult(cur), singleParentResult(opt), 50);
    const text = lines.join('\n');
    expect(text).toMatch(/Monat 18\b/);
    expect(text).toMatch(/Monat 14/);
    expect(text).toMatch(/Monat 19/);
  });

  it('fasst einen vollständig zusammenhängenden Bereich ohne innere Lücke zusammen', () => {
    const cur: Record<number, MonthMode> = {};
    for (let m = 10; m <= 12; m++) cur[m] = 'basis';
    const opt: Record<number, MonthMode> = {};
    for (let m = 10; m <= 12; m++) opt[m] = 'plus';

    const lines = getResultChangePreviewUserFriendly(singleParentResult(cur), singleParentResult(opt), 50);
    expect(lines.length).toBe(1);
    expect(lines[0]).toMatch(/Monat 10–12/);
  });

  it('formuliert Übergang zum Partnerschaftsbonus in zwei Zeilen (Monat + Voraussetzung ElterngeldPlus)', () => {
    const cur = twoParentResult({ 1: 'basis' }, { 1: 'none' });
    const opt = twoParentResult({ 1: 'partnerBonus' }, { 1: 'partnerBonus' });
    const lines = getResultChangePreviewUserFriendly(cur, opt, 50);
    expect(lines[0]).toBe('Monat 1 wird zum Partnerschaftsbonus');
    expect(lines[1]).toBe('→ beide Eltern müssen parallel ElterngeldPlus beziehen');
  });
});
