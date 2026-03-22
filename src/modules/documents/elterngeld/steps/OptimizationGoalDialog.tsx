/**
 * Zieloptionen für die Berechnungsseite (Goal-Card).
 * Der zweite Optimierungseinstieg über einen separaten Dialog wurde entfernt.
 * Einziger gültiger Optimierungsweg: begleiteter Flow im Wizard (OptimizationOverlay).
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
