/**
 * Zieloptionen für buildOptimizationResult im Wizard (OptimizationOverlay).
 */

import type { OptimizationGoal } from '../calculation/elterngeldOptimization';

export type OptimizationEntryGoalOption = {
  value: Extract<OptimizationGoal, 'maxMoney' | 'longerDuration' | 'frontLoad' | 'partnerBonus'>;
  label: string;
  description: string;
};

export const MAIN_GOAL_OPTIONS: OptimizationEntryGoalOption[] = [
  {
    value: 'maxMoney',
    label: 'Mehr Geld',
    description: 'Höchstmögliche geschätzte Gesamtauszahlung.',
  },
  {
    value: 'longerDuration',
    label: 'Länger verteilt',
    description: 'Weniger pro Monat, dafür über mehr Monate.',
  },
  {
    value: 'frontLoad',
    label: 'Früher mehr',
    description: 'Mehr Auszahlung in den ersten Monaten.',
  },
];

/** Ziele für den ersten Planvorschläge-Screen (optional inkl. Partnerschaftsbonus). */
export function getOptimizationOverlayGoalOptions(opts: {
  partnerBonusHoursEligible: boolean;
  hasSecondParent: boolean;
  /** Bei Alleinerziehend entfällt der Partnerschaftsbonus in der UI. */
  applicantMode?: string;
}): OptimizationEntryGoalOption[] {
  const base = [...MAIN_GOAL_OPTIONS];
  if (
    opts.hasSecondParent &&
    opts.partnerBonusHoursEligible &&
    opts.applicantMode !== 'single_parent'
  ) {
    base.push({
      value: 'partnerBonus',
      label: 'Partnerschaftsbonus',
      description: 'Gemeinsame Bonusmonate nutzen, wo es sich lohnt.',
    });
  }
  return base;
}

/** Kurzer Kontext unter „Gewähltes Ziel“ in den Planvorschlägen (keine Logik). */
export const OPTIMIZATION_GOAL_CHOICE_HINT: Partial<Record<OptimizationGoal, string>> = {
  maxMoney: 'Die Vorschläge priorisieren die höchste geschätzte Gesamtsumme.',
  longerDuration:
    'Die Vorschläge strecken den Bezug über mehr Monate – typisch weniger pro Monat, dafür längere Dauer.',
  frontLoad: 'Die Vorschläge legen den Schwerpunkt auf höhere Beträge zu Beginn.',
  partnerBonus: 'Die Vorschläge nutzen gemeinsame Bonusmonate, wo das zur Anwendung passt.',
};
