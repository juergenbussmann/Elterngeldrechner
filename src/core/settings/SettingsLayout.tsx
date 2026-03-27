import React from 'react';
import { Outlet } from 'react-router-dom';
import { SectionHeader } from '../../shared/ui/SectionHeader';
import { useI18n } from '../../shared/lib/i18n';
import '../../styles/softpill-buttons-in-cards.css';
import '../../styles/softpill-cards.css';

export const SettingsLayout: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="screen-placeholder settings-screen">
      <section className="next-steps next-steps--plain settings__section">
        <SectionHeader as="h1" title={t('settings.title')} />
      </section>

      <Outlet />
    </div>
  );
};
