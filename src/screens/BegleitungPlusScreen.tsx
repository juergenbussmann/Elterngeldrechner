import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useI18n } from '../shared/lib/i18n';
import { useNotifications } from '../shared/lib/notifications';
import { useNavigation } from '../shared/lib/navigation/useNavigation';
import { ModulePage } from '../shared/ui/ModuleLayout';
import { Button } from '../shared/ui/Button';
import '../core/begleitungPlus/ui/begleitungPlusScreen.css';
import { type FeatureKey, FEATURE_PLUS_MAP } from '../config/begleitungPlus';
import type { PlanId } from '../core/begleitungPlus/planTypes';
import { PLAN_OPTIONS } from '../core/begleitungPlus/planTypes';
import { subscribeToPlan } from '../core/begleitungPlus/subscribeToPlan';
import { restorePurchases, syncEntitlementsFromStore, useNativeBilling } from '../core/billing';
import { BILLING_ENABLED, isNativeAndroid } from '../config/billing';

const PLUS_BENEFITS = [
  'begleitungPlus.benefits.save',
  'begleitungPlus.benefits.reminders',
  'begleitungPlus.benefits.content',
] as const;

const BASIS_BENEFITS = [
  'freeTier.benefits.plan',
  'freeTier.benefits.info',
] as const;

export default function BegleitungPlusScreen() {
  const { t } = useI18n();
  const { showToast } = useNotifications();
  const { goBack } = useNavigation();
  const [searchParams] = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('monthly');

  const featureParam = searchParams.get('feature');
  const feature =
    featureParam && featureParam in FEATURE_PLUS_MAP ? (featureParam as FeatureKey) : undefined;

  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  /* Abo-Status beim Öffnen prüfen (Gerätewechsel, Neuinstallation) */
  useEffect(() => {
    if (useNativeBilling) syncEntitlementsFromStore();
  }, []);

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const result = await subscribeToPlan(selectedPlan);
      if (result.success) {
        goBack();
        return;
      }
      if (result.stubMessageKey) {
        const planLabel = t(selectedPlan === 'monthly' ? 'billing.plan.monthly' : 'billing.plan.yearly');
        const goBackOnStub = ['billing.subscriptionComingSoon', 'billing.integrationPending'].includes(result.stubMessageKey);
        showToast(result.stubMessageKey, {
          params: { planLabel },
          kind: 'info',
        });
        if (goBackOnStub) goBack();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!useNativeBilling) return;
    setIsRestoring(true);
    try {
      const result = await restorePurchases();
      if (result.success) {
        showToast(result.hadPurchase ? 'billing.restoreSuccess' : 'billing.restoreNothing', {
          kind: result.hadPurchase ? 'success' : 'info',
        });
        if (result.hadPurchase) goBack();
      } else if (result.errorKey) {
        showToast(result.errorKey, { kind: 'error' });
      }
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="home-screen phase-screen">
      <ModulePage data-bp-scope>
        <header className="begleitung-plus__header">
          <p>{t('begleitungPlus.badge')}</p>
          <h2 className="topics-menu-panel__title">{t('begleitungPlus.title')}</h2>
          <p>{t('begleitungPlus.subtitle')}</p>
        </header>

        <section className="begleitung-plus__section" aria-label={t('begleitungPlus.plan.ariaLabel')}>
          <div
            className="begleitung-plus__plans"
            role="radiogroup"
            aria-label={t('begleitungPlus.plan.ariaLabel')}
          >
            {PLAN_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`ui-chip ${selectedPlan === opt.id ? 'ui-chip--selected' : ''}`}
                role="radio"
                aria-checked={selectedPlan === opt.id}
                onClick={() => setSelectedPlan(opt.id)}
              >
                <span className="begleitung-plus__plan-title">{t(opt.labelKey)}</span>
                {opt.showSavingsBadge && (
                  <small className="begleitung-plus__plan-sub">{t('begleitungPlus.priceSavings')}</small>
                )}
              </button>
            ))}
          </div>
        </section>

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

        {feature != null && (
          <p>{t('begleitungPlus.featureHint')}</p>
        )}

        <section className="begleitung-plus__section" aria-label="Vorteile">
          <ul className="begleitung-plus__benefits">
            {PLUS_BENEFITS.map((key) => (
              <li key={key}>{t(key)}</li>
            ))}
          </ul>
        </section>

        <section className="begleitung-plus__section" aria-label={t('begleitungPlus.cta')}>
          <div className="begleitung-plus__actions">
            <Button
              type="button"
              variant="primary"
              fullWidth
              onClick={handleSubscribe}
              disabled={isLoading || isRestoring}
            >
              {isLoading ? t('billing.loading') : t('begleitungPlus.cta')}
            </Button>
          </div>
          <p>{t('begleitungPlus.microcopy')}</p>
          {useNativeBilling && (
            <button
              type="button"
              className="begleitung-plus__restore-link"
              onClick={handleRestore}
              disabled={isRestoring || isLoading}
            >
              {isRestoring ? t('billing.restoring') : t('billing.restore')}
            </button>
          )}
        </section>

        <h2 className="topics-menu-panel__title">{t('freeTier.title')}</h2>
        <p>{t('freeTier.descriptionShort')}</p>
        <ul className="begleitung-plus__benefits">
          {BASIS_BENEFITS.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
        <p className="begleitung-plus-sheet__price">{t('freeTier.price')}</p>
        <div className="begleitung-plus__actions">
          <Button type="button" variant="secondary" fullWidth onClick={goBack}>
            {t('freeTier.cta')}
          </Button>
        </div>
      </ModulePage>
    </div>
  );
}
