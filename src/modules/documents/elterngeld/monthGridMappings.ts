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
import type { CalculationResult, ParentCalculationResult } from './calculation';
import type { MonthGridItem } from './ui/MonthGrid';
import type {
  ElterngeldApplication,
  MonthDistributionEntry,
  MonthModeForDistribution,
} from './types/elterngeldTypes';

const MODE_LABELS: Record<string, string> = {
  none: '–',
  basis: 'Basis',
  plus: 'Plus',
  partnerBonus: 'Bonus',
};

/** Erstellt MonthGrid-Items aus konkreter Monatsverteilung. */
function getMonthGridItemsFromDistribution(
  distribution: MonthDistributionEntry[],
  model: string,
  hasPartner: boolean,
  maxMonths: number
): MonthGridItem[] {
  const byMonth = new Map(distribution.map((d) => [d.month, d]));
  const result: MonthGridItem[] = [];
  for (let m = 1; m <= maxMonths; m++) {
    const entry = byMonth.get(m) ?? { month: m, modeA: 'none' as const, modeB: 'none' as const };
    const modeA = entry.modeA ?? 'none';
    const modeB = entry.modeB ?? 'none';
    const hasA = modeA !== 'none';
    const hasB = hasPartner && modeB !== 'none';

    let state: MonthGridItem['state'];
    let label: string;
    let subLabel: string;

    if (hasA && hasB) {
      state = 'both';
      label = 'Beide';
      subLabel = modeA === 'partnerBonus' || modeB === 'partnerBonus' ? 'Bonus' : model === 'plus' ? 'Plus' : 'Basis';
    } else if (hasA) {
      state = 'mother';
      label = 'Mutter';
      subLabel = MODE_LABELS[modeA] ?? modeA;
    } else if (hasB) {
      state = 'partner';
      label = 'Partner';
      subLabel = MODE_LABELS[modeB] ?? modeB;
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

/**
 * Vorbereitung: Ermittelt MonthGrid-Items aus values.
 * Verwendet primär concreteMonthDistribution (übernommene Variante), Fallback: Count-Logik.
 */
export function getMonthGridItemsFromValues(
  values: ElterngeldApplication,
  maxMonths: number
): MonthGridItem[] {
  const dist = values.benefitPlan.concreteMonthDistribution;
  const hasPartner = values.applicantMode === 'both_parents';
  if (dist && dist.length > 0) {
    return getMonthGridItemsFromDistribution(
      dist,
      values.benefitPlan.model,
      hasPartner,
      maxMonths
    );
  }
  const countA = parseInt(String(values.benefitPlan.parentAMonths || ''), 10) || 0;
  const countB = hasPartner ? parseInt(String(values.benefitPlan.parentBMonths || ''), 10) || 0 : 0;
  return getMonthGridItemsFromCounts(
    countA,
    countB,
    values.benefitPlan.model,
    values.benefitPlan.partnershipBonus,
    hasPartner,
    maxMonths
  );
}

/** Vorbereitung: count-basiertes Modell → MonthGrid-Items (Fallback) */
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

function normalizeDistributionMode(value: string | undefined): MonthModeForDistribution {
  if (value === 'basis' || value === 'plus' || value === 'partnerBonus' || value === 'none') {
    return value;
  }
  return 'none';
}

function expandConcreteMonthDistribution(
  distribution: MonthDistributionEntry[],
  maxMonths: number
): MonthDistributionEntry[] {
  const byMonth = new Map(distribution.map((d) => [d.month, d]));
  const out: MonthDistributionEntry[] = [];
  for (let m = 1; m <= maxMonths; m++) {
    const e = byMonth.get(m);
    if (e) {
      out.push({
        month: m,
        modeA: normalizeDistributionMode(e.modeA),
        modeB: normalizeDistributionMode(e.modeB ?? 'none'),
      });
    } else {
      out.push({ month: m, modeA: 'none', modeB: 'none' });
    }
  }
  return out;
}

function documentDistributionFromLiveResult(
  result: CalculationResult,
  maxMonths: number,
  hasPartner: boolean
): MonthDistributionEntry[] {
  const parentA = result.parents[0];
  const parentB = result.parents[1];
  const byMonthA = new Map(parentA?.monthlyResults.map((r) => [r.month, r]) ?? []);
  const byMonthB = new Map(parentB?.monthlyResults.map((r) => [r.month, r]) ?? []);
  const out: MonthDistributionEntry[] = [];
  for (let m = 1; m <= maxMonths; m++) {
    const modeA = normalizeDistributionMode(byMonthA.get(m)?.mode);
    const modeB =
      hasPartner && parentB ? normalizeDistributionMode(byMonthB.get(m)?.mode) : ('none' as const);
    out.push({ month: m, modeA, modeB });
  }
  return out;
}

function documentDistributionFromCounts(values: ElterngeldApplication, maxMonths: number): MonthDistributionEntry[] {
  const hasPartner = values.applicantMode === 'both_parents';
  const countA = parseInt(String(values.benefitPlan.parentAMonths || ''), 10) || 0;
  const countB = hasPartner ? parseInt(String(values.benefitPlan.parentBMonths || ''), 10) || 0 : 0;
  const model = values.benefitPlan.model;
  const partnershipBonus = values.benefitPlan.partnershipBonus;
  const out: MonthDistributionEntry[] = [];
  for (let m = 1; m <= maxMonths; m++) {
    const motherHas = m <= countA;
    const partnerHas = hasPartner && m <= countB;
    let modeA: MonthModeForDistribution = 'none';
    let modeB: MonthModeForDistribution = 'none';
    if (motherHas && partnerHas && partnershipBonus) {
      modeA = 'partnerBonus';
      modeB = 'partnerBonus';
    } else if (motherHas && partnerHas) {
      modeA = model === 'plus' ? 'plus' : 'basis';
      modeB = model === 'plus' ? 'plus' : 'basis';
    } else if (motherHas) {
      modeA = model === 'plus' ? 'plus' : 'basis';
    } else if (partnerHas) {
      modeB = partnershipBonus ? 'partnerBonus' : model === 'plus' ? 'plus' : 'basis';
    }
    out.push({ month: m, modeA, modeB });
  }
  return out;
}

/**
 * Effektive Monatsverteilung für Dokumente, Ausfüllhilfe und PDFs: übernimmt concreteMonthDistribution,
 * sonst valides calculatePlan-Ergebnis, sonst dieselbe Count-Logik wie MonthGrid-Fallback.
 */
export function resolveDocumentMonthDistribution(
  values: ElterngeldApplication,
  liveResult: CalculationResult | null | undefined,
  maxMonths: number
): MonthDistributionEntry[] {
  const dist = values.benefitPlan.concreteMonthDistribution;
  if (dist && dist.length > 0) {
    return expandConcreteMonthDistribution(dist, maxMonths);
  }
  if (
    liveResult &&
    liveResult.validation.errors.length === 0 &&
    (liveResult.parents[0]?.monthlyResults?.length ?? 0) > 0
  ) {
    const hasPartner = values.applicantMode === 'both_parents';
    return documentDistributionFromLiveResult(liveResult, maxMonths, hasPartner);
  }
  return documentDistributionFromCounts(values, maxMonths);
}
