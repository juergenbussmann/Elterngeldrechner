import React from 'react';
import '../styles/demo-screen.css';
import { useI18n } from '../shared/lib/i18n';
import { useNavigation } from '../shared/lib/navigation/useNavigation';
import { SectionHeader } from '../shared/ui/SectionHeader';
import { NextStepsSection } from '../components/NextStepsSection';

/**
 * Demo-Seite – Skeleton, der das Startseiten-UI-System nutzt.
 * Verwendet ausschließlich bestehende Bausteine (SectionHeader, Card, Button, NextStepsSection).
 */
export function Demo() {
  const { t } = useI18n();
  const { goTo } = useNavigation();

  return (
    <div className="home-screen phase-screen demo-screen">
      <SectionHeader as="h1" title={t('nav.demo')} />

      <section className="home-section">
        <SectionHeader title={t('demo.section.glassTitle')} />
        <div className="demo-screen__glass-card glass">
          <p className="demo-screen__intro">{t('demo.intro')}</p>
          <div className="home-screen__actions">
            <button
              type="button"
              className="glass-btn demo-screen__button"
              onClick={() => goTo('/')}
            >
              {t('demo.backToStart')}
            </button>
          </div>
        </div>
      </section>

      <NextStepsSection
        variant="plain"
        title={t('demo.nextSteps')}
        items={[
          { label: t('documents.elterngeld.title'), to: '/documents/elterngeld' },
          { label: t('nav.settings'), to: '/settings' },
        ]}
      />
    </div>
  );
}
