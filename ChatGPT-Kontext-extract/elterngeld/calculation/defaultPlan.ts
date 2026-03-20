/**
 * Standardwerte für den Berechnungsplan.
 */

import type {
  ElterngeldCalculationPlan,
  CalculationParentInput,
  ParentMonthInput,
  MonthMode,
} from './types';

const DEFAULT_MONTH_COUNT = 14;

function createEmptyMonth(month: number): ParentMonthInput {
  return {
    month,
    mode: 'none',
    incomeDuringNet: 0,
  };
}

function createDefaultParent(id: string, label: string): CalculationParentInput {
  const months: ParentMonthInput[] = [];
  for (let m = 1; m <= DEFAULT_MONTH_COUNT; m++) {
    months.push(createEmptyMonth(m));
  }
  return {
    id,
    label,
    incomeBeforeNet: 0,
    months,
  };
}

export function createDefaultPlan(
  childBirthDate: string = '',
  hasSecondParent: boolean = true
): ElterngeldCalculationPlan {
  const parents: CalculationParentInput[] = [
    createDefaultParent('parentA', 'Sie'),
  ];
  if (hasSecondParent) {
    parents.push(createDefaultParent('parentB', 'Partner'));
  }

  return {
    childBirthDate,
    parents,
    hasSiblingBonus: false,
    additionalChildren: 0,
  };
}
