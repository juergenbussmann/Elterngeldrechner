import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import de from '../../../locales/de.json';
import en from '../../../locales/en.json';
import { initI18n, registerBundle, registerBundles, t as translate } from '../../../core/i18n/i18nHost';
import { getI18nBundles } from '../../../core/modules/moduleHost';
import { getValue, setValue } from '../storage';
import { assertLocalePreferenceConsistency } from '../../../core/quality/qualityGate';

type Locale = 'de' | 'en';

type LanguagePreference = 'system' | Locale;

interface I18nContextValue {
  locale: Locale;
  preference: LanguagePreference;
  t: (key: string, namespace?: string) => string;
  setLocale: (locale: Locale) => void;
  setPreference: (preference: LanguagePreference) => void;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const LANGUAGE_PREFERENCE_STORAGE_KEY = 'language-preference';

const getInitialPreference = (): LanguagePreference => {
  const stored = getValue<LanguagePreference | null>(LANGUAGE_PREFERENCE_STORAGE_KEY, null);
  if (stored === 'system' || stored === 'de' || stored === 'en') {
    return stored;
  }
  return 'de';
};

const resolveEffectiveLocale = (preference: LanguagePreference): Locale => {
  if (preference === 'system') {
    if (typeof navigator !== 'undefined') {
      const languages = navigator.languages && navigator.languages.length > 0 ? navigator.languages : [navigator.language];
      for (const lang of languages) {
        if (!lang) continue;
        const code = lang.toLowerCase().slice(0, 2) as Locale | string;
        if (code === 'de' || code === 'en') {
          return code;
        }
      }
    }
    return 'de';
  }
  return preference;
};

let bundlesRegistered = false;

const ensureBundlesRegistered = (): void => {
  if (bundlesRegistered) {
    return;
  }

  registerBundle({ locale: 'de', namespace: 'core', strings: de });
  registerBundle({ locale: 'en', namespace: 'core', strings: en });
  registerBundles(getI18nBundles());
  bundlesRegistered = true;
};

export const I18nProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  ensureBundlesRegistered();

  const [preference, setPreferenceState] = useState<LanguagePreference>(getInitialPreference);
  const [ready, setReady] = useState(false);
  const locale = useMemo(() => resolveEffectiveLocale(preference), [preference]);

  useEffect(() => {
    ensureBundlesRegistered();
    initI18n(locale);
    setReady(true);
  }, [locale]);

  useEffect(() => {
    assertLocalePreferenceConsistency(preference, locale, 'i18n-provider');
  }, [preference, locale]);

  const value = useMemo<I18nContextValue>(() => {
    const setPreference = (next: LanguagePreference): void => {
      setPreferenceState(next);
      setValue<LanguagePreference>(LANGUAGE_PREFERENCE_STORAGE_KEY, next);
      const nextLocale = resolveEffectiveLocale(next);
      initI18n(nextLocale);
    };

    const setLocale = (nextLocale: Locale): void => {
      setPreference(nextLocale);
    };

    const t = (key: string, namespace?: string): string => {
      return translate(key, namespace);
    };

    return {
      locale,
      preference,
      t,
      setLocale,
      setPreference,
    };
  }, [locale, preference]);

  if (!ready) {
    return null;
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useI18n = (): I18nContextValue => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTranslation = () => {
  const { t } = useI18n();
  return { t };
};
