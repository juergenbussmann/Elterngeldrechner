/* eslint-disable react-refresh/only-export-components */
import React, { useMemo } from 'react';
import type { PwaFactoryModule } from '../../core/contracts/moduleContract';
import { useI18n } from '../../shared/lib/i18n';
import { useThemeController } from '../../core/theme/ThemeProvider';

const ThemePreferencesSettings: React.FC = () => {
  const { t } = useI18n();
  const { preference, resolvedMode, setPreference } = useThemeController();

  const options = useMemo(
    () => [
      { value: 'system' as const, label: t('settings.option.system', 'stdThemePrefs') },
      { value: 'light' as const, label: t('settings.option.light', 'stdThemePrefs') },
      { value: 'dark' as const, label: t('settings.option.dark', 'stdThemePrefs') },
    ],
    [t],
  );

  return (
    <div className="settings-section__content">
      <div className="settings-field">
        <p className="settings-layout__description">
          {t('settings.description', 'stdThemePrefs')}
        </p>
      </div>

      <div
        className="settings-field"
        role="radiogroup"
        aria-label={t('settings.title', 'stdThemePrefs')}
      >
        {options.map((option) => (
          <label key={option.value} className="settings-radio">
            <input
              type="radio"
              name="themePreference"
              value={option.value}
              checked={preference === option.value}
              onChange={() => setPreference(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>

      <p className="settings-layout__muted">
        {t('settings.activeLabel', 'stdThemePrefs')}{' '}
        {resolvedMode === 'dark'
          ? t('settings.option.dark', 'stdThemePrefs')
          : t('settings.option.light', 'stdThemePrefs')}
      </p>
    </div>
  );
};

export const ThemePreferencesModule: PwaFactoryModule = {
  id: 'std.themePrefs',
  displayName: 'Ansicht',
  getSettings: () => ({
    sections: [
      {
        id: 'std-theme-preferences',
        title: 'Einstellung Ansicht',
        element: <ThemePreferencesSettings />,
      },
    ],
  }),
  getI18nBundles: () => [
    {
      namespace: 'stdThemePrefs',
      locale: 'en',
      strings: {
        'settings.title': 'View Settings',
        'settings.description': 'Choose the view mode for the application.',
        'settings.option.system': 'System',
        'settings.option.light': 'Light',
        'settings.option.dark': 'Dark',
        'settings.activeLabel': 'Active view:',
      },
    },
    {
      namespace: 'stdThemePrefs',
      locale: 'de',
      strings: {
        'settings.title': 'Einstellung Ansicht',
        'settings.description': 'Wähle den Ansichtsmodus der Anwendung.',
        'settings.option.system': 'System',
        'settings.option.light': 'Hell',
        'settings.option.dark': 'Dunkel',
        'settings.activeLabel': 'Aktive Ansicht:',
      },
    },
  ],
};

