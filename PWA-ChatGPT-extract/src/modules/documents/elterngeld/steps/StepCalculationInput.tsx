/**
 * Eingabeflow für die Elterngeld-Berechnung.
 * Monatszentrierte Darstellung wie in der Vorbereitung:
 * Pro Lebensmonat ein kombinierter Zustand (Mutter | Partner | Beide | Kein Bezug).
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Card } from '../../../../shared/ui/Card';
import { Button } from '../../../../shared/ui/Button';
import { TextInput } from '../../../../shared/ui/TextInput';
import { IncomeInput } from '../ui/IncomeInput';
import { MonthGrid } from '../ui/MonthGrid';
import { PlanTimeline } from '../ui/PlanTimeline';
import { PlanPhases } from '../ui/PlanPhases';
import { MonthSummary } from '../ui/MonthSummary';
import { MonthStatusBar } from '../ui/MonthStatusBar';
import { getMonthGridItemsFromPlan } from '../monthGridMappings';
import { getCombinedMonthState } from '../calculation';
import { CalculationMonthPanel } from './CalculationMonthPanel';
import {
  PartnerBonusCheckDialog,
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
};

const SCROLL_IDS = {
  grunddaten: 'elterngeld-input-grunddaten',
  einkommen: 'elterngeld-input-einkommen',
  monatsplan: 'elterngeld-input-monatsplan',
} as const;

const CHANGED_MONTH_DISPLAY_MS = 3000;

export const StepCalculationInput: React.FC<Props> = ({ plan, onChange, initialFocusMonth, initialScrollTo }) => {
  const [activeMonth, setActiveMonth] = useState<number | null>(initialFocusMonth ?? null);
  const [showPartnerBonusCheck, setShowPartnerBonusCheck] = useState(false);
  const [changedMonth, setChangedMonth] = useState<number | null>(null);

  useEffect(() => {
    if (initialFocusMonth != null) setActiveMonth(initialFocusMonth);
  }, [initialFocusMonth]);

  useEffect(() => {
    if (!initialScrollTo) return;
    const id = SCROLL_IDS[initialScrollTo];
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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

  const handlePartnerBonusAction = useCallback((action: PartnerBonusAction) => {
    if (action.type === 'focusMonth') {
      setActiveMonth(action.month);
      const el = document.getElementById(SCROLL_IDS.monatsplan);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (action.type === 'focusSection') {
      const sectionToId: Record<string, string> = {
        grunddaten: SCROLL_IDS.grunddaten,
        einkommen: SCROLL_IDS.einkommen,
        monatsplan: SCROLL_IDS.monatsplan,
        elternArbeit: SCROLL_IDS.monatsplan,
        eltern: SCROLL_IDS.einkommen,
      };
      const id = sectionToId[action.section] ?? SCROLL_IDS.monatsplan;
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (action.section === 'monatsplan' || action.section === 'elternArbeit') setActiveMonth(null);
    }
  }, []);

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
              <PlanTimeline
                items={items}
                showLegend
                onMonthClick={handleMonthClick}
              />
            </>
          );
        })()}

        <MonthStatusBar
          activeMonth={activeMonth}
          who={
            activeMonth !== null
              ? getCombinedMonthState(plan, activeMonth, !!parentB).who
              : 'none'
          }
          mode={
            activeMonth !== null
              ? getCombinedMonthState(plan, activeMonth, !!parentB).mode
              : 'none'
          }
          showLegend
        />
        <MonthGrid
          items={getMonthGridItemsFromPlan(plan, !!parentB, maxMonth)}
          onMonthClick={handleMonthClick}
          activeMonth={activeMonth ?? undefined}
        />

        {parentA.months.some((m) => m.hasMaternityBenefit) && (
          <p className="elterngeld-step__hint elterngeld-step__hint--section elterngeld-calculation__maternity-hint">
            In den ersten Lebensmonaten der Mutter können Mutterschaftsleistungen auf das Elterngeld angerechnet werden. Die Schätzung ist dort vereinfacht.
          </p>
        )}

        <p className="elterngeld-step__hint elterngeld-step__hint--below">
          Bei ElterngeldPlus und Partnerschaftsbonus: 24–32 Wochenstunden erforderlich. Bitte tragen Sie Ihre geplanten Wochenstunden ein – es gibt keine automatische Übernahme.
        </p>
        <Button
          type="button"
          variant="secondary"
          className="btn--softpill elterngeld-step__partner-bonus-check-btn"
          onClick={() => setShowPartnerBonusCheck(true)}
        >
          Partnerschaftsbonus prüfen
        </Button>
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
