/**
 * Dialog zur Prüfung des Partnerschaftsbonus.
 * Nutzt ausschließlich validatePartnerBonus und bestehende PWA-Daten.
 * Keine neue Fachlogik.
 */

import React from 'react';
import { Modal } from '../../../../shared/ui/Modal';
import { Button } from '../../../../shared/ui/Button';
import {
  validatePartnerBonus,
  validatePartnerBonusFromResult,
  type PartnerBonusValidationResult,
} from '../calculation/partnerBonusValidation';
import { getCombinedMonthState } from '../calculation/monthCombinedState';
import type { ElterngeldCalculationPlan, CalculationResult } from '../calculation';

export type PartnerBonusAction =
  | { type: 'focusMonth'; month: number }
  | {
      type: 'focusSection';
      section: 'grunddaten' | 'einkommen' | 'monatsplan' | 'elternArbeit' | 'eltern';
    }
  | { type: 'applyFix'; month: number; fix: 'switchToPlus' | 'setBoth' | 'setBonusMonth' }
  | { type: 'applySetAllSuitableMonths'; months: number[] };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  plan: ElterngeldCalculationPlan;
  /** Wenn gesetzt (Ergebnis-Ansicht): Maßnahmen aus angezeigten Result-Daten ableiten statt aus Plan */
  result?: CalculationResult | null;
  onAction?: (action: PartnerBonusAction) => void;
};

/** Kurze Erklärung (max. 1 Satz) – Plan-basiert. */
function getShortExplanation(
  plan: ElterngeldCalculationPlan,
  validation: PartnerBonusValidationResult
): string {
  const hasPartner = plan.parents.length > 1;
  const { warnings } = validation;

  if (!hasPartner) return 'Füge zuerst einen zweiten Elternteil hinzu.';
  if (validation.isValid) return 'Partnerschaftsbonus ist vorbereitet. Du kannst jetzt mit der Planung fortfahren.';
  if (!plan.parents.some((p) => p.months.some((m) => m.mode === 'partnerBonus')))
    return 'Wähle Monate, in denen beide Eltern ElterngeldPlus beziehen.';
  if (warnings.some((w) => w.includes('24–32') || w.includes('Wochenstunden')))
    return 'Beide Eltern müssen etwa 24–32 Stunden pro Woche arbeiten.';
  return 'Passe die Monate an, damit beide gleichzeitig Plus beziehen.';
}

/** Kurze Erklärung (max. 1 Satz) – Result-basiert (Ergebnis-Screen). */
function getShortExplanationFromResult(
  result: CalculationResult,
  validation: PartnerBonusValidationResult
): string {
  const hasPartner = result.parents.length > 1;
  if (!hasPartner) return 'Füge zuerst einen zweiten Elternteil hinzu.';
  if (validation.isValid) return 'Partnerschaftsbonus ist vorbereitet. Du kannst jetzt mit der Planung fortfahren.';
  if (!result.parents.some((p) => p.monthlyResults.some((r) => r.mode === 'partnerBonus')))
    return 'Wähle Monate, in denen beide Eltern ElterngeldPlus beziehen.';
  return 'Passe die Monate an, damit beide gleichzeitig Plus beziehen.';
}

export function getFirstPartnerBonusMonth(plan: ElterngeldCalculationPlan): number | null {
  for (const p of plan.parents) {
    const m = p.months.find((x) => x.mode === 'partnerBonus');
    if (m) return m.month;
  }
  return null;
}

/** Erster Monat mit PartnerBonus – aus Result-Daten. */
export function getFirstPartnerBonusMonthFromResult(result: CalculationResult): number | null {
  for (const p of result.parents) {
    const r = p.monthlyResults.find((x) => x.mode === 'partnerBonus');
    if (r) return r.month;
  }
  return null;
}

/** Monate, die im Plan mindestens einem Elternteil zugeordnet sind. */
function getValidMonths(plan: ElterngeldCalculationPlan): Set<number> {
  const months = new Set<number>();
  for (const p of plan.parents) {
    for (const m of p.months) {
      months.add(m.month);
    }
  }
  return months;
}

/**
 * Baut die Maßnahmenliste ausschließlich aus dem aktuellen Monatszustand auf.
 * Quelle: getCombinedMonthState (dieselbe Logik wie die UI).
 * Ein Monat erscheint nur, wenn er aktuell NICHT korrekt ist (Bezug Beide + Leistung Plus/Bonus).
 * Harte Filterregel: Monat darf NICHT als Maßnahme erscheinen, wenn aktuell
 * Leistung = ElterngeldPlus (oder Bonus) UND Bezug = Beide.
 */
function buildMeasuresFromCurrentState(
  plan: ElterngeldCalculationPlan,
  hasPartner: boolean,
  maxMonth: number,
  validMonths: Set<number>
): { month: number; fix: 'switchToPlus' | 'setBoth' | 'setBonusMonth' }[] {
  const result: { month: number; fix: 'switchToPlus' | 'setBoth' | 'setBonusMonth' }[] = [];
  for (let m = 1; m <= maxMonth; m++) {
    if (!validMonths.has(m)) continue;
    const combined = getCombinedMonthState(plan, m, hasPartner);
    // Harte Filterregel: Beide + Plus/Bonus = bereits korrekt, nie als Maßnahme
    if (combined.who === 'both' && (combined.mode === 'plus' || combined.mode === 'partnerBonus')) continue;
    if (combined.who === 'both' && combined.mode === 'basis') result.push({ month: m, fix: 'switchToPlus' });
    else if ((combined.who === 'mother' || combined.who === 'partner') && (combined.mode === 'plus' || combined.mode === 'partnerBonus')) result.push({ month: m, fix: 'setBoth' });
    else result.push({ month: m, fix: 'setBonusMonth' });
  }
  return result;
}

/** Baut Maßnahmen aus Result-Daten (angezeigte Daten in Ergebnis-Ansicht). Gleiche Filterregel. */
function buildMeasuresFromResult(
  result: CalculationResult,
  maxMonth: number
): { month: number; fix: 'switchToPlus' | 'setBoth' | 'setBonusMonth' }[] {
  const parentA = result.parents[0];
  const parentB = result.parents[1];
  const byMonthA = new Map(parentA?.monthlyResults.map((r) => [r.month, r]) ?? []);
  const byMonthB = new Map(parentB?.monthlyResults.map((r) => [r.month, r]) ?? []);
  const validMonths = new Set([...byMonthA.keys(), ...byMonthB.keys()].filter((m) => m >= 1 && m <= maxMonth));
  const measures: { month: number; fix: 'switchToPlus' | 'setBoth' | 'setBonusMonth' }[] = [];
  for (let m = 1; m <= maxMonth; m++) {
    if (!validMonths.has(m)) continue;
    const rA = byMonthA.get(m);
    const rB = byMonthB.get(m);
    const modeA = rA?.mode ?? 'none';
    const modeB = rB?.mode ?? 'none';
    const hasA = modeA !== 'none';
    const hasB = modeB !== 'none';
    if (hasA && hasB) {
      const mode = modeA === 'partnerBonus' && modeB === 'partnerBonus' ? 'partnerBonus' : modeA;
      if (mode === 'plus' || mode === 'partnerBonus') continue;
      measures.push({ month: m, fix: 'switchToPlus' });
    } else if (hasA || hasB) {
      const mode = hasA ? modeA : modeB;
      if (mode === 'plus' || mode === 'partnerBonus') measures.push({ month: m, fix: 'setBoth' });
      else measures.push({ month: m, fix: 'setBonusMonth' });
    } else {
      measures.push({ month: m, fix: 'setBonusMonth' });
    }
  }
  return measures;
}

/** Monate mit Bezug „Beide“ aber noch nicht Plus/Bonus – aus aktuellem State. */
function getBothMonthsNotYetBonusFromState(
  plan: ElterngeldCalculationPlan,
  hasPartner: boolean,
  maxMonth: number,
  validMonths: Set<number>
): number[] {
  const result: number[] = [];
  for (let m = 1; m <= maxMonth; m++) {
    if (!validMonths.has(m)) continue;
    const combined = getCombinedMonthState(plan, m, hasPartner);
    if (combined.who === 'both' && combined.mode !== 'plus' && combined.mode !== 'partnerBonus') result.push(m);
  }
  return result;
}

/** Monate mit Bezug „Beide" aber noch nicht Plus/Bonus – aus Result-Daten. */
function getBothMonthsNotYetBonusFromResult(
  result: CalculationResult,
  maxMonth: number
): number[] {
  const parentA = result.parents[0];
  const parentB = result.parents[1];
  if (!parentB) return [];
  const byMonthA = new Map(parentA.monthlyResults.map((r) => [r.month, r.mode]));
  const byMonthB = new Map(parentB.monthlyResults.map((r) => [r.month, r.mode]));
  const validMonths = new Set([...byMonthA.keys(), ...byMonthB.keys()].filter((m) => m >= 1 && m <= maxMonth));
  const months: number[] = [];
  for (let m = 1; m <= maxMonth; m++) {
    if (!validMonths.has(m)) continue;
    const modeA = byMonthA.get(m) ?? 'none';
    const modeB = byMonthB.get(m) ?? 'none';
    const hasA = modeA !== 'none';
    const hasB = modeB !== 'none';
    if (hasA && hasB) {
      const bothBonus = modeA === 'partnerBonus' && modeB === 'partnerBonus';
      const combinedMode = bothBonus ? 'partnerBonus' : modeA;
      if (combinedMode !== 'plus' && combinedMode !== 'partnerBonus') months.push(m);
    }
  }
  return months;
}

/** Section-Aktionen nur für Fälle ohne Monats-Maßnahmen (z. B. Stunden-Warnung). Kein focusMonth. */
function deriveSectionActions(
  plan: ElterngeldCalculationPlan,
  validation: PartnerBonusValidationResult
): PartnerBonusAction[] {
  const hasPartner = plan.parents.length > 1;
  const { warnings } = validation;

  if (!hasPartner) return [{ type: 'focusSection', section: 'eltern' }];
  if (validation.isValid) return [];
  if (warnings.some((w) => w.includes('24–32') || w.includes('Wochenstunden')))
    return [
      { type: 'focusSection', section: 'elternArbeit' },
      { type: 'focusSection', section: 'monatsplan' },
    ];
  return [{ type: 'focusSection', section: 'monatsplan' }];
}

/** Section-Aktionen für Result-basierte Ansicht (keine Stunden-Warnung). */
function deriveSectionActionsFromResult(
  result: CalculationResult,
  validation: PartnerBonusValidationResult
): PartnerBonusAction[] {
  const hasPartner = result.parents.length > 1;
  if (!hasPartner) return [{ type: 'focusSection', section: 'eltern' }];
  if (validation.isValid) return [];
  return [{ type: 'focusSection', section: 'monatsplan' }];
}

function getFixButtonLabel(fix: 'switchToPlus' | 'setBoth' | 'setBonusMonth'): string {
  if (fix === 'switchToPlus') return 'Auf ElterngeldPlus umstellen';
  if (fix === 'setBoth') return 'Beide auswählen';
  return 'Als Bonusmonat setzen';
}

function getSectionActionLabel(action: PartnerBonusAction): string {
  if (action.type === 'focusMonth') return `Monat ${action.month} anpassen`;
  if (action.type === 'focusSection') {
    if (action.section === 'elternArbeit') return 'Arbeitszeit anpassen';
    if (action.section === 'eltern') return 'Familiensituation prüfen';
    if (action.section === 'monatsplan') return 'Monatsplan anpassen';
  }
  return 'Monatsplan anpassen';
}

/** Kontexttext direkt über dem Button – konkrete Handlung, keine abstrakten Hinweise. */
function getSectionContextText(action: PartnerBonusAction): string {
  if (action.type === 'focusMonth') {
    return 'Öffne den Monat und stelle ein: ElterngeldPlus + Beide Eltern';
  }
  if (action.type === 'focusSection') {
    if (action.section === 'elternArbeit') return 'Trage deine geplanten Wochenstunden ein (24–32 für Partnerschaftsbonus).';
    if (action.section === 'eltern') return 'Füge einen zweiten Elternteil hinzu.';
    if (action.section === 'monatsplan') return 'Wähle in den Monaten ElterngeldPlus mit beiden Eltern für Bonusmonate.';
  }
  return 'Lege deine Monate fest und wähle ElterngeldPlus mit beiden Eltern für Bonusmonate.';
}

export const PartnerBonusCheckDialog: React.FC<Props> = ({
  isOpen,
  onClose,
  plan,
  result,
  onAction,
}) => {
  const useResult = Boolean(result);
  const validation = useResult ? validatePartnerBonusFromResult(result!) : validatePartnerBonus(plan);
  const hasPartner = useResult ? result!.parents.length > 1 : plan.parents.length > 1;
  const maxMonth = useResult
    ? Math.max(14, ...result!.parents.flatMap((p) => p.monthlyResults.map((r) => r.month)), 0)
    : plan.parents.length > 0
      ? Math.max(14, ...plan.parents.flatMap((p) => p.months.map((m) => m.month)))
      : 14;

  const validMonths = getValidMonths(plan);
  const monthsNeedingFix = hasPartner && !validation.isValid
    ? (useResult
        ? buildMeasuresFromResult(result!, maxMonth)
        : buildMeasuresFromCurrentState(plan, hasPartner, maxMonth, validMonths))
    : [];

  const bothMonthsNotYetBonus = hasPartner && onAction
    ? (useResult
        ? getBothMonthsNotYetBonusFromResult(result!, maxMonth)
        : getBothMonthsNotYetBonusFromState(plan, hasPartner, maxMonth, validMonths))
    : [];
  const sectionActions = useResult
    ? deriveSectionActionsFromResult(result!, validation)
    : deriveSectionActions(plan, validation);

  /** Erfolgszustand ausschließlich aus Validierung – keine Fallbacks. */
  const showSuccessState = validation.isValid;
  const successTitle = 'Partnerschaftsbonus ist vorbereitet';
  const successText = 'Die Bonusmonate sind bereits korrekt gesetzt.';

  const handleAction = (a: PartnerBonusAction) => {
    if (onAction) {
      onAction(a);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="elterngeld-partner-bonus-check__header">
          <h2 className="elterngeld-partner-bonus-check__title">
            {showSuccessState ? successTitle : 'Partnerschaftsbonus prüfen'}
          </h2>
          {showSuccessState ? (
            <p className="elterngeld-partner-bonus-check__explanation elterngeld-partner-bonus-check__explanation--intro">
              {successText}
            </p>
          ) : (
            <>
              <div className="elterngeld-partner-bonus-check__status-row elterngeld-partner-bonus-check__status-row--success">
                <span className="elterngeld-partner-bonus-check__status-icon" aria-hidden="true" />
                <h3 className="elterngeld-partner-bonus-check__status-label">So aktivierst du den Partnerschaftsbonus</h3>
              </div>
              <p className="elterngeld-partner-bonus-check__explanation elterngeld-partner-bonus-check__explanation--intro">
                {useResult ? getShortExplanationFromResult(result!, validation) : getShortExplanation(plan, validation)}
              </p>
            </>
          )}
        </div>
      }
      variant="softpill"
      scrollableContent
      hideFooter={showSuccessState}
    >
      <div className="elterngeld-partner-bonus-check__content">
        {showSuccessState ? (
          <Button type="button" variant="primary" className="btn--softpill" onClick={onClose}>
            Schließen
          </Button>
        ) : (
          <>
            {bothMonthsNotYetBonus.length > 1 && onAction && (
              <div className="elterngeld-partner-bonus-check__section">
                <Button
                  type="button"
                  variant="primary"
                  className="btn--softpill elterngeld-partner-bonus-check__action-btn"
                  onClick={() => {
                    onAction?.({ type: 'applySetAllSuitableMonths', months: bothMonthsNotYetBonus });
                    onClose();
                  }}
                >
                  Alle geeigneten Monate als Bonusmonate setzen
                </Button>
              </div>
            )}

            {monthsNeedingFix.length > 0 && onAction && monthsNeedingFix.map(({ month, fix }) => (
              <div key={month} className="elterngeld-partner-bonus-check__section">
                <h4 className="elterngeld-partner-bonus-check__section-title">Lebensmonat {month}</h4>
                <p className="elterngeld-partner-bonus-check__explanation">Kann als Bonusmonat gesetzt werden</p>
                <Button
                  type="button"
                  variant="primary"
                  className="btn--softpill elterngeld-partner-bonus-check__action-btn"
                  onClick={() => {
                    onAction?.({ type: 'applyFix', month, fix });
                    onClose();
                  }}
                >
                  {getFixButtonLabel(fix)}
                </Button>
              </div>
            ))}

            {monthsNeedingFix.length === 0 && sectionActions.length > 0 && onAction && (
              <div className="elterngeld-partner-bonus-check__section">
                <p className="elterngeld-partner-bonus-check__explanation">{
                  getSectionContextText(sectionActions[0])
                }</p>
                <div className="elterngeld-partner-bonus-check__actions next-steps__stack">
                  {sectionActions.map((action, i) => (
                    <Button
                      key={i}
                      type="button"
                      variant={i === 0 ? 'primary' : 'secondary'}
                      className="btn--softpill elterngeld-partner-bonus-check__action-btn"
                      onClick={() => handleAction(action)}
                    >
                      {getSectionActionLabel(action)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};
