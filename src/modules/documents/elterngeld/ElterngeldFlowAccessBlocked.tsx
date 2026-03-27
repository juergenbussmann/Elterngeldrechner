import React from 'react';
import { SectionHeader } from '../../../shared/ui/SectionHeader';
import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';
import { useI18n } from '../../../shared/lib/i18n';
import { usePanels } from '../../../shared/lib/panels';
import { openBegleitungPlusUpsell } from '../../../core/begleitungPlus/openBegleitungPlusUpsell';

export type ElterngeldFlowAccessVariant = 'free' | 'monthly';

export const ElterngeldFlowAccessBlocked: React.FC<{
  variant: ElterngeldFlowAccessVariant;
  /** i18n-Key für die Seitenüberschrift (Einstiegskontext Elterngeld vs. Elternzeit). */
  screenTitleKey?: string;
  /** Grund für Navigation zur Plus-Seite (Analytics/Debug). */
  plusUpsellReason?: string;
}> = ({
  variant,
  screenTitleKey = 'documents.elterngeld.accessNeedPlus.title',
  plusUpsellReason = 'elterngeld_yearly_gate',
}) => {
  const { t } = useI18n();
  const { openBottomSheet } = usePanels();

  return (
    <div className="screen-placeholder elterngeld-screen">
      <section className="next-steps next-steps--plain elterngeld__section">
        <SectionHeader as="h1" title={t(screenTitleKey)} />
        <Card className="still-daily-checklist__card">
          {variant === 'free' ? (
            <>
              <p className="elterngeld-step__hint">{t('documents.elterngeld.accessNeedPlus.body')}</p>
              <div className="next-steps__stack" style={{ marginTop: '1rem' }}>
                <Button
                  type="button"
                  variant="primary"
                  className="next-steps__button btn--softpill"
                  onClick={() =>
                    openBegleitungPlusUpsell({ reason: plusUpsellReason, feature: 'EXPORT' })
                  }
                >
                  {t('begleitungPlus.cta')}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="elterngeld-step__hint">{t('begleitungPlus.elterngeldYearly.hintPlanner')}</p>
              <div className="next-steps__stack" style={{ marginTop: '1rem' }}>
                <Button
                  type="button"
                  variant="primary"
                  className="next-steps__button btn--softpill"
                  onClick={() =>
                    openBottomSheet('begleitung-plus-upsell', { yearlyUpgradeForElterngeld: true })
                  }
                >
                  {t('begleitungPlus.elterngeldYearly.ctaUpgrade')}
                </Button>
              </div>
              <p className="elterngeld-step__hint" style={{ marginTop: '0.75rem' }}>
                {t('begleitungPlus.elterngeldYearly.hintFullApp')}
              </p>
            </>
          )}
        </Card>
      </section>
    </div>
  );
};
