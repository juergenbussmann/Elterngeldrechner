/**
 * Mapping zwischen Datenmodell und UI-Zustand für MonthGrid.
 * UI-Zustand: mother | partner | both | none
 *
 * Mapping:
 *   mother → parentA != none && parentB == none
 *   partner → parentA == none && parentB != none
 *   both → parentA != none && parentB != none
 *   none → parentA == none && parentB == none
 */

import type { ElterngeldCalculationPlan } from './calculation';
import { getCombinedMonthState } from './calculation';
import type { ParentCalculationResult } from './calculation';
import type { MonthGridItem } from './ui/MonthGrid';

const MODE_LABELS: Record<string, string> = {
  none: '–',
  basis: 'Basis',
  plus: 'Plus',
  partnerBonus: 'Bonus',
};

/** Vorbereitung: count-basiertes Modell → MonthGrid-Items */
export function getMonthGridItemsFromCounts(
  parentAMonths: number,
  parentBMonths: number,
  model: string,
  partnershipBonus: boolean,
  hasPartner: boolean,
  maxMonths: number
): MonthGridItem[] {
  const result: MonthGridItem[] = [];
  for (let m = 1; m <= maxMonths; m++) {
    const motherHas = m <= parentAMonths;
    const partnerHas = hasPartner && m <= parentBMonths;

    let state: MonthGridItem['state'];
    let label: string;
    let subLabel: string;

    if (motherHas && partnerHas && partnershipBonus) {
      state = 'both';
      label = 'Beide';
      subLabel = 'Bonus';
    } else if (motherHas && partnerHas) {
      state = 'both';
      label = 'Beide';
      subLabel = model === 'plus' ? 'Plus' : 'Basis';
    } else if (motherHas) {
      state = 'mother';
      label = 'Mutter';
      subLabel = model === 'plus' ? 'Plus' : 'Basis';
    } else if (partnerHas) {
      state = 'partner';
      label = 'Partner';
      subLabel = partnershipBonus ? 'Bonus' : model === 'plus' ? 'Plus' : 'Basis';
    } else {
      state = 'none';
      label = 'Kein Bezug';
      subLabel = '–';
    }

    result.push({
      month: m,
      state,
      label,
      subLabel: subLabel !== '–' ? subLabel : undefined,
    });
  }
  return result;
}

/** Berechnung (Plan): ElterngeldCalculationPlan → MonthGrid-Items */
export function getMonthGridItemsFromPlan(
  plan: ElterngeldCalculationPlan,
  hasPartner: boolean,
  maxMonths: number
): MonthGridItem[] {
  const result: MonthGridItem[] = [];
  for (let m = 1; m <= maxMonths; m++) {
    const combined = getCombinedMonthState(plan, m, hasPartner);
    result.push({
      month: m,
      state: combined.tileVariant,
      label: combined.label,
      subLabel: combined.modeLabel !== '–' ? combined.modeLabel : undefined,
    });
  }
  return result;
}

/** Berechnung (Ergebnis): ParentCalculationResult[] → MonthGrid-Items */
export function getMonthGridItemsFromResults(
  parents: ParentCalculationResult[],
  maxMonths: number
): MonthGridItem[] {
  const parentA = parents[0];
  const parentB = parents[1];
  const byMonthA = new Map(parentA?.monthlyResults.map((r) => [r.month, r]) ?? []);
  const byMonthB = new Map(parentB?.monthlyResults.map((r) => [r.month, r]) ?? []);

  const result: MonthGridItem[] = [];
  for (let m = 1; m <= maxMonths; m++) {
    const rA = byMonthA.get(m);
    const rB = byMonthB.get(m);
    const modeA = rA?.mode ?? 'none';
    const modeB = rB?.mode ?? 'none';
    const hasA = modeA !== 'none';
    const hasB = modeB !== 'none';

    let state: MonthGridItem['state'];
    let label: string;
    let subLabel: string;
    let hasWarning = false;

    if (hasA && !hasB) {
      state = 'mother';
      label = 'Mutter';
      subLabel = MODE_LABELS[modeA] ?? modeA;
      hasWarning = (rA?.warnings?.length ?? 0) > 0;
    } else if (!hasA && hasB) {
      state = 'partner';
      label = 'Partner';
      subLabel = MODE_LABELS[modeB] ?? modeB;
      hasWarning = (rB?.warnings?.length ?? 0) > 0;
    } else if (hasA && hasB) {
      state = 'both';
      label = 'Beide';
      subLabel = 'Bonus';
      hasWarning = (rA?.warnings?.length ?? 0) > 0 || (rB?.warnings?.length ?? 0) > 0;
    } else {
      state = 'none';
      label = 'Kein Bezug';
      subLabel = '–';
    }

    result.push({
      month: m,
      state,
      label,
      subLabel: subLabel !== '–' ? subLabel : undefined,
      hasWarning,
    });
  }
  return result;
}
