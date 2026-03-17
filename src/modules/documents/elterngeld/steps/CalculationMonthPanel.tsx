/**
 * Panel zur Auswahl des kombinierten Monatszustands.
 * Mutter | Partner | Beide | Kein Bezug + Modus (Basis/Plus/Bonus).
 * Einkommen und Wochenstunden bei Bezug.
 */

import React, { useState, useCallback, useEffect } from 'react';
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

const LEISTUNG_OPTIONS: { value: 'basis' | 'plus'; label: string }[] = [
  { value: 'basis', label: 'Basiselterngeld' },
  { value: 'plus', label: 'ElterngeldPlus' },
];

const WHO_OPTIONS: { who: CombinedWho; label: string }[] = [
  { who: 'mother', label: 'Mutter' },
  { who: 'partner', label: 'Partner' },
  { who: 'both', label: 'Beide' },
  { who: 'none', label: 'Kein Bezug' },
];

const APPLY_RANGE_OPTIONS = [
  { id: 'next1' as const, label: 'nächsten Monat', count: 1 },
  { id: 'next3' as const, label: 'nächste 3 Monate', count: 3 },
  { id: 'toEnd' as const, label: 'alle folgenden Monate', count: -1 },
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

function getEffectiveMode(who: CombinedWho, model: 'basis' | 'plus'): MonthMode {
  if (who === 'none') return 'none';
  if (who === 'both') return 'partnerBonus';
  return model;
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

  const [selectedModelInDialog, setSelectedModelInDialog] = useState<'basis' | 'plus'>(() =>
    state.mode === 'basis' ? 'basis' : 'plus'
  );
  const [selectedWhoInDialog, setSelectedWhoInDialog] = useState<CombinedWho>(() => state.who);

  useEffect(() => {
    setSelectedModelInDialog(state.mode === 'basis' ? 'basis' : 'plus');
    setSelectedWhoInDialog(state.who);
    setSelectedApplyRange(null);
  }, [month, state.who, state.mode]);

  const applySelection = useCallback(
    (who: CombinedWho, model: 'basis' | 'plus') => {
      const mode = getEffectiveMode(who, model);
      onChange(applyCombinedSelection(plan, month, { who, mode }, hasPartner));
      onMonthChange?.(month);
    },
    [plan, month, hasPartner, onChange, onMonthChange]
  );

  const handleLeistungClick = (model: 'basis' | 'plus') => {
    setSelectedModelInDialog(model);
    setSelectedApplyRange(null);
    applySelection(selectedWhoInDialog, model);
  };

  const handleWhoClick = (who: CombinedWho) => {
    setSelectedWhoInDialog(who);
    setSelectedApplyRange(null);
    applySelection(who, selectedModelInDialog);
  };

  const maxMonth =
    plan.parents.length > 0
      ? Math.max(14, ...plan.parents.flatMap((p) => p.months.map((m) => m.month)))
      : 14;

  const [selectedApplyRange, setSelectedApplyRange] = useState<'next1' | 'next3' | 'toEnd' | null>(null);
  const [showLeistungDetails, setShowLeistungDetails] = useState(false);

  const applyToFollowingMonths = useCallback(
    (rangeId: 'next1' | 'next3' | 'toEnd') => {
      const opt = APPLY_RANGE_OPTIONS.find((o) => o.id === rangeId);
      if (!opt) return;
      const toMonth =
        opt.count === -1
          ? maxMonth
          : Math.min(month + opt.count, maxMonth);
      const fromMonth = month + 1;
      if (fromMonth > toMonth) return;
      const mode = getEffectiveMode(selectedWhoInDialog, selectedModelInDialog);
      const selection: CombinedSelection = { who: selectedWhoInDialog, mode };
      onChange(applySelectionToRange(plan, month, fromMonth, toMonth, selection, hasPartner));
      onMonthChange?.(month);
    },
    [plan, month, maxMonth, selectedWhoInDialog, selectedModelInDialog, hasPartner, onChange, onMonthChange]
  );

  const handleConfirm = useCallback(() => {
    if (selectedApplyRange !== null) {
      applyToFollowingMonths(selectedApplyRange);
    }
    onClose();
  }, [selectedApplyRange, applyToFollowingMonths, onClose]);

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
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
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
        <div className="elterngeld-plan__panel-leistung">
          <span className="elterngeld-plan__panel-leistung-label">Leistung</span>
          <div className="elterngeld-plan__panel-leistung-btns">
            {LEISTUNG_OPTIONS.map((opt) => (
              <ElterngeldSelectButton
                key={opt.value}
                label={opt.label}
                selected={selectedModelInDialog === opt.value}
                showCheck={false}
                onClick={() => handleLeistungClick(opt.value)}
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
          {WHO_OPTIONS.filter((o) => (o.who === 'partner' || o.who === 'both') ? hasPartner : true).map((opt) => (
            <ElterngeldSelectButton
              key={opt.who}
              label={opt.label}
              variant={opt.who}
              selected={selectedWhoInDialog === opt.who}
              onClick={() => handleWhoClick(opt.who)}
              ariaPressed={selectedWhoInDialog === opt.who}
              className="elterngeld-plan__panel-btn"
            />
          ))}
        </div>
        {hasPartner && (() => {
          const isPlus = selectedModelInDialog === 'plus';
          const isBoth = selectedWhoInDialog === 'both';
          const hint =
            isBoth && isPlus
              ? 'Als Bonusmonat gesetzt.'
              : isBoth && !isPlus
                ? 'Für Partnerschaftsbonus in diesem Monat auf ElterngeldPlus wechseln.'
                : !isBoth && isPlus
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
              handleLeistungClick('plus');
            } else if (isPlus && !isBoth) {
              handleWhoClick('both');
            } else {
              applySelection('both', 'plus');
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
  );
};
