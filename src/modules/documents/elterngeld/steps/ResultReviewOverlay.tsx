/**
 * Rein informative Ergebnisübersicht im Wizard (ohne Optimierung / Varianten / Zielwahl).
 * Zusammensetzung vorhandener Bausteine wie in StepSummary / StepPlan.
 */

import React, { useMemo, useCallback } from 'react';
import { Modal } from '../../../../shared/ui/Modal';
import { Card } from '../../../../shared/ui/Card';
import { Button } from '../../../../shared/ui/Button';
import { ElterngeldLiveCard } from '../ui/ElterngeldLiveCard';
import { MonthGrid } from '../ui/MonthGrid';
import { MonthSummary } from '../ui/MonthSummary';
import { getMonthGridItemsFromValues } from '../monthGridMappings';
import type { ElterngeldApplication } from '../types/elterngeldTypes';
import type { CalculationResult } from '../calculation';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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

function countPartnerBonusMonths(result: CalculationResult): number {
  const months = new Set<number>();
  for (const p of result.parents) {
    for (const r of p.monthlyResults) {
      if (r.mode === 'partnerBonus') months.add(r.month);
    }
  }
  return months.size;
}

export type ResultReviewOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  values: ElterngeldApplication;
  result: CalculationResult;
};

export const ResultReviewOverlay: React.FC<ResultReviewOverlayProps> = ({
  isOpen,
  onClose,
  values,
  result,
}) => {
  const maxMonths = values.benefitPlan.model === 'plus' ? 24 : 14;
  const items = useMemo(() => getMonthGridItemsFromValues(values, maxMonths), [values, maxMonths]);
  /** Gleiche MonthGrid-Renderkette wie StepPlan (Kacheln als Button + elterngeld-tile--clickable); keine Planänderung. */
  const handleMonthClickReadOnly = useCallback((_month: number) => {}, []);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ergebnis prüfen" variant="softpill" scrollableContent hideFooter>
      <div className="elterngeld-optimization-overlay-content">
        <ElterngeldLiveCard result={result} />
        <Card className="still-daily-checklist__card elterngeld-plan__summary-card" role="article">
          <h3 className="elterngeld-step__title">Kennzahlen</h3>
          <p className="elterngeld-step__hint">
            Schätzung auf Basis deines aktuellen Plans – ohne Alternativvarianten.
          </p>
          <div className="elterngeld-plan__summary-rows">
            <div className="elterngeld-plan__summary-row">
              <span className="elterngeld-plan__summary-label">Geschätzter Gesamtbetrag</span>
              <span className="elterngeld-plan__summary-value">{formatCurrency(result.householdTotal)}</span>
            </div>
            <div className="elterngeld-plan__summary-row">
              <span className="elterngeld-plan__summary-label">Dauer</span>
              <span className="elterngeld-plan__summary-value">{countBezugMonths(result)} Monate</span>
            </div>
            <div className="elterngeld-plan__summary-row">
              <span className="elterngeld-plan__summary-label">Bonusmonate</span>
              <span className="elterngeld-plan__summary-value">{countPartnerBonusMonths(result)} Bonusmonate</span>
            </div>
          </div>
        </Card>
        <Card className="still-daily-checklist__card elterngeld-plan-card" role="article">
          <h3 className="elterngeld-step__title">Monatsübersicht</h3>
          <div id="elterngeld-plan-month-grid" className="elterngeld-plan__month-grid-wrap">
            <MonthGrid items={items} onMonthClick={handleMonthClickReadOnly} />
          </div>
          <div className="elterngeld-plan__counts elterngeld-plan__counts--secondary">
            <MonthSummary items={items} />
          </div>
        </Card>
        <div className="next-steps__stack elterngeld-optimization-goal__actions">
          <Button type="button" variant="primary" className="next-steps__button btn--softpill" onClick={onClose}>
            Schließen
          </Button>
        </div>
      </div>
    </Modal>
  );
};
