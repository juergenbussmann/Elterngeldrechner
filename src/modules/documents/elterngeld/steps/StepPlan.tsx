/**
 * Schritt Monate planen – vereinfachte UX.
 * Verwendet: benefitPlan.model, parentAMonths, parentBMonths, partnershipBonus.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card } from '../../../../shared/ui/Card';
import { Button } from '../../../../shared/ui/Button';
import { MonthGrid } from '../ui/MonthGrid';
import { MonthStatusBar } from '../ui/MonthStatusBar';
import { getMonthGridItemsFromCounts } from '../monthGridMappings';
import { ElterngeldSelectButton } from '../ui/ElterngeldSelectButton';
import { PartnerBonusCheckDialog, type PartnerBonusAction } from './PartnerBonusCheckDialog';
import { OptimizationSuggestionBlock } from './OptimizationSuggestionBlock';
import { applicationToCalculationPlan } from '../applicationToCalculationPlan';
import { calculatePlan } from '../calculation';
import { buildOptimizationResult } from '../calculation/elterngeldOptimization';
import type { ElterngeldApplication, BenefitModel } from '../types/elterngeldTypes';
import type { ElterngeldCalculationPlan } from '../calculation';

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

/** Leitet benefitPlan-Updates aus einem ElterngeldCalculationPlan ab. Nur Mapping, keine Berechnung. */
function planToBenefitPlanUpdates(plan: ElterngeldCalculationPlan): {
  parentAMonths: string;
  parentBMonths: string;
  partnershipBonus: boolean;
  model?: BenefitModel;
} {
  const parentA = plan.parents[0];
  const parentB = plan.parents[1];
  const countA = parentA
    ? Math.max(0, ...parentA.months.filter((m) => m.mode !== 'none').map((m) => m.month))
    : 0;
  const countB = parentB
    ? Math.max(0, ...parentB.months.filter((m) => m.mode !== 'none').map((m) => m.month))
    : 0;
  const partnershipBonus = plan.parents.some((p) =>
    p.months.some((m) => m.mode === 'partnerBonus')
  );
  const result: {
    parentAMonths: string;
    parentBMonths: string;
    partnershipBonus: boolean;
    model?: BenefitModel;
  } = {
    parentAMonths: String(countA),
    parentBMonths: String(countB),
    partnershipBonus,
  };
  if (partnershipBonus) {
    result.model = 'plus';
  }
  return result;
}

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
  /** Beim Klick auf Aktionsbutton im PartnerBonusCheckDialog: zu anderem Wizard-Step springen, optional mit scrollToId */
  onNavigateToStep?: (stepId: string, scrollToId?: string) => void;
};

type ApplyRangeId = 'next1' | 'next3' | 'toEnd';

export const StepPlan: React.FC<Props> = ({ values, onChange, onNavigateToStep }) => {
  const [activeMonth, setActiveMonth] = useState<number | null>(null);
  const [showPartnerBonusCheck, setShowPartnerBonusCheck] = useState(false);
  const [selectedApplyRange, setSelectedApplyRange] = useState<ApplyRangeId | null>(null);
  const [selectedModelInDialog, setSelectedModelInDialog] = useState<'basis' | 'plus'>(() =>
    values.benefitPlan.model === 'basis' ? 'basis' : 'plus'
  );

  useEffect(() => {
    if (activeMonth !== null) {
      setSelectedModelInDialog(values.benefitPlan.model === 'basis' ? 'basis' : 'plus');
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

  const handlePartnerBonusAction = useCallback(
    (action: PartnerBonusAction) => {
      if (action.type === 'focusMonth') {
        setActiveMonth(action.month);
        const el =
          document.getElementById('elterngeld-plan-month-grid') ??
          document.getElementById('elterngeld-plan-card');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (action.type === 'focusSection') {
        if (action.section === 'elternArbeit') {
          onNavigateToStep?.('elternArbeit', 'elterngeld-step-eltern-arbeit-teilzeit');
        } else if (action.section === 'eltern') {
          onNavigateToStep?.('elternArbeit');
        } else if (action.section === 'monatsplan') {
          const el =
            document.getElementById('elterngeld-plan-month-grid') ??
            document.getElementById('elterngeld-plan-card');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    },
    [onNavigateToStep]
  );

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

  const partnerBonusSuggestion = useMemo(() => {
    if (!hasPartner) return null;
    try {
      const result = calculatePlan(planForCheck);
      const outcome = buildOptimizationResult(planForCheck, result, 'partnerBonus');
      if ('status' in outcome && outcome.status === 'unsupported') return null;
      const ors = outcome as { status: string; suggestions: { plan: ElterngeldCalculationPlan; status: string }[] };
      if (ors.status === 'improved' && ors.suggestions.length > 0 && ors.suggestions[0].status === 'improved') {
        return ors.suggestions[0];
      }
    } catch {
      /* ignore */
    }
    return null;
  }, [planForCheck, hasPartner]);

  return (
    <Card id="elterngeld-plan-card" className="still-daily-checklist__card elterngeld-plan-card">
      <h3 className="elterngeld-step__title">Monate planen</h3>
      <p className="elterngeld-step__hint elterngeld-step__hint--section">
        Plane hier, welcher Elternteil in welchem Monat Elterngeld bezieht.
      </p>

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
      </div>

      <div id="elterngeld-plan-month-grid" className="elterngeld-plan__month-grid-wrap">
      <MonthStatusBar
        activeMonth={activeMonth}
        who={
          activeMonth !== null
            ? getCurrentMonthState(
                activeMonth,
                countA,
                countB,
                values.benefitPlan.partnershipBonus,
                hasPartner
              )
            : 'none'
        }
        mode={
          activeMonth !== null
            ? (() => {
                const who = getCurrentMonthState(
                  activeMonth,
                  countA,
                  countB,
                  values.benefitPlan.partnershipBonus,
                  hasPartner
                );
                if (who === 'none') return 'none';
                if (who === 'both' && values.benefitPlan.partnershipBonus) return 'partnerBonus';
                return values.benefitPlan.model === 'plus' ? 'plus' : 'basis';
              })()
            : 'none'
        }
        showLegend
      />
      <MonthGrid
        items={getMonthGridItemsFromCounts(
          countA,
          countB,
          values.benefitPlan.model,
          values.benefitPlan.partnershipBonus,
          hasPartner,
          maxMonths
        )}
        onMonthClick={handleMonthClick}
        activeMonth={activeMonth ?? undefined}
      />
      </div>

      {hasPartner && (() => {
        const items = getMonthGridItemsFromCounts(
          countA,
          countB,
          values.benefitPlan.model,
          values.benefitPlan.partnershipBonus,
          hasPartner,
          maxMonths
        );
        const bothMonths = items.filter((i) => i.state === 'both').map((i) => i.month);
        const rangeStr = formatBothMonthRange(bothMonths);
        const isBasisOnly = values.benefitPlan.model === 'basis';
        return (
          <div className={`elterngeld-plan__bonus-preview ${isBasisOnly ? 'elterngeld-plan__bonus-preview--basis-warning' : ''}`}>
            {bothMonths.length > 0 ? (
              <>
                <span className="elterngeld-plan__bonus-preview-icon" aria-hidden="true">💡</span>{' '}
                Gemeinsame Monate erkannt – diese können Grundlage für Partnerschaftsbonus sein, wenn ElterngeldPlus genutzt wird.
                {rangeStr && (
                  <span className="elterngeld-plan__bonus-preview-range"> Mögliche gemeinsame Monate: Lebensmonat {rangeStr}.</span>
                )}
                <span className="elterngeld-plan__bonus-preview-tip">
                  Wähle oben „ElterngeldPlus“, um Bonusmonate zu planen.
                </span>
                {isBasisOnly && (
                  <span className="elterngeld-plan__bonus-preview-warning">
                    Partnerschaftsbonus ist nur mit ElterngeldPlus möglich.
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="elterngeld-plan__bonus-preview-icon" aria-hidden="true">⚠️</span>{' '}
                Keine gemeinsamen Monate geplant – Partnerschaftsbonus derzeit nicht möglich.
              </>
            )}
          </div>
        );
      })()}

      {partnerBonusSuggestion && (
        <OptimizationSuggestionBlock
          currentPlan={planForCheck}
          optimizedPlan={partnerBonusSuggestion.plan}
          hasPartner={hasPartner}
          onAdopt={() => {
            const updates = planToBenefitPlanUpdates(partnerBonusSuggestion.plan);
            onChange({
              ...values,
              benefitPlan: {
                ...values.benefitPlan,
                ...updates,
              },
            });
          }}
        />
      )}

      <div className="elterngeld-plan__counts">
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
        {hasPartner && (
          <>
            <div className="elterngeld-plan__partner-bonus-info">
              <h4 className="elterngeld-plan__partner-bonus-info-title">Partnerschaftsbonus prüfen</h4>
              <p className="elterngeld-plan__partner-bonus-info-text">
                Wenn beide Eltern gleichzeitig 24–32 Stunden pro Woche arbeiten,
                können zusätzliche Bonusmonate möglich sein.
              </p>
              <Button
                type="button"
                variant="secondary"
                className="btn--softpill elterngeld-step__partner-bonus-check-btn"
                onClick={() => setShowPartnerBonusCheck(true)}
              >
                Partnerschaftsbonus prüfen
              </Button>
            </div>
          </>
        )}
      </div>

      <PartnerBonusCheckDialog
        isOpen={showPartnerBonusCheck}
        onClose={() => setShowPartnerBonusCheck(false)}
        plan={planForCheck}
        onAction={handlePartnerBonusAction}
      />

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
            className="elterngeld-plan__panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="elterngeld-plan-panel-title"
          >
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
            </div>
            <p className="elterngeld-plan__panel-sub">Wer nimmt diesen Monat?</p>
            <div className="elterngeld-plan__panel-actions">
              {MONTH_OPTIONS.filter((o) => (o.id === 'partner' || o.id === 'both') ? hasPartner : true).map((opt) => (
                <ElterngeldSelectButton
                  key={opt.id}
                  label={opt.label}
                  variant={opt.variant}
                  selected={currentState === opt.id}
                  onClick={() => assignMonth(activeMonth, opt.id)}
                  ariaPressed={currentState === opt.id}
                  className="elterngeld-plan__panel-btn"
                />
              ))}
            </div>
            {hasPartner && (
              <>
                <p className="elterngeld-plan__panel-hint">
                  Tipp: Monate mit „Beide“ können gemeinsame Monate für den Partnerschaftsbonus sein.
                </p>
                <p className="elterngeld-plan__panel-hint elterngeld-plan__panel-hint--bonus">
                  Hinweis: Partnerschaftsbonus ist nur mit ElterngeldPlus möglich.
                </p>
              </>
            )}
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
            <button type="button" className="elterngeld-plan__panel-close" onClick={handleConfirm}>
              Übernehmen
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};
