/**
 * Billing-Konfiguration für Begleitung Plus.
 *
 * === RevenueCat ===
 * Client arbeitet mit Packages (monthly/annual) aus dem default Offering.
 * Entitlement begleitung_plus – NICHT premium.
 * Google-Play-Produkte werden in RevenueCat importiert und dem Entitlement zugeordnet.
 *
 * === Production Android ===
 * VITE_BILLING_ENABLED=true in .env.production.
 * VITE_REVENUECAT_API_KEY=goog_xxx (Google API Key aus RevenueCat Dashboard).
 *
 * === Web/PWA ===
 * Kein Store. Stub-Toast "Abos später verfügbar".
 * BILLING_STUB_ACTIVATE nur in DEV – Production: niemals Premium aus Stub.
 */

import { Capacitor } from '@capacitor/core';

const BILLING_CONFIG_DEBUG = import.meta.env.DEV;

/** Technisches Entitlement – sichtbarer Name bleibt "Begleitung Plus". */
export const ENTITLEMENT_BEGLEITUNG_PLUS = 'begleitung_plus' as const;

/** Default Offering Identifier aus RevenueCat Dashboard. */
export const OFFERING_DEFAULT = 'default' as const;

/**
 * Package-Identifier in RevenueCat (Reihenfolge = Priorität beim Lookup).
 * Standard: $rc_monthly / $rc_annual (belegen offering.monthly / offering.annual).
 * Custom: "monthly"/"annual" oder Base-Plan-IDs aus Google Play.
 * Produkt-IDs: 2.23:2-23-monatlich / 2.23:2-23-365 (falls über product.identifier gesucht wird).
 */
export const PACKAGE_IDS_MONTHLY = ['$rc_monthly', 'monthly', '2-23-monatlich', '2.23:2-23-monatlich'] as const;
export const PACKAGE_IDS_ANNUAL = ['$rc_annual', 'annual', '2-23-365', '2.23:2-23-365'] as const;

/** Android native: echtes Google Play Billing via RevenueCat. Web/PWA: immer false. */
export const isNativeAndroid = ((): boolean => {
  try {
    const native = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
    if (BILLING_CONFIG_DEBUG) {
      console.debug('[billing] isNativeAndroid=', native, {
        isNativePlatform: Capacitor.isNativePlatform(),
        platform: Capacitor.getPlatform(),
      });
    }
    return native;
  } catch (e) {
    if (BILLING_CONFIG_DEBUG) console.warn('[billing] isNativeAndroid error:', e);
    return false;
  }
})();

/** Env-Wert: "true" oder "1" = aktiviert. Auf Android: Fallback aktiv wenn nicht explizit "false". */
const envBillingEnabled =
  import.meta.env.VITE_BILLING_ENABLED === 'true' || import.meta.env.VITE_BILLING_ENABLED === '1';
const envBillingDisabled =
  import.meta.env.VITE_BILLING_ENABLED === 'false' || import.meta.env.VITE_BILLING_ENABLED === '0';

export const BILLING_ENABLED =
  envBillingEnabled || (isNativeAndroid && !envBillingDisabled);

if (BILLING_CONFIG_DEBUG) {
  console.debug('[billing] BILLING_ENABLED=', BILLING_ENABLED, {
    raw: import.meta.env.VITE_BILLING_ENABLED,
    envBillingEnabled,
    envBillingDisabled,
    isNativeAndroid,
  });
}

/** RevenueCat API Key (Google) – aus .env. */
export const REVENUECAT_API_KEY =
  import.meta.env.VITE_REVENUECAT_API_KEY ?? '';

/** DEV-only: Stub aktiviert Plus lokal. Production: immer false (PROD-Guard). */
export const BILLING_STUB_ACTIVATE =
  !import.meta.env.PROD &&
  import.meta.env.DEV &&
  (import.meta.env.VITE_BILLING_STUB_ACTIVATE === 'true' ||
    import.meta.env.VITE_BILLING_STUB_ACTIVATE === '1');
