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
      {
        id: 'openTopicsMenu',
        labelKey: 'app.header.topicsMenu',
        icon: 'hamburger',
      },
    ],
  },
  {
    id: 'phasePregnancy',
    route: '/phase/pregnancy',
    titleKey: 'nav.pregnancy',
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
    id: 'phaseBirth',
    route: '/phase/birth',
    titleKey: 'nav.birth',
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
    id: 'phaseBreastfeeding',
    route: '/phase/breastfeeding',
    titleKey: 'nav.breastfeeding',
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
    id: 'knowledge',
    route: '/knowledge',
    titleKey: 'nav.knowledge',
    actions: [
      {
        id: 'goBack',
        labelKey: 'common.back',
        icon: 'back',
      },
      {
        id: 'openTopicsMenu',
        labelKey: 'app.header.topicsMenu',
        icon: 'hamburger',
      },
    ],
  },
  {
    id: 'knowledgeDetail',
    route: '/knowledge/',
    titleKey: 'nav.knowledge',
    actions: [
      {
        id: 'goBack',
        labelKey: 'common.back',
        icon: 'back',
      },
      {
        id: 'openTopicsMenu',
        labelKey: 'app.header.topicsMenu',
        icon: 'hamburger',
      },
    ],
  },
  {
    id: 'checklists',
    route: '/checklists',
    titleKey: 'nav.checklists',
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
    id: 'checklistDetail',
    route: '/checklists/meine',
    titleKey: 'nav.checklists',
    actions: [
      {
        id: 'goBack',
        labelKey: 'common.back',
        icon: 'back',
        navigationTarget: '/checklists',
      },
    ],
  },
  {
    id: 'checklistsPregnancy',
    route: '/checklists/schwangerschaft',
    titleKey: 'checklists.page.pregnancyTitle',
    actions: [
      {
        id: 'goBack',
        labelKey: 'common.back',
        icon: 'back',
        navigationTarget: '/checklists',
      },
    ],
  },
  {
    id: 'checklistsBirth',
    route: '/checklists/geburt',
    titleKey: 'checklists.page.birthTitle',
    actions: [
      {
        id: 'goBack',
        labelKey: 'common.back',
        icon: 'back',
        navigationTarget: '/checklists',
      },
    ],
  },
  {
    id: 'checklistsBreastfeeding',
    route: '/checklists/stillen',
    titleKey: 'checklists.page.breastfeedingTitle',
    actions: [
      {
        id: 'goBack',
        labelKey: 'common.back',
        icon: 'back',
        navigationTarget: '/checklists',
      },
    ],
  },
  {
    id: 'stillDailyChecklist',
    route: '/checklist/still-daily',
    titleKey: 'stillDaily.title',
    actions: [
      {
        id: 'goBack',
        labelKey: 'common.back',
        icon: 'back',
      },
    ],
  },
  {
    id: 'appointments',
    route: '/appointments',
    titleKey: 'nav.appointments',
    actions: [
      {
        id: 'goBack',
        labelKey: 'common.back',
        icon: 'back',
      },
    ],
  },
  {
    id: 'appointmentNew',
    route: '/appointments/new',
    titleKey: 'appointments.add',
    actions: [
      {
        id: 'goBack',
        labelKey: 'common.back',
        icon: 'back',
        navigationTarget: '/appointments',
      },
    ],
  },
  {
    id: 'appointmentEdit',
    route: '/appointments/edit/',
    titleKey: 'appointments.edit',
    actions: [
      {
        id: 'goBack',
        labelKey: 'common.back',
        icon: 'back',
        navigationTarget: '/appointments',
      },
    ],
  },
  {
    id: 'uchecksNew',
    route: '/appointments/uchecks/new',
    titleKey: 'uchecks.dialog.title',
    actions: [
      {
        id: 'goBack',
        labelKey: 'common.back',
        icon: 'back',
        navigationTarget: '/appointments',
      },
    ],
  },
  {
    id: 'documents',
    route: '/documents',
    titleKey: 'documents.title',
    actions: [
      {
        id: 'goBack',
        labelKey: 'common.back',
        icon: 'back',
      },
    ],
  },
  {
    id: 'contacts',
    route: '/contacts',
    titleKey: 'contacts.title',
    actions: [
      {
        id: 'goBack',
        labelKey: 'common.back',
        icon: 'back',
      },
    ],
  },
  {
    id: 'contactNew',
    route: '/contacts/new',
    titleKey: 'contacts.add',
    actions: [
      {
        id: 'goBack',
        labelKey: 'common.back',
        icon: 'back',
        navigationTarget: '/contacts',
      },
    ],
  },
  {
    id: 'contactEdit',
    route: '/contacts/edit/',
    titleKey: 'contacts.edit',
    actions: [
      {
        id: 'goBack',
        labelKey: 'common.back',
        icon: 'back',
        navigationTarget: '/contacts',
      },
    ],
  },
  {
    id: 'notes',
    route: '/notes',
    titleKey: 'notes.title',
    actions: [
      {
        id: 'goBack',
        labelKey: 'common.back',
        icon: 'back',
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
    id: 'begleitungPlus',
    route: '/begleitung-plus',
    titleKey: 'begleitungPlus.title',
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
