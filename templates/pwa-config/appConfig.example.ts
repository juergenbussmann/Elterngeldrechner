// Template reference only. Kopieer de inhoud naar `src/config/appConfig.ts` en vul met jouw waarden.
// Laat dit bestand buiten `src/` staan om de build niet te beïnvloeden.

export const APP_NAME = 'APP_NAME';
export const APP_SHORT_NAME = 'APP_SHORT_NAME';
export const APP_DESCRIPTION = 'Korte beschrijving van jouw PWA.';
export const THEME_COLOR = '#2563eb';
export const BACKGROUND_COLOR = '#0b1224';

export const apiBaseUrl: string | undefined = undefined;

export type FooterMenuItem = {
  id: string;
  route: string;
  labelKey: string;
  icon: string;
};

/**
 * Branding en theming voor de applicatie.
 * - `appName`: Volledige naam voor splash screens en headings.
 * - `shortName`: Korte naam (PWA install banner).
 * - `description`: Wordt gebruikt in meta/manifest en kan in UI getoond worden.
 * - `primaryColor`: Accentkleur voor knoppen/links.
 * - `logoPath`: Pad naar het hoofdpictogram (bijv. 192x192).
 */
export const APP_BRAND = {
  appName: APP_NAME,
  shortName: APP_SHORT_NAME,
  description: APP_DESCRIPTION,
  primaryColor: '#2563eb',
  logoPath: '/icons/pwa-192x192.png',
};

export const footerMenu: FooterMenuItem[] = [
  { id: 'home', route: '/', labelKey: 'nav.home', icon: 'home' },
  { id: 'notifications', route: '/notifications', labelKey: 'nav.notifications', icon: 'notifications' },
  { id: 'settings', route: '/settings', labelKey: 'nav.settings', icon: 'settings' },
];

export interface TelemetryConfig {
  /**
   * Endpoint voor telemetry events. Laat undefined als je nog geen endpoint hebt.
   */
  endpoint?: string;
  /**
   * Zet aan/uit of telemetry standaard aan staat voor nieuwe gebruikers.
   */
  enabledByDefault: boolean;
  /**
   * Sample rate 0..1 voor het sturen van events.
   */
  sampleRate: number;
}

export const DEFAULT_TELEMETRY_CONFIG: TelemetryConfig = {
  endpoint: undefined,
  enabledByDefault: true,
  sampleRate: 1,
};

