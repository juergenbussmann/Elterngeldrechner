/**
 * Kombinierter Monatszustand für die Berechnungs-UI.
 * Der Nutzer denkt in Monaten: Mutter | Partner | Beide | Kein Bezug.
 * Intern: parentA.months[].mode, parentB.months[].mode
 */

import type { ElterngeldCalculationPlan, ParentMonthInput, MonthMode } from './types';

export type CombinedWho = 'mother' | 'partner' | 'both' | 'none';

export type CombinedMonthState = {
  who: CombinedWho;
  mode: MonthMode;
  modeLabel: string;
  label: string;
  /** Für MonthTile variant */
  tileVariant: 'mother' | 'partner' | 'both' | 'none';
};

const MODE_LABELS: Record<MonthMode, string> = {
  none: '–',
  basis: 'Basis',
  plus: 'Plus',
  partnerBonus: 'Bonus',
};

/**
 * Leitet den kombinierten Zustand aus parentA und parentB für einen Monat ab.
 * Mapping:
 *   Mutter → parentA != none && parentB == none
 *   Partner → parentA == none && parentB != none
 *   Beide → parentA != none && parentB != none
 *   Kein Bezug → parentA == none && parentB == none
 */
export function getCombinedMonthState(
  plan: ElterngeldCalculationPlan,
  month: number,
  hasPartner: boolean
): CombinedMonthState {
  const parentA = plan.parents[0];
  const parentB = plan.parents[1];
  const mA = parentA?.months.find((m) => m.month === month);
  const mB = hasPartner && parentB ? parentB.months.find((m) => m.month === month) : null;

  const modeA: MonthMode = mA?.mode ?? 'none';
  const modeB: MonthMode = mB?.mode ?? 'none';

  const hasA = modeA !== 'none';
  const hasB = modeB !== 'none';

  if (hasA && !hasB) {
    return {
      who: 'mother',
      mode: modeA,
      modeLabel: MODE_LABELS[modeA],
      label: 'Mutter',
      tileVariant: 'mother',
    };
  }
  if (!hasA && hasB) {
    return {
      who: 'partner',
      mode: modeB,
      modeLabel: MODE_LABELS[modeB],
      label: 'Partner',
      tileVariant: 'partner',
    };
  }
  if (hasA && hasB) {
    const isBonus = modeA === 'partnerBonus' && modeB === 'partnerBonus';
    return {
      who: 'both',
      mode: isBonus ? 'partnerBonus' : modeA,
      modeLabel: isBonus ? 'Bonus' : MODE_LABELS[modeA],
      label: 'Beide',
      tileVariant: 'both',
    };
  }
  return {
    who: 'none',
    mode: 'none',
    modeLabel: '–',
    label: 'Kein Bezug',
    tileVariant: 'none',
  };
}

export type CombinedSelection = {
  who: CombinedWho;
  mode: MonthMode;
};

function updateMonthInList(
  months: ParentMonthInput[],
  month: number,
  mode: MonthMode
): ParentMonthInput[] {
  const idx = months.findIndex((m) => m.month === month);
  const existing = idx >= 0 ? months[idx] : { month, mode: 'none' as MonthMode, incomeDuringNet: 0 };
  const updated = { ...existing, mode };
  const next = idx >= 0 ? [...months] : [...months, updated];
  if (idx >= 0) next[idx] = updated;
  return next.sort((a, b) => a.month - b.month);
}

/**
 * Wendet eine kombinierte Auswahl auf den Plan an.
 * Aktualisiert parentA und parentB für den angegebenen Monat.
 */
export function applyCombinedSelection(
  plan: ElterngeldCalculationPlan,
  month: number,
  selection: CombinedSelection,
  hasPartner: boolean
): ElterngeldCalculationPlan {
  const parentA = plan.parents[0];
  const parentB = plan.parents[1];

  let modeA: MonthMode = 'none';
  let modeB: MonthMode = 'none';

  if (selection.who === 'mother') {
    modeA = selection.mode;
  } else if (selection.who === 'partner') {
    modeB = selection.mode;
  } else if (selection.who === 'both') {
    modeA = 'partnerBonus';
    modeB = 'partnerBonus';
  }

  const nextMonthsA = updateMonthInList(parentA.months, month, modeA);
  const nextParents = [
    { ...parentA, months: nextMonthsA },
    ...(parentB
      ? [{ ...parentB, months: hasPartner ? updateMonthInList(parentB.months, month, modeB) : parentB.months }]
      : []),
  ];

  return {
    ...plan,
    parents: nextParents,
  };
}
