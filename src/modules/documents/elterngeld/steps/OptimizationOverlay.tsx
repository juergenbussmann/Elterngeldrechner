/**
 * Overlay zur Optimierungsdarstellung im Planungsscreen.
 * Nutzt denselben Step-Flow wie die Calculation-Page.
 */

import React from 'react';
import { Modal } from '../../../../shared/ui/Modal';
import { StepOptimizationBlock } from './StepCalculationResult';
import type { ElterngeldCalculationPlan, CalculationResult } from '../calculation';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCurrencySigned(amount: number): string {
  const formatted = formatCurrency(Math.abs(amount));
  if (amount > 0) return `+${formatted}`;
  if (amount < 0) return `−${formatted}`;
  return formatted;
}

function countBezugMonths(result: CalculationResult): number {
  const months = new Set<number>();
  for (const p of result.parents) {
    for (const r of p.monthlyResults) {
      if (r.mode !== 'none' || r.amount > 0) months.add(r.month);
    }
  }
  return months.size;
}

function hasPartnerBonus(result: CalculationResult): boolean {
  return result.parents.some((p) =>
    p.monthlyResults.some((m) => m.mode === 'partnerBonus')
  );
}

type OptimizationOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  plan: ElterngeldCalculationPlan;
  result: CalculationResult;
  hasAnySuggestions: boolean;
  onAdoptOptimization: (plan: ElterngeldCalculationPlan) => void;
  /** Schließt Overlay und führt sichtbar in die Monatsaufteilungs-Bearbeitung. */
  onNavigateToMonthEditing?: () => void;
  /** Optional: Vergleichsbasis für Deltas (Konsistenz mit Calculation-Page) */
  originalPlanForOptimization?: ElterngeldCalculationPlan | null;
  originalResultForOptimization?: CalculationResult | null;
  lastAdoptedPlan?: ElterngeldCalculationPlan | null;
  lastAdoptedResult?: CalculationResult | null;
};

export const OptimizationOverlay: React.FC<OptimizationOverlayProps> = ({
  isOpen,
  onClose,
  plan,
  result,
  onAdoptOptimization,
  onNavigateToMonthEditing,
  originalPlanForOptimization,
  originalResultForOptimization,
  lastAdoptedPlan,
  lastAdoptedResult,
}) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Aufteilung prüfen" variant="softpill" scrollableContent>
      <div className="elterngeld-optimization-overlay-content">
        <StepOptimizationBlock
          plan={plan}
          result={result}
          originalPlanForOptimization={originalPlanForOptimization}
          originalResultForOptimization={originalResultForOptimization}
          lastAdoptedPlan={lastAdoptedPlan}
          lastAdoptedResult={lastAdoptedResult}
          formatCurrency={formatCurrency}
          formatCurrencySigned={formatCurrencySigned}
          countBezugMonths={countBezugMonths}
          hasPartnerBonus={hasPartnerBonus}
          onAdoptOptimization={(p) => {
            onAdoptOptimization(p);
            onClose();
          }}
          onDiscardOptimization={onClose}
          onBackToOptimization={onClose}
          onNavigateToMonthEditing={onNavigateToMonthEditing}
        />
      </div>
    </Modal>
  );
};
