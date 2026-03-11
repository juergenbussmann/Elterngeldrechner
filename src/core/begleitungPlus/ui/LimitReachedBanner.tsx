/**
 * Limit-Reached-Banner (Trigger Variante B).
 * Zeigt soft Hinweis + CTA wenn Free-Limit erreicht.
 * Max 1x pro Session je Feature (Anti-Spam).
 */

import React from 'react';
import { useI18n } from '../../../shared/lib/i18n';
import { Card } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import { openBegleitungPlusUpsell } from '../openBegleitungPlusUpsell';
import './LimitReachedBanner.css';

export type LimitFeatureKey = 'APPOINTMENTS_UNLIMITED' | 'CONTACTS_UNLIMITED';

export interface LimitReachedBannerProps {
  featureKey: LimitFeatureKey;
  onDismiss: () => void;
}

export const LimitReachedBanner: React.FC<LimitReachedBannerProps> = ({
  featureKey,
  onDismiss,
}) => {
  const { t } = useI18n();

  const handleCta = () => {
    openBegleitungPlusUpsell({
      reason: 'limit_reached',
      feature: featureKey,
    });
  };

  return (
    <Card className="limit-reached-banner">
      <button
        type="button"
        className="limit-reached-banner__dismiss"
        onClick={onDismiss}
        aria-label={t('common.close')}
      >
        ×
      </button>
      <p className="limit-reached-banner__text">{t('upgradeTrigger.limitReached.text')}</p>
      <Button
        type="button"
        variant="primary"
        className="btn--softpill limit-reached-banner__cta"
        onClick={handleCta}
      >
        {t('upgradeTrigger.limitReached.cta')}
      </Button>
      <p className="limit-reached-banner__microcopy">{t('upgradeTrigger.limitReached.microcopy')}</p>
    </Card>
  );
};
