/**
 * Schritt Monate planen – vereinfachte UX.
 * Verwendet: benefitPlan.model, parentAMonths, parentBMonths, partnershipBonus.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Card } from '../../../../shared/ui/Card';
import { Button } from '../../../../shared/ui/Button';
import { MonthGrid } from '../ui/MonthGrid';
import { MonthSummary } from '../ui/MonthSummary';
import { getMonthGridItemsFromValues } from '../monthGridMappings';
import { ElterngeldSelectButton } from '../ui/ElterngeldSelectButton';
import { applicationToCalculationPlan } from '../applicationToCalculationPlan';
import { mergePlanIntoPreparation } from '../planToApplicationMerge';
import { isPartnerBonusPartTimeHoursEligible } from '../partnerBonusEligibility';
import { calculatePlan, validatePartnerBonus, applyCombinedSelection } from '../calculation';
import { PartnerBonusCheckDialog, type PartnerBonusAction } from './PartnerBonusCheckDialog';
import type { ElterngeldApplication, BenefitModel } from '../types/elterngeldTypes';
import type { CalculationResult } from '../calculation';

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

type HintAction =
  | 'focusMonth'
  | 'focusEinkommen'
  | 'focusGrunddaten'
  | 'focusMonatsplan'
  | 'openPartnerBonusCheck'
  | 'focusElternArbeit'
  | null;

function getHintActionFromWarning(
  warning: string,
  result: CalculationResult,
  hoursEligibleForPartnerBonus: boolean
): { label: string; action: HintAction; month?: number } {
  const month = extractMonthFromWarning(warning);
  if (month != null) return { label: `Monat ${month} anpassen`, action: 'focusMonth', month };
  if (warning.includes('24–32') || warning.includes('Wochenstunden') || warning.includes('Arbeitszeit')) {
    const m = getFirstRelevantMonth(result);
    return { label: 'Arbeitszeit anpassen', action: m != null ? 'focusMonth' : 'focusMonatsplan', month: m ?? undefined };
  }
  if (warning.includes('Partnerschaftsbonus') || warning.includes('Partnerbonus')) {
    if (!hoursEligibleForPartnerBonus) {
      return { label: 'Teilzeitstunden anpassen', action: 'focusElternArbeit' };
    }
    return { label: 'Partnerschaftsbonus prüfen', action: 'openPartnerBonusCheck' };
  }
  if (warning.includes('Einkommen')) return { label: 'Einkommen anpassen', action: 'focusEinkommen' };
  if (warning.includes('Geburtsdatum') || warning.includes('Termin')) return { label: 'Grunddaten prüfen', action: 'focusGrunddaten' };
  return { label: '', action: null };
}

function getErrorActionFromError(error: string): { label: string; action: 'focusGrunddaten' | 'focusEinkommen' | null } {
  if (error.includes('Geburtsdatum') || error.includes('Termin')) return { label: 'Grunddaten prüfen', action: 'focusGrunddaten' };
  if (error.includes('Einkommen')) return { label: 'Einkommen anpassen', action: 'focusEinkommen' };
  return { label: '', action: null };
}

const MODEL_OPTIONS: { value: BenefitModel; label: string }[] = [
  { value: 'basis', label: 'Basiselterngeld' },
  { value: 'plus', label: 'ElterngeldPlus' },
  { value: 'mixed', label: 'Gemischt' },
];

/** Explizite Startvorbelegung beim Modellwechsel – nur UI-Startzustand, keine Ableitung aus Berechnungslogik. */
const MODEL_START_PREFILL: Record<BenefitModel, { parentAMonths: string; parentBMonths: string }> = {
  basis: { parentAMonths: '14', parentBMonths: '0' },
  plus: { parentAMonths: '24', parentBMonths: '0' },
  mixed: { parentAMonths: '14', parentBMonths: '0' },
};

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

/** Monate, die nach einer Anpassung der Bezugszähler in der Rasteransicht als „Kein Bezug“ erscheinen (vorher nicht). */
function computeMonthsTurnedToNone(
  beforeValues: ElterngeldApplication,
  afterValues: ElterngeldApplication,
  maxMonths: number
): number[] {
  const itemsBefore = getMonthGridItemsFromValues(beforeValues, maxMonths);
  const itemsAfter = getMonthGridItemsFromValues(afterValues, maxMonths);
  return itemsBefore
    .filter((row) => {
      const aft = itemsAfter.find((x) => x.month === row.month);
      return row.state !== 'none' && aft?.state === 'none';
    })
    .map((r) => r.month);
}

function parseMonthCount(value: string): number {
  const n = parseInt(String(value || '').trim(), 10);
  return Number.isNaN(n) ? 0 : Math.max(0, Math.min(36, n));
}

/** Reines Mapping wie `update()` – für eine atomare State-Aktualisierung (kein doppeltes onChange). */
function applyBenefitPlanField(
  app: ElterngeldApplication,
  field: string,
  value: string | boolean
): ElterngeldApplication {
  const base = { ...app.benefitPlan, [field]: value };
  let benefitPlan = field === 'model' ? { ...base, concreteMonthDistribution: undefined as undefined } : base;
  if (field === 'model') {
    const prefill = MODEL_START_PREFILL[value as BenefitModel];
    if (prefill) {
      benefitPlan = { ...benefitPlan, ...prefill };
    }
  }
  return { ...app, benefitPlan };
}

function buildAssignMonthApplication(
  app: ElterngeldApplication,
  month: number,
  who: 'mother' | 'partner' | 'both' | 'none'
): ElterngeldApplication {
  const maxMonths = app.benefitPlan.model === 'plus' ? 24 : 14;
  const capped = Math.min(Math.max(month, 0), maxMonths);
  const bp = app.benefitPlan;
  const countA = parseMonthCount(bp.parentAMonths);
  const countB = app.applicantMode === 'both_parents' ? parseMonthCount(bp.parentBMonths) : 0;
  const hasPartner = app.applicantMode === 'both_parents';

  const clearDistribution = { ...bp, concreteMonthDistribution: undefined as undefined };
  let benefitPlan = clearDistribution;
  if (who === 'mother') {
    benefitPlan = {
      ...clearDistribution,
      parentAMonths: String(capped),
      parentBMonths: String(Math.min(countB, capped - 1)),
      partnershipBonus: false,
    };
  } else if (who === 'partner') {
    benefitPlan = {
      ...clearDistribution,
      parentAMonths: String(Math.min(countA, capped - 1)),
      parentBMonths: String(capped),
      partnershipBonus: false,
    };
  } else if (who === 'both') {
    benefitPlan = {
      ...clearDistribution,
      parentAMonths: String(Math.max(countA, capped)),
      parentBMonths: String(Math.max(countB, capped)),
      partnershipBonus: true,
    };
  } else {
    benefitPlan = {
      ...clearDistribution,
      parentAMonths: String(Math.min(countA, capped - 1)),
      parentBMonths: hasPartner ? String(Math.min(countB, capped - 1)) : bp.parentBMonths,
    };
  }

  return { ...app, benefitPlan };
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
  /** Entspricht ElterngeldWizardPage: zentrale 24–32-h-Regel für Partnerbonus-Pfade */
  partnerBonusHoursEligible?: boolean;
  /** Nach erfolgreicher Anwendung des Bonus-Fix (Toast etc.) */
  onApplyBonusFix?: () => void;
};

type ApplyRangeId = 'next1' | 'next3' | 'toEnd';

export const StepPlan: React.FC<Props> = ({
  values,
  onChange,
  onNavigateToStep,
  partnerBonusHoursEligible = true,
  onApplyBonusFix,
}) => {
  const [activeMonth, setActiveMonth] = useState<number | null>(null);
  const [selectedApplyRange, setSelectedApplyRange] = useState<ApplyRangeId | null>(null);
  const [showLeistungDetails, setShowLeistungDetails] = useState(false);
  const [showModelLeistungDetails, setShowModelLeistungDetails] = useState(false);
  const [selectedModelInDialog, setSelectedModelInDialog] = useState<'basis' | 'plus'>(() =>
    values.benefitPlan.model === 'basis' ? 'basis' : 'plus'
  );
  const [monthGridAutoAdjustNotice, setMonthGridAutoAdjustNotice] = useState<string | null>(null);
  const [showPartnerBonusCheck, setShowPartnerBonusCheck] = useState(false);
  const defaultBasisPlanAppliedRef = useRef(false);

  useEffect(() => {
    const dist = values.benefitPlan.concreteMonthDistribution;
    const hasDistribution = Array.isArray(dist) && dist.length > 0;
    const a = String(values.benefitPlan.parentAMonths ?? '').trim();
    const b = String(values.benefitPlan.parentBMonths ?? '').trim();
    const isPlanEmpty = !hasDistribution && a === '' && b === '';

    if (!isPlanEmpty) return;
    if (defaultBasisPlanAppliedRef.current) return;
    defaultBasisPlanAppliedRef.current = true;

    onChange({
      ...values,
      benefitPlan: {
        ...values.benefitPlan,
        model: 'basis',
        parentAMonths: '12',
        parentBMonths: '2',
      },
    });
  }, [values, onChange]);

  useEffect(() => {
    if (activeMonth !== null) {
      setSelectedModelInDialog(values.benefitPlan.model === 'basis' ? 'basis' : 'plus');
      setSelectedApplyRange(null);
    }
  }, [activeMonth, values.benefitPlan.model]);

  const update = useCallback(
    (field: string, value: string | boolean) => {
      const base = { ...values.benefitPlan, [field]: value };
      let benefitPlan = field === 'model' ? { ...base, concreteMonthDistribution: undefined } : base;
      if (field === 'model') {
        const prefill = MODEL_START_PREFILL[value as BenefitModel];
        if (prefill) {
          benefitPlan = { ...benefitPlan, ...prefill };
        }
      }
      onChange({
        ...values,
        benefitPlan,
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

  const partnerBonusNotAllowed = useMemo(
    () => hasPartner && !isPartnerBonusPartTimeHoursEligible(values),
    [hasPartner, values]
  );

  const assignMonth = useCallback(
    (month: number, who: 'mother' | 'partner' | 'both' | 'none') => {
      const canonicalAsDialog: 'basis' | 'plus' =
        values.benefitPlan.model === 'basis' ? 'basis' : 'plus';
      const valuesWithDialogModel =
        selectedModelInDialog === canonicalAsDialog
          ? values
          : applyBenefitPlanField(values, 'model', selectedModelInDialog);
      const nextValues = buildAssignMonthApplication(valuesWithDialogModel, month, who);
      const maxBefore = values.benefitPlan.model === 'plus' ? 24 : 14;
      const maxAfter = nextValues.benefitPlan.model === 'plus' ? 24 : 14;
      const turned = computeMonthsTurnedToNone(values, nextValues, Math.max(maxBefore, maxAfter));
      setMonthGridAutoAdjustNotice(
        turned.length > 0
          ? `Die geplanten Bezugsmonate wurden angepasst. Lebensmonat${turned.length === 1 ? ' ' : 'e '}${formatBothMonthRange(turned)} ${turned.length === 1 ? 'wird' : 'werden'} jetzt als „Kein Bezug“ angezeigt, weil sich aus dieser Auswahl kürzere Bezugsdauern ergeben.`
          : null
      );
      onChange(nextValues);
    },
    [values, onChange, selectedModelInDialog]
  );

  const items = useMemo(() => {
    if (import.meta.env.DEV) {
      const bp = values.benefitPlan;
      const dist = bp.concreteMonthDistribution;
      console.log('[StepPlan DIAG] values vor getMonthGridItemsFromValues:', {
        model: bp.model,
        parentAMonths: bp.parentAMonths,
        parentBMonths: bp.parentBMonths,
        applicantMode: values.applicantMode,
        concreteMonthDistribution: {
          length: dist?.length ?? 0,
          content: dist ?? [],
        },
      });
    }
    const result = getMonthGridItemsFromValues(values, maxMonths);
    if (import.meta.env.DEV) {
      console.log('[StepPlan DIAG] nach getMonthGridItemsFromValues:', {
        maxMonths,
        itemCount: result.length,
        items: result.map((i) => ({ month: i.month, state: i.state, label: i.label, subLabel: i.subLabel })),
      });
    }
    return result;
  }, [values, maxMonths]);

  const currentState =
    activeMonth !== null
      ? (items.find((i) => i.month === activeMonth)?.state ??
          getCurrentMonthState(
            activeMonth,
            countA,
            countB,
            values.benefitPlan.partnershipBonus,
            hasPartner
          ))
      : null;

  const handleConfirm = useCallback(() => {
    const bp = values.benefitPlan;
    let newBp = { ...bp, model: selectedModelInDialog, concreteMonthDistribution: undefined };

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

    const nextValues = { ...values, benefitPlan: newBp };
    const turned = computeMonthsTurnedToNone(values, nextValues, maxMonths);
    setMonthGridAutoAdjustNotice(
      turned.length > 0
        ? `Die geplanten Bezugsmonate wurden angepasst. Lebensmonat${turned.length === 1 ? ' ' : 'e '}${formatBothMonthRange(turned)} ${turned.length === 1 ? 'wird' : 'werden'} jetzt als „Kein Bezug“ angezeigt, weil sich aus dieser Auswahl kürzere Bezugsdauern ergeben.`
        : null
    );
    onChange(nextValues);
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

  const handlePartnerBonusAction = useCallback(
    (action: PartnerBonusAction) => {
      const basePlan = applicationToCalculationPlan(values);
      const hasP = values.applicantMode === 'both_parents';
      if (action.type === 'applyFix') {
        const next = applyCombinedSelection(basePlan, action.month, { who: 'both', mode: 'partnerBonus' }, hasP);
        onChange(mergePlanIntoPreparation(values, next));
        setActiveMonth(action.month);
        setShowPartnerBonusCheck(false);
        onApplyBonusFix?.();
        return;
      }
      if (action.type === 'applySetAllSuitableMonths') {
        if (action.months.length === 0) return;
        let next = basePlan;
        for (const m of action.months) {
          next = applyCombinedSelection(next, m, { who: 'both', mode: 'partnerBonus' }, hasP);
        }
        onChange(mergePlanIntoPreparation(values, next));
        const firstM = action.months[0];
        setActiveMonth(firstM ?? null);
        setShowPartnerBonusCheck(false);
        onApplyBonusFix?.();
        return;
      }
      if (action.type === 'focusMonth') {
        setActiveMonth(action.month);
        setShowPartnerBonusCheck(false);
        const el = document.getElementById('elterngeld-plan-month-grid') ?? document.getElementById('elterngeld-plan-card');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (action.type === 'focusSection') {
        setShowPartnerBonusCheck(false);
        if (action.section === 'grunddaten') onNavigateToStep?.('geburtKind');
        else if (action.section === 'einkommen') onNavigateToStep?.('einkommen');
        else if (action.section === 'elternArbeit') onNavigateToStep?.('elternArbeit', 'elterngeld-step-eltern-arbeit-teilzeit');
        else if (action.section === 'monatsplan' || action.section === 'eltern') {
          const el = document.getElementById('elterngeld-plan-month-grid') ?? document.getElementById('elterngeld-plan-card');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    },
    [values, onChange, onApplyBonusFix, onNavigateToStep]
  );

  const mainHint = useMemo(() => {
    if (!planResult) return null;
    const hoursEligible = isPartnerBonusPartTimeHoursEligible(values);
    const { validation } = planResult;
    const firstError = validation.errors[0];
    if (firstError) {
      const { label, action } = getErrorActionFromError(firstError);
      if (action) return { text: firstError, label, action: action as HintAction, month: undefined as number | undefined };
    }
    for (const w of validation.warnings) {
      const { label, action, month } = getHintActionFromWarning(w, planResult, hoursEligible);
      if (action) return { text: w, label, action, month };
    }
    return null;
  }, [planResult, values]);

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
              } else if (mainHint.action === 'focusEinkommen' && onNavigateToStep) {
                onNavigateToStep('einkommen');
              } else if (mainHint.action === 'focusGrunddaten' && onNavigateToStep) {
                onNavigateToStep('geburtKind');
              } else if (mainHint.action === 'focusMonatsplan') {
                const el = document.getElementById('elterngeld-plan-month-grid') ?? document.getElementById('elterngeld-plan-card');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              } else if (mainHint.action === 'focusElternArbeit' && onNavigateToStep) {
                onNavigateToStep('elternArbeit', 'elterngeld-step-eltern-arbeit-teilzeit');
              }
            }}
          >
            {mainHint.label}
          </Button>
        </div>
      )}

      {planResult && mainHint?.action === 'openPartnerBonusCheck' && (
        <div className="elterngeld-plan__status-card elterngeld-step__notice elterngeld-step__notice--warning">
          <p className="elterngeld-plan__status-text">{mainHint.text}</p>
          <Button
            type="button"
            variant="primary"
            className="btn--softpill elterngeld-plan__status-btn"
            onClick={() => setShowPartnerBonusCheck(true)}
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

      {hasPartner &&
        isPartnerBonusPartTimeHoursEligible(values) &&
        !partnerBonusValidation.isValid &&
        !(mainHint && mainHint.action && mainHint.action !== 'openPartnerBonusCheck') && (
        <div className="elterngeld-plan__status-card elterngeld-step__notice elterngeld-step__notice--warning">
          <p className="elterngeld-plan__status-text">
            Der Partnerschaftsbonus ist möglich, aber noch nicht passend eingeplant.
          </p>
        </div>
      )}

      <div id="elterngeld-plan-leistung" className="elterngeld-plan__model-row">
        <span className="elterngeld-plan__model-label">Standard-Leistung für neue Monate</span>
        <p className="elterngeld-plan__model-hint">
          Diese Einstellung wird für neue Monate im Plan verwendet.
          Du kannst sie im Monatsdialog jederzeit ändern.
        </p>
        <div
          className="elterngeld-plan__model-comparison elterngeld-step__notice elterngeld-step__notice--tip"
          role="note"
        >
          <p className="elterngeld-plan__model-comparison-text">
            <strong>Basis:</strong> mehr Geld pro Monat
            <br />
            <strong>Plus:</strong> weniger pro Monat, dafür länger und mit Teilzeit kombinierbar
          </p>
        </div>
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
        {values.benefitPlan.model === 'plus' && partnerBonusNotAllowed && (
          <div className="elterngeld-hint elterngeld-hint--model">
            <p className="elterngeld-hint__text">
              Partnerschaftsbonus nur möglich bei 24–32 Stunden pro Woche.
            </p>
            {onNavigateToStep && (
              <button
                type="button"
                className="elterngeld-hint__toggle"
                onClick={() => onNavigateToStep('elternArbeit', 'elterngeld-step-eltern-arbeit-teilzeit')}
              >
                Teilzeitstunden anpassen
              </button>
            )}
          </div>
        )}
        <div className="elterngeld-hint elterngeld-hint--model elterngeld-hint--model-details">
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

      {monthGridAutoAdjustNotice && (
        <div
          className="elterngeld-plan__status-card elterngeld-step__notice elterngeld-step__notice--tip"
          role="status"
        >
          <p className="elterngeld-plan__status-text">{monthGridAutoAdjustNotice}</p>
        </div>
      )}

      <div className="elterngeld-plan__counts elterngeld-plan__counts--secondary">
        <MonthSummary items={items} />
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
              <div
                className="elterngeld-plan__model-comparison elterngeld-plan__model-comparison--panel elterngeld-step__notice elterngeld-step__notice--tip"
                role="note"
              >
                <p className="elterngeld-plan__model-comparison-text">
                  <strong>Basis:</strong> mehr Geld pro Monat
                  <br />
                  <strong>Plus:</strong> weniger pro Monat, dafür länger und mit Teilzeit kombinierbar
                </p>
              </div>
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
            <div className="next-steps__stack elterngeld-plan__panel-actions">
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
                } else if (activeMonth != null) {
                  const withPlus = applyBenefitPlanField(values, 'model', 'plus');
                  const next = buildAssignMonthApplication(withPlus, activeMonth, 'both');
                  const maxForNotice = Math.max(maxMonths, 24);
                  const turned = computeMonthsTurnedToNone(values, next, maxForNotice);
                  setMonthGridAutoAdjustNotice(
                    turned.length > 0
                      ? `Die geplanten Bezugsmonate wurden angepasst. Lebensmonat${turned.length === 1 ? ' ' : 'e '}${formatBothMonthRange(turned)} ${turned.length === 1 ? 'wird' : 'werden'} jetzt als „Kein Bezug“ angezeigt, weil sich aus dieser Auswahl kürzere Bezugsdauern ergeben.`
                      : null
                  );
                  onChange(next);
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

      <PartnerBonusCheckDialog
        isOpen={showPartnerBonusCheck}
        onClose={() => setShowPartnerBonusCheck(false)}
        plan={planForCheck}
        onAction={handlePartnerBonusAction}
      />
    </Card>
  );
};
