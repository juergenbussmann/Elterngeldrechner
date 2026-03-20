import React, { useState, useEffect } from 'react';
import { useI18n } from '../../../shared/lib/i18n';
import { useNotifications } from '../../../shared/lib/notifications';
import { useThemeController } from '../../theme/ThemeProvider';
import { Button } from '../../../shared/ui/Button';
import '../../phase/ui/PhaseOnboardingPanel.css';
import './BegleitungPlusUpsellPanel.css';
import type { FeatureKey } from '../../../config/begleitungPlus';
import { useNativeBilling } from '../../billing';
import type { PlanId } from '../planTypes';
import { PLAN_OPTIONS } from '../planTypes';
import { subscribeToPlan } from '../subscribeToPlan';

export interface BegleitungPlusUpsellPanelProps {
  onClose: () => void;
  reason?: string;
  feature?: FeatureKey;
}

const PLUS_BENEFITS = [
  'begleitungPlus.benefits.save',
  'begleitungPlus.benefits.reminders',
  'begleitungPlus.benefits.content',
] as const;

const BASIS_BENEFITS = [
  'freeTier.benefits.plan',
  'freeTier.benefits.info',
] as const;

export const BegleitungPlusUpsellPanel: React.FC<BegleitungPlusUpsellPanelProps> = ({
  onClose,
  feature,
}) => {
  const { t } = useI18n();
  const { showToast } = useNotifications();
  const { resolvedMode } = useThemeController();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('monthly');

  useEffect(() => {
    console.error('[BILLING_TEST] paywall opened');
  }, []);

  const handleSubscribe = async () => {
    const result = await subscribeToPlan(selectedPlan);
    if (result.success) {
      onClose();
      return;
    }
    if (result.stubMessageKey) {
      const planLabel = t(selectedPlan === 'monthly' ? 'billing.plan.monthly' : 'billing.plan.yearly');
      showToast(result.stubMessageKey, { params: { planLabel }, kind: 'info' });
      if (['billing.subscriptionComingSoon', 'billing.integrationPending'].includes(result.stubMessageKey)) {
        onClose();
      }
    }
  };

  return (
    <div className="begleitung-plus-sheet" data-color-scheme={resolvedMode} data-bp-scope>
      <p className="begleitung-plus-sheet__badge">{t('begleitungPlus.badge')}</p>
      <h2 className="topics-menu-panel__title">{t('begleitungPlus.title')}</h2>
      <p className="phase-onboarding-panel__subtitle">{t('begleitungPlus.subtitle')}</p>

      <div
        role="radiogroup"
        aria-label={t('begleitungPlus.plan.ariaLabel')}
        className="begleitung-plus__plans"
      >
        {PLAN_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={selectedPlan === opt.id}
              className={`ui-chip ${selectedPlan === opt.id ? 'ui-chip--selected' : ''}`}
              onClick={() => setSelectedPlan(opt.id)}
            >
              <span>{t(opt.labelKey)}</span>
              {opt.showSavingsBadge && <small>{t('begleitungPlus.priceSavings')}</small>}
            </button>
        ))}
      </div>

      <p className="begleitung-plus-sheet__price">
          <strong>
            {selectedPlan === 'monthly'
              ? t('begleitungPlus.priceMonthly')
              : t('begleitungPlus.plan.displayYearly')}
          </strong>
          {selectedPlan === 'yearly' && (
            <>
              <br />
              <span className="begleitung-plus-sheet__price-savings">
                {t('begleitungPlus.priceSavings')}
              </span>
            </>
          )}
      </p>

      {feature != null && <p className="phase-onboarding-panel__hint">{t('begleitungPlus.featureHint')}</p>}

      <ul className="begleitung-plus-sheet__benefits">
          {PLUS_BENEFITS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
      </ul>

      <div className="begleitung-plus__actions">
          <Button type="button" variant="primary" fullWidth onClick={handleSubscribe}>
            {t('begleitungPlus.cta')}
          </Button>
      </div>
      <p className="begleitung-plus-sheet__microcopy">{t('begleitungPlus.microcopy')}</p>

      <h2 className="topics-menu-panel__title">{t('freeTier.title')}</h2>
      <p className="phase-onboarding-panel__subtitle">{t('freeTier.descriptionShort')}</p>
      <ul className="begleitung-plus-sheet__benefits">
          {BASIS_BENEFITS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
      </ul>
      <p className="begleitung-plus-sheet__price">{t('freeTier.price')}</p>
      <div className="begleitung-plus__actions">
          <Button type="button" variant="secondary" fullWidth onClick={onClose}>
            {t('freeTier.cta')}
          </Button>
      </div>
    </div>
  );
};
