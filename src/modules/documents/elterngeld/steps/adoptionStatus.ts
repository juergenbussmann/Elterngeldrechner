/**
 * Statusmodell für die Übernahme einer Optimierungsvariante.
 * Klare Unterscheidung der Zustände nach Auswahl und Übernahme.
 */

import type { ElterngeldCalculationPlan, CalculationResult } from '../calculation';
import { plansAreEqual, isPlanEmpty } from '../infra/calculationPlanStorage';

export type AdoptionStatusKind =
  | 'selected_not_adopted'
  | 'adopted_active'
  | 'adopted_manually_changed'
  | 'original_active'
  | 'optimization_stale'
  | 'idle';

/** Vereinfachte UI-Kategorie für maximale Klarheit (max. 3 + Ausnahme). */
export type AdoptionDisplayCategory = 'aktiv' | 'geändert' | 'nicht mehr aktuell' | 'noch nicht übernommen' | null;

export interface AdoptionStatus {
  kind: AdoptionStatusKind;
  /** Nutzerverständliche Statuszeile (max. 2 Sätze) */
  message: string;
  /** Zusätzlicher Hinweis bei manuell geändert / veraltet */
  hint?: string;
  /** Kurzbeschreibung der aktiven Variante (z.B. „Nur Mutter bezieht Elterngeld“) */
  activeVariantLabel?: string;
  /** Vereinfachte Darstellungskategorie für UI (aktiv | geändert | nicht mehr aktuell | noch nicht übernommen) */
  displayCategory: AdoptionDisplayCategory;
}

function getActiveVariantLabel(plan: ElterngeldCalculationPlan): string {
  const counts = plan.parents.map((p) => p.months.filter((m) => m.mode !== 'none').length);
  const a = counts[0] ?? 0;
  const b = counts[1] ?? 0;
  const labelA = plan.parents[0]?.label ?? 'Mutter';
  const labelB = plan.parents[1]?.label ?? 'Vater';
  if (a > 0 && b === 0) return `Nur ${labelA} bezieht Elterngeld.`;
  if (a === 0 && b > 0) return `Nur ${labelB} bezieht Elterngeld.`;
  if (a > 0 && b > 0) return 'Beide Eltern beziehen Elterngeld.';
  return 'Aktive Variante';
}

/**
 * Ermittelt den aktuellen Übernahme-Status aus Plan und Referenzen.
 */
export function getAdoptionStatus(
  plan: ElterngeldCalculationPlan,
  result: CalculationResult,
  opts: {
    planB?: ElterngeldCalculationPlan | null;
    lastAdoptedPlan?: ElterngeldCalculationPlan | null;
    lastAdoptedResult?: CalculationResult | null;
    originalPlanForOptimization?: ElterngeldCalculationPlan | null;
    optimizationStatus?: 'idle' | 'proposed' | 'adopted';
    optimizationGoal?: string;
  }
): AdoptionStatus {
  const {
    planB,
    lastAdoptedPlan,
    lastAdoptedResult,
    originalPlanForOptimization,
    optimizationStatus = 'idle',
    optimizationGoal,
  } = opts;

  const hasLastAdopted = Boolean(lastAdoptedPlan && lastAdoptedResult);
  const hasOriginal = Boolean(originalPlanForOptimization);
  const hasPlanB = Boolean(planB && !isPlanEmpty(planB));

  if (hasLastAdopted && plansAreEqual(plan, lastAdoptedPlan!)) {
    return {
      kind: 'adopted_active',
      message: 'Diese Variante ist jetzt in eurem Plan übernommen.',
      activeVariantLabel: getActiveVariantLabel(plan),
      displayCategory: 'aktiv',
    };
  }

  if (hasLastAdopted && hasOriginal && originalPlanForOptimization && plansAreEqual(plan, originalPlanForOptimization)) {
    return {
      kind: 'original_active',
      message: 'Ihr nutzt jetzt wieder euren ursprünglichen Plan.',
      hint: 'Die übernommene Optimierung ist nicht mehr aktiv.',
      displayCategory: 'aktiv',
    };
  }

  if (hasLastAdopted && !plansAreEqual(plan, lastAdoptedPlan!)) {
    return {
      kind: 'adopted_manually_changed',
      message: 'Ihr habt den Plan nach der Übernahme noch angepasst.',
      hint: 'Die gewählte Variante ist damit nicht mehr unverändert aktiv. Wir vergleichen weiter auf Basis eures aktuellen Plans.',
      displayCategory: 'geändert',
    };
  }

  if (optimizationGoal && hasOriginal && originalPlanForOptimization && !plansAreEqual(plan, originalPlanForOptimization)) {
    return {
      kind: 'optimization_stale',
      message: 'Diese Optimierung passt nicht mehr vollständig zu eurem aktuellen Stand.',
      hint: 'Bitte prüft die Vorschläge noch einmal auf Basis der aktuellen Eingaben.',
      displayCategory: 'nicht mehr aktuell',
    };
  }

  if (optimizationStatus === 'proposed' && optimizationGoal) {
    return {
      kind: 'selected_not_adopted',
      message: 'Ausgewählt, aber noch nicht übernommen.',
      displayCategory: 'noch nicht übernommen',
    };
  }

  return {
    kind: 'idle',
    message: '',
    displayCategory: null,
  };
}
