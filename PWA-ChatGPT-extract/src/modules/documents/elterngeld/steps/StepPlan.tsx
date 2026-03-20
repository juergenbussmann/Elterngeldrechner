/**
 * Schritt Monate planen – vereinfachte UX.
 * Verwendet: benefitPlan.model, parentAMonths, parentBMonths, partnershipBonus.
 */

import React, { useState, useCallback } from 'react';
import { Card } from '../../../../shared/ui/Card';
import { Button } from '../../../../shared/ui/Button';
import { MonthGrid } from '../ui/MonthGrid';
import { MonthStatusBar } from '../ui/MonthStatusBar';
import { getMonthGridItemsFromCounts } from '../monthGridMappings';
import { ElterngeldSelectButton } from '../ui/ElterngeldSelectButton';
import { PartnerBonusCheckDialog, type PartnerBonusAction } from './PartnerBonusCheckDialog';
import { applicationToCalculationPlan } from '../applicationToCalculationPlan';
import type { ElterngeldApplication, BenefitModel } from '../types/elterngeldTypes';

const MODEL_OPTIONS: { value: BenefitModel; label: string }[] = [
  { value: 'basis', label: 'Basiselterngeld' },
  { value: 'plus', label: 'ElterngeldPlus' },
  { value: 'mixed', label: 'Gemischt' },
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
  { id: 'toEnd' as const, label: 'bis zum Ende', count: -1 },
] as const;

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

export const StepPlan: React.FC<Props> = ({ values, onChange, onNavigateToStep }) => {
  const [activeMonth, setActiveMonth] = useState<number | null>(null);
  const [showPartnerBonusCheck, setShowPartnerBonusCheck] = useState(false);

  const update = useCallback(
    (field: string, value: string | boolean) => {
      onChange({
        ...values,
        benefitPlan: { ...values.benefitPlan, [field]: value },
      });
    },
    [values, onChange]
  );

  const handleMonthClick = useCallback((month: number) => setActiveMonth(month), []);
  const closePanel = useCallback(() => setActiveMonth(null), []);

  const handlePartnerBonusAction = useCallback(
    (action: PartnerBonusAction) => {
      if (action.type === 'focusMonth') {
        setActiveMonth(action.month);
        const el = document.getElementById('elterngeld-plan-card');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (action.type === 'focusSection') {
        if (action.section === 'elternArbeit') {
          onNavigateToStep?.('elternArbeit', 'elterngeld-step-eltern-arbeit-teilzeit');
        } else if (action.section === 'eltern') {
          onNavigateToStep?.('elternArbeit');
        } else if (action.section === 'monatsplan') {
          const el = document.getElementById('elterngeld-plan-card');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      closePanel();
    },
    [values, onChange, maxMonths, countA, countB, hasPartner, closePanel]
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

  const applyToFollowingMonths = useCallback(
    (rangeId: 'next1' | 'next3' | 'toEnd') => {
      if (activeMonth === null || !currentState) return;
      const opt = APPLY_RANGE_OPTIONS.find((o) => o.id === rangeId);
      if (!opt) return;
      const endMonth =
        opt.count === -1
          ? maxMonths
          : Math.min(activeMonth + opt.count, maxMonths);
      const bp = values.benefitPlan;

      if (currentState === 'mother') {
        onChange({
          ...values,
          benefitPlan: {
            ...bp,
            parentAMonths: String(Math.max(countA, endMonth)),
            parentBMonths: String(Math.min(countB, activeMonth - 1)),
            partnershipBonus: false,
          },
        });
      } else if (currentState === 'partner') {
        onChange({
          ...values,
          benefitPlan: {
            ...bp,
            parentAMonths: String(Math.min(countA, activeMonth - 1)),
            parentBMonths: String(Math.max(countB, endMonth)),
            partnershipBonus: false,
          },
        });
      } else if (currentState === 'both') {
        onChange({
          ...values,
          benefitPlan: {
            ...bp,
            parentAMonths: String(Math.max(countA, endMonth)),
            parentBMonths: String(Math.max(countB, endMonth)),
            partnershipBonus: true,
          },
        });
      } else {
        onChange({
          ...values,
          benefitPlan: {
            ...bp,
            parentAMonths: String(Math.min(countA, activeMonth - 1)),
            parentBMonths: hasPartner
              ? String(Math.min(countB, activeMonth - 1))
              : bp.parentBMonths,
          },
        });
      }
      closePanel();
    },
    [
      activeMonth,
      currentState,
      values,
      onChange,
      maxMonths,
      countA,
      countB,
      hasPartner,
      closePanel,
    ]
  );

  const planForCheck = applicationToCalculationPlan(values);

  return (
    <Card id="elterngeld-plan-card" className="still-daily-checklist__card elterngeld-plan-card">
      <h3 className="elterngeld-step__title">Monate planen</h3>
      <p className="elterngeld-step__hint elterngeld-step__hint--section">
        Plane hier, welcher Elternteil in welchem Monat Elterngeld bezieht.
      </p>

      <div className="elterngeld-plan__model-row">
        <span className="elterngeld-plan__model-label">Leistung:</span>
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
          onClick={closePanel}
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
            <div className="elterngeld-plan__panel-apply-range">
              <p className="elterngeld-plan__panel-apply-range-label">Werte für folgende Monate übernehmen</p>
              <div className="elterngeld-plan__panel-apply-range-options">
                {APPLY_RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className="elterngeld-plan__panel-apply-range-btn"
                    onClick={() => applyToFollowingMonths(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" className="elterngeld-plan__panel-close" onClick={closePanel}>
              Schließen
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};
