/* eslint-disable react-refresh/only-export-components */
import React, { useEffect } from 'react';
import type { PwaFactoryModule } from '../../core/contracts/moduleContract';
import { useI18n } from '../../shared/lib/i18n';
import { assertLocalePreferenceConsistency } from '../../core/quality/qualityGate';

const LanguagePreferencesSettings: React.FC = () => {
  const { t, preference, locale, setPreference } = useI18n();

  useEffect(() => {
    assertLocalePreferenceConsistency(preference, locale, 'language-preferences');
  }, [preference, locale]);

  return (
    <div className="settings-section__content">
      <p className="settings-layout__description">
        {t('settings.description', 'stdLanguagePrefs')}
      </p>

      <div
        className="settings-field"
        role="radiogroup"
        aria-label={t('settings.title', 'stdLanguagePrefs')}
      >
        <label className="settings-radio">
          <input
            type="radio"
            name="languagePreference"
            value="system"
            checked={preference === 'system'}
            onChange={() => setPreference('system')}
          />
          <span>{t('settings.option.system', 'stdLanguagePrefs')}</span>
        </label>
        <label className="settings-radio">
          <input
            type="radio"
            name="languagePreference"
            value="de"
            checked={preference === 'de'}
            onChange={() => setPreference('de')}
          />
          <span>{t('settings.option.de', 'stdLanguagePrefs')}</span>
        </label>
        <label className="settings-radio">
          <input
            type="radio"
            name="languagePreference"
            value="en"
            checked={preference === 'en'}
            onChange={() => setPreference('en')}
          />
          <span>{t('settings.option.en', 'stdLanguagePrefs')}</span>
        </label>
        <div className="settings-layout__muted">
          Preference: {preference}
        </div>
        <div className="settings-layout__muted">
          Active locale: {locale}
          {preference === 'system' ? ' (system preference applied)' : ''}
        </div>
      </div>
    </div>
  );
};

export const LanguagePreferencesModule: PwaFactoryModule = {
  id: 'std.languagePrefs',
  displayName: 'Language Preferences',
  getSettings: () => ({
    sections: [
      {
        id: 'std-language-preferences',
        title: 'Language',
        element: <LanguagePreferencesSettings />,
      },
    ],
  }),
  getI18nBundles: () => [
    {
      namespace: 'stdLanguagePrefs',
      locale: 'en',
      strings: {
        'settings.title': 'Language',
        'settings.description': 'Choose the application language.',
        'settings.option.system': 'System language',
        'settings.option.de': 'German',
        'settings.option.en': 'English',
      },
    },
    {
      namespace: 'stdLanguagePrefs',
      locale: 'de',
      strings: {
        'settings.title': 'Sprache',
        'settings.description': 'Wähle die Sprache der Anwendung.',
        'settings.option.system': 'Systemsprache',
        'settings.option.de': 'Deutsch',
        'settings.option.en': 'Englisch',
      },
    },
  ],
};

