/**
 * Elterngeld-Berechnungslogik (unverbindliche Schätzung, MVP).
 * Vereinfachte Ersatzratenlogik – keine amtliche Berechnung.
 *
 * @see docs/ELTERNGELD-CALCULATION-MVP.md für Grenzen und TODOs
 */

import type {
  ElterngeldCalculationPlan,
  CalculationResult,
  ParentCalculationResult,
  MonthlyResult,
  MonthlyBreakdown,
  ParentMonthInput,
  MonthMode,
} from './types';
import { validatePartnerBonus, validateParallelBasis } from './partnerBonusValidation';

/** clamp(value, min, max) – Wert in Bereich begrenzen */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Ersatzrate nach Nettoeinkommen vor Geburt (vereinfachte amtliche Logik).
 * - Über 1240 €: 65 %
 * - 1200–1240 €: linear von 67 % auf 65 %
 * - 1000–1200 €: 67 %
 * - Unter 1000 €: +0,1 % pro 2 € unter 1000, max. 100 %
 */
export function getReplacementRate(incomeBeforeNet: number): number {
  if (incomeBeforeNet <= 0) return 0;
  // Über 1240 €: 65 %
  if (incomeBeforeNet > 1240) return 0.65;
  // 1200–1240 €: linear von 67 % auf 65 %
  if (incomeBeforeNet > 1200) {
    const t = (incomeBeforeNet - 1200) / (1240 - 1200);
    return 0.67 - t * (0.67 - 0.65);
  }
  // 1000–1200 €: 67 %
  if (incomeBeforeNet >= 1000) return 0.67;
  // Unter 1000 €: +0,1 Prozentpunkte pro 2 € unter 1000, max. 100 %
  const steps = Math.floor((1000 - incomeBeforeNet) / 2);
  const increase = steps * 0.001;
  return Math.min(1, 0.67 + increase);
}

/**
 * Geschwisterbonus: 10 % des Betrags, mindestens 75 €.
 */
export function calculateSiblingBonus(amount: number): number {
  if (amount <= 0) return 0;
  const tenPercent = amount * 0.1;
  return Math.max(75, tenPercent);
}

/** Mehrlingszuschlag pro zusätzlichem Kind (€) */
const MEHRLINGSZUSCHLAG_PER_CHILD = 300;

/**
 * Gesetzliche Einkommensgrenzen (zvE, Jahreswert).
 * Entscheidungsgrundlage: keine Berechnung bei Überschreitung.
 */
export const THRESHOLD_COUPLE_ANNUAL = 175_000;
export const THRESHOLD_SINGLE_ANNUAL = 150_000;

/**
 * Monatliche Näherungswerte (nur zur Orientierung, keine harte Grenze).
 * 175.000 / 12 ≈ 14.583 €, 150.000 / 12 = 12.500 €
 */
export const MONTHLY_APPROX_COUPLE = 14_583;
export const MONTHLY_APPROX_SINGLE = 12_500;

/** @deprecated Nutze THRESHOLD_* und estimatedAnnualIncome. Nur für Tests/Abwärtskompatibilität. */
export const INCOME_GUARD_MONTHLY_HOUSEHOLD = 15_000;

export interface MonthlyCalculationInput {
  type: 'basis' | 'plus' | 'partnerBonus';
  incomeBeforeNet: number;
  incomeDuringNet: number;
  hoursPerWeek: number;
  hasSiblingBonus: boolean;
  additionalChildren: number;
}

export interface MonthlyCalculationOutput {
  amount: number;
  warnings: string[];
  breakdown?: MonthlyBreakdown;
}

/**
 * Berechnet Elterngeld für einen Monat (MVP).
 */
export function calculateMonthlyElterngeld(input: MonthlyCalculationInput): MonthlyCalculationOutput {
  const warnings: string[] = [];

  // Stunden > 32 bei Plus/PartnerBonus problematisch (nur wenn Wert eingetragen)
  if (
    (input.type === 'plus' || input.type === 'partnerBonus') &&
    input.hoursPerWeek != null &&
    input.hoursPerWeek > 32
  ) {
    warnings.push(
      `Mehr als 32 Wochenstunden: ElterngeldPlus/Partnerschaftsbonus in der Regel nicht zulässig.`
    );
  }

  const loss = Math.max(0, input.incomeBeforeNet - input.incomeDuringNet);
  const replacementRate = getReplacementRate(input.incomeBeforeNet);
  const replacementRatePercent = Math.round(replacementRate * 100);

  const MIN_BASIS = 300;
  const MAX_BASIS = 1800;
  const MIN_PLUS = 150;
  const MAX_PLUS = 900;

  let baseAmount: number;
  let appliedMin: number | undefined;
  let appliedMax: number | undefined;
  let theoreticalBaseClamp: number | undefined;
  let maxPlus: number | undefined;

  if (input.type === 'basis') {
    baseAmount = loss * replacementRate;
    const beforeClamp = baseAmount;
    baseAmount = clamp(baseAmount, MIN_BASIS, MAX_BASIS);
    if (beforeClamp < MIN_BASIS) appliedMin = MIN_BASIS;
    if (beforeClamp > MAX_BASIS) appliedMax = MAX_BASIS;
  } else if (input.type === 'plus' || input.type === 'partnerBonus') {
    const baseFromLoss = loss * replacementRate;
    const theoreticalBase = input.incomeBeforeNet * replacementRate;
    theoreticalBaseClamp = clamp(theoreticalBase, MIN_BASIS, MAX_BASIS);
    maxPlus = theoreticalBaseClamp / 2;
    let plusAmount = Math.min(baseFromLoss / 2, maxPlus);
    const beforeClamp = plusAmount;
    baseAmount = Math.max(MIN_PLUS, plusAmount);
    baseAmount = Math.min(MAX_PLUS, baseAmount);
    if (beforeClamp < MIN_PLUS) appliedMin = MIN_PLUS;
    if (beforeClamp > MAX_PLUS) appliedMax = MAX_PLUS;
  } else {
    baseAmount = loss * replacementRate;
  }

  let amount = Math.round(baseAmount);
  let siblingBonus: number | undefined;
  const additionalChildrenAmount = input.additionalChildren * MEHRLINGSZUSCHLAG_PER_CHILD;

  if (input.hasSiblingBonus) {
    siblingBonus = calculateSiblingBonus(amount);
    amount += siblingBonus;
  }

  amount += additionalChildrenAmount;

  const breakdown: MonthlyBreakdown = {
    incomeBeforeNet: input.incomeBeforeNet,
    incomeDuringNet: input.incomeDuringNet,
    loss,
    replacementRatePercent,
    baseAmount: Math.round(baseAmount),
    appliedMin,
    appliedMax,
    theoreticalBaseClamp,
    maxPlus,
    siblingBonus,
    additionalChildrenAmount: additionalChildrenAmount > 0 ? additionalChildrenAmount : undefined,
  };

  return { amount: Math.round(amount), warnings, breakdown };
}

/**
 * Berechnet den gesamten Plan und liefert UI-taugliche Ergebnisse.
 */
export function calculatePlan(plan: ElterngeldCalculationPlan): CalculationResult {
  const errors: string[] = [];
  const globalWarnings: string[] = [];

  if (!plan.childBirthDate?.trim()) {
    errors.push('Geburtsdatum oder voraussichtlicher Termin fehlt.');
  }

  const householdMonthlyIncome = plan.parents.reduce((sum, p) => sum + (p.incomeBeforeNet || 0), 0);
  const estimatedAnnualIncome = householdMonthlyIncome * 12;
  const parentsWithIncome = plan.parents.filter((p) => (p.incomeBeforeNet ?? 0) > 0);
  const isCouple = parentsWithIncome.length >= 2;

  const threshold = isCouple ? THRESHOLD_COUPLE_ANNUAL : THRESHOLD_SINGLE_ANNUAL;

  if (estimatedAnnualIncome > threshold) {
    errors.push(
      `Dein geschätztes Einkommen liegt über der zulässigen Grenze (ca. ${isCouple ? '14.500' : '12.500'} € monatlich bei ${isCouple ? 'Paaren' : 'Alleinerziehenden'}). Deshalb kann kein Elterngeld berechnet werden.`
    );
  }

  const parallelBasis = validateParallelBasis(plan);
  if (!parallelBasis.isValid && parallelBasis.warning) {
    globalWarnings.push(parallelBasis.warning);
  }

  if (errors.length > 0) {
    return {
      parents: plan.parents.map((p) => ({
        id: p.id,
        label: p.label,
        monthlyResults: [],
        total: 0,
        warnings: [],
      })),
      householdTotal: 0,
      validation: { isValid: false, errors, warnings: globalWarnings },
      meta: {
        isEstimate: true,
        disclaimer:
          'Unverbindliche Schätzung. Die endgültige Entscheidung trifft die zuständige Elterngeldstelle. Diese Berechnung dient der Orientierung und ersetzt keine amtliche Prüfung.',
        transparencyHints: [
          'Kein Anspruch auf Elterngeld besteht, wenn das zu versteuernde Einkommen im letzten Jahr über 175.000 € (Paare) bzw. 150.000 € (Alleinerziehende) liegt.',
          'Wir schätzen dein Einkommen aktuell auf Basis deiner Monatsangaben.',
          'Mutterschaftsleistungen: vereinfachte Berücksichtigung',
          'Parallelbezug Basis: maximal 1 Monat gleichzeitig erlaubt (wird geprüft)',
        ],
      },
    };
  }

  const parents: ParentCalculationResult[] = plan.parents.map((parent) => {
    const monthlyResults: MonthlyResult[] = [];
    const parentWarnings: string[] = [];

    if (parent.incomeBeforeNet <= 0 && parent.months.some((m) => m.mode !== 'none')) {
      parentWarnings.push('Einkommen vor Geburt fehlt – Berechnung nicht möglich.');
    }

    for (const m of parent.months) {
      if (m.mode === 'none') {
        monthlyResults.push({ month: m.month, mode: 'none', amount: 0, warnings: [] });
        continue;
      }

      const out = calculateMonthlyElterngeld({
        type: m.mode as 'basis' | 'plus' | 'partnerBonus',
        incomeBeforeNet: parent.incomeBeforeNet,
        incomeDuringNet: m.incomeDuringNet,
        hoursPerWeek: m.hoursPerWeek ?? 0,
        hasSiblingBonus: plan.hasSiblingBonus,
        additionalChildren: plan.additionalChildren,
      });

      const maternityWarning = m.hasMaternityBenefit
        ? 'Für diesen Lebensmonat werden Mutterschaftsleistungen vereinfacht berücksichtigt. Die tatsächliche Anrechnung kann abweichen.'
        : null;
      const warnings = maternityWarning ? [...out.warnings, maternityWarning] : out.warnings;

      let breakdown = out.breakdown;
      if (m.hasMaternityBenefit && breakdown) {
        breakdown = { ...breakdown, hasMaternityBenefit: true };
      }

      monthlyResults.push({
        month: m.month,
        mode: m.mode,
        amount: out.amount,
        warnings,
        breakdown,
        hasMaternityBenefit: m.hasMaternityBenefit,
      });
      parentWarnings.push(...warnings);
    }

    const total = monthlyResults.reduce((sum, r) => sum + r.amount, 0);

    return {
      id: parent.id,
      label: parent.label,
      monthlyResults,
      total,
      warnings: [...new Set(parentWarnings)],
    };
  });

  // Partnerschaftsbonus-Validierung
  const partnerBonusValidation = validatePartnerBonus(plan);
  if (partnerBonusValidation.warnings.length > 0) {
    globalWarnings.push(...partnerBonusValidation.warnings);
  }

  const householdTotal = parents.reduce((sum, p) => sum + p.total, 0);

  return {
    parents,
    householdTotal,
    validation: {
      isValid: errors.length === 0 && partnerBonusValidation.isValid,
      errors,
      warnings: globalWarnings,
    },
    meta: {
      isEstimate: true,
      disclaimer:
        'Unverbindliche Schätzung. Die endgültige Entscheidung trifft die zuständige Elterngeldstelle. Diese Berechnung dient der Orientierung und ersetzt keine amtliche Prüfung.',
      transparencyHints: [
        'Kein Anspruch auf Elterngeld besteht, wenn das zu versteuernde Einkommen im letzten Jahr über 175.000 € (Paare) bzw. 150.000 € (Alleinerziehende) liegt.',
        'Wir schätzen dein Einkommen aktuell auf Basis deiner Monatsangaben.',
        'Mutterschaftsleistungen: vereinfachte Berücksichtigung',
        'Parallelbezug Basis: maximal 1 Monat gleichzeitig erlaubt (wird geprüft)',
      ],
    },
  };
}
