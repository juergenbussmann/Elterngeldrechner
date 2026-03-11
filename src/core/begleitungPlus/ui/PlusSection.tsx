import React from 'react';
import { useI18n } from '../../../shared/lib/i18n';
import { useBegleitungPlus } from '../useBegleitungPlus';
import { openBegleitungPlusUpsell } from '../openBegleitungPlusUpsell';
import { Card } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import type { FeatureKey } from '../../../config/begleitungPlus';
import './PlusSection.css';

export interface PlusSectionProps {
  feature?: FeatureKey;
  title?: string;
  teaser?: string;
  children: React.ReactNode;
}

export const PlusSection: React.FC<PlusSectionProps> = ({
  feature = 'ADVANCED_KNOWLEDGE',
  title,
  teaser,
  children,
}) => {
  const { t } = useI18n();
  const { isPlus } = useBegleitungPlus();

  if (isPlus) {
    return <>{children}</>;
  }

  const handleCta = () => {
    openBegleitungPlusUpsell({
      reason: 'knowledge_advanced',
      feature,
    });
  };

  return (
    <Card className="plus-section__card">
      <h3 className="plus-section__title">{title ?? t('plusSection.title')}</h3>
      <p className="plus-section__teaser">{teaser ?? t('plusSection.teaser')}</p>
      <Button
        type="button"
        variant="secondary"
        className="btn--softpill"
        onClick={handleCta}
      >
        {t('begleitungPlus.cta')}
      </Button>
    </Card>
  );
};
