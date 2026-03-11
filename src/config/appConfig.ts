export const APP_NAME = 'Stillberatung';
export const APP_SHORT_NAME = 'Stillberatung';
export const APP_DESCRIPTION = 'Stillberatung – Fachlich fundierte Informationen zu Schwangerschaft, Geburt und Stillen.';
export const THEME_COLOR = '#111827';
export const BACKGROUND_COLOR = '#000000';

export const apiBaseUrl: string | undefined = undefined;

export type FooterMenuItem = {
  id: string;
  route: string;
  labelKey: string;
  icon: string;
};

export const footerMenu: FooterMenuItem[] = [
  { id: 'home', route: '/', labelKey: 'nav.home', icon: 'home' },
  {
    id: 'stillDaily',
    route: '/checklists',
    labelKey: 'stillDaily.menuTitle',
    icon: 'check',
  },
  { id: 'appointments', route: '/appointments', labelKey: 'nav.appointments', icon: 'appointments' },
  { id: 'documents', route: '/documents', labelKey: 'documents.title', icon: 'documents' },
  { id: 'contacts', route: '/contacts', labelKey: 'nav.contacts', icon: 'contacts' },
  { id: 'notes', route: '/notes', labelKey: 'nav.notes', icon: 'notes' },
  { id: 'settings', route: '/settings', labelKey: 'nav.settings', icon: 'settings' },
];

export type AppBranding = {
  appName: string;
  shortName: string;
  description: string;
  primaryColor: string;
  logoPath: string;
};

export const APP_BRAND: AppBranding = {
  appName: APP_NAME,
  shortName: APP_SHORT_NAME,
  description: APP_DESCRIPTION,
  // Farbwelt an Mockup (Muted Rose) angepasst
  primaryColor: '#D48C8C',
  // Landing-Logo (freigestellt)
  logoPath: '/brand/Logo-ohne-Schrift.png',
};

export interface TelemetryConfig {
  endpoint?: string;
  enabledByDefault: boolean;
  sampleRate: number;
}

export const DEFAULT_TELEMETRY_CONFIG: TelemetryConfig = {
  endpoint: undefined,
  enabledByDefault: false,
  sampleRate: 1,
};