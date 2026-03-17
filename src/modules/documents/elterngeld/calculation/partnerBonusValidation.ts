/**
 * Validierung des Partnerschaftsbonus (MVP).
 * Regeln: beide im selben Monat partnerBonus, beide 24–32 h/Woche, 2–4 zusammenhängende Monate.
 */

import type { ElterngeldCalculationPlan, CalculationResult } from './types';

export interface PartnerBonusValidationResult {
  isValid: boolean;
  longestValidSeries: number;
  monthValidity: Record<number, boolean>;
  warnings: string[];
}

const MIN_HOURS = 24;
const MAX_HOURS = 32;
const MIN_MONTHS = 2;
const MAX_MONTHS = 4;

export function validatePartnerBonus(plan: ElterngeldCalculationPlan): PartnerBonusValidationResult {
  const warnings: string[] = [];
  const monthValidity: Record<number, boolean> = {};

  const parentA = plan.parents[0];
  const parentB = plan.parents[1];

  if (!parentB) {
    return {
      isValid: true,
      longestValidSeries: 0,
      monthValidity: {},
      warnings: [],
    };
  }

  const monthsA = new Map(parentA.months.map((m) => [m.month, m]));
  const monthsB = new Map(parentB.months.map((m) => [m.month, m]));

  const allMonths = new Set([...monthsA.keys(), ...monthsB.keys()]);
  let longestSeries = 0;
  let currentSeries = 0;

  for (const month of Array.from(allMonths).sort((a, b) => a - b)) {
    const mA = monthsA.get(month);
    const mB = monthsB.get(month);

    const bothPartnerBonus =
      mA?.mode === 'partnerBonus' && mB?.mode === 'partnerBonus';
    const aHoursOk =
      mA?.mode === 'partnerBonus'
        ? mA.hoursPerWeek != null && mA.hoursPerWeek >= MIN_HOURS && mA.hoursPerWeek <= MAX_HOURS
        : true;
    const bHoursOk =
      mB?.mode === 'partnerBonus'
        ? mB.hoursPerWeek != null && mB.hoursPerWeek >= MIN_HOURS && mB.hoursPerWeek <= MAX_HOURS
        : true;

    const valid = bothPartnerBonus && aHoursOk && bHoursOk;
    monthValidity[month] = valid;

    if (valid) {
      currentSeries++;
      longestSeries = Math.max(longestSeries, currentSeries);
    } else {
      const aHoursOutOfRange =
        mA?.mode === 'partnerBonus' &&
        mA.hoursPerWeek != null &&
        (mA.hoursPerWeek < MIN_HOURS || mA.hoursPerWeek > MAX_HOURS);
      const bHoursOutOfRange =
        mB?.mode === 'partnerBonus' &&
        mB.hoursPerWeek != null &&
        (mB.hoursPerWeek < MIN_HOURS || mB.hoursPerWeek > MAX_HOURS);
      if (bothPartnerBonus && (aHoursOutOfRange || bHoursOutOfRange)) {
        warnings.push(
          `Monat ${month}: Partnerschaftsbonus erfordert 24–32 Wochenstunden je Elternteil.`
        );
      }
      if (mA?.mode === 'partnerBonus' && !mB?.mode) {
        warnings.push(
          `Monat ${month}: Partnerschaftsbonus nur möglich, wenn beide Elternteile im selben Monat beziehen.`
        );
      }
      if (mB?.mode === 'partnerBonus' && !mA?.mode) {
        warnings.push(
          `Monat ${month}: Partnerschaftsbonus nur möglich, wenn beide Elternteile im selben Monat beziehen.`
        );
      }
      currentSeries = 0;
    }
  }

  const hasPartnerBonusMonths = plan.parents.some((p) =>
    p.months.some((m) => m.mode === 'partnerBonus')
  );

  if (hasPartnerBonusMonths && longestSeries > 0 && (longestSeries < MIN_MONTHS || longestSeries > MAX_MONTHS)) {
    warnings.push(
      `Partnerschaftsbonus: 2–4 zusammenhängende Monate erforderlich. Längste gültige Serie: ${longestSeries} Monat(e).`
    );
  }

  const hasHourWarnings = warnings.some((w) => w.includes('24–32'));
  const isValid =
    !hasPartnerBonusMonths ||
    (longestSeries >= MIN_MONTHS && longestSeries <= MAX_MONTHS && !hasHourWarnings);

  return {
    isValid,
    longestValidSeries: longestSeries,
    monthValidity,
    warnings,
  };
}

/** Validierung aus Result-Daten (für Ergebnis-Screen, eine Quelle: result). Stundenprüfung entfällt. */
export function validatePartnerBonusFromResult(result: CalculationResult): PartnerBonusValidationResult {
  const parentA = result.parents[0];
  const parentB = result.parents[1];
  if (!parentB) {
    return { isValid: true, longestValidSeries: 0, monthValidity: {}, warnings: [] };
  }
  const byMonthA = new Map(parentA.monthlyResults.map((r) => [r.month, r.mode]));
  const byMonthB = new Map(parentB.monthlyResults.map((r) => [r.month, r.mode]));
  const allMonths = new Set([...byMonthA.keys(), ...byMonthB.keys()]);
  const warnings: string[] = [];
  const monthValidity: Record<number, boolean> = {};
  let longestSeries = 0;
  let currentSeries = 0;

  for (const month of Array.from(allMonths).sort((a, b) => a - b)) {
    const modeA = byMonthA.get(month) ?? 'none';
    const modeB = byMonthB.get(month) ?? 'none';
    const bothPartnerBonus = modeA === 'partnerBonus' && modeB === 'partnerBonus';
    monthValidity[month] = bothPartnerBonus;

    if (bothPartnerBonus) {
      currentSeries++;
      longestSeries = Math.max(longestSeries, currentSeries);
    } else {
      if (modeA === 'partnerBonus' && modeB !== 'partnerBonus') {
        warnings.push(`Monat ${month}: Partnerschaftsbonus nur möglich, wenn beide Elternteile im selben Monat beziehen.`);
      }
      if (modeB === 'partnerBonus' && modeA !== 'partnerBonus') {
        warnings.push(`Monat ${month}: Partnerschaftsbonus nur möglich, wenn beide Elternteile im selben Monat beziehen.`);
      }
      currentSeries = 0;
    }
  }

  const hasPartnerBonusMonths = result.parents.some((p) =>
    p.monthlyResults.some((r) => r.mode === 'partnerBonus')
  );
  if (hasPartnerBonusMonths && longestSeries > 0 && (longestSeries < MIN_MONTHS || longestSeries > MAX_MONTHS)) {
    warnings.push(
      `Partnerschaftsbonus: 2–4 zusammenhängende Monate erforderlich. Längste gültige Serie: ${longestSeries} Monat(e).`
    );
  }
  const isValid =
    !hasPartnerBonusMonths ||
    (longestSeries >= MIN_MONTHS && longestSeries <= MAX_MONTHS);

  return { isValid, longestValidSeries: longestSeries, monthValidity, warnings };
}
