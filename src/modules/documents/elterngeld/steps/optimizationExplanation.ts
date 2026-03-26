/**
 * Erklärungslogik für Optimierungsvarianten.
 * Leitet aus realen Result-Daten verständliche Vorteile ab.
 * Keine Berechnungslogik – nur Darstellung.
 */

import type { CalculationResult } from '../calculation';
import type { OptimizationSuggestion } from '../calculation/elterngeldOptimization';
import type { CombinedWho } from '../calculation/monthCombinedState';
import type { MonthMode } from '../calculation';

function countBezugMonths(result: CalculationResult): number {
  const months = new Set<number>();
  for (const p of result.parents) {
    for (const r of p.monthlyResults) {
      if (r.mode !== 'none' || r.amount > 0) months.add(r.month);
    }
  }
  return months.size;
}

function countPartnerBonusMonths(result: CalculationResult): number {
  const months = new Set<number>();
  for (const p of result.parents) {
    for (const r of p.monthlyResults) {
      if (r.mode === 'partnerBonus') months.add(r.month);
    }
  }
  return months.size;
}

function getStateFromResult(
  result: CalculationResult,
  month: number
): { who: CombinedWho; mode: MonthMode } {
  const parentA = result.parents[0];
  const parentB = result.parents[1];
  const rA = parentA?.monthlyResults.find((r) => r.month === month);
  const rB = parentB?.monthlyResults.find((r) => r.month === month);
  const modeA: MonthMode = rA?.mode ?? 'none';
  const modeB: MonthMode = rB?.mode ?? 'none';
  const hasA = modeA !== 'none';
  const hasB = modeB !== 'none';
  if (hasA && !hasB) return { who: 'mother', mode: modeA };
  if (!hasA && hasB) return { who: 'partner', mode: modeB };
  if (hasA && hasB) {
    const mode = modeA === 'partnerBonus' && modeB === 'partnerBonus' ? 'partnerBonus' : modeA;
    return { who: 'both', mode };
  }
  return { who: 'none', mode: 'none' };
}

function formatStateLabel(who: CombinedWho, mode: MonthMode): string {
  if (who === 'none') return 'Kein Bezug';
  if (who === 'both') return 'Partnerschaftsbonus';
  if (who === 'mother') return mode === 'plus' ? 'Mutter – Plus' : 'Mutter – Basis';
  if (who === 'partner') return mode === 'plus' ? 'Partner – Plus' : 'Partner – Basis';
  return 'Beide – Bonus';
}

/** Summe der Haushaltsauszahlung in den ersten n Lebensmonaten. */
function getSumFirstNMonths(result: CalculationResult, n: number): number {
  const byMonth = new Map<number, number>();
  for (const p of result.parents) {
    for (const r of p.monthlyResults) {
      if (r.mode !== 'none' || r.amount > 0) {
        const cur = byMonth.get(r.month) ?? 0;
        byMonth.set(r.month, cur + r.amount);
      }
    }
  }
  let sum = 0;
  for (let m = 1; m <= n; m++) {
    sum += byMonth.get(m) ?? 0;
  }
  return sum;
}

/** Bezugsmonate pro Elternteil (Anzahl Monate mit Bezug). */
function getBezugMonthsPerParent(result: CalculationResult): [number, number] {
  const a = new Set(
    result.parents[0]?.monthlyResults.filter((r) => r.mode !== 'none' || r.amount > 0).map((r) => r.month) ?? []
  );
  const b = new Set(
    result.parents[1]?.monthlyResults.filter((r) => r.mode !== 'none' || r.amount > 0).map((r) => r.month) ?? []
  );
  return [a.size, b.size];
}

/** Prüft, ob es sichtbare Planänderungen zwischen current und optimized gibt. */
function hasPlanChanges(currentResult: CalculationResult, optimizedResult: CalculationResult): boolean {
  const allMonths = new Set<number>();
  for (const p of currentResult.parents) {
    for (const r of p.monthlyResults) allMonths.add(r.month);
  }
  for (const p of optimizedResult.parents) {
    for (const r of p.monthlyResults) allMonths.add(r.month);
  }
  for (const month of allMonths) {
    const cur = getStateFromResult(currentResult, month);
    const opt = getStateFromResult(optimizedResult, month);
    const fromLabel = formatStateLabel(cur.who, cur.mode);
    const toLabel = formatStateLabel(opt.who, opt.mode);
    if (fromLabel !== toLabel) return true;
  }
  return false;
}

/**
 * Ermittelt einen verständlichen Vorteilssatz, wenn die Variante gleiche Dauer,
 * aber weniger Gesamtgeld hat. Nur reale, aus Daten ableitbare Unterschiede.
 * Gibt null zurück, wenn kein erklärbarer Vorteil gefunden wird.
 */
export function getExplainableAdvantageWhenSameDurationLessTotal(
  currentResult: CalculationResult,
  optimizedResult: CalculationResult,
  goal: string,
  suggestion?: OptimizationSuggestion | null
): string | null {
  const currentDuration = countBezugMonths(currentResult);
  const optimizedDuration = countBezugMonths(optimizedResult);
  const currentTotal = currentResult.householdTotal;
  const optimizedTotal = optimizedResult.householdTotal;

  if (currentDuration !== optimizedDuration || optimizedTotal >= currentTotal) {
    return null;
  }

  /* frontLoad: deltaValue > 0 bedeutet höhere Auszahlung in frühen Monaten */
  if (goal === 'frontLoad' && suggestion && (suggestion.deltaValue ?? 0) > 0) {
    return 'In den ersten Monaten höher, insgesamt etwas weniger.';
  }

  /* Planänderungen vorhanden → andere Verteilung */
  if (hasPlanChanges(currentResult, optimizedResult)) {
    return 'Gleiche Dauer, aber anders über die Monate verteilt.';
  }

  /* Optimiert hat mehr Bonusmonate als aktuell */
  const currentBonus = countPartnerBonusMonths(currentResult);
  const optimizedBonus = countPartnerBonusMonths(optimizedResult);
  if (optimizedBonus > currentBonus) {
    return 'Berücksichtigt Bonusmonate, wenn sie sinnvoll nutzbar sind.';
  }

  /* Höhere Auszahlung in den ersten 6 Monaten (früher mehr Geld) */
  const first6Current = getSumFirstNMonths(currentResult, 6);
  const first6Optimized = getSumFirstNMonths(optimizedResult, 6);
  if (first6Optimized > first6Current) {
    return 'In den ersten Monaten höher, insgesamt etwas weniger.';
  }

  /* Deutlich andere Verteilung zwischen Elternteilen */
  const [curA, curB] = getBezugMonthsPerParent(currentResult);
  const [optA, optB] = getBezugMonthsPerParent(optimizedResult);
  const curDiff = Math.abs(curA - curB);
  const optDiff = Math.abs(optA - optB);
  if (optDiff > curDiff && Math.abs(optDiff - curDiff) >= 2) {
    return 'Gleiche Dauer, aber stärker auf einen Elternteil verlagert.';
  }

  /* Ausgewogenere gemeinsame Aufteilung: beide Eltern mit Monaten, ausgeglichener als aktuell */
  if (optDiff < curDiff && optA > 0 && optB > 0 && Math.abs(optDiff - curDiff) >= 1) {
    return 'Gleiche Dauer, aber ausgewogenere Aufteilung zwischen beiden Eltern.';
  }

  return null;
}

/**
 * Prüft, ob eine Variante angezeigt werden darf.
 * Gleiche Bezugsdauer und geringere Gesamtauszahlung: nie (auch nicht über „erklärbare“ Vorteile).
 * Sonst: höhere/gleiche Summe, oder geänderte Dauer inkl. Trade-off weniger Geld.
 */
export function shouldShowVariant(
  suggestion: OptimizationSuggestion,
  currentResult: CalculationResult,
  goal: string
): boolean {
  const optimizedDuration = countBezugMonths(suggestion.result);
  const currentDuration = countBezugMonths(currentResult);
  const optimizedTotal = suggestion.optimizedTotal;
  const currentTotal = currentResult.householdTotal;

  if (optimizedDuration === currentDuration && optimizedTotal < currentTotal) return false;

  if (optimizedTotal >= currentTotal) return true;
  if (optimizedDuration !== currentDuration) return true;

  const advantage = getExplainableAdvantageWhenSameDurationLessTotal(
    currentResult,
    suggestion.result,
    goal,
    suggestion
  );
  return advantage !== null;
}

/** Zählt Monate, in denen aktuell Basis war und optimiert Plus/Bonus ist. */
function countBasisToPlusChanges(
  currentResult: CalculationResult,
  optimizedResult: CalculationResult
): number {
  const allMonths = new Set<number>();
  for (const p of currentResult.parents) {
    for (const r of p.monthlyResults) allMonths.add(r.month);
  }
  for (const p of optimizedResult.parents) {
    for (const r of p.monthlyResults) allMonths.add(r.month);
  }
  let count = 0;
  for (const month of allMonths) {
    const cur = getStateFromResult(currentResult, month);
    const opt = getStateFromResult(optimizedResult, month);
    const curHadBasis = (cur.who === 'mother' || cur.who === 'partner') && cur.mode === 'basis';
    const optHasPlus = opt.mode === 'plus' || opt.mode === 'partnerBonus';
    if (curHadBasis && optHasPlus) count++;
  }
  return count;
}

/** Prüft, ob Monate zwischen Elternteilen verschoben wurden. */
function hasParentDistributionShift(
  currentResult: CalculationResult,
  optimizedResult: CalculationResult
): boolean {
  const [curA, curB] = getBezugMonthsPerParent(currentResult);
  const [optA, optB] = getBezugMonthsPerParent(optimizedResult);
  const curDiff = curA - curB;
  const optDiff = optA - optB;
  return Math.abs(optDiff - curDiff) >= 2;
}

export interface CalculationBreakdownLine {
  label: string;
  value?: string;
}

/**
 * Beleg „So wird das berechnet“ – ausschließlich aus monthlyResults, mode, amount, householdTotal.
 * Keine Berechnungslogik, nur Darstellung vorhandener Daten.
 */
export function getCalculationBreakdown(result: CalculationResult): CalculationBreakdownLine[] {
  const lines: CalculationBreakdownLine[] = [];
  const allMonths = new Set<number>();
  for (const p of result.parents) {
    for (const r of p.monthlyResults) {
      if (r.mode !== 'none' || r.amount > 0) allMonths.add(r.month);
    }
  }
  const months = [...allMonths].sort((a, b) => a - b);

  const byMode = new Map<string, number[]>();
  let incomeBeforeNet: number | null = null;

  for (const month of months) {
    const { mode } = getStateFromResult(result, month);
    if (mode !== 'none') {
      if (!byMode.has(mode)) byMode.set(mode, []);
      byMode.get(mode)!.push(month);
    }
    if (incomeBeforeNet == null) {
      for (const p of result.parents) {
        const r = p.monthlyResults.find((mr) => mr.month === month);
        if (r?.breakdown != null) {
          incomeBeforeNet = r.breakdown.incomeBeforeNet;
          break;
        }
      }
    }
  }

  const formatRange = (m: number[]): string => {
    if (m.length === 0) return '';
    const sorted = [...new Set(m)].sort((a, b) => a - b);
    if (sorted.length === 1) return `Monat ${sorted[0]}`;
    return `Monat ${sorted[0]}–${sorted[sorted.length - 1]}`;
  };

  const basisMonths = byMode.get('basis') ?? [];
  const plusMonths = byMode.get('plus') ?? [];
  const bonusMonths = byMode.get('partnerBonus') ?? [];

  if (basisMonths.length > 0) {
    lines.push({ label: `${formatRange(basisMonths)}: Basiselterngeld` });
  }
  if (plusMonths.length > 0) {
    lines.push({ label: `${formatRange(plusMonths)}: ElterngeldPlus` });
  }
  if (bonusMonths.length > 0) {
    lines.push({ label: `Partnerschaftsbonus: ${bonusMonths.length} Monate berücksichtigt` });
  }
  if (incomeBeforeNet != null && incomeBeforeNet > 0) {
    lines.push({
      label: 'Grundlage: geschätztes Nettoeinkommen',
      value: `${Math.round(incomeBeforeNet)} €`,
    });
  }

  return lines;
}

/**
 * Beleg für Optimierungs-Unterschiede – was wurde konkret geändert.
 * Nutzt nur vorhandene Daten aus currentResult und optimizedResult.
 */
export function getOptimizationBreakdown(
  currentResult: CalculationResult,
  optimizedResult: CalculationResult
): string[] {
  const lines: string[] = [];
  const basisToPlus = countBasisToPlusChanges(currentResult, optimizedResult);
  const parentShift = hasParentDistributionShift(currentResult, optimizedResult);
  const currentBonus = countPartnerBonusMonths(currentResult);
  const optimizedBonus = countPartnerBonusMonths(optimizedResult);

  if (basisToPlus > 0) {
    lines.push(
      `${basisToPlus} Monat${basisToPlus === 1 ? '' : 'e'} ${basisToPlus === 1 ? 'wurde' : 'wurden'} zu ElterngeldPlus geändert`
    );
  }
  if (parentShift) {
    const [curA, curB] = getBezugMonthsPerParent(currentResult);
    const [optA, optB] = getBezugMonthsPerParent(optimizedResult);
    const diff = Math.abs(Math.abs(optA - optB) - Math.abs(curA - curB));
    if (diff >= 1) {
      lines.push(
        `${diff} Monat${diff === 1 ? '' : 'e'} ${diff === 1 ? 'wurde' : 'wurden'} auf den zweiten Elternteil verschoben`
      );
    }
  }
  if (optimizedBonus > currentBonus) {
    lines.push('Partnerschaftsbonus wurde aktiviert');
  }

  return lines;
}

/**
 * Erklärungssatz für die Hauptempfehlung (erste Variante).
 * Basiert ausschließlich auf realen Planänderungen, nicht auf dem Ziel.
 * Priorität: 1) Partnerschaftsbonus, 2) Basis→Plus, 3) Verteilung Eltern, 4) allgemeine Änderung.
 */
export function getMainRecommendationExplanation(
  currentResult: CalculationResult,
  optimizedResult: CalculationResult,
  _goal: string,
  _suggestion: OptimizationSuggestion
): string | null {
  if (!hasPlanChanges(currentResult, optimizedResult)) return null;

  const currentBonus = countPartnerBonusMonths(currentResult);
  const optimizedBonus = countPartnerBonusMonths(optimizedResult);
  const basisToPlusCount = countBasisToPlusChanges(currentResult, optimizedResult);
  const parentShift = hasParentDistributionShift(currentResult, optimizedResult);

  if (optimizedBonus > currentBonus) {
    return 'Der Partnerschaftsbonus wird in die Planung aufgenommen.';
  }
  if (basisToPlusCount > 0) {
    return 'Mehr Monate werden als ElterngeldPlus geplant.';
  }
  if (parentShift) {
    return 'Ein Teil der Monate wird auf den zweiten Elternteil verlagert.';
  }
  return 'Die Monate werden anders verteilt.';
}
