/**
 * Panel zur Auswahl des kombinierten Monatszustands.
 * Mutter | Partner | Beide | Kein Bezug + Modus (Basis/Plus/Bonus).
 * Einkommen und Wochenstunden bei Bezug.
 */

import React from 'react';
import { TextInput } from '../../../../shared/ui/TextInput';
import { ElterngeldSelectButton } from '../ui/ElterngeldSelectButton';
import { IncomeInput } from '../ui/IncomeInput';
import type { ElterngeldCalculationPlan, ParentMonthInput, MonthMode } from '../calculation';
import {
  getCombinedMonthState,
  applyCombinedSelection,
  type CombinedWho,
  type CombinedSelection,
} from '../calculation';

const COMBINED_OPTIONS: { who: CombinedWho; mode: MonthMode; label: string }[] = [
  { who: 'mother', mode: 'basis', label: 'Mutter – Basis' },
  { who: 'mother', mode: 'plus', label: 'Mutter – Plus' },
  { who: 'partner', mode: 'basis', label: 'Partner – Basis' },
  { who: 'partner', mode: 'plus', label: 'Partner – Plus' },
  { who: 'both', mode: 'partnerBonus', label: 'Beide – Bonus' },
  { who: 'none', mode: 'none', label: 'Kein Bezug' },
];

const APPLY_RANGE_OPTIONS = [
  { id: 'next1' as const, label: 'nächsten Monat', count: 1 },
  { id: 'next3' as const, label: 'nächste 3 Monate', count: 3 },
  { id: 'toEnd' as const, label: 'bis zum Ende', count: -1 },
] as const;

function parseNum(value: string | undefined): number {
  const s = String(value ?? '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

function getMonthData(
  plan: ElterngeldCalculationPlan,
  parentIndex: number,
  month: number
): ParentMonthInput | undefined {
  return plan.parents[parentIndex]?.months.find((m) => m.month === month);
}

function getMonthIndex(plan: ElterngeldCalculationPlan, parentIndex: number, month: number): number {
  return plan.parents[parentIndex]?.months.findIndex((m) => m.month === month) ?? -1;
}

/** Kopiert Auswahl und Werte (Einkommen, Std/Woche) von sourceMonth auf die Monate fromMonth..toMonth. */
function applySelectionToRange(
  plan: ElterngeldCalculationPlan,
  sourceMonth: number,
  fromMonth: number,
  toMonth: number,
  selection: CombinedSelection,
  hasPartner: boolean
): ElterngeldCalculationPlan {
  const mA = getMonthData(plan, 0, sourceMonth);
  const mB = hasPartner ? getMonthData(plan, 1, sourceMonth) : null;

  let result = plan;
  for (let m = fromMonth; m <= toMonth; m++) {
    result = applyCombinedSelection(result, m, selection, hasPartner);
  }

  if (!mA && !mB) return result;

  const patchMonthData = (
    months: ParentMonthInput[],
    targetMonth: number,
    patch: Partial<ParentMonthInput>
  ): ParentMonthInput[] => {
    const idx = months.findIndex((x) => x.month === targetMonth);
    if (idx < 0) return months;
    const next = [...months];
    next[idx] = { ...next[idx], ...patch };
    return next;
  };

  for (let m = fromMonth; m <= toMonth; m++) {
    const patchA: Partial<ParentMonthInput> = {};
    if (mA && (selection.who === 'mother' || selection.who === 'both')) {
      patchA.incomeDuringNet = mA.incomeDuringNet ?? 0;
      if (mA.hoursPerWeek != null) patchA.hoursPerWeek = mA.hoursPerWeek;
    }
    const patchB: Partial<ParentMonthInput> = {};
    if (mB && (selection.who === 'partner' || selection.who === 'both')) {
      patchB.incomeDuringNet = mB.incomeDuringNet ?? 0;
      if (mB.hoursPerWeek != null) patchB.hoursPerWeek = mB.hoursPerWeek;
    }

    result = {
      ...result,
      parents: result.parents.map((p, i) => {
        const patch = i === 0 ? patchA : patchB;
        if (Object.keys(patch).length === 0) return p;
        return { ...p, months: patchMonthData(p.months, m, patch) };
      }),
    };
  }
  return result;
}

export interface CalculationMonthPanelProps {
  month: number;
  plan: ElterngeldCalculationPlan;
  hasPartner: boolean;
  onChange: (plan: ElterngeldCalculationPlan) => void;
  onClose: () => void;
  /** Wird aufgerufen, wenn der Monat geändert wurde (für temporäre Markierung) */
  onMonthChange?: (month: number) => void;
}

export const CalculationMonthPanel: React.FC<CalculationMonthPanelProps> = ({
  month,
  plan,
  hasPartner,
  onChange,
  onClose,
  onMonthChange,
}) => {
  const state = getCombinedMonthState(plan, month, hasPartner);

  const options = COMBINED_OPTIONS.filter(
    (o) =>
      (o.who === 'partner' || o.who === 'both') ? hasPartner : true
  );

  const handleSelect = (sel: CombinedSelection) => {
    onChange(applyCombinedSelection(plan, month, sel, hasPartner));
    onMonthChange?.(month);
  };

  const isSelected = (who: CombinedWho, mode: MonthMode) =>
    state.who === who && state.mode === mode;

  const maxMonth =
    plan.parents.length > 0
      ? Math.max(14, ...plan.parents.flatMap((p) => p.months.map((m) => m.month)))
      : 14;

  const handleApplyToRange = (rangeId: 'next1' | 'next3' | 'toEnd') => {
    const opt = APPLY_RANGE_OPTIONS.find((o) => o.id === rangeId);
    if (!opt) return;
    const toMonth =
      opt.count === -1
        ? maxMonth
        : Math.min(month + opt.count, maxMonth);
    const fromMonth = month + 1;
    if (fromMonth > toMonth) return;
    const selection: CombinedSelection = { who: state.who, mode: state.mode };
    onChange(applySelectionToRange(plan, month, fromMonth, toMonth, selection, hasPartner));
    onMonthChange?.(month);
    onClose();
  };

  const updateParentMonth = (parentIndex: number, patch: Partial<ParentMonthInput>) => {
    const parent = plan.parents[parentIndex];
    if (!parent) return;
    let months = [...parent.months];
    const mIdx = months.findIndex((m) => m.month === month);
    const existing = mIdx >= 0 ? months[mIdx] : { month, mode: 'none' as MonthMode, incomeDuringNet: 0 };
    const updated = { ...existing, ...patch };
    if (mIdx >= 0) {
      months[mIdx] = updated;
    } else {
      months = [...months, updated].sort((a, b) => a.month - b.month);
    }
    onChange({
      ...plan,
      parents: plan.parents.map((p, i) =>
        i === parentIndex ? { ...p, months } : p
      ),
    });
    onMonthChange?.(month);
  };

  const mA = getMonthData(plan, 0, month);
  const mB = hasPartner ? getMonthData(plan, 1, month) : null;
  const hasBezug = state.who !== 'none';
  const needsIncomeHours =
    hasBezug &&
    (state.who === 'mother' || state.who === 'partner' || state.who === 'both');
  const needsHours = state.mode === 'plus' || state.mode === 'partnerBonus';

  return (
    <div
      className="elterngeld-plan__panel-overlay"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="button"
      tabIndex={0}
      aria-label="Schließen"
    >
      <div
        className="elterngeld-plan__panel elterngeld-calculation__month-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="elterngeld-calculation-month-panel-title"
      >
        <h4 id="elterngeld-calculation-month-panel-title" className="elterngeld-plan__panel-title">
          Lebensmonat {month}
        </h4>
        <p className="elterngeld-plan__panel-sub">Wer nimmt diesen Monat?</p>

        <div className="elterngeld-select-btn-group elterngeld-calculation__month-options">
          {options.map((opt) => (
            <ElterngeldSelectButton
              key={`${opt.who}-${opt.mode}`}
              label={opt.label}
              selected={isSelected(opt.who, opt.mode)}
              showCheck={false}
              variant={
                opt.who === 'mother'
                  ? 'mother'
                  : opt.who === 'partner'
                    ? 'partner'
                    : opt.who === 'both'
                      ? 'both'
                      : 'none'
              }
              onClick={() => handleSelect({ who: opt.who, mode: opt.mode })}
              ariaPressed={isSelected(opt.who, opt.mode)}
              className="elterngeld-plan__panel-btn"
            />
          ))}
        </div>

        {needsIncomeHours && (
          <div className="elterngeld-calculation__month-panel-fields">
            {state.who === 'mother' && (
              <>
                <label className="elterngeld-step__label">
                  <span>Einkommen im Lebensmonat</span>
                  <IncomeInput
                    value={mA?.incomeDuringNet}
                    onChange={(v) => updateParentMonth(0, { incomeDuringNet: v })}
                  />
                </label>
                {needsHours && (
                  <label className="elterngeld-step__label">
                    <span>Std/Woche</span>
                    <TextInput
                      type="number"
                      min={0}
                      max={40}
                      step={1}
                      value={mA?.hoursPerWeek ?? ''}
                      onChange={(e) => {
                        const raw = String(e.target.value ?? '').trim();
                        updateParentMonth(0, {
                          hoursPerWeek: raw === '' ? undefined : Math.min(40, parseNum(raw)),
                        });
                      }}
                      placeholder="z. B. 28"
                    />
                  </label>
                )}
              </>
            )}
            {state.who === 'partner' && mB && (
              <>
                <label className="elterngeld-step__label">
                  <span>Einkommen im Lebensmonat</span>
                  <IncomeInput
                    value={mB.incomeDuringNet}
                    onChange={(v) => updateParentMonth(1, { incomeDuringNet: v })}
                  />
                </label>
                {needsHours && (
                  <label className="elterngeld-step__label">
                    <span>Std/Woche</span>
                    <TextInput
                      type="number"
                      min={0}
                      max={40}
                      step={1}
                      value={mB.hoursPerWeek ?? ''}
                      onChange={(e) => {
                        const raw = String(e.target.value ?? '').trim();
                        updateParentMonth(1, {
                          hoursPerWeek: raw === '' ? undefined : Math.min(40, parseNum(raw)),
                        });
                      }}
                      placeholder="z. B. 28"
                    />
                  </label>
                )}
              </>
            )}
            {state.who === 'both' && mA && mB && (
              <>
                <label className="elterngeld-step__label">
                  <span>Sie – Einkommen im Lebensmonat</span>
                  <IncomeInput
                    value={mA.incomeDuringNet}
                    onChange={(v) => updateParentMonth(0, { incomeDuringNet: v })}
                  />
                </label>
                <label className="elterngeld-step__label">
                  <span>Sie – Std/Woche</span>
                  <TextInput
                    type="number"
                    min={0}
                    max={40}
                    step={1}
                    value={mA.hoursPerWeek ?? ''}
                    onChange={(e) => {
                      const raw = String(e.target.value ?? '').trim();
                      updateParentMonth(0, {
                        hoursPerWeek: raw === '' ? undefined : Math.min(40, parseNum(raw)),
                      });
                    }}
                    placeholder="z. B. 28"
                  />
                </label>
                <label className="elterngeld-step__label">
                  <span>Partner – Einkommen im Lebensmonat</span>
                  <IncomeInput
                    value={mB.incomeDuringNet}
                    onChange={(v) => updateParentMonth(1, { incomeDuringNet: v })}
                  />
                </label>
                <label className="elterngeld-step__label">
                  <span>Partner – Std/Woche</span>
                  <TextInput
                    type="number"
                    min={0}
                    max={40}
                    step={1}
                    value={mB.hoursPerWeek ?? ''}
                    onChange={(e) => {
                      const raw = String(e.target.value ?? '').trim();
                      updateParentMonth(1, {
                        hoursPerWeek: raw === '' ? undefined : Math.min(40, parseNum(raw)),
                      });
                    }}
                    placeholder="z. B. 28"
                  />
                </label>
              </>
            )}
          </div>
        )}

        <div className="elterngeld-plan__panel-apply-range">
          <p className="elterngeld-plan__panel-apply-range-label">Werte für folgende Monate übernehmen</p>
          <div className="elterngeld-plan__panel-apply-range-options">
            {APPLY_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="elterngeld-plan__panel-apply-range-btn"
                onClick={() => handleApplyToRange(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="elterngeld-plan__panel-close" onClick={onClose}>
          Schließen
        </button>
      </div>
    </div>
  );
};
