import type { PwaFactoryI18nBundle } from '../contracts/moduleContract';

const DEFAULT_LOCALE = 'de';
const FALLBACK_LOCALE = 'en';

let currentLocale: string = DEFAULT_LOCALE;

const bundlesByLocale = new Map<string, Map<string, Record<string, string>>>();

const getLocaleStore = (locale: string): Map<string, Record<string, string>> => {
  const existing = bundlesByLocale.get(locale);
  if (existing) {
    return existing;
  }
  const created = new Map<string, Record<string, string>>();
  bundlesByLocale.set(locale, created);
  return created;
};

const getNamespaceOrder = (localeStore: Map<string, Record<string, string>>): string[] => {
  const namespaces = Array.from(localeStore.keys()).sort();
  const coreIndex = namespaces.indexOf('core');
  if (coreIndex > 0) {
    namespaces.splice(coreIndex, 1);
    namespaces.unshift('core');
  }
  return namespaces;
};

export const registerBundle = (bundle: PwaFactoryI18nBundle): void => {
  if (!bundle) {
    return;
  }
  const localeKey = bundle.locale || DEFAULT_LOCALE;
  const namespaceKey = bundle.namespace;
  const localeStore = getLocaleStore(localeKey);
  const existingStrings = localeStore.get(namespaceKey) ?? {};

  localeStore.set(namespaceKey, {
    ...existingStrings,
    ...bundle.strings,
  });
};

export const registerBundles = (bundles: PwaFactoryI18nBundle[]): void => {
  if (!Array.isArray(bundles)) {
    return;
  }
  bundles.forEach(registerBundle);
};

export const initI18n = (locale: string = DEFAULT_LOCALE): void => {
  currentLocale = locale || DEFAULT_LOCALE;
};

const lookup = (key: string, namespace: string | undefined, locale: string): string | undefined => {
  const localeStore = bundlesByLocale.get(locale);
  if (!localeStore) {
    return undefined;
  }

  if (namespace) {
    return localeStore.get(namespace)?.[key];
  }

  const namespaces = getNamespaceOrder(localeStore);
  for (const nsKey of namespaces) {
    const value = localeStore.get(nsKey)?.[key];
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
};

export const t = (key: string, namespace?: string): string => {
  const locale = currentLocale || DEFAULT_LOCALE;
  const primary = lookup(key, namespace, locale);
  if (primary !== undefined) {
    return primary;
  }

  const fallback =
    locale !== FALLBACK_LOCALE ? lookup(key, namespace, FALLBACK_LOCALE) : undefined;

  return fallback ?? key;
};

