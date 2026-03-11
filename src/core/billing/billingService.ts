/**
 * Billing-Service – RevenueCat für Begleitung Plus.
 * Web: no-op, kein Fehler, kein Premium. Android: RevenueCat + Google Play.
 */

import { Purchases } from '@revenuecat/purchases-capacitor';
import {
  isNativeAndroid,
  BILLING_ENABLED,
  ENTITLEMENT_BEGLEITUNG_PLUS,
  OFFERING_DEFAULT,
  REVENUECAT_API_KEY,
  PACKAGE_IDS_MONTHLY,
  PACKAGE_IDS_ANNUAL,
} from '../../config/billing';
import { activatePlus, deactivatePlus } from '../begleitungPlus/begleitungPlusStore';
import type { PlanId } from '../begleitungPlus/planTypes';

/** Android + BILLING_ENABLED: echte Store-Calls. Web: immer false. */
export const useNativeBilling = isNativeAndroid && BILLING_ENABLED;

let initialized = false;

/**
 * Initialisiert RevenueCat. Sollte beim Start der Paywall oder App-Cold-Start aufgerufen werden.
 */
export async function initializeBilling(): Promise<void> {
  if (!useNativeBilling || !REVENUECAT_API_KEY) return;
  if (initialized) return;

  try {
    await Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
      appUserID: null,
    });
    initialized = true;
    if (import.meta.env.DEV) {
      console.debug('[billing] RevenueCat initialisiert');
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[billing] RevenueCat configure failed:', err);
    }
  }
}

function applyEntitlementFromCustomerInfo(expiresAt?: string): void {
  activatePlus(expiresAt);
}

function clearEntitlement(): void {
  deactivatePlus();
}

/**
 * Prüft ob begleitung_plus aktiv ist und aktualisiert den lokalen Cache.
 */
function syncFromCustomerInfo(customerInfo: { entitlements: { active: Record<string, { expirationDate: string | null }> } }): boolean {
  const ent = customerInfo.entitlements?.active?.[ENTITLEMENT_BEGLEITUNG_PLUS];
  if (ent) {
    applyEntitlementFromCustomerInfo(ent.expirationDate ?? undefined);
    if (import.meta.env.DEV) {
      console.debug('[billing] Entitlement begleitung_plus aktiv');
    }
    return true;
  }
  clearEntitlement();
  return false;
}

type PurchasesOffering = import('@revenuecat/purchases-capacitor').PurchasesOffering;
type PurchasesPackage = import('@revenuecat/purchases-capacitor').PurchasesPackage;

/** Hilfsfunktion: prüft ob ein Package zu einem der gesuchten IDs passt. */
function packageMatchesId(
  pkg: PurchasesPackage,
  id: string,
  isMonthly: boolean
): boolean {
  const p = pkg as { identifier?: string; packageType?: string; product?: { identifier?: string; storeProductId?: string } };
  if (p.identifier === id) return true;
  const pt = (p.packageType ?? '').toUpperCase();
  if (pt === (isMonthly ? 'MONTHLY' : 'ANNUAL')) return true;
  const prodId = p.product?.identifier ?? (p.product as { storeProductId?: string })?.storeProductId;
  if (prodId === id || (prodId && prodId.includes(id))) return true;
  return false;
}

/**
 * Robuster Package-Lookup. Priorität:
 * 1. offering.monthly / offering.annual (Convenience)
 * 2. availablePackages: identifier (z.B. $rc_monthly, monthly, 2-23-monatlich)
 * 3. availablePackages: packageType (MONTHLY / ANNUAL)
 * 4. availablePackages: product.identifier / storeProductId
 */
function findPackage(
  offering: PurchasesOffering | null,
  ids: readonly string[],
  isMonthly: boolean
): PurchasesPackage | null {
  if (!offering) return null;
  for (const id of ids) {
    if (id === '$rc_monthly' && offering.monthly) return offering.monthly;
    if (id === '$rc_annual' && offering.annual) return offering.annual;
    const pkg = offering.availablePackages?.find((p) => packageMatchesId(p, id, isMonthly));
    if (pkg) return pkg;
  }
  return null;
}

/**
 * Lädt Offerings von RevenueCat.
 */
export async function loadOfferings(): Promise<{ current: PurchasesOffering | null }> {
  if (!useNativeBilling) {
    return { current: null };
  }

  await initializeBilling();

  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current ?? offerings.all?.[OFFERING_DEFAULT] ?? null;
    if (current) {
      console.warn('[billing] offering debug:', current.identifier, current.availablePackages?.map((p) => {
        const px = p as { identifier?: string; packageType?: string; product?: { identifier?: string; storeProductId?: string } };
        return {
          identifier: px.identifier,
          packageType: px.packageType,
          productIdentifier: px.product?.identifier,
          storeProductId: (px.product as { storeProductId?: string })?.storeProductId,
        };
      }));
    }
    return { current };
  } catch (err) {
    console.warn('[billing] loadOfferings failed:', err);
    return { current: null };
  }
}

export type PurchaseResult =
  | { success: true }
  | {
      success: false;
      cancelled?: boolean;
      errorKey?: string;
      errorMessage?: string;
    };

/**
 * Extrahiert Fehlerdetails für Debugging (ohne sensible Daten).
 */
function getPurchaseErrorDetails(err: unknown): string {
  if (err instanceof Error) {
    const code = (err as { code?: string; readableErrorCode?: string }).code ?? (err as { readableErrorCode?: string }).readableErrorCode;
    return `[code=${code ?? 'unknown'}] ${err.message}`;
  }
  return String(err);
}

/** Prüft ob der Nutzer den Kauf abgebrochen hat (RevenueCat + Google Play). */
function isUserCancelled(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  if (/cancel|cancelled|abort|user/i.test(msg) || msg.includes('RESULT_CANCELED')) return true;
  const rc = err as { userCancelled?: boolean; readableErrorCode?: string };
  return rc?.userCancelled === true || rc?.readableErrorCode === 'PURCHASE_CANCELLED';
}

/**
 * Kauft das monatliche Package.
 */
export async function purchaseMonthly(): Promise<PurchaseResult> {
  if (!useNativeBilling) {
    return { success: false, errorKey: 'billing.notAvailable' };
  }

  const { current } = await loadOfferings();
  const pkg = findPackage(current, PACKAGE_IDS_MONTHLY, true);
  if (!pkg) {
    const msg = 'No monthly package found';
    console.warn('[billing] Kein monthly Package – current:', !!current, 'availableIds:', current?.availablePackages?.map((p) => (p as { identifier?: string }).identifier));
    return { success: false, errorKey: 'billing.purchaseFailed', errorMessage: msg };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    if (import.meta.env.DEV) {
      console.debug('[billing] Package monthly gekauft');
    }
    syncFromCustomerInfo(customerInfo);
    const hasAccess = !!customerInfo.entitlements?.active?.[ENTITLEMENT_BEGLEITUNG_PLUS];
    if (!hasAccess) {
      const msg = 'Purchase succeeded but no begleitung_plus entitlement';
      console.warn('[billing] purchaseMonthly: Kauf erfolgreich, aber kein begleitung_plus Entitlement');
      return { success: false, errorKey: 'billing.purchaseFailed', errorMessage: msg };
    }
    return { success: true };
  } catch (err: unknown) {
    const details = getPurchaseErrorDetails(err);
    if (isUserCancelled(err)) {
      console.warn('[billing] purchaseMonthly cancelled:', details, err);
      return {
        success: false,
        cancelled: true,
        errorKey: 'billing.purchaseCancelled',
        errorMessage: details,
      };
    }
    console.warn('[billing] purchaseMonthly error:', details, err);
    return {
      success: false,
      errorKey: 'billing.purchaseFailed',
      errorMessage: details,
    };
  }
}

/**
 * Kauft das jährliche Package.
 */
export async function purchaseYearly(): Promise<PurchaseResult> {
  if (!useNativeBilling) {
    return { success: false, errorKey: 'billing.notAvailable' };
  }

  const { current } = await loadOfferings();
  const pkg = findPackage(current, PACKAGE_IDS_ANNUAL, false);
  if (!pkg) {
    const msg = 'No annual package found';
    console.warn('[billing] Kein annual Package – current:', !!current, 'availableIds:', current?.availablePackages?.map((p) => (p as { identifier?: string }).identifier));
    return { success: false, errorKey: 'billing.purchaseFailed', errorMessage: msg };
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    if (import.meta.env.DEV) {
      console.debug('[billing] Package annual gekauft');
    }
    syncFromCustomerInfo(customerInfo);
    const hasAccess = !!customerInfo.entitlements?.active?.[ENTITLEMENT_BEGLEITUNG_PLUS];
    if (!hasAccess) {
      const msg = 'Purchase succeeded but no begleitung_plus entitlement';
      console.warn('[billing] purchaseYearly: Kauf erfolgreich, aber kein begleitung_plus Entitlement');
      return { success: false, errorKey: 'billing.purchaseFailed', errorMessage: msg };
    }
    return { success: true };
  } catch (err: unknown) {
    const details = getPurchaseErrorDetails(err);
    if (isUserCancelled(err)) {
      console.warn('[billing] purchaseYearly cancelled:', details, err);
      return {
        success: false,
        cancelled: true,
        errorKey: 'billing.purchaseCancelled',
        errorMessage: details,
      };
    }
    console.warn('[billing] purchaseYearly error:', details, err);
    return {
      success: false,
      errorKey: 'billing.purchaseFailed',
      errorMessage: details,
    };
  }
}

/**
 * Stellt Käufe wieder her und synchronisiert Entitlements.
 */
export type RestoreResult =
  | { success: true; hadPurchase: boolean }
  | { success: false; errorKey?: string };

export async function restorePurchases(): Promise<RestoreResult> {
  if (!useNativeBilling) {
    return { success: false, errorKey: 'billing.notAvailable' };
  }

  await initializeBilling();

  try {
    const { customerInfo } = await Purchases.restorePurchases();
    const hadPurchase = syncFromCustomerInfo(customerInfo);
    return { success: true, hadPurchase };
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[billing] restorePurchases error:', err);
    }
    return { success: false, errorKey: 'billing.restoreFailed' };
  }
}

/**
 * Prüft ob der Nutzer Zugriff auf Begleitung Plus hat.
 */
export async function hasBegleitungPlusAccess(): Promise<boolean> {
  if (!useNativeBilling) return false;

  await initializeBilling();

  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return !!customerInfo.entitlements?.active?.[ENTITLEMENT_BEGLEITUNG_PLUS];
  } catch {
    return false;
  }
}

/**
 * Lädt bestehende Abos und synchronisiert Entitlements.
 * Source of Truth auf Android; Web: no-op.
 */
export async function syncEntitlementsFromStore(): Promise<void> {
  if (!useNativeBilling) return;

  await initializeBilling();

  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    syncFromCustomerInfo(customerInfo);
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[billing] syncEntitlementsFromStore failed:', err);
    }
  }
}

/**
 * Kauft ein Abo (monatlich oder jährlich). Kompatibilität mit subscribeToPlan.
 */
export async function purchaseSubscription(plan: PlanId): Promise<PurchaseResult> {
  return plan === 'monthly' ? purchaseMonthly() : purchaseYearly();
}
