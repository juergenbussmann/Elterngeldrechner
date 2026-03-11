import React from 'react';
import { useI18n } from '../../shared/lib/i18n';
import { getHomeWidgets } from '../modules/moduleHost';

export const WidgetHost: React.FC = () => {
  const { t } = useI18n();

  const widgets = getHomeWidgets();

  if (widgets.length === 0) {
    return null;
  }

  return (
    <div
      className="home-widget-grid"
      aria-label={t('home.widgets.ariaLabel')}
    >
      {widgets.map(({ module, widget }) => (
        <section
          key={widget.id}
          className="home-widget-grid__item"
          aria-label={module.displayName}
        >
          {widget.element}
        </section>
      ))}
    </div>
  );
};
