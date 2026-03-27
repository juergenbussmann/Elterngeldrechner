/**
 * Zieloptionen für buildOptimizationResult im Wizard (OptimizationOverlay, ResultReviewOverlay).
 */

export const MAIN_GOAL_OPTIONS: {
  value: 'maxMoney' | 'longerDuration' | 'frontLoad';
  label: string;
  description: string;
}[] = [
  { value: 'maxMoney', label: 'mehr Geld insgesamt', description: '' },
  { value: 'frontLoad', label: 'früher mehr Geld', description: '' },
  { value: 'longerDuration', label: 'länger verteilt', description: '' },
];
