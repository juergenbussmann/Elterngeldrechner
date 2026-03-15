/**
 * Eingabeflow für die Elterngeld-Berechnung.
 * Gemeinsame Monatsmatrix: pro Lebensmonat des Kindes werden Sie und Partner nebeneinander dargestellt.
 */

import React, { useCallback } from 'react';
import { Card } from '../../../../shared/ui/Card';
import { TextInput } from '../../../../shared/ui/TextInput';
import { SelectionField } from '../../../../shared/ui/SelectionModal';
import { MonthTimeline } from '../MonthTimeline';
import type {
  ElterngeldCalculationPlan,
  CalculationParentInput,
  ParentMonthInput,
  MonthMode,
} from '../calculation';

const MODE_OPTIONS: { value: MonthMode; label: string }[] = [
  { value: 'none', label: 'Kein Bezug' },
  { value: 'basis', label: 'Basiselterngeld' },
  { value: 'plus', label: 'ElterngeldPlus' },
  { value: 'partnerBonus', label: 'Partnerschaftsbonus' },
];

function parseNum(value: string | undefined): number {
  const s = String(value ?? '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

/** Prüft, ob die Übernahme-Aktion für diesen Elternteil/Monat angezeigt werden soll. */
function shouldShowCopyToFollowing(
  parent: CalculationParentInput,
  currentMonth: number
): boolean {
  const current = parent.months.find((m) => m.month === currentMonth);
  if (!current || current.mode === 'none') return false;
  return parent.months.some((x) => x.month > currentMonth && x.mode !== 'none');
}

type Props = {
  plan: ElterngeldCalculationPlan;
  onChange: (plan: ElterngeldCalculationPlan) => void;
};

export const StepCalculationInput: React.FC<Props> = ({ plan, onChange }) => {
  const updateChildBirthDate = (v: string) => {
    onChange({ ...plan, childBirthDate: v });
  };

  const updateParent = (index: number, patch: Partial<CalculationParentInput>) => {
    const next = [...plan.parents];
    next[index] = { ...next[index], ...patch };
    onChange({ ...plan, parents: next });
  };

  const updateParentMonth = (
    parentIndex: number,
    monthIndex: number,
    patch: Partial<ParentMonthInput>
  ) => {
    const parent = plan.parents[parentIndex];
    const months = [...parent.months];
    months[monthIndex] = { ...months[monthIndex], ...patch };
    updateParent(parentIndex, { months });
  };

  const applyToFollowingMonths = (
    parentIndex: number,
    sourceMonth: number,
    fields: { incomeDuringNet?: boolean; hoursPerWeek?: boolean }
  ) => {
    const parent = plan.parents[parentIndex];
    const sourceM = parent.months.find((x) => x.month === sourceMonth);
    if (!sourceM) return;
    const months = parent.months.map((m) => {
      if (m.month <= sourceMonth || m.mode === 'none') return m;
      const patch: Partial<ParentMonthInput> = {};
      if (fields.incomeDuringNet) patch.incomeDuringNet = sourceM.incomeDuringNet;
      if (fields.hoursPerWeek) patch.hoursPerWeek = sourceM.hoursPerWeek;
      return { ...m, ...patch };
    });
    updateParent(parentIndex, { months });
  };

  const updateGlobal = (patch: Partial<Pick<ElterngeldCalculationPlan, 'hasSiblingBonus' | 'additionalChildren'>>) => {
    onChange({ ...plan, ...patch });
  };

  const parentA = plan.parents[0];
  const parentB = plan.parents[1];
  const allMonths = Array.from({ length: 14 }, (_, i) => i + 1);

  const activeMonths = allMonths.filter((month) => {
    const mA = parentA.months.find((m) => m.month === month);
    const mB = parentB?.months.find((m) => m.month === month);
    return (mA?.mode ?? 'none') !== 'none' || (mB?.mode ?? 'none') !== 'none';
  });

  const noBezugMonths = allMonths.filter((month) => {
    const mA = parentA.months.find((m) => m.month === month);
    const mB = parentB?.months.find((m) => m.month === month);
    return (mA?.mode ?? 'none') === 'none' && (mB?.mode ?? 'none') === 'none';
  });

  const getMonthData = (parentIndex: number, month: number) => {
    const parent = plan.parents[parentIndex];
    return parent.months.find((m) => m.month === month);
  };

  const getMonthIndex = (parentIndex: number, month: number) =>
    plan.parents[parentIndex].months.findIndex((m) => m.month === month);

  const scrollToMonth = useCallback((month: number) => {
    const el = document.getElementById(`elterngeld-month-${month}`);
    if (!el) return;
    const details = el.closest('details');
    if (details && !details.open) details.open = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const renderParentBlock = (
    parentIndex: number,
    month: number,
    isCompact: boolean
  ) => {
    const m = getMonthData(parentIndex, month);
    const mIdx = getMonthIndex(parentIndex, month);
    if (!m || mIdx < 0) return null;

    const parent = plan.parents[parentIndex];
    const hasBezug = m.mode !== 'none';
    const showCopyAction = shouldShowCopyToFollowing(parent, month);

    const hasMaternity = parentIndex === 0 && m.hasMaternityBenefit;

    return (
      <div
        key={`p${parentIndex}-m${month}`}
        className={`elterngeld-matrix__parent-block ${!hasBezug ? 'elterngeld-matrix__parent-block--no-bezug' : ''} ${hasMaternity ? 'elterngeld-matrix__parent-block--maternity' : ''}`}
      >
        <span className="elterngeld-matrix__parent-label">
          {parent.label}
          {hasMaternity && (
            <span className="elterngeld-matrix__maternity-badge">
              Mutterschutz / Mutterschaftsleistungen
            </span>
          )}
        </span>
        <div className="elterngeld-matrix__parent-fields">
          <div className="elterngeld-calculation__mode-field">
            <SelectionField
              label="Modus"
              placeholder="– Bitte wählen –"
              value={m.mode}
              options={MODE_OPTIONS}
              onChange={(v) =>
                updateParentMonth(parentIndex, mIdx, {
                  mode: v as MonthMode,
                })
              }
            />
          </div>
          {!isCompact && (
            <>
              {hasBezug ? (
                <>
                  <label className="elterngeld-calculation__inline-label">
                    <span>Eink. im Lebensmonat (€)</span>
                    <TextInput
                      type="number"
                      min={0}
                      step={100}
                      value={m.incomeDuringNet || ''}
                      onChange={(e) =>
                        updateParentMonth(parentIndex, mIdx, {
                          incomeDuringNet: parseNum(e.target.value),
                        })
                      }
                      placeholder="0"
                    />
                  </label>
                  <label className="elterngeld-calculation__inline-label">
                    <span>Std/Woche</span>
                    <TextInput
                      type="number"
                      min={0}
                      max={40}
                      step={1}
                      value={m.hoursPerWeek ?? ''}
                      onChange={(e) => {
                        const raw = String(e.target.value ?? '').trim();
                        updateParentMonth(parentIndex, mIdx, {
                          hoursPerWeek: raw === '' ? undefined : Math.min(40, parseNum(raw)),
                        });
                      }}
                      placeholder={
                        m.mode === 'plus' || m.mode === 'partnerBonus'
                          ? 'z. B. 28'
                          : '0'
                      }
                    />
                  </label>
                </>
              ) : (
                <p className="elterngeld-matrix__no-bezug-hint">
                  In diesem Lebensmonat ist kein Elterngeld-Bezug geplant.
                </p>
              )}
            </>
          )}
          {showCopyAction && (
            <button
              type="button"
              className="elterngeld-copy-action"
              onClick={() =>
                applyToFollowingMonths(parentIndex, month, {
                  incomeDuringNet: true,
                  hoursPerWeek: true,
                })
              }
            >
              Werte für folgende Bezugsmonate übernehmen
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderMonthRow = (month: number, isActive: boolean) => (
    <div
      key={month}
      id={`elterngeld-month-${month}`}
      className={`elterngeld-matrix__month-row ${isActive ? 'elterngeld-matrix__month-row--active' : 'elterngeld-matrix__month-row--no-bezug'}`}
    >
      <h5 className="elterngeld-matrix__month-heading">Lebensmonat {month}</h5>
      <div className="elterngeld-matrix__parents">
        {renderParentBlock(0, month, false)}
        {parentB && renderParentBlock(1, month, false)}
      </div>
    </div>
  );

  const renderMonthRowCompact = (month: number, isActive: boolean) => (
    <div
      key={month}
      id={`elterngeld-month-${month}`}
      className={`elterngeld-matrix__month-row elterngeld-matrix__month-row--compact ${isActive ? 'elterngeld-matrix__month-row--active' : 'elterngeld-matrix__month-row--no-bezug'}`}
    >
      <h5 className="elterngeld-matrix__month-heading">Lebensmonat {month}</h5>
      <div className="elterngeld-matrix__parents">
        {renderParentBlock(0, month, true)}
        {parentB && renderParentBlock(1, month, true)}
      </div>
    </div>
  );

  return (
    <div className="elterngeld-calculation-input">
      <Card className="still-daily-checklist__card">
        <h3 className="elterngeld-step__title">Grunddaten</h3>
        <div className="elterngeld-step__fields">
          <label className="elterngeld-step__label">
            <span>Geburtsdatum oder voraussichtlicher Termin</span>
            <TextInput
              type="date"
              value={plan.childBirthDate}
              onChange={(e) => updateChildBirthDate(e.target.value)}
            />
          </label>
          <label className="elterngeld-step__label elterngeld-step__label--row">
            <input
              type="checkbox"
              checked={plan.hasSiblingBonus}
              onChange={(e) => updateGlobal({ hasSiblingBonus: e.target.checked })}
            />
            <span>Geschwisterbonus (10 %, mind. 75 €)</span>
          </label>
          <label className="elterngeld-step__label">
            <span>Zusätzliche Kinder bei Mehrlingsgeburt</span>
            <TextInput
              type="number"
              min={0}
              max={10}
              value={plan.additionalChildren || ''}
              onChange={(e) =>
                updateGlobal({
                  additionalChildren: Math.max(0, parseInt(e.target.value, 10) || 0),
                })
              }
              placeholder="0"
            />
          </label>
        </div>
      </Card>

      <Card className="still-daily-checklist__card">
        <h3 className="elterngeld-step__title">Einkommen vor Geburt</h3>
        <div className="elterngeld-step__fields">
          <label className="elterngeld-step__label">
            <span>Sie – Nettoeinkommen vor Geburt (€/Monat)</span>
            <TextInput
              type="number"
              min={0}
              step={100}
              value={parentA.incomeBeforeNet || ''}
              onChange={(e) =>
                updateParent(0, { incomeBeforeNet: parseNum(e.target.value) })
              }
              placeholder="z. B. 2500"
            />
          </label>
          {parentB && (
            <label className="elterngeld-step__label">
              <span>Partner – Nettoeinkommen vor Geburt (€/Monat)</span>
              <TextInput
                type="number"
                min={0}
                step={100}
                value={parentB.incomeBeforeNet || ''}
                onChange={(e) =>
                  updateParent(1, { incomeBeforeNet: parseNum(e.target.value) })
                }
                placeholder="z. B. 2500"
              />
            </label>
          )}
          <span className="elterngeld-step__hint">
            Dieses Einkommen ist die Grundlage für die Schätzung. Die Monatsfelder darunter sind für das geplante Einkommen während des Bezugs (z. B. bei Teilzeit).
          </span>
        </div>
      </Card>

      <Card className="still-daily-checklist__card">
        <h3 className="elterngeld-step__title">Monatsplan (Lebensmonate 1–14)</h3>
        <p className="elterngeld-step__hint elterngeld-step__hint--section">
          Pro Lebensmonat des Kindes sehen Sie hier die Angaben für Sie und Ihren Partner nebeneinander.
        </p>

        <div className="elterngeld-matrix__timelines">
          <div className="elterngeld-matrix__timeline-block">
            <span className="elterngeld-matrix__timeline-label">Sie</span>
            <MonthTimeline
              months={parentA.months.map((m) => ({
                month: m.month,
                mode: m.mode,
                hasWarning:
                  (m.mode === 'plus' || m.mode === 'partnerBonus') && (m.hoursPerWeek ?? 0) > 32,
              }))}
              label=""
              onMonthClick={scrollToMonth}
            />
          </div>
          {parentB && (
            <div className="elterngeld-matrix__timeline-block">
              <span className="elterngeld-matrix__timeline-label">Partner</span>
              <MonthTimeline
                months={parentB.months.map((m) => ({
                  month: m.month,
                  mode: m.mode,
                  hasWarning:
                    (m.mode === 'plus' || m.mode === 'partnerBonus') && (m.hoursPerWeek ?? 0) > 32,
                }))}
                label=""
                onMonthClick={scrollToMonth}
              />
            </div>
          )}
        </div>

        {activeMonths.length > 0 && (
          <div className="elterngeld-calculation__months-section">
            <h5 className="elterngeld-calculation__months-section-title">
              Geplante Bezugsmonate
            </h5>
            <p className="elterngeld-step__hint elterngeld-step__hint--section">
              Diese Lebensmonate wurden aus Ihrer Vorbereitung übernommen. Tragen Sie pro Lebensmonat das geplante Einkommen während des Bezugs ein (z. B. 0 bei Elternzeit, Teilzeitbetrag bei ElterngeldPlus).
            </p>
            {parentA.months.some((m) => m.hasMaternityBenefit) && (
              <p className="elterngeld-step__hint elterngeld-step__hint--section elterngeld-calculation__maternity-hint">
                In den ersten Lebensmonaten der Mutter können Mutterschaftsleistungen auf das Elterngeld angerechnet werden. Die Schätzung ist dort vereinfacht.
              </p>
            )}
            <div className="elterngeld-matrix elterngeld-matrix--active">
              {activeMonths.map((month) => renderMonthRow(month, true))}
            </div>
          </div>
        )}

        {noBezugMonths.length > 0 && (
          <details className="elterngeld-calculation__no-bezug-details">
            <summary className="elterngeld-calculation__no-bezug-summary">
              Weitere Lebensmonate ohne Bezug anzeigen ({noBezugMonths.length})
            </summary>
            <p className="elterngeld-step__hint elterngeld-step__hint--section">
              Diese Lebensmonate haben aktuell keinen Bezug geplant. Sie können hier bei Bedarf einen Modus wählen.
            </p>
            <div className="elterngeld-matrix elterngeld-matrix--no-bezug">
              {noBezugMonths.map((month) => renderMonthRowCompact(month, false))}
            </div>
          </details>
        )}

        {activeMonths.length === 0 && noBezugMonths.length > 0 && (
          <p className="elterngeld-step__hint elterngeld-step__hint--section">
            Wählen Sie in den Lebensmonaten unten einen Bezugsmodus, um die Berechnung zu starten.
          </p>
        )}

        <p className="elterngeld-step__hint elterngeld-step__hint--below">
          Bei ElterngeldPlus und Partnerschaftsbonus: 24–32 Wochenstunden erforderlich. Bitte tragen Sie Ihre geplanten Wochenstunden ein – es gibt keine automatische Übernahme.
        </p>
      </Card>
    </div>
  );
};
