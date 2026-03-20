const isDev = typeof import.meta !== 'undefined' && Boolean(import.meta.env?.DEV);

const devAssert = (condition: boolean, message: string): void => {
  if (!isDev) {
    return;
  }
  if (!condition) {
    throw new Error(message);
  }
};

export const assertGlobalSettingsSectionsAbsent = (renderedSectionsCount: number): void => {
  devAssert(
    renderedSectionsCount === 0,
    `GlobalSettingsScreen rendered ${renderedSectionsCount} module section(s); expected 0.`,
  );
};

export const assertLocalePreferenceConsistency = (
  preference: string,
  locale: string,
  context = 'i18n',
): void => {
  if (!isDev) {
    return;
  }
  if (preference === 'system') {
    return;
  }

  devAssert(
    preference === locale,
    `[${context}] Active locale (${locale}) does not match selected preference (${preference}).`,
  );
};


