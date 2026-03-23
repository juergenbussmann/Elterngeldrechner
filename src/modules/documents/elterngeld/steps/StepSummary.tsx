/**
 * Schritt Zusammenfassung – reine Verdichtung von StepPlan.
 * Keine eigene Logik. Keine doppelte Darstellung.
 * Nutzt exakt dieselben Daten wie StepPlan: plan, result, getOptimizationSummary.
 */

import React, { useMemo } from 'react';
import { Card } from '../../../../shared/ui/Card';
import { Button } from '../../../../shared/ui/Button';
import { getMonthGridItemsFromValues } from '../monthGridMappings';
import type { ElterngeldApplication } from '../types/elterngeldTypes';
import type { CalculationResult } from '../calculation';
import type { OptimizationSuggestion } from '../calculation/elterngeldOptimization';

type OptimizationSummary = { hasAnySuggestions: boolean; partnerBonusSuggestion: OptimizationSuggestion | null };

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

function formatBothMonthRange(months: number[]): string {
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

function parseMonthCount(value: string): number {
  const n = parseInt(String(value || '').trim(), 10);
  return Number.isNaN(n) ? 0 : Math.max(0, Math.min(36, n));
}

function getErrorActionFromError(error: string): { label: string; action: 'focusGrunddaten' | 'focusEinkommen' | null } {
  if (error.includes('Geburtsdatum') || error.includes('Termin')) return { label: 'Grunddaten prüfen', action: 'focusGrunddaten' };
  if (error.includes('Einkommen')) return { label: 'Einkommen anpassen', action: 'focusEinkommen' };
  return { label: '', action: null };
}

function getHintActionFromWarning(warning: string, result: CalculationResult): { label: string; action: string | null } {
  const month = warning.match(/Monat\s+(\d+)/i);
  if (month) return { label: `Monat ${month[1]} anpassen`, action: 'focusMonth' };
  if (warning.includes('Partnerschaftsbonus') || warning.includes('Partnerbonus')) return { label: 'Partnerschaftsbonus prüfen', action: 'openPartnerBonusCheck' };
  if (warning.includes('24–32') || warning.includes('Wochenstunden') || warning.includes('Arbeitszeit')) {
    for (const p of result.parents) {
      const m = p.monthlyResults.find((r) => r.mode === 'partnerBonus' || r.mode === 'plus');
      if (m) return { label: 'Arbeitszeit anpassen', action: 'focusMonth' };
    }
    return { label: 'Arbeitszeit anpassen', action: 'focusMonatsplan' };
  }
  if (warning.includes('Einkommen')) return { label: 'Einkommen anpassen', action: 'focusEinkommen' };
  if (warning.includes('Geburtsdatum') || warning.includes('Termin')) return { label: 'Grunddaten prüfen', action: 'focusGrunddaten' };
  return { label: '', action: null };
}

type Props = {
  values: ElterngeldApplication;
  onCreatePdf: () => void;
  isSubmitting: boolean;
  onBackToPlan?: () => void;
  onOpenOptimization?: () => void;
  onNavigateToCalculation?: () => void;
  liveResult?: CalculationResult | null;
  optimizationSummary?: OptimizationSummary;
};

export const StepSummary: React.FC<Props> = ({
  values,
  onCreatePdf,
  isSubmitting,
  onBackToPlan,
  onOpenOptimization,
  onNavigateToCalculation,
  liveResult,
  optimizationSummary = { hasAnySuggestions: false, partnerBonusSuggestion: null },
}) => {
  const result = liveResult ?? null;

  const maxMonths = values.benefitPlan.model === 'plus' ? 24 : 14;
  const hasPartner = values.applicantMode === 'both_parents';

  const items = useMemo(
    () => getMonthGridItemsFromValues(values, maxMonths),
    [values, maxMonths]
  );

  const displayHint = useMemo(() => {
    if (!result) return null;
    const { validation } = result;
    const firstError = validation.errors[0];
    if (firstError) {
      const { action } = getErrorActionFromError(firstError);
      if (action) return { type: 'critical' as const, text: firstError };
    }
    for (const w of validation.warnings) {
      const { action } = getHintActionFromWarning(w, result);
      if (action) return { type: 'critical' as const, text: w };
    }
    if (optimizationSummary.hasAnySuggestions && onOpenOptimization) {
      return { type: 'optimization' as const };
    }
    if (hasPartner) {
      const bothMonths = items.filter((i) => i.state === 'both').map((i) => i.month);
      const rangeStr = formatBothMonthRange(bothMonths);
      const isBasisOnly = values.benefitPlan.model === 'basis';
      return {
        type: 'bonus' as const,
        bothMonths,
        rangeStr,
        isBasisOnly,
      };
    }
    return null;
  }, [result, optimizationSummary.hasAnySuggestions, optimizationSummary.partnerBonusSuggestion, onOpenOptimization, hasPartner, items, values.benefitPlan.model]);

  return (
    <Card className="still-daily-checklist__card elterngeld-summary-card">
      <h3 className="elterngeld-step__title">Zusammenfassung</h3>

      {result && (
        <div className="elterngeld-plan__summary-card still-daily-checklist__card">
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
        </div>
      )}

      {displayHint && displayHint.type === 'critical' && (
        <div className="elterngeld-summary__main-hint elterngeld-step__notice elterngeld-step__notice--warning">
          <p className="elterngeld-summary__hint-text">{displayHint.text}</p>
          {onBackToPlan && (
            <Button
              type="button"
              variant="secondary"
              className="btn--softpill elterngeld-summary__action-secondary"
              onClick={onBackToPlan}
            >
              Zurück zur Planung
            </Button>
          )}
        </div>
      )}

      {displayHint && displayHint.type === 'optimization' && onOpenOptimization && (
        <div className="elterngeld-summary__optimization-hint elterngeld-step__notice elterngeld-step__notice--tip">
          <p className="elterngeld-summary__hint-text">Dein Plan funktioniert. Du kannst ihn noch optimieren – mehr Geld oder bessere Verteilung.</p>
          <Button
            type="button"
            variant="secondary"
            className="btn--softpill elterngeld-summary__action-secondary"
            onClick={onOpenOptimization}
          >
            Optimierung ansehen
          </Button>
        </div>
      )}

      {displayHint && displayHint.type === 'bonus' && (
        <div className={`elterngeld-plan__main-hint elterngeld-plan__bonus-preview elterngeld-step__notice elterngeld-step__notice--tip ${displayHint.isBasisOnly ? 'elterngeld-plan__bonus-preview--basis-warning' : ''}`}>
          {displayHint.bothMonths.length > 0 ? (
            <>
              <span className="elterngeld-plan__bonus-preview-icon" aria-hidden="true">💡</span>{' '}
              Gemeinsame Monate erkannt – diese können Grundlage für Partnerschaftsbonus sein, wenn ElterngeldPlus genutzt wird.
              {displayHint.rangeStr && (
                <span className="elterngeld-plan__bonus-preview-range"> Mögliche gemeinsame Monate: Lebensmonat {displayHint.rangeStr}.</span>
              )}
              <span className="elterngeld-plan__bonus-preview-tip">
                Wähle oben „ElterngeldPlus“, um Bonusmonate zu planen.
              </span>
              {displayHint.isBasisOnly && (
                <span className="elterngeld-plan__bonus-preview-warning">
                  Partnerschaftsbonus ist nur mit ElterngeldPlus möglich.
                </span>
              )}
            </>
          ) : (
            <>
              <span className="elterngeld-plan__bonus-preview-icon" aria-hidden="true">⚠️</span>{' '}
              Keine gemeinsamen Monate geplant – für Partnerschaftsbonus gemeinsame Monate mit ElterngeldPlus erforderlich.
            </>
          )}
        </div>
      )}

      <div className="elterngeld-summary__actions elterngeld-summary__actions--secondary">
        {result && result.validation.errors.length === 0 && onOpenOptimization && (
          <Button
            type="button"
            variant="secondary"
            fullWidth
            className="next-steps__button btn--softpill elterngeld-summary__action-secondary"
            onClick={onOpenOptimization}
          >
            Optimierung ansehen
          </Button>
        )}
        {onNavigateToCalculation && result && result.validation.errors.length === 0 && (
          <Button
            type="button"
            variant="primary"
            fullWidth
            className="next-steps__button btn--softpill elterngeld-summary__action-primary"
            onClick={onNavigateToCalculation}
          >
            Ergebnis prüfen
          </Button>
        )}
        {onBackToPlan && (
          <Button
            type="button"
            variant="secondary"
            fullWidth
            className="next-steps__button btn--softpill elterngeld-summary__action-secondary"
            onClick={onBackToPlan}
          >
            Zurück zur Planung
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          fullWidth
          className="next-steps__button btn--softpill elterngeld-summary__action-secondary"
          onClick={onCreatePdf}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Wird erstellt…' : 'PDF Übersicht erstellen'}
        </Button>
      </div>
    </Card>
  );
};
