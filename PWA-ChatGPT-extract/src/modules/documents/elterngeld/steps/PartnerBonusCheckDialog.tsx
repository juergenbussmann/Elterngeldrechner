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
    };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  plan: ElterngeldCalculationPlan;
  onAction?: (action: PartnerBonusAction) => void;
};

const FALLBACK_EXPLANATION =
  'Die aktuelle Monatsverteilung erfüllt die Voraussetzungen für den Partnerschaftsbonus noch nicht.';

function getFirstPartnerBonusMonth(plan: ElterngeldCalculationPlan): number | null {
  for (const p of plan.parents) {
    const m = p.months.find((x) => x.mode === 'partnerBonus');
    if (m) return m.month;
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
      explanation:
        'Die Bonusmonate sind aktuell nicht gleichzeitig oder nicht zusammenhängend geplant.',
      actions: [{ type: 'focusSection', section: 'monatsplan' }],
    };
  }

  // Unbekannter Fall: allgemeiner Hinweis
  const month = getFirstPartnerBonusMonth(plan);
  return {
    statusLabel: 'Partnerschaftsbonus aktuell nicht möglich',
    explanation: FALLBACK_EXPLANATION,
    actions:
      month != null
        ? [{ type: 'focusMonth', month }]
        : [{ type: 'focusSection', section: 'monatsplan' }],
  };
}

function getActionLabel(action: PartnerBonusAction): string {
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
  const hasPartnerBonusMonths = plan.parents.some((p) =>
    p.months.some((m) => m.mode === 'partnerBonus')
  );

  const { statusLabel, explanation, actions } = deriveCase(plan, validation);
  const statusVariant = statusLabel.includes('möglich') && !statusLabel.includes('nicht')
    ? 'success'
    : 'warning';

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
