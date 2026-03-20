/**
 * Schritt Monate planen – vereinfachte UX.
 * Verwendet: benefitPlan.model, parentAMonths, parentBMonths, partnershipBonus.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card } from '../../../../shared/ui/Card';
import { Button } from '../../../../shared/ui/Button';
import { MonthGrid } from '../ui/MonthGrid';
import { getMonthGridItemsFromCounts } from '../monthGridMappings';
import { ElterngeldSelectButton } from '../ui/ElterngeldSelectButton';
import { applicationToCalculationPlan } from '../applicationToCalculationPlan';
import { mergePlanIntoPreparation } from '../planToApplicationMerge';
import { calculatePlan, validatePartnerBonus } from '../calculation';
import type { OptimizationSuggestion } from '../calculation/elterngeldOptimization';

type OptimizationSummary = { hasAnySuggestions: boolean; partnerBonusSuggestion: OptimizationSuggestion | null };
import type { ElterngeldApplication, BenefitModel } from '../types/elterngeldTypes';
import type { ElterngeldCalculationPlan, CalculationResult } from '../calculation';

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

function extractMonthFromWarning(warning: string): number | null {
  const m = warning.match(/Monat\s+(\d+)/i);
  return m ? parseInt(m[1], 10) : null;
}

function getFirstRelevantMonth(result: CalculationResult): number | null {
  for (const p of result.parents) {
    const m = p.monthlyResults.find((r) => r.mode === 'partnerBonus' || r.mode === 'plus');
    if (m) return m.month;
  }
  return null;
}

type HintAction = 'focusMonth' | 'focusEinkommen' | 'focusGrunddaten' | 'focusMonatsplan' | 'openOptimization' | 'openPartnerBonusCheck' | null;

function getHintActionFromWarning(warning: string, result: CalculationResult): { label: string; action: HintAction; month?: number } {
  const month = extractMonthFromWarning(warning);
  if (month != null) return { label: `Monat ${month} anpassen`, action: 'focusMonth', month };
  if (warning.includes('Partnerschaftsbonus') || warning.includes('Partnerbonus')) return { label: 'Partnerschaftsbonus prüfen', action: 'openPartnerBonusCheck' };
  if (warning.includes('24–32') || warning.includes('Wochenstunden') || warning.includes('Arbeitszeit')) {
    const m = getFirstRelevantMonth(result);
    return { label: 'Arbeitszeit anpassen', action: m != null ? 'focusMonth' : 'focusMonatsplan', month: m ?? undefined };
  }
  if (warning.includes('Einkommen')) return { label: 'Einkommen prüfen', action: 'focusEinkommen' };
  if (warning.includes('Geburtsdatum') || warning.includes('Termin')) return { label: 'Grunddaten prüfen', action: 'focusGrunddaten' };
  return { label: '', action: null };
}

function getErrorActionFromError(error: string): { label: string; action: 'focusGrunddaten' | 'focusEinkommen' | null } {
  if (error.includes('Geburtsdatum') || error.includes('Termin')) return { label: 'Grunddaten prüfen', action: 'focusGrunddaten' };
  if (error.includes('Einkommen')) return { label: 'Einkommen prüfen', action: 'focusEinkommen' };
  return { label: '', action: null };
}

const MODEL_OPTIONS: { value: BenefitModel; label: string }[] = [
  { value: 'basis', label: 'Basiselterngeld' },
  { value: 'plus', label: 'ElterngeldPlus' },
  { value: 'mixed', label: 'Gemischt' },
];

/** Nur Basis und Plus für den Monatsdialog – für schnelle Umstellung beim Bonus-Planen */
const DIALOG_LEISTUNG_OPTIONS: { value: 'basis' | 'plus'; label: string }[] = [
  { value: 'basis', label: 'Basiselterngeld' },
  { value: 'plus', label: 'ElterngeldPlus' },
];

const MONTH_OPTIONS = [
  { id: 'mother' as const, label: 'Mutter', variant: 'mother' as const },
  { id: 'partner' as const, label: 'Partner', variant: 'partner' as const },
  { id: 'both' as const, label: 'Beide', variant: 'both' as const },
  { id: 'none' as const, label: 'Kein Bezug', variant: 'none' as const },
] as const;

const APPLY_RANGE_OPTIONS = [
  { id: 'next1' as const, label: 'nächsten Monat', count: 1 },
  { id: 'next3' as const, label: 'nächste 3 Monate', count: 3 },
  { id: 'toEnd' as const, label: 'alle folgenden Monate', count: -1 },
] as const;

/** Formatiert Monatsnummern für Anzeige (z. B. "3–6" oder "3, 5, 7"). Nur Darstellung, keine Logik. */
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

function getCurrentMonthState(
  month: number,
  countA: number,
  countB: number,
  partnershipBonus: boolean,
  hasPartner: boolean
): 'mother' | 'partner' | 'both' | 'none' {
  const motherHas = month <= countA;
  const partnerHas = hasPartner && month <= countB;
  if (motherHas && partnerHas && partnershipBonus) return 'both';
  if (motherHas && partnerHas) return 'both';
  if (motherHas) return 'mother';
  if (partnerHas) return 'partner';
  return 'none';
}

type Props = {
  values: ElterngeldApplication;
  onChange: (values: ElterngeldApplication) => void;
  /** Zu anderem Wizard-Step springen, optional mit scrollToId */
  onNavigateToStep?: (stepId: string, scrollToId?: string) => void;
  showOptimizationOverlay?: boolean;
  onShowOptimizationOverlay?: (open: boolean) => void;
  optimizationSummary?: OptimizationSummary;
  /** Nach erfolgreicher Anwendung des Bonus-Fix (Toast etc.) */
  onApplyBonusFix?: () => void;
};

type ApplyRangeId = 'next1' | 'next3' | 'toEnd';

export const StepPlan: React.FC<Props> = ({
  values,
  onChange,
  onNavigateToStep,
  showOptimizationOverlay = false,
  onShowOptimizationOverlay,
  optimizationSummary = { hasAnySuggestions: false, partnerBonusSuggestion: null },
  onApplyBonusFix,
}) => {
  const [activeMonth, setActiveMonth] = useState<number | null>(null);
  const [showPartnerBonusCheck, setShowPartnerBonusCheck] = useState(false);
  const [selectedApplyRange, setSelectedApplyRange] = useState<ApplyRangeId | null>(null);
  const [showLeistungDetails, setShowLeistungDetails] = useState(false);
  const [showModelLeistungDetails, setShowModelLeistungDetails] = useState(false);
  const [selectedModelInDialog, setSelectedModelInDialog] = useState<'basis' | 'plus'>(() =>
    values.benefitPlan.model === 'basis' ? 'basis' : 'plus'
  );

  useEffect(() => {
    if (activeMonth !== null) {
      setSelectedModelInDialog(values.benefitPlan.model === 'basis' ? 'basis' : 'plus');
      setSelectedApplyRange(null);
    }
  }, [activeMonth, values.benefitPlan.model]);

  const update = useCallback(
    (field: string, value: string | boolean) => {
      onChange({
        ...values,
        benefitPlan: { ...values.benefitPlan, [field]: value },
      });
    },
    [values, onChange]
  );

  const handleMonthClick = useCallback((month: number) => {
    setActiveMonth(month);
  }, []);
  const closePanel = useCallback(() => {
    setActiveMonth(null);
    setSelectedApplyRange(null);
  }, []);

  const maxMonths = values.benefitPlan.model === 'plus' ? 24 : 14;
  const countA = parseMonthCount(values.benefitPlan.parentAMonths);
  const countB =
    values.applicantMode === 'both_parents'
      ? parseMonthCount(values.benefitPlan.parentBMonths)
      : 0;
  const hasPartner = values.applicantMode === 'both_parents';

  const assignMonth = useCallback(
    (month: number, who: 'mother' | 'partner' | 'both' | 'none') => {
      const capped = Math.min(Math.max(month, 0), maxMonths);
      const bp = values.benefitPlan;

      if (who === 'mother') {
        onChange({
          ...values,
          benefitPlan: {
            ...bp,
            parentAMonths: String(capped),
            parentBMonths: String(Math.min(countB, capped - 1)),
            partnershipBonus: false,
          },
        });
      } else if (who === 'partner') {
        onChange({
          ...values,
          benefitPlan: {
            ...bp,
            parentAMonths: String(Math.min(countA, capped - 1)),
            parentBMonths: String(capped),
            partnershipBonus: false,
          },
        });
      } else if (who === 'both') {
        onChange({
          ...values,
          benefitPlan: {
            ...bp,
            parentAMonths: String(Math.max(countA, capped)),
            parentBMonths: String(Math.max(countB, capped)),
            partnershipBonus: true,
          },
        });
      } else {
        onChange({
          ...values,
          benefitPlan: {
            ...bp,
            parentAMonths: String(Math.min(countA, capped - 1)),
            parentBMonths: hasPartner ? String(Math.min(countB, capped - 1)) : bp.parentBMonths,
          },
        });
      }
      /* Dialog bleibt offen – Nutzer kann optional „auf Folgemonate übernehmen“ nutzen */
    },
    [values, onChange, maxMonths, countA, countB, hasPartner]
  );

  const currentState =
    activeMonth !== null
      ? getCurrentMonthState(
          activeMonth,
          countA,
          countB,
          values.benefitPlan.partnershipBonus,
          hasPartner
        )
      : null;

  const handleConfirm = useCallback(() => {
    const bp = values.benefitPlan;
    let newBp = { ...bp, model: selectedModelInDialog };

    if (selectedApplyRange !== null && activeMonth !== null && currentState) {
      const opt = APPLY_RANGE_OPTIONS.find((o) => o.id === selectedApplyRange);
      if (opt) {
        const endMonth =
          opt.count === -1 ? maxMonths : Math.min(activeMonth + opt.count, maxMonths);
        if (currentState === 'mother') {
          newBp = {
            ...newBp,
            parentAMonths: String(Math.max(countA, endMonth)),
            parentBMonths: String(Math.min(countB, activeMonth - 1)),
            partnershipBonus: false,
          };
        } else if (currentState === 'partner') {
          newBp = {
            ...newBp,
            parentAMonths: String(Math.min(countA, activeMonth - 1)),
            parentBMonths: String(Math.max(countB, endMonth)),
            partnershipBonus: false,
          };
        } else if (currentState === 'both') {
          newBp = {
            ...newBp,
            parentAMonths: String(Math.max(countA, endMonth)),
            parentBMonths: String(Math.max(countB, endMonth)),
            partnershipBonus: true,
          };
        } else {
          newBp = {
            ...newBp,
            parentAMonths: String(Math.min(countA, activeMonth - 1)),
            parentBMonths: hasPartner ? String(Math.min(countB, activeMonth - 1)) : bp.parentBMonths,
          };
        }
      }
    }

    onChange({ ...values, benefitPlan: newBp });
    closePanel();
  }, [
    selectedApplyRange,
    selectedModelInDialog,
    activeMonth,
    currentState,
    values,
    onChange,
    maxMonths,
    countA,
    countB,
    hasPartner,
    closePanel,
  ]);

  const planForCheck = applicationToCalculationPlan(values);

  const planResult = useMemo(() => {
    try {
      return calculatePlan(planForCheck);
    } catch {
      return null;
    }
  }, [planForCheck]);

  const partnerBonusValidation = useMemo(() => validatePartnerBonus(planForCheck), [planForCheck]);

  const mainHint = useMemo(() => {
    if (!planResult) return null;
    const { validation } = planResult;
    const firstError = validation.errors[0];
    if (firstError) {
      const { label, action } = getErrorActionFromError(firstError);
      if (action) return { text: firstError, label, action: action as HintAction, month: undefined as number | undefined };
    }
    for (const w of validation.warnings) {
      const { label, action, month } = getHintActionFromWarning(w, planResult);
      if (action) return { text: w, label, action, month };
    }
    return null;
  }, [planResult]);

  const items = useMemo(
    () =>
      getMonthGridItemsFromCounts(
        countA,
        countB,
        values.benefitPlan.model,
        values.benefitPlan.partnershipBonus,
        hasPartner,
        maxMonths
      ),
    [countA, countB, values.benefitPlan.model, values.benefitPlan.partnershipBonus, hasPartner, maxMonths]
  );

  return (
    <Card id="elterngeld-plan-card" className="still-daily-checklist__card elterngeld-plan-card">
      <h3 className="elterngeld-step__title">Monate planen</h3>
      <p className="elterngeld-step__hint elterngeld-step__hint--section">
        Plane hier, welcher Elternteil in welchem Monat Elterngeld bezieht.
      </p>

      {planResult && mainHint && mainHint.action && mainHint.action !== 'openPartnerBonusCheck' && (planResult.validation.errors.length > 0 || planResult.validation.warnings.length > 0) && (
        <div className="elterngeld-plan__status-card elterngeld-step__notice elterngeld-step__notice--warning">
          <p className="elterngeld-plan__status-text">{mainHint.text}</p>
          <Button
            type="button"
            variant="primary"
            className="btn--softpill elterngeld-plan__status-btn"
            onClick={() => {
              if (mainHint.action === 'focusMonth' && mainHint.month != null) {
                setActiveMonth(mainHint.month);
                const el = document.getElementById('elterngeld-plan-month-grid') ?? document.getElementById('elterngeld-plan-card');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              } else if (mainHint.action === 'openOptimization') {
                onShowOptimizationOverlay?.(true);
              } else if (mainHint.action === 'focusEinkommen' && onNavigateToStep) {
                onNavigateToStep('einkommen');
              } else if (mainHint.action === 'focusGrunddaten' && onNavigateToStep) {
                onNavigateToStep('geburtKind');
              } else if (mainHint.action === 'focusMonatsplan') {
                const el = document.getElementById('elterngeld-plan-month-grid') ?? document.getElementById('elterngeld-plan-card');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
          >
            {mainHint.label}
          </Button>
        </div>
      )}

      {planResult && (
        <Card className="elterngeld-plan__summary-card still-daily-checklist__card">
          <div className="elterngeld-plan__summary-rows">
            <div className="elterngeld-plan__summary-row">
              <span className="elterngeld-plan__summary-label">Gesamtbetrag</span>
              <span className="elterngeld-plan__summary-value">{formatCurrency(planResult.householdTotal)}</span>
            </div>
            <div className="elterngeld-plan__summary-row">
              <span className="elterngeld-plan__summary-label">Dauer</span>
              <span className="elterngeld-plan__summary-value">{countBezugMonths(planResult)} Monate</span>
            </div>
            <div className="elterngeld-plan__summary-row">
              <span className="elterngeld-plan__summary-label">Bonusmonate</span>
              <span className="elterngeld-plan__summary-value">{countPartnerBonusMonths(planResult)} Bonusmonate</span>
            </div>
          </div>
        </Card>
      )}

      {hasPartner && !partnerBonusValidation.isValid && !(mainHint && mainHint.action && mainHint.action !== 'openPartnerBonusCheck') && (
        <div className="elterngeld-plan__status-card elterngeld-step__notice elterngeld-step__notice--warning">
          <p className="elterngeld-plan__status-text">
            Der Partnerschaftsbonus ist möglich, aber noch nicht passend eingeplant.
          </p>
        </div>
      )}

      {hasPartner && partnerBonusValidation.isValid && optimizationSummary.hasAnySuggestions && !(mainHint && mainHint.action && mainHint.action !== 'openPartnerBonusCheck') && (
        <div className="elterngeld-plan__status-card elterngeld-step__notice elterngeld-step__notice--tip">
          <p className="elterngeld-plan__status-text">Dein Plan ist grundsätzlich stimmig.</p>
          <Button
            type="button"
            variant="secondary"
            className="btn--softpill elterngeld-plan__status-btn"
            onClick={() => onShowOptimizationOverlay?.(true)}
          >
            Optimierung jetzt anwenden
          </Button>
        </div>
      )}

      {(!hasPartner || (partnerBonusValidation.isValid && !optimizationSummary.hasAnySuggestions)) && !(mainHint && mainHint.action) && (
        <div className="elterngeld-plan__status-card elterngeld-step__notice elterngeld-step__notice--tip">
          <p className="elterngeld-plan__status-text">Dein Plan ist grundsätzlich stimmig.</p>
        </div>
      )}

      <div className="elterngeld-plan__model-row">
        <span className="elterngeld-plan__model-label">Standard-Leistung für neue Monate</span>
        <p className="elterngeld-plan__model-hint">
          Diese Einstellung wird für neue Monate im Plan verwendet.
          Du kannst sie im Monatsdialog jederzeit ändern.
        </p>
        <div className="elterngeld-plan__model-btns">
          {MODEL_OPTIONS.map((opt) => {
            const isSelected = values.benefitPlan.model === opt.value;
            return (
              <ElterngeldSelectButton
                key={opt.value}
                label={opt.label}
                selected={isSelected}
                showCheck={false}
                onClick={() => update('model', opt.value)}
                ariaPressed={isSelected}
                className="elterngeld-plan__model-btn elterngeld-select-btn--compact"
              />
            );
          })}
        </div>
        <div className="elterngeld-hint elterngeld-hint--model">
          <p className="elterngeld-hint__text">
            Basiselterngeld = mehr Geld pro Monat, kürzere Dauer
            <br />
            ElterngeldPlus = weniger pro Monat, dafür länger und mit Teilzeit kombinierbar
          </p>
          <button
            type="button"
            className="elterngeld-hint__toggle"
            onClick={() => setShowModelLeistungDetails((v) => !v)}
            aria-expanded={showModelLeistungDetails}
          >
            {showModelLeistungDetails ? 'Weniger anzeigen' : 'Mehr erfahren'}
          </button>
          {showModelLeistungDetails && (
            <div className="elterngeld-hint__details">
              <h4 className="elterngeld-hint__details-title">Unterschied Basiselterngeld und ElterngeldPlus</h4>
              <p className="elterngeld-hint__details-text">
                <strong>Basiselterngeld</strong>
                <br />
                höhere monatliche Auszahlung · kürzere Bezugsdauer
              </p>
              <p className="elterngeld-hint__details-text">
                <strong>ElterngeldPlus</strong>
                <br />
                geringere monatliche Auszahlung · längere Bezugsdauer · sinnvoll bei Teilzeit
              </p>
              <p className="elterngeld-hint__details-text">
                <strong>Partnerschaftsbonus</strong>
                <br />
                nur mit ElterngeldPlus möglich
              </p>
              <p className="elterngeld-hint__details-text elterngeld-hint__details-text--sub">
                Diese Auswahl ist die Voreinstellung für neue Monate.
                Im Monatsdialog kannst du die Leistung pro Monat ändern.
              </p>
            </div>
          )}
        </div>
      </div>

      <div id="elterngeld-plan-month-grid" className="elterngeld-plan__month-grid-wrap">
        <MonthGrid
          items={items}
          onMonthClick={handleMonthClick}
          activeMonth={activeMonth ?? undefined}
        />
      </div>

      <div className="elterngeld-plan__counts elterngeld-plan__counts--secondary">
        <div className="elterngeld-plan__summary-card">
          <h4 className="elterngeld-plan__summary-title">Monatsübersicht</h4>
          <div className="elterngeld-plan__summary-rows">
            <div className="elterngeld-plan__summary-row">
              <span className="elterngeld-plan__summary-label">Mutter:</span>
              <span className="elterngeld-plan__summary-value">{countA} Monate</span>
            </div>
            {hasPartner && (
              <div className="elterngeld-plan__summary-row">
                <span className="elterngeld-plan__summary-label">Partner:</span>
                <span className="elterngeld-plan__summary-value">{countB} Monate</span>
              </div>
            )}
          </div>
          <p className="elterngeld-plan__summary-hint">
            Die Monatszahlen werden automatisch aus dem Plan oben berechnet.
            Monate mit gleichzeitigem Bezug werden bei beiden Eltern gezählt.
          </p>
        </div>
      </div>

      {activeMonth !== null && (
        <div
          className="elterngeld-plan__panel-overlay"
          onClick={(e) => { if (e.target === e.currentTarget) closePanel(); }}
          onKeyDown={(e) => e.key === 'Escape' && closePanel()}
          role="button"
          tabIndex={0}
          aria-label="Schließen"
        >
          <div
            className="elterngeld-plan__panel scroll-container"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="elterngeld-plan-panel-title"
          >
            <div className="scroll-content">
            <h4 id="elterngeld-plan-panel-title" className="elterngeld-plan__panel-title">
              Lebensmonat {activeMonth}
            </h4>
            <div className="elterngeld-plan__panel-leistung">
              <span className="elterngeld-plan__panel-leistung-label">Leistung</span>
              <div className="elterngeld-plan__panel-leistung-btns">
                {DIALOG_LEISTUNG_OPTIONS.map((opt) => (
                  <ElterngeldSelectButton
                    key={opt.value}
                    label={opt.label}
                    selected={selectedModelInDialog === opt.value}
                    showCheck={false}
                    onClick={() => setSelectedModelInDialog(opt.value)}
                    ariaPressed={selectedModelInDialog === opt.value}
                    className="elterngeld-plan__panel-leistung-btn elterngeld-select-btn--compact"
                  />
                ))}
              </div>
              <div className="elterngeld-hint elterngeld-hint--leistung">
                <p className="elterngeld-hint__text">
                  Basiselterngeld = mehr Geld pro Monat, kürzere Dauer
                  <br />
                  ElterngeldPlus = weniger pro Monat, dafür länger und mit Teilzeit kombinierbar
                </p>
                <button
                  type="button"
                  className="elterngeld-hint__toggle"
                  onClick={(e) => { e.stopPropagation(); setShowLeistungDetails((v) => !v); }}
                  aria-expanded={showLeistungDetails}
                >
                  {showLeistungDetails ? 'Weniger anzeigen' : 'Mehr erfahren'}
                </button>
                {showLeistungDetails && (
                  <div className="elterngeld-hint__details">
                    <h4 className="elterngeld-hint__details-title">Unterschied Basiselterngeld und ElterngeldPlus</h4>
                    <p className="elterngeld-hint__details-text">
                      <strong>Basiselterngeld</strong>
                      <br />
                      höhere monatliche Auszahlung · kürzere Bezugsdauer
                    </p>
                    <p className="elterngeld-hint__details-text">
                      <strong>ElterngeldPlus</strong>
                      <br />
                      geringere monatliche Auszahlung · längere Bezugsdauer · sinnvoll bei Teilzeit
                    </p>
                    <p className="elterngeld-hint__details-text">
                      <strong>Partnerschaftsbonus</strong>
                      <br />
                      nur mit ElterngeldPlus möglich · beide Eltern müssen gleichzeitig ElterngeldPlus beziehen
                    </p>
                  </div>
                )}
              </div>
            </div>
            <p className="elterngeld-plan__panel-sub">Wer nimmt diesen Monat?</p>
            <div className="elterngeld-plan__panel-actions">
              {MONTH_OPTIONS.filter((o) => (o.id === 'partner' || o.id === 'both') ? hasPartner : true).map((opt) => (
                <ElterngeldSelectButton
                  key={opt.id}
                  label={opt.label}
                  variant={opt.variant}
                  selected={currentState === opt.id}
                  onClick={() => {
                    setSelectedApplyRange(null);
                    assignMonth(activeMonth, opt.id);
                  }}
                  ariaPressed={currentState === opt.id}
                  className="elterngeld-plan__panel-btn"
                />
              ))}
            </div>
            {hasPartner && activeMonth !== null && (() => {
              const isPlus = selectedModelInDialog === 'plus';
              const isBoth = currentState === 'both';
              const hint =
                isBoth && isPlus
                  ? 'Als Bonusmonat gesetzt.'
                  : isBoth && !isPlus
                    ? 'Für Partnerschaftsbonus in diesem Monat auf ElterngeldPlus wechseln.'
                    : isPlus && !isBoth
                      ? 'Für Partnerschaftsbonus müssen in diesem Monat beide Eltern ausgewählt sein.'
                      : 'Für Partnerschaftsbonus in diesem Monat ElterngeldPlus und „Beide“ wählen.';
              const showButton = !(isBoth && isPlus);
              const buttonLabel =
                isBoth && !isPlus
                  ? 'Auf ElterngeldPlus umstellen'
                  : isPlus && !isBoth
                    ? 'Beide auswählen'
                    : 'Diesen Monat als Bonusmonat setzen';
              const handleQuickFix = () => {
                setSelectedApplyRange(null);
                if (isBoth && !isPlus) {
                  update('model', 'plus');
                } else if (isPlus && !isBoth) {
                  assignMonth(activeMonth, 'both');
                } else {
                  update('model', 'plus');
                  assignMonth(activeMonth, 'both');
                }
              };
              return (
                <div className="elterngeld-plan__panel-hint-block">
                  <p className="elterngeld-plan__panel-hint elterngeld-plan__panel-hint--context">
                    {hint}
                  </p>
                  {showButton && (
                    <button
                      type="button"
                      className="elterngeld-plan__panel-quickfix-btn"
                      onClick={(e) => { e.stopPropagation(); handleQuickFix(); }}
                    >
                      {buttonLabel}
                    </button>
                  )}
                </div>
              );
            })()}
            <div className="elterngeld-plan__panel-apply-range" role="group" aria-label="Diese Auswahl auch anwenden auf">
              <p className="elterngeld-plan__panel-apply-range-label">Diese Auswahl auch anwenden auf</p>
              <div
                className="elterngeld-plan__panel-apply-range-options"
                onClick={(e) => e.stopPropagation()}
              >
                <ElterngeldSelectButton
                  label="nächsten Monat"
                  variant="default"
                  selected={selectedApplyRange === 'next1'}
                  showCheck={false}
                  onClick={() => setSelectedApplyRange((prev) => (prev === 'next1' ? null : 'next1'))}
                  ariaPressed={selectedApplyRange === 'next1'}
                  className="elterngeld-plan__panel-apply-range-btn"
                />
                <ElterngeldSelectButton
                  label="nächste 3 Monate"
                  variant="default"
                  selected={selectedApplyRange === 'next3'}
                  showCheck={false}
                  onClick={() => setSelectedApplyRange((prev) => (prev === 'next3' ? null : 'next3'))}
                  ariaPressed={selectedApplyRange === 'next3'}
                  className="elterngeld-plan__panel-apply-range-btn"
                />
                <ElterngeldSelectButton
                  label="alle folgenden Monate"
                  variant="default"
                  selected={selectedApplyRange === 'toEnd'}
                  showCheck={false}
                  onClick={() => setSelectedApplyRange((prev) => (prev === 'toEnd' ? null : 'toEnd'))}
                  ariaPressed={selectedApplyRange === 'toEnd'}
                  className="elterngeld-plan__panel-apply-range-btn"
                />
              </div>
              <p className="elterngeld-plan__panel-apply-range-note">
                Ohne Auswahl wird nur dieser Monat geändert.
              </p>
            </div>
            </div>
            <div className="scroll-footer">
              <button type="button" className="elterngeld-plan__panel-close" onClick={handleConfirm}>
                Übernehmen
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
