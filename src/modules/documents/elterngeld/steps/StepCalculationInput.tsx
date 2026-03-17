/**
 * Eingabeflow für die Elterngeld-Berechnung.
 * Monatszentrierte Darstellung wie in der Vorbereitung:
 * Pro Lebensmonat ein kombinierter Zustand (Mutter | Partner | Beide | Kein Bezug).
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Card } from '../../../../shared/ui/Card';
import { Button } from '../../../../shared/ui/Button';
import { TextInput } from '../../../../shared/ui/TextInput';
import { IncomeInput } from '../ui/IncomeInput';
import { MonthGrid } from '../ui/MonthGrid';
import { PlanPhases } from '../ui/PlanPhases';
import { MonthSummary } from '../ui/MonthSummary';
import { getMonthGridItemsFromPlan } from '../monthGridMappings';
import { getCombinedMonthState, calculatePlan, applyCombinedSelection } from '../calculation';
import { buildOptimizationResult } from '../calculation/elterngeldOptimization';
import { CalculationMonthPanel } from './CalculationMonthPanel';
import { OptimizationSuggestionBlock } from './OptimizationSuggestionBlock';
import {
  PartnerBonusCheckDialog,
  getFirstPartnerBonusMonth,
  type PartnerBonusAction,
} from './PartnerBonusCheckDialog';
import type {
  ElterngeldCalculationPlan,
  CalculationParentInput,
} from '../calculation';

function parseNum(value: string | undefined): number {
  const s = String(value ?? '').replace(',', '.');
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

type Props = {
  plan: ElterngeldCalculationPlan;
  onChange: (plan: ElterngeldCalculationPlan) => void;
  /** Beim Mount: diesen Monat fokussieren (Panel öffnen) */
  initialFocusMonth?: number | null;
  /** Beim Mount: zu diesem Bereich scrollen */
  initialScrollTo?: 'grunddaten' | 'einkommen' | 'monatsplan' | null;
  /** Beim Mount: diesen Monat als kürzlich geändert markieren (z. B. nach Bonus-Fix aus Ergebnis-Ansicht) */
  initialChangedMonth?: number | null;
};

const SCROLL_IDS = {
  grunddaten: 'elterngeld-input-grunddaten',
  einkommen: 'elterngeld-input-einkommen',
  monatsplan: 'elterngeld-input-month-grid',
} as const;

const CHANGED_MONTH_DISPLAY_MS = 3000;

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

export const StepCalculationInput: React.FC<Props> = ({
  plan,
  onChange,
  initialFocusMonth,
  initialScrollTo,
  initialChangedMonth,
}) => {
  const [activeMonth, setActiveMonth] = useState<number | null>(initialFocusMonth ?? null);
  const [showPartnerBonusCheck, setShowPartnerBonusCheck] = useState(false);
  const [changedMonth, setChangedMonth] = useState<number | null>(initialChangedMonth ?? null);

  useEffect(() => {
    if (initialFocusMonth != null) setActiveMonth(initialFocusMonth);
  }, [initialFocusMonth]);

  useEffect(() => {
    if (initialChangedMonth != null) setChangedMonth(initialChangedMonth);
  }, [initialChangedMonth]);

  useEffect(() => {
    if (!initialScrollTo) return;
    const id = SCROLL_IDS[initialScrollTo];
    const t = setTimeout(() => {
      const el = document.getElementById(id) ?? (id === SCROLL_IDS.monatsplan ? document.getElementById('elterngeld-input-monatsplan') : null);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
    return () => clearTimeout(t);
  }, [initialScrollTo]);

  useEffect(() => {
    if (changedMonth === null) return;
    const t = setTimeout(() => setChangedMonth(null), CHANGED_MONTH_DISPLAY_MS);
    return () => clearTimeout(t);
  }, [changedMonth]);

  const updateChildBirthDate = (v: string) => {
    onChange({ ...plan, childBirthDate: v });
  };

  const updateParent = (index: number, patch: Partial<CalculationParentInput>) => {
    const next = [...plan.parents];
    next[index] = { ...next[index], ...patch };
    onChange({ ...plan, parents: next });
  };

  const updateGlobal = (patch: Partial<Pick<ElterngeldCalculationPlan, 'hasSiblingBonus' | 'additionalChildren'>>) => {
    onChange({ ...plan, ...patch });
  };

  const handleMonthClick = useCallback((month: number) => {
    setActiveMonth(month);
  }, []);

  const handleClosePanel = useCallback(() => {
    setActiveMonth(null);
  }, []);

  const partnerBonusSuggestion = useMemo(() => {
    if (plan.parents.length < 2) return null;
    try {
      const result = calculatePlan(plan);
      const outcome = buildOptimizationResult(plan, result, 'partnerBonus');
      if ('status' in outcome && outcome.status === 'unsupported') return null;
      const ors = outcome as { status: string; suggestions: { plan: ElterngeldCalculationPlan; status: string }[] };
      if (ors.status === 'improved' && ors.suggestions.length > 0 && ors.suggestions[0].status === 'improved') {
        return ors.suggestions[0];
      }
    } catch {
      /* ignore */
    }
    return null;
  }, [plan]);

  const handlePartnerBonusAction = useCallback((action: PartnerBonusAction) => {
    if (action.type === 'applyFix') {
      const hasPartner = plan.parents.length > 1;
      if (action.fix === 'switchToPlus') {
        onChange(applyCombinedSelection(plan, action.month, { who: 'both', mode: 'partnerBonus' }, hasPartner));
      } else if (action.fix === 'setBoth') {
        onChange(applyCombinedSelection(plan, action.month, { who: 'both', mode: 'partnerBonus' }, hasPartner));
      } else {
        onChange(applyCombinedSelection(plan, action.month, { who: 'both', mode: 'partnerBonus' }, hasPartner));
      }
      setActiveMonth(action.month);
      setChangedMonth(action.month);
      const el = document.getElementById(SCROLL_IDS.monatsplan);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (action.type === 'applySetAllSuitableMonths') {
      const hasPartner = plan.parents.length > 1;
      let next = plan;
      for (const m of action.months) {
        next = applyCombinedSelection(next, m, { who: 'both', mode: 'partnerBonus' }, hasPartner);
      }
      onChange(next);
      const firstM = action.months[0];
      setActiveMonth(firstM ?? null);
      if (firstM != null) setChangedMonth(firstM);
      const el = document.getElementById(SCROLL_IDS.monatsplan);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (action.type === 'focusMonth') {
      setActiveMonth(action.month);
      const el = document.getElementById(SCROLL_IDS.monatsplan);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (action.type === 'focusSection') {
      const sectionToId: Record<string, string> = {
        grunddaten: SCROLL_IDS.grunddaten,
        einkommen: SCROLL_IDS.einkommen,
        monatsplan: SCROLL_IDS.monatsplan,
        elternArbeit: SCROLL_IDS.monatsplan,
        eltern: SCROLL_IDS.einkommen,
      };
      const id = sectionToId[action.section] ?? SCROLL_IDS.monatsplan;
      const el = document.getElementById(id) ?? document.getElementById('elterngeld-input-monatsplan');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (action.section === 'elternArbeit') {
        const m = getFirstPartnerBonusMonth(plan);
        setActiveMonth(m ?? null);
      } else if (action.section === 'monatsplan') {
        setActiveMonth(null);
      }
    }
  }, [plan]);

  const parentA = plan.parents[0];
  const parentB = plan.parents[1];
  const hasPartner = plan.parents.length > 1;
  const maxMonth =
    plan.parents.length > 0
      ? Math.max(14, ...plan.parents.flatMap((p) => p.months.map((m) => m.month)))
      : 14;

  return (
    <div className="elterngeld-calculation-input">
      <Card id="elterngeld-input-grunddaten" className="still-daily-checklist__card">
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

      <Card id="elterngeld-input-einkommen" className="still-daily-checklist__card">
        <h3 className="elterngeld-step__title">Einkommen vor Geburt</h3>
        <div className="elterngeld-step__fields">
          <label className="elterngeld-step__label">
            <span>Sie – Nettoeinkommen vor Geburt (€/Monat)</span>
            <IncomeInput
              value={parentA.incomeBeforeNet}
              onChange={(v) => updateParent(0, { incomeBeforeNet: v })}
              placeholder="z. B. 2500"
            />
          </label>
          {parentB && (
            <label className="elterngeld-step__label">
              <span>Partner – Nettoeinkommen vor Geburt (€/Monat)</span>
              <IncomeInput
                value={parentB.incomeBeforeNet}
                onChange={(v) => updateParent(1, { incomeBeforeNet: v })}
                placeholder="z. B. 2500"
              />
            </label>
          )}
          <span className="elterngeld-step__hint">
            Dieses Einkommen ist die Grundlage für die Schätzung. Die Monatsfelder darunter sind für das geplante Einkommen während des Bezugs (z. B. bei Teilzeit).
          </span>
        </div>
      </Card>

      <Card id="elterngeld-input-monatsplan" className="still-daily-checklist__card">
        <h3 className="elterngeld-step__title">Monatsplan (Lebensmonate 1–{maxMonth})</h3>
        <p className="elterngeld-step__hint elterngeld-step__hint--section">
          Pro Lebensmonat: Wer nimmt Elterngeld? Klicke auf einen Monat, um die Zuordnung zu ändern.
        </p>

        {(() => {
          const items = getMonthGridItemsFromPlan(plan, !!parentB, maxMonth);
          return (
            <>
              <PlanPhases items={items} />
              <MonthSummary items={items} />
            </>
          );
        })()}

        <div id="elterngeld-input-month-grid" className="elterngeld-input__month-grid-wrap">
        <MonthGrid
          items={getMonthGridItemsFromPlan(plan, !!parentB, maxMonth)}
          onMonthClick={handleMonthClick}
          activeMonth={activeMonth ?? undefined}
          changedMonth={changedMonth}
        />
        </div>

        {parentB && (() => {
          const items = getMonthGridItemsFromPlan(plan, true, maxMonth);
          const bothMonths = items.filter((i) => i.state === 'both').map((i) => i.month);
          const rangeStr = formatBothMonthRange(bothMonths);
          const hasPlusOrBonus = plan.parents.some((p) =>
            p.months.some((m) => m.mode === 'plus' || m.mode === 'partnerBonus')
          );
          const isBasisOnly = !hasPlusOrBonus;
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
                    Wähle in den Monaten „Plus“ oder „Beide – Bonus“, um Bonusmonate zu planen.
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
                  Keine gemeinsamen Monate geplant – für Partnerschaftsbonus gemeinsame Monate mit ElterngeldPlus erforderlich.
                </>
              )}
            </div>
          );
        })()}

        {partnerBonusSuggestion && (
          <OptimizationSuggestionBlock
            currentPlan={plan}
            optimizedPlan={partnerBonusSuggestion.plan}
            hasPartner={!!parentB}
            onAdopt={() => onChange(partnerBonusSuggestion.plan)}
          />
        )}

        {parentA.months.some((m) => m.hasMaternityBenefit) && (
          <p className="elterngeld-step__hint elterngeld-step__hint--section elterngeld-calculation__maternity-hint">
            In den ersten Lebensmonaten der Mutter können Mutterschaftsleistungen auf das Elterngeld angerechnet werden. Die Schätzung ist dort vereinfacht.
          </p>
        )}

        <div className="elterngeld-plan__partner-bonus-info elterngeld-plan__partner-bonus-actions">
          <h4 className="elterngeld-plan__partner-bonus-info-title">Partnerschaftsbonus prüfen</h4>
          {parentB && (() => {
            const hasPlusOrBonus = plan.parents.some((p) =>
              p.months.some((m) => m.mode === 'plus' || m.mode === 'partnerBonus')
            );
            const firstMonth = getFirstPartnerBonusMonth(plan)
              ?? plan.parents.flatMap((p) => p.months).find((m) => m.mode === 'plus')?.month ?? null;
            return (
              <>
                {hasPlusOrBonus && (
                  <p className="elterngeld-plan__partner-bonus-info-text">
                    Bei ElterngeldPlus und Partnerschaftsbonus: 24–32 Wochenstunden erforderlich.
                  </p>
                )}
                <div className="elterngeld-plan__partner-bonus-buttons">
                  {hasPlusOrBonus && firstMonth != null && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="elterngeld-plan__partner-bonus-work-link"
                      onClick={() => {
                        setActiveMonth(firstMonth);
                        const el = document.getElementById(SCROLL_IDS.monatsplan);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                    >
                      Arbeitszeit anpassen
                    </Button>
                  )}
                </div>
              </>
            );
          })()}
          <Button
            type="button"
            variant="secondary"
            className="btn--softpill elterngeld-step__partner-bonus-check-btn"
            onClick={() => setShowPartnerBonusCheck(true)}
          >
            Partnerschaftsbonus prüfen
          </Button>
        </div>
      </Card>

      <PartnerBonusCheckDialog
        isOpen={showPartnerBonusCheck}
        onClose={() => setShowPartnerBonusCheck(false)}
        plan={plan}
        onAction={handlePartnerBonusAction}
      />

      {activeMonth !== null && (
        <CalculationMonthPanel
          month={activeMonth}
          plan={plan}
          hasPartner={!!parentB}
          onChange={onChange}
          onClose={handleClosePanel}
          onMonthChange={(m) => setChangedMonth(m)}
        />
      )}
    </div>
  );
};
