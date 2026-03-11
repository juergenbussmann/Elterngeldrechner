import React from 'react';
import { Card } from '../shared/ui/Card';
import { Button } from '../shared/ui/Button';
import { SectionHeader } from '../shared/ui/SectionHeader';
import { useNavigation } from '../shared/lib/navigation/useNavigation';
import { useI18n } from '../shared/lib/i18n';
import { useDocumentHead, buildCanonicalUrl } from '../shared/lib/seo';

const BERATUNG_CARDS = [
  {
    id: 'hausbesuch',
    titleKey: 'beratung.card.hausbesuch.title',
    descriptionKey: 'beratung.card.hausbesuch.description',
    ctaKey: 'beratung.card.hausbesuch.cta',
    to: '/contacts',
  },
  {
    id: 'online',
    titleKey: 'beratung.card.online.title',
    descriptionKey: 'beratung.card.online.description',
    ctaKey: 'beratung.card.online.cta',
    to: '/contacts',
  },
  {
    id: 'akuthilfe',
    titleKey: 'beratung.card.akuthilfe.title',
    descriptionKey: 'beratung.card.akuthilfe.description',
    ctaKey: 'beratung.card.akuthilfe.cta',
    to: '/contacts',
  },
] as const;

export function Beratung() {
  const { goTo } = useNavigation();
  const { t } = useI18n();

  useDocumentHead({
    title: t('beratung.seoTitle'),
    description: t('beratung.seoDescription'),
    canonicalUrl: buildCanonicalUrl('/beratung'),
  });

  return (
    <div className="home-screen screen-placeholder">
      <section className="home-section">
        <SectionHeader as="h1" title={t('beratung.title')} />
        <p className="home-section__placeholder-text">{t('beratung.subtitle')}</p>
      </section>

      <section className="home-section">
        <div className="home-section__cards">
          {BERATUNG_CARDS.map((card) => (
            <Card key={card.id} className="ui-card">
              <div className="form-screen__section">
                <h3 className="home-section__knowledge-card-title">{t(card.titleKey)}</h3>
                <p className="home-section__knowledge-card-description">{t(card.descriptionKey)}</p>
                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  className="btn--softpill"
                  onClick={() => goTo(card.to)}
                >
                  {t(card.ctaKey)}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="home-section">
        <Card className="ui-card">
          <div className="form-screen__section">
            <p className="home-section__knowledge-card-description">{t('beratung.cta.text')}</p>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              className="btn--softpill"
              onClick={() => goTo('/contacts')}
            >
              {t('beratung.cta.button')}
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
