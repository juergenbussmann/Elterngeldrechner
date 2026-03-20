/**
 * Progress-Trigger-Banner (einmalig).
 * Zeigt nach 3–5 relevanten Aktionen einen Upsell-Hinweis.
 * Dismissible, 1x pro Nutzer.
 */

import React from 'react';
import { useI18n } from '../../../shared/lib/i18n';
import { Card } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import { openBegleitungPlusUpsell } from '../openBegleitungPlusUpsell';
import { dismissProgressTrigger } from '../upgradeTriggersStore';
import './ProgressTriggerBanner.css';

export interface ProgressTriggerBannerProps {
  onDismiss: () => void;
}

export const ProgressTriggerBanner: React.FC<ProgressTriggerBannerProps> = ({ onDismiss }) => {
  const { t } = useI18n();

  const handleCta = () => {
    openBegleitungPlusUpsell({ reason: 'progress_moment' });
  };

  const handleDismiss = () => {
    dismissProgressTrigger();
    onDismiss();
  };

  return (
    <Card className="progress-trigger-banner">
      <button
        type="button"
        className="progress-trigger-banner__dismiss"
        onClick={handleDismiss}
        aria-label={t('common.close')}
      >
        ×
      </button>
      <p className="progress-trigger-banner__text">{t('upgradeTrigger.progress.text')}</p>
      <Button
        type="button"
        variant="primary"
        className="btn--softpill progress-trigger-banner__cta"
        onClick={handleCta}
      >
        {t('upgradeTrigger.progress.cta')}
      </Button>
    </Card>
  );
};
