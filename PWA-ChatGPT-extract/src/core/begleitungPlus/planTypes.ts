/**
 * Plan-Modell für Begleitung Plus Abo-Auswahl.
 */

export type PlanId = 'monthly' | 'yearly';

export interface PlanOption {
  id: PlanId;
  /** i18n key für Anzeige (z.B. begleitungPlus.plan.optionMonthly) */
  labelKey: string;
  /** Zeigt "2 Monate geschenkt" Badge (nur yearly) */
  showSavingsBadge: boolean;
}

export const PLAN_OPTIONS: PlanOption[] = [
  { id: 'monthly', labelKey: 'begleitungPlus.plan.optionMonthly', showSavingsBadge: false },
  { id: 'yearly', labelKey: 'begleitungPlus.plan.optionYearly', showSavingsBadge: true },
];
