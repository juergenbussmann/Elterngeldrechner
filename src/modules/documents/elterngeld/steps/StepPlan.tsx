/**
 * Schritt Monate planen – vereinfachte UX.
 * Verwendet: benefitPlan.model, parentAMonths, parentBMonths, partnershipBonus.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Card } from '../../../../shared/ui/Card';
import { Button } from '../../../../shared/ui/Button';
import { MonthGrid } from '../ui/MonthGrid';
import { MonthSummary } from '../ui/MonthSummary';
import { getExpandedMonthDistribution, getMonthGridItemsFromValues } from '../monthGridMappings';
import { ElterngeldSelectButton } from '../ui/ElterngeldSelectButton';
import { applicationToCalculationPlan } from '../applicationToCalculationPlan';
import { mergePlanIntoPreparation } from '../planToApplicationMerge';
import { isPartnerBonusPartTimeHoursEligible } from '../partnerBonusEligibility';
import { calculatePlan, validatePartnerBonus, applyCombinedSelection } from '../calculation';
import { PartnerBonusCheckDialog, type PartnerBonusAction } from './PartnerBonusCheckDialog';
import {
  getPartnerschaftsbonusHandlungshinweis,
  PARTNERSCHAFTSBONUS_KARTE_TITEL,
  PARTNERSCHAFTSBONUS_OVERLAY_AKTION,
} from './partnerBonusUiCopy';
import type {
  ElterngeldApplication,
  BenefitModel,
  MonthDistributionEntry,
  MonthModeForDistribution,
} from '../types/elterngeldTypes';
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
    return { label: PARTNERSCHAFTSBONUS_OVERLAY_AKTION, action: 'openPartnerBonusCheck' };
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

function parseMonthCount(value: string): number {
  const n = parseInt(String(value || '').trim(), 10);
  return Number.isNaN(n) ? 0 : Math.max(0, Math.min(36, n));
}

function maxMonthsForBenefitModel(model: BenefitModel): number {
  return model === 'plus' ? 24 : 14;
}

function derivePartnershipBonusFromDist(dist: MonthDistributionEntry[]): boolean {
  return dist.some((e) => e.modeA === 'partnerBonus' && e.modeB === 'partnerBonus');
}

/** Ableitung des Leistungsmodells aus der konkreten Verteilung (keine Zählerlogik). */
function deriveBenefitModelFromDistribution(dist: MonthDistributionEntry[]): BenefitModel {
  let hasBasis = false;
  let hasPlusFamily = false;
  for (const e of dist) {
    for (const mode of [e.modeA, e.modeB] as const) {
      if (mode === 'none') continue;
      if (mode === 'basis') hasBasis = true;
      if (mode === 'plus' || mode === 'partnerBonus') hasPlusFamily = true;
    }
  }
  if (hasPlusFamily && hasBasis) return 'mixed';
  if (hasPlusFamily) return 'plus';
  return 'basis';
}

/** Monatsraster: 24 nur wenn in der Verteilung Plus/Bonus vorkommt, sonst 14 (bzw. Fallback-Modell). */
function maxDisplayMonthsFromDistributionOrModel(
  dist: MonthDistributionEntry[] | undefined,
  fallbackModel: BenefitModel
): number {
  if (dist && dist.length > 0) {
    const anyPlusFamily = dist.some(
      (e) =>
        e.modeA === 'plus' ||
        e.modeA === 'partnerBonus' ||
        e.modeB === 'plus' ||
        e.modeB === 'partnerBonus'
    );
    return anyPlusFamily ? 24 : 14;
  }
  return maxMonthsForBenefitModel(fallbackModel);
}

/** Leistung (Basis/Plus) für einen Lebensmonat aus materialisierter Verteilung – für den Dialog. */
function dialogLeistungForActiveMonth(
  app: ElterngeldApplication,
  month: number,
  hasPartnerUser: boolean
): 'basis' | 'plus' {
  const expandTo = Math.max(14, month, 24);
  const dist = getExpandedMonthDistribution(app, expandTo);
  const e = dist.find((x) => x.month === month);
  if (!e) return 'basis';
  const isPlusFamily = (m: MonthModeForDistribution) => m === 'plus' || m === 'partnerBonus';
  if (isPlusFamily(e.modeA)) return 'plus';
  if (hasPartnerUser && isPlusFamily(e.modeB)) return 'plus';
  return 'basis';
}

function deriveCountsFromDist(dist: MonthDistributionEntry[]): { parentAMonths: string; parentBMonths: string } {
  let maxA = 0;
  let maxB = 0;
  for (const e of dist) {
    if (e.modeA !== 'none') maxA = Math.max(maxA, e.month);
    if (e.modeB !== 'none') maxB = Math.max(maxB, e.month);
  }
  return { parentAMonths: String(maxA), parentBMonths: String(maxB) };
}

function patchMonthInDistribution(
  dist: MonthDistributionEntry[],
  month: number,
  who: 'mother' | 'partner' | 'both' | 'none',
  leistung: 'basis' | 'plus',
  hasPartner: boolean,
  partnershipBonus: boolean
): MonthDistributionEntry[] {
  const modeForLeistung: MonthModeForDistribution = leistung === 'plus' ? 'plus' : 'basis';
  return dist.map((e) => {
    if (e.month !== month) return e;
    const next: MonthDistributionEntry = { ...e };
    if (who === 'none') {
      next.modeA = 'none';
      next.modeB = 'none';
    } else if (who === 'mother') {
      next.modeA = modeForLeistung;
      next.modeB = 'none';
    } else if (who === 'partner') {
      next.modeA = 'none';
      if (!hasPartner) next.modeB = 'none';
      else next.modeB = partnershipBonus && leistung === 'plus' ? 'partnerBonus' : modeForLeistung;
    } else {
      if (!hasPartner) {
        next.modeA = modeForLeistung;
        next.modeB = 'none';
      } else if (leistung === 'plus') {
        next.modeA = 'partnerBonus';
        next.modeB = 'partnerBonus';
      } else {
        next.modeA = 'basis';
        next.modeB = 'basis';
      }
    }
    return next;
  });
}

function applyMonthPatchToApplication(
  app: ElterngeldApplication,
  month: number,
  who: 'mother' | 'partner' | 'both' | 'none',
  leistung: 'basis' | 'plus'
): ElterngeldApplication {
  const hasPartner = app.applicantMode === 'both_parents';
  const expandTo = Math.max(
    maxMonthsForBenefitModel(app.benefitPlan.model),
    month,
    maxMonthsForBenefitModel(leistung === 'plus' ? 'plus' : 'basis')
  );
  let dist = getExpandedMonthDistribution(app, expandTo);
  const partnershipBonusFlag = derivePartnershipBonusFromDist(dist);
  dist = patchMonthInDistribution(dist, month, who, leistung, hasPartner, partnershipBonusFlag);
  const partnershipBonus = derivePartnershipBonusFromDist(dist);
  const derivedModel = deriveBenefitModelFromDistribution(dist);
  const counts = deriveCountsFromDist(dist);
  return {
    ...app,
    benefitPlan: {
      ...app.benefitPlan,
      model: derivedModel,
      concreteMonthDistribution: dist,
      partnershipBonus,
      parentAMonths: counts.parentAMonths,
      parentBMonths: counts.parentBMonths,
    },
  };
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

    const benefitPlan = {
      ...values.benefitPlan,
      model: 'basis' as const,
      parentAMonths: '12',
      parentBMonths: '2',
    };
    const tempApp: ElterngeldApplication = { ...values, benefitPlan };
    onChange({
      ...values,
      benefitPlan: {
        ...benefitPlan,
        concreteMonthDistribution: getExpandedMonthDistribution(tempApp, 14),
      },
    });
  }, [values, onChange]);

  useEffect(() => {
    if (activeMonth === null) return;
    setSelectedApplyRange(null);
  }, [activeMonth]);

  useEffect(() => {
    if (activeMonth === null) return;
    const hp = values.applicantMode === 'both_parents';
    setSelectedModelInDialog(dialogLeistungForActiveMonth(values, activeMonth, hp));
  }, [activeMonth, values]);

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
      const nextValues = applyMonthPatchToApplication(values, month, who, selectedModelInDialog);
      setMonthGridAutoAdjustNotice(null);
      onChange(nextValues);
    },
    [values, onChange, selectedModelInDialog]
  );

  const maxMonths = useMemo(
    () =>
      maxDisplayMonthsFromDistributionOrModel(
        values.benefitPlan.concreteMonthDistribution,
        values.benefitPlan.model
      ),
    [values.benefitPlan.concreteMonthDistribution, values.benefitPlan.model]
  );

  const items = useMemo(() => getMonthGridItemsFromValues(values, maxMonths), [values, maxMonths]);

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
    if (activeMonth === null || !currentState) {
      closePanel();
      return;
    }
    const bp = values.benefitPlan;
    const who = currentState;
    const expandTo = Math.max(
      maxMonthsForBenefitModel(bp.model),
      activeMonth,
      maxMonthsForBenefitModel(selectedModelInDialog === 'plus' ? 'plus' : 'basis')
    );
    let dist = getExpandedMonthDistribution(values, expandTo);

    const applyPatchForMonth = (m: number) => {
      const pbFlag = derivePartnershipBonusFromDist(dist);
      dist = patchMonthInDistribution(dist, m, who, selectedModelInDialog, hasPartner, pbFlag);
    };

    if (selectedApplyRange !== null) {
      const opt = APPLY_RANGE_OPTIONS.find((o) => o.id === selectedApplyRange);
      if (opt) {
        const gridMax = maxDisplayMonthsFromDistributionOrModel(dist, deriveBenefitModelFromDistribution(dist));
        const endMonth = opt.count === -1 ? gridMax : Math.min(activeMonth + opt.count, gridMax);
        for (let m = activeMonth; m <= endMonth; m++) {
          applyPatchForMonth(m);
        }
      }
    } else {
      applyPatchForMonth(activeMonth);
    }

    const partnershipBonus = derivePartnershipBonusFromDist(dist);
    const derivedModel = deriveBenefitModelFromDistribution(dist);
    const counts = deriveCountsFromDist(dist);

    setMonthGridAutoAdjustNotice(null);
    onChange({
      ...values,
      benefitPlan: {
        ...bp,
        model: derivedModel,
        concreteMonthDistribution: dist,
        partnershipBonus,
        parentAMonths: counts.parentAMonths,
        parentBMonths: counts.parentBMonths,
      },
    });
    closePanel();
  }, [
    selectedApplyRange,
    selectedModelInDialog,
    activeMonth,
    currentState,
    values,
    onChange,
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
          <p className="elterngeld-plan__status-text elterngeld-plan__status-text--title">{PARTNERSCHAFTSBONUS_KARTE_TITEL}</p>
          <p className="elterngeld-plan__status-text">{mainHint.text}</p>
          <p className="elterngeld-plan__status-text elterngeld-plan__status-text--hint">
            {getPartnerschaftsbonusHandlungshinweis(mainHint.text)}
          </p>
          <Button
            type="button"
            variant="primary"
            className="btn--softpill elterngeld-plan__status-btn"
            onClick={() => setShowPartnerBonusCheck(true)}
          >
            {PARTNERSCHAFTSBONUS_OVERLAY_AKTION}
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
          <p className="elterngeld-plan__status-text elterngeld-plan__status-text--title">{PARTNERSCHAFTSBONUS_KARTE_TITEL}</p>
          {partnerBonusValidation.warnings[0] && (
            <p className="elterngeld-plan__status-text">{partnerBonusValidation.warnings[0]}</p>
          )}
          {partnerBonusValidation.warnings[0] && (
            <p className="elterngeld-plan__status-text elterngeld-plan__status-text--hint">
              {getPartnerschaftsbonusHandlungshinweis(partnerBonusValidation.warnings[0])}
            </p>
          )}
          <Button
            type="button"
            variant="primary"
            className="btn--softpill elterngeld-plan__status-btn"
            onClick={() => setShowPartnerBonusCheck(true)}
          >
            {PARTNERSCHAFTSBONUS_OVERLAY_AKTION}
          </Button>
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
                  ? 'Für diesen Monat: ElterngeldPlus und „Beide“ – so stellst du diesen Monat für einen Bonusmonat im Raster ein.'
                  : isBoth && !isPlus
                    ? 'Für einen Bonusmonat in diesem Monat: hier auf ElterngeldPlus wechseln.'
                    : isPlus && !isBoth
                      ? 'Für einen Bonusmonat in diesem Monat: hier beide Eltern auswählen.'
                      : 'Für einen Bonusmonat in diesem Monat: ElterngeldPlus und „Beide“ wählen.';
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
                  setSelectedModelInDialog('plus');
                  const next = applyMonthPatchToApplication(values, activeMonth, 'both', 'plus');
                  setMonthGridAutoAdjustNotice(null);
                  onChange(next);
                } else if (isPlus && !isBoth) {
                  assignMonth(activeMonth, 'both');
                } else if (activeMonth != null) {
                  const next = applyMonthPatchToApplication(values, activeMonth, 'both', 'plus');
                  setMonthGridAutoAdjustNotice(null);
                  onChange(next);
                }
              };
              return (
                <div className="elterngeld-plan__panel-hint-block">
                  <p className="elterngeld-plan__panel-hint elterngeld-plan__panel-hint--context">
                    {hint}
                  </p>
                  <p className="elterngeld-plan__panel-apply-range-note">
                    Das betrifft nur diesen Monat (bzw. den gewählten Bereich nach „Übernehmen“). Es ersetzt keine
                    vollständige Partnerschaftsbonus-Prüfung.
                  </p>
                  <div className="elterngeld-plan__partner-bonus-buttons">
                    {showButton && (
                      <button
                        type="button"
                        className="elterngeld-plan__panel-quickfix-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickFix();
                        }}
                      >
                        {buttonLabel}
                      </button>
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      className="btn--softpill elterngeld-step__partner-bonus-check-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPartnerBonusCheck(true);
                      }}
                    >
                      Bonus vollständig prüfen
                    </Button>
                  </div>
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
