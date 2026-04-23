import type { ScreenConfig } from '../core/screenConfig';

/**
 * Central registry for screen configuration used by the app shell.
 */
export const screenConfigs: ScreenConfig[] = [
  {
    id: 'home',
    route: '/',
    titleKey: 'home.title',
    actions: [
      {
        id: 'openSettings',
        labelKey: 'app.header.settings',
        icon: 'settings',
        navigationTarget: 'settings',
      },
    ],
  },
  {
    id: 'documents',
    route: '/documents',
    titleKey: 'documents.family.title',
    actions: [
      {
        id: 'goBack',
        labelKey: 'common.back',
        icon: 'back',
      },
    ],
  },
  {
    id: 'documentsList',
    route: '/documents/list',
    titleKey: 'documents.title',
    actions: [
      {
        id: 'goBack',
        labelKey: 'common.back',
        icon: 'back',
        navigationTarget: '/documents',
      },
    ],
  },
  {
    id: 'documentsParentalLeave',
    route: '/documents/parental-leave',
    titleKey: 'documents.parentalLeave.title',
    actions: [
      {
        id: 'goBack',
        labelKey: 'common.back',
        icon: 'back',
        navigationTarget: '/documents',
      },
    ],
  },
  {
    id: 'documentsElterngeld',
    route: '/documents/elterngeld',
    titleKey: 'documents.elterngeld.title',
    actions: [
      {
        id: 'goBack',
        labelKey: 'common.back',
        icon: 'back',
        navigationTarget: '/documents',
      },
    ],
  },
  {
    id: 'settings',
    route: '/settings',
    titleKey: 'settings.title',
    actions: [
      {
        id: 'goBack',
        labelKey: 'common.back',
        icon: 'back',
      },
    ],
  },
  {
    id: 'settingsDeveloper',
    route: '/settings/developer',
    titleKey: 'settings.developer.title',
    actions: [
      {
        id: 'goBack',
        labelKey: 'common.back',
        icon: 'back',
        navigationTarget: '/settings',
      },
    ],
  },
  {
    id: 'settingsModule',
    route: '/settings/',
    titleKey: 'settings.title',
    actions: [
      {
        id: 'goBack',
        labelKey: 'common.back',
        icon: 'back',
        navigationTarget: '/settings',
      },
    ],
  },
  {
    id: 'testseite',
    route: '/testseite',
    titleKey: 'nav.testseite',
    actions: [
      {
        id: 'goBack',
        labelKey: 'common.back',
        icon: 'back',
        navigationTarget: '/',
      },
    ],
  },
  {
    id: 'beratung',
    route: '/beratung',
    titleKey: 'beratung.title',
    actions: [
      {
        id: 'goBack',
        labelKey: 'common.back',
        icon: 'back',
        navigationTarget: '/',
      },
    ],
  },
  {
    id: 'demo',
    route: '/demo',
    titleKey: 'nav.demo',
    actions: [
      {
        id: 'goBack',
        labelKey: 'common.back',
        icon: 'back',
        navigationTarget: '/',
      },
    ],
  },
  {
    id: 'offline',
    route: '/offline',
    titleKey: 'core.offline.title',
  },
];

/**
 * Resolve the screen configuration for a given path.
 */
export const getScreenConfigByPath = (path: string): ScreenConfig | undefined => {
  const normalizedPath = path || '/';
  const exactMatch = screenConfigs.find((screen) => screen.route === normalizedPath);
  if (exactMatch) {
    return exactMatch;
  }

  const prefixMatches = screenConfigs
    .filter((screen) => screen.route !== '/' && normalizedPath.startsWith(screen.route))
    .sort((a, b) => b.route.length - a.route.length);

  return prefixMatches[0];
};
