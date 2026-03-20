/**
 * Planphasen – gruppiert aufeinanderfolgende Monate mit identischem Zustand.
 * Nur Darstellung, keine neue Planlogik.
 */

import React from 'react';
import type { MonthGridItem } from './MonthGrid';

export interface PlanPhase {
  label: string;
  range: string;
}

function getPhaseLabel(item: MonthGridItem): string {
  if (item.state === 'none') return 'Kein Bezug';
  if (item.state === 'both') return 'Beide – Partnerschaftsbonus';
  const sub = item.subLabel ? ` – ${item.subLabel}` : '';
  return `${item.label}${sub}`;
}

/** Gruppiert sequenzielle Monate mit gleichem Zustand zu Phasen */
export function computePlanPhases(items: MonthGridItem[]): PlanPhase[] {
  if (items.length === 0) return [];
  const phases: PlanPhase[] = [];
  let start = items[0].month;
  let prevKey = `${items[0].state}-${items[0].label}-${items[0].subLabel ?? ''}`;
  let prevLabel = getPhaseLabel(items[0]);

  for (let i = 1; i < items.length; i++) {
    const item = items[i];
    const key = `${item.state}-${item.label}-${item.subLabel ?? ''}`;
    const label = getPhaseLabel(item);

    if (key !== prevKey) {
      phases.push({
        label: prevLabel,
        range: start === items[i - 1].month ? `LM${start}` : `LM${start}–${items[i - 1].month}`,
      });
      start = item.month;
      prevKey = key;
      prevLabel = label;
    }
  }
  const last = items[items.length - 1];
  phases.push({
    label: prevLabel,
    range: start === last.month ? `LM${start}` : `LM${start}–${last.month}`,
  });
  return phases;
}

export interface PlanPhasesProps {
  items: MonthGridItem[];
  compact?: boolean;
}

export const PlanPhases: React.FC<PlanPhasesProps> = ({ items, compact }) => {
  const phases = computePlanPhases(items);
  if (phases.length === 0) return null;

  return (
    <div className={`elterngeld-plan-phases ${compact ? 'elterngeld-plan-phases--compact' : ''}`}>
      <h4 className="elterngeld-plan-phases__title">Planphasen</h4>
      <div className="elterngeld-plan-phases__list" role="list">
        {phases.map((p, i) => (
          <div key={i} className="elterngeld-plan-phases__item" role="listitem">
            <span className="elterngeld-plan-phases__label">{p.label}</span>
            <span className="elterngeld-plan-phases__range">{p.range}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
