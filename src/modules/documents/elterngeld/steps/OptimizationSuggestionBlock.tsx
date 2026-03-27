/**
 * Kompakter Optimierungsvorschlag-Block für Plan- und Ergebnisbereich.
 * Nutzt ausschließlich buildOptimizationResult – keine neue Logik.
 */

import React from 'react';
import { Button } from '../../../../shared/ui/Button';
import {
  getCombinedMonthState,
  type ElterngeldCalculationPlan,
  type MonthMode,
} from '../calculation';
import type { CombinedWho } from '../calculation/monthCombinedState';

function formatMonthRange(months: number[]): string {
  if (months.length === 0) return '';
  if (months.length === 1) return String(months[0]);
  const sorted = [...months].sort((a, b) => a - b);
  let consecutive = true;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      consecutive = false;
      break;
    }
  }
  if (consecutive) return `${sorted[0]}–${sorted[sorted.length - 1]}`;
  return sorted.join(', ');
}

function formatStateLabel(who: CombinedWho, mode: MonthMode): string {
  if (who === 'none') return 'Kein Bezug';
  if (who === 'both') return 'Beide';
  if (who === 'mother') return mode === 'plus' ? 'Mutter – Plus' : 'Mutter – Basis';
  if (who === 'partner') return mode === 'plus' ? 'Partner – Plus' : 'Partner – Basis';
  return 'Beide – Bonus';
}

/** Ermittelt die Monatsänderungen zwischen aktuellem und optimiertem Plan. */
function getPlanChangeLines(
  currentPlan: ElterngeldCalculationPlan,
  optimizedPlan: ElterngeldCalculationPlan,
  hasPartner: boolean
): { months: number[]; toLabel: string }[] {
  const allMonths = new Set<number>();
  for (const p of currentPlan.parents) {
    for (const m of p.months) allMonths.add(m.month);
  }
  for (const p of optimizedPlan.parents) {
    for (const m of p.months) allMonths.add(m.month);
  }
  const months = [...allMonths].sort((a, b) => a - b);

  type Run = { months: number[]; toLabel: string };
  const changes: Run[] = [];
  let currentRun: Run | null = null;

  for (const month of months) {
    const cur = getCombinedMonthState(currentPlan, month, hasPartner);
    const opt = getCombinedMonthState(optimizedPlan, month, hasPartner);
    const fromLabel = formatStateLabel(cur.who, cur.mode);
    const toLabel = formatStateLabel(opt.who, opt.mode);

    if (fromLabel === toLabel) continue;

    if (currentRun && currentRun.toLabel === toLabel) {
      currentRun.months.push(month);
    } else {
      if (currentRun) changes.push(currentRun);
      currentRun = { months: [month], toLabel };
    }
  }
  if (currentRun) changes.push(currentRun);
  return changes;
}

export interface OptimizationSuggestionBlockProps {
  currentPlan: ElterngeldCalculationPlan;
  optimizedPlan: ElterngeldCalculationPlan;
  hasPartner: boolean;
  onAdopt: () => void;
  /** Entspricht getOptimizationAdoptUiState (Wizard: keine Übernahme ohne valide Teilzeit/PB). */
  adoptDisabled?: boolean;
  adoptHint?: string | null;
}

export const OptimizationSuggestionBlock: React.FC<OptimizationSuggestionBlockProps> = ({
  currentPlan,
  optimizedPlan,
  hasPartner,
  onAdopt,
  adoptDisabled = false,
  adoptHint = null,
}) => {
  const changeLines = getPlanChangeLines(currentPlan, optimizedPlan, hasPartner);

  return (
    <div className="elterngeld-optimization-suggestion">
      <h4 className="elterngeld-optimization-suggestion__title">Optimierung möglich</h4>
      <p className="elterngeld-optimization-suggestion__text">
        Mit einer kleinen Anpassung können gemeinsame Bonusmonate entstehen.
      </p>
      {changeLines.length > 0 && (
        <div className="elterngeld-optimization-suggestion__changes">
          <span className="elterngeld-optimization-suggestion__changes-label">Vorgeschlagene Änderung:</span>
          <ul className="elterngeld-optimization-suggestion__list">
            {changeLines.map((c, i) => (
              <li key={i}>
                Lebensmonat {formatMonthRange(c.months)}: {c.toLabel}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="elterngeld-optimization-suggestion__result">Ergebnis: Partnerschaftsbonus nutzbar</p>
      <Button
        type="button"
        variant="primary"
        className="btn--softpill elterngeld-optimization-suggestion__btn"
        onClick={onAdopt}
        disabled={adoptDisabled}
      >
        Vorschlag übernehmen
      </Button>
      {adoptDisabled && adoptHint && (
        <p className="elterngeld-step__notice elterngeld-step__notice--tip elterngeld-optimization-suggestion__adopt-hint" role="status">
          {adoptHint}
        </p>
      )}
    </div>
  );
};
