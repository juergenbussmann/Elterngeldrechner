/**
 * Dialog zur Prüfung des Partnerschaftsbonus.
 * Nutzt ausschließlich validatePartnerBonus und bestehende PWA-Daten.
 * Keine neue Fachlogik.
 */

import React from 'react';
import { Modal } from '../../../../shared/ui/Modal';
import { Button } from '../../../../shared/ui/Button';
import { validatePartnerBonus } from '../calculation/partnerBonusValidation';
import type { ElterngeldCalculationPlan } from '../calculation';

export type PartnerBonusAction =
  | { type: 'focusMonth'; month: number }
  | {
      type: 'focusSection';
      section: 'grunddaten' | 'einkommen' | 'monatsplan' | 'elternArbeit' | 'eltern';
    }
  | { type: 'applyFix'; month: number; fix: 'switchToPlus' | 'setBoth' | 'setBonusMonth' };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  plan: ElterngeldCalculationPlan;
  onAction?: (action: PartnerBonusAction) => void;
};

const FALLBACK_EXPLANATION =
  'Die aktuelle Monatsverteilung erfüllt die Voraussetzungen für den Partnerschaftsbonus noch nicht.';

const WHY_NOT_POSSIBLE =
  'Der Partnerschaftsbonus kann nur genutzt werden, wenn beide Eltern gleichzeitig in passenden Monaten ElterngeldPlus beziehen und die Voraussetzungen erfüllen.\n\n' +
  'In der aktuellen Planung gibt es noch keine geeigneten gemeinsamen Bonusmonate.';

const WHAT_TO_ADJUST =
  'Damit der Partnerschaftsbonus möglich wird, müssen Monate geplant werden, in denen beide Eltern gleichzeitig Bonusmonate nutzen können.\n\n' +
  'Passe im Monatsplan geeignete Monate an oder füge gemeinsame Bonusmonate hinzu.';

export function getFirstPartnerBonusMonth(plan: ElterngeldCalculationPlan): number | null {
  for (const p of plan.parents) {
    const m = p.months.find((x) => x.mode === 'partnerBonus');
    if (m) return m.month;
  }
  return null;
}

/** Ermittelt den Monatszustand für die Schnellaktion (nur Plan-Daten auslesen). */
function getMonthStateForFix(
  plan: ElterngeldCalculationPlan,
  month: number,
  hasPartner: boolean
): { isBoth: boolean; isPlus: boolean } {
  const parentA = plan.parents[0];
  const parentB = hasPartner ? plan.parents[1] : null;
  const mA = parentA?.months.find((m) => m.month === month);
  const mB = parentB?.months.find((m) => m.month === month);
  const modeA = mA?.mode ?? 'none';
  const modeB = mB?.mode ?? 'none';
  const hasA = modeA !== 'none';
  const hasB = modeB !== 'none';
  const isBoth = hasA && hasB;
  const isPlus = modeA === 'plus' || modeA === 'partnerBonus' || modeB === 'plus' || modeB === 'partnerBonus';
  return { isBoth, isPlus };
}

/** Findet den ersten Monat, der eine Schnellaktion benötigt (A, B oder C). */
function findMonthNeedingFix(
  plan: ElterngeldCalculationPlan,
  hasPartner: boolean,
  maxMonth: number
): { month: number; fix: 'switchToPlus' | 'setBoth' | 'setBonusMonth'; hint: string } | null {
  for (let m = 1; m <= maxMonth; m++) {
    const { isBoth, isPlus } = getMonthStateForFix(plan, m, hasPartner);
    if (isBoth && isPlus) continue; /* Fall D: ok */
    if (isBoth && !isPlus) return { month: m, fix: 'switchToPlus', hint: 'Für Partnerschaftsbonus in diesem Monat auf ElterngeldPlus wechseln.' };
    if (isPlus && !isBoth) return { month: m, fix: 'setBoth', hint: 'Für Partnerschaftsbonus müssen in diesem Monat beide Eltern ausgewählt sein.' };
    if (!isPlus && !isBoth) return { month: m, fix: 'setBonusMonth', hint: 'Für Partnerschaftsbonus in diesem Monat ElterngeldPlus und „Beide“ wählen.' };
  }
  return null;
}

/**
 * Leitet aus validatePartnerBonus-Ergebnis die 4 Fälle ab.
 * Bei Arbeitszeit-Bezug (FALL 1, FALL 4): beide Buttons „Arbeitszeit prüfen“ und „Bonusmonate planen“.
 */
function deriveCase(
  plan: ElterngeldCalculationPlan,
  validation: { isValid: boolean; warnings: string[] }
): {
  statusLabel: string;
  explanation: string;
  whatToAdjust?: string;
  actions: PartnerBonusAction[];
} {
  const hasPartner = plan.parents.length > 1;
  const hasPartnerBonusMonths = plan.parents.some((p) =>
    p.months.some((m) => m.mode === 'partnerBonus')
  );
  const { warnings } = validation;

  // FALL 3: Kein zweiter Elternteil
  if (!hasPartner) {
    return {
      statusLabel: 'Partnerschaftsbonus aktuell nicht möglich',
      explanation:
        'Der Partnerschaftsbonus setzt zwei Elternteile voraus.',
      actions: [{ type: 'focusSection', section: 'eltern' }],
    };
  }

  // FALL 4: Bonus grundsätzlich möglich (noch nicht eingeplant) – beide Buttons
  if (!hasPartnerBonusMonths) {
    return {
      statusLabel: 'Partnerschaftsbonus grundsätzlich möglich',
      explanation:
        'Der Partnerschaftsbonus ist aktuell noch nicht im Plan enthalten. ' +
        'Wenn beide Eltern gleichzeitig etwa 24–32 Stunden arbeiten, können Bonusmonate möglich sein.',
      actions: [
        { type: 'focusSection', section: 'elternArbeit' },
        { type: 'focusSection', section: 'monatsplan' },
      ],
    };
  }

  // Bonusmonate vorhanden, Validierung prüfen
  if (validation.isValid) {
    return {
      statusLabel: 'Partnerschaftsbonus möglich',
      explanation: 'Ihre Bonusmonate erfüllen die Voraussetzungen.',
      actions: [],
    };
  }

  // FALL 1: Arbeitszeit passt nicht (24–32 Wochenstunden) – Arbeitszeit prüfen + Monate anpassen
  const hasHoursWarning = warnings.some(
    (w) => w.includes('24–32') || w.includes('Wochenstunden')
  );
  if (hasHoursWarning) {
    return {
      statusLabel: 'Partnerschaftsbonus aktuell nicht möglich',
      explanation:
        'Für den Partnerschaftsbonus müssen beide Eltern gleichzeitig etwa 24–32 Stunden pro Woche arbeiten.',
      actions: [
        { type: 'focusSection', section: 'elternArbeit' },
        { type: 'focusSection', section: 'monatsplan' },
      ],
    };
  }

  // FALL 2: Bonusmonate nicht gleichzeitig oder nicht zusammenhängend
  const hasBothWarning = warnings.some(
    (w) => w.includes('beide Elternteile') || w.includes('selben Monat')
  );
  const hasSeriesWarning = warnings.some(
    (w) => w.includes('zusammenhängende') || w.includes('2–4')
  );
  if (hasBothWarning || hasSeriesWarning) {
    return {
      statusLabel: 'Partnerschaftsbonus aktuell nicht möglich',
      explanation: WHY_NOT_POSSIBLE,
      whatToAdjust: WHAT_TO_ADJUST,
      actions: [{ type: 'focusSection', section: 'monatsplan' }],
    };
  }

  // Unbekannter Fall: allgemeiner Hinweis
  const month = getFirstPartnerBonusMonth(plan);
  return {
    statusLabel: 'Partnerschaftsbonus aktuell nicht möglich',
    explanation: WHY_NOT_POSSIBLE,
    whatToAdjust: WHAT_TO_ADJUST,
    actions:
      month != null
        ? [{ type: 'focusMonth', month }]
        : [{ type: 'focusSection', section: 'monatsplan' }],
  };
}

function getFixButtonLabel(fix: 'switchToPlus' | 'setBoth' | 'setBonusMonth'): string {
  if (fix === 'switchToPlus') return 'Auf ElterngeldPlus umstellen';
  if (fix === 'setBoth') return 'Beide auswählen';
  return 'Diesen Monat als Bonusmonat setzen';
}

function getActionLabel(action: PartnerBonusAction): string {
  if (action.type === 'applyFix') return getFixButtonLabel(action.fix);
  if (action.type === 'focusMonth') return `Zu Monat ${action.month} springen`;
  if (action.type === 'focusSection') {
    if (action.section === 'elternArbeit') return 'Arbeitszeit prüfen';
    if (action.section === 'eltern') return 'Familiensituation prüfen';
    if (action.section === 'monatsplan') return 'Monate anpassen';
    if (action.section === 'einkommen') return 'Eingaben prüfen';
    if (action.section === 'grunddaten') return 'Grunddaten prüfen';
  }
  return 'Zur Stelle springen';
}

/** Button-Label für Monatsplan: „Bonusmonate planen“ wenn noch nicht eingeplant, sonst „Monate anpassen“ */
function getMonatsplanButtonLabel(hasPartnerBonusMonths: boolean): string {
  return hasPartnerBonusMonths ? 'Monate anpassen' : 'Bonusmonate planen';
}

export const PartnerBonusCheckDialog: React.FC<Props> = ({
  isOpen,
  onClose,
  plan,
  onAction,
}) => {
  const validation = validatePartnerBonus(plan);
  const hasPartner = plan.parents.length > 1;
  const hasPartnerBonusMonths = plan.parents.some((p) =>
    p.months.some((m) => m.mode === 'partnerBonus')
  );
  const maxMonth = plan.parents.length > 0
    ? Math.max(14, ...plan.parents.flatMap((p) => p.months.map((m) => m.month)))
    : 14;

  const { statusLabel, explanation, whatToAdjust, actions } = deriveCase(plan, validation);
  const statusVariant = statusLabel.includes('möglich') && !statusLabel.includes('nicht')
    ? 'success'
    : 'warning';

  const quickFixFromScan = hasPartner && !validation.isValid
    ? findMonthNeedingFix(plan, hasPartner, maxMonth)
    : null;

  const focusMonthAction = actions.find((a): a is { type: 'focusMonth'; month: number } => a.type === 'focusMonth');
  const fallbackQuickFix =
    !quickFixFromScan &&
    focusMonthAction &&
    hasPartner &&
    onAction
      ? (() => {
          const month = focusMonthAction.month;
          const { isBoth, isPlus } = getMonthStateForFix(plan, month, hasPartner);
          if (isBoth && isPlus)
            return { month, fix: null as const, hint: 'Dieser Monat ist als gemeinsamer Bonusmonat geeignet.' };
          if (isBoth && !isPlus)
            return { month, fix: 'switchToPlus' as const, hint: 'Für Partnerschaftsbonus in diesem Monat auf ElterngeldPlus wechseln.' };
          if (isPlus && !isBoth)
            return { month, fix: 'setBoth' as const, hint: 'Für Partnerschaftsbonus müssen in diesem Monat beide Eltern ausgewählt sein.' };
          return { month, fix: 'setBonusMonth' as const, hint: 'Für Partnerschaftsbonus in diesem Monat ElterngeldPlus und \'Beide\' wählen.' };
        })()
      : null;

  const quickFixSection = quickFixFromScan ?? fallbackQuickFix;

  const displayActions =
    onAction && actions.length > 0
      ? actions.map((action) => ({
          action,
          label:
            action.type === 'focusSection' && action.section === 'monatsplan'
              ? getMonatsplanButtonLabel(hasPartnerBonusMonths)
              : getActionLabel(action),
        }))
      : [];

  const handleAction = (a: PartnerBonusAction) => {
    if (onAction) {
      onAction(a);
      onClose();
    }
  };

  const explanationText = explanation || FALLBACK_EXPLANATION;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Partnerschaftsbonus prüfen"
      variant="softpill"
    >
      <div className="elterngeld-partner-bonus-check">
        <div
          className={`elterngeld-partner-bonus-check__status-row elterngeld-partner-bonus-check__status-row--${statusVariant}`}
        >
          <span className="elterngeld-partner-bonus-check__status-icon" aria-hidden="true" />
          <span className="elterngeld-partner-bonus-check__status-label">{statusLabel}</span>
        </div>

        <div className="elterngeld-partner-bonus-check__section">
          <h4 className="elterngeld-partner-bonus-check__section-title">Warum?</h4>
          <p className="elterngeld-partner-bonus-check__explanation">{explanationText}</p>
        </div>

        {whatToAdjust && (
          <div className="elterngeld-partner-bonus-check__section">
            <h4 className="elterngeld-partner-bonus-check__section-title">Was anpassen?</h4>
            <p className="elterngeld-partner-bonus-check__explanation">{whatToAdjust}</p>
          </div>
        )}

        {quickFixSection && onAction && (
          <div className="elterngeld-partner-bonus-check__section">
            <h4 className="elterngeld-partner-bonus-check__section-title">Lebensmonat {quickFixSection.month}</h4>
            <p className="elterngeld-partner-bonus-check__explanation">{quickFixSection.hint}</p>
            {quickFixSection && 'fix' in quickFixSection && quickFixSection.fix != null && (
              <Button
                type="button"
                variant="primary"
                className="btn--softpill elterngeld-partner-bonus-check__action-btn"
                onClick={() => {
                  onAction({ type: 'applyFix', month: quickFixSection.month, fix: quickFixSection.fix });
                }}
              >
                {getFixButtonLabel(quickFixSection.fix)}
              </Button>
            )}
          </div>
        )}

        {displayActions.length > 0 && (
          <div className="elterngeld-partner-bonus-check__section">
            <h4 className="elterngeld-partner-bonus-check__section-title">Nächster Schritt</h4>
            <div className="elterngeld-partner-bonus-check__actions">
              {displayActions.map(({ action, label }, i) => (
                <Button
                  key={i}
                  type="button"
                  variant={i === 0 ? 'primary' : 'secondary'}
                  className="btn--softpill elterngeld-partner-bonus-check__action-btn"
                  onClick={() => handleAction(action)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
