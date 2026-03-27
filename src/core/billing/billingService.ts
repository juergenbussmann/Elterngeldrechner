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
import { activatePlusWithPlan, deactivatePlus } from '../begleitungPlus/begleitungPlusStore';
import type { PlanId } from '../begleitungPlus/planTypes';

/** Android + BILLING_ENABLED: echte Store-Calls. Web: immer false. */
export const useNativeBilling = isNativeAndroid && BILLING_ENABLED;

let initialized = false;

/**
 * Initialisiert RevenueCat. Sollte beim Start der Paywall oder App-Cold-Start aufgerufen werden.
 * Wirft bei Fehlern – Fehler werden nicht still geschluckt.
 */
export async function initializeBilling(): Promise<void> {
  if (!useNativeBilling || !REVENUECAT_API_KEY) return;
  if (initialized) return;

  if (import.meta.env.DEV) {
    console.debug('[billing] RevenueCat key check', {
      hasKey: !!REVENUECAT_API_KEY,
      keyPrefix: REVENUECAT_API_KEY?.slice(0, 8),
      keyLength: REVENUECAT_API_KEY?.length,
    });
  }

  try {
    await Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
      appUserID: null,
    });
    initialized = true;
    console.error('[BILLING_TEST] billingService active');
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[billing] RevenueCat configure failed:', err);
      const anyErr = err as {
        code?: number;
        message?: string;
        readableErrorCode?: string;
        underlyingErrorMessage?: string;
        userInfo?: unknown;
      };
      console.warn('[billing] parsed error', {
        code: anyErr?.code,
        message: anyErr?.message,
        readableErrorCode: anyErr?.readableErrorCode,
        underlyingErrorMessage: anyErr?.underlyingErrorMessage,
        userInfo: anyErr?.userInfo,
      });
    }
    throw err;
  }
}

function clearEntitlement(): void {
  deactivatePlus();
}

/**
 * Extrahiert active Entitlements aus CustomerInfo.
 * Das RevenueCat Capacitor Plugin kann die native Antwort als
 * { customerInfo: { entitlements: { active: {...} } } } wrappen –
 * dieser Helper unterstützt beide Strukturen.
 */
function getActiveEntitlements(
  raw: unknown
): Record<string, Record<string, unknown> & { expirationDate?: string | null }> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const inner = (o.customerInfo ?? o) as Record<string, unknown>;
  const ent = inner?.entitlements as
    | { active?: Record<string, Record<string, unknown> & { expirationDate?: string | null }> }
    | undefined;
  return ent?.active;
}

function normalizeIdFragment(id: string): string {
  return id.trim().toLowerCase().replace(/^[^:]*:/, '');
}

function productIdMatchesPackageList(productId: string, ids: readonly string[]): boolean {
  const n = productId.trim().toLowerCase();
  if (!n) return false;
  for (const raw of ids) {
    const id = String(raw).toLowerCase();
    const frag = normalizeIdFragment(id);
    if (n === id || n.includes(frag) || frag.includes(n)) return true;
  }
  return false;
}

/**
 * Leitet monthly/yearly aus den von RevenueCat gelieferten Entitlement-Feldern ab.
 */
function inferPlanTypeFromBegleitungEntitlement(ent: unknown): 'monthly' | 'yearly' {
  if (!ent || typeof ent !== 'object') {
    return 'monthly';
  }
  const e = ent as Record<string, unknown>;

  const pkgRaw = e.packageType ?? e.periodType;
  const pkg = typeof pkgRaw === 'string' ? pkgRaw.trim().toUpperCase() : '';
  if (pkg === 'ANNUAL' || pkg === 'YEARLY' || pkg === 'TWELVE_MONTH' || pkg === 'LIFETIME') {
    return 'yearly';
  }
  if (pkg === 'MONTHLY') {
    return 'monthly';
  }

  const productIdentifier =
    (typeof e.productIdentifier === 'string' && e.productIdentifier) ||
    (typeof e.productId === 'string' && e.productId) ||
    '';

  if (productIdentifier) {
    const isAnnual = productIdMatchesPackageList(productIdentifier, PACKAGE_IDS_ANNUAL);
    const isMonthly = productIdMatchesPackageList(productIdentifier, PACKAGE_IDS_MONTHLY);
    if (isAnnual && !isMonthly) return 'yearly';
    if (isMonthly && !isAnnual) return 'monthly';
    if (isAnnual) return 'yearly';
    if (isMonthly) return 'monthly';
  }

  if (import.meta.env.DEV) {
    console.debug('[billing] inferPlanType fallback monthly; entitlement fields', {
      keys: Object.keys(e),
      productIdentifier: e.productIdentifier,
      packageType: e.packageType,
      periodType: e.periodType,
      unsubscribeDetectedAt: e.unsubscribeDetectedAt,
    });
  }

  return 'monthly';
}

/**
 * Prüft ob begleitung_plus aktiv ist und aktualisiert den lokalen Cache.
 */
function syncFromCustomerInfo(raw: unknown): boolean {
  const active = getActiveEntitlements(raw);
  const ent = active?.[ENTITLEMENT_BEGLEITUNG_PLUS];
  if (ent) {
    const planType = inferPlanTypeFromBegleitungEntitlement(ent);
    const exp = ent.expirationDate ?? undefined;
    activatePlusWithPlan(planType, exp ?? undefined);
    if (import.meta.env.DEV) {
      console.debug('[billing] Entitlement begleitung_plus aktiv', { planType, expirationDate: exp });
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

/** Rückgabe von loadOfferings – loadError erhält den ursprünglichen Fehler für den Kauf-Flow. */
export type LoadOfferingsResult = {
  current: PurchasesOffering | null;
  loadError?: unknown;
};

/**
 * Lädt Offerings von RevenueCat.
 */
export async function loadOfferings(): Promise<LoadOfferingsResult> {
  if (!useNativeBilling) {
    return { current: null };
  }

  try {
    await initializeBilling();
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[billing] loadOfferings: initializeBilling fehlgeschlagen:', err);
      const anyErr = err as {
        code?: number;
        message?: string;
        readableErrorCode?: string;
        underlyingErrorMessage?: string;
        userInfo?: unknown;
      };
      console.warn('[billing] parsed error', {
        code: anyErr?.code,
        message: anyErr?.message,
        readableErrorCode: anyErr?.readableErrorCode,
        underlyingErrorMessage: anyErr?.underlyingErrorMessage,
        userInfo: anyErr?.userInfo,
      });
    }
    const anyErr = err as { underlyingErrorMessage?: string; message?: string };
    const loadErrorVal = anyErr?.underlyingErrorMessage ?? anyErr?.message ?? err;
    return { current: null, loadError: loadErrorVal };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current ?? offerings.all?.[OFFERING_DEFAULT] ?? null;

    if (import.meta.env.DEV) {
      const hasCurrent = !!current;
      const packageIds = current?.availablePackages?.map((p) => {
        const px = p as { identifier?: string; packageType?: string };
        return px.identifier ?? px.packageType ?? '?';
      }) ?? [];
      console.debug('[billing] getOfferings – current vorhanden:', hasCurrent, 'packages:', packageIds);
    }

    return { current: current ?? null };
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[billing] loadOfferings getOfferings failed:', err);
      const anyErr = err as {
        code?: number;
        message?: string;
        readableErrorCode?: string;
        underlyingErrorMessage?: string;
        userInfo?: unknown;
      };
      console.warn('[billing] parsed error', {
        code: anyErr?.code,
        message: anyErr?.message,
        readableErrorCode: anyErr?.readableErrorCode,
        underlyingErrorMessage: anyErr?.underlyingErrorMessage,
        userInfo: anyErr?.userInfo,
      });
    }
    const anyErr = err as { underlyingErrorMessage?: string; message?: string };
    const loadErrorVal = anyErr?.underlyingErrorMessage ?? anyErr?.message ?? err;
    return { current: null, loadError: loadErrorVal };
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

  const { current, loadError } = await loadOfferings();
  const pkg = findPackage(current, PACKAGE_IDS_MONTHLY, true);

  if (!pkg) {
    const priorError = loadError != null ? getPurchaseErrorDetails(loadError) : null;
    const msg = priorError ?? 'No monthly package found';
    if (import.meta.env.DEV) {
      console.warn('[billing] purchaseMonthly: Package nicht gefunden – gesucht:', PACKAGE_IDS_MONTHLY, 'current:', !!current, 'availableIds:', current?.availablePackages?.map((p) => (p as { identifier?: string }).identifier), 'loadError:', !!loadError);
    }
    return { success: false, errorKey: 'billing.purchaseFailed', errorMessage: msg };
  }

  const p = pkg as { identifier?: string; product?: { identifier?: string; storeProductId?: string } };
  console.error('[BILLING_TEST] selected package identifier', p?.identifier);
  console.error('[BILLING_TEST] selected product identifier', p?.product?.identifier ?? (p?.product as { storeProductId?: string })?.storeProductId);
  try {
    console.error('[BILLING_TEST] selected package raw JSON', JSON.stringify(pkg, null, 2));
  } catch (e) {
    console.error('[BILLING_TEST] selected package raw JSON (stringify failed)', e);
  }
  console.error('[BILLING_TEST] about to purchase package');

  try {
    const result = await Purchases.purchasePackage({ aPackage: pkg });
    const rawCustomerInfo = result?.customerInfo ?? result;

    console.error('[BILLING_TEST] RAW purchase result', result);
    try {
      console.error('[BILLING_TEST] RAW purchase result JSON', JSON.stringify(result, null, 2));
    } catch (e) {
      console.error('[BILLING_TEST] RAW purchase result JSON (stringify failed)', e);
    }
    console.error('[BILLING_TEST] RAW customerInfo', rawCustomerInfo);
    try {
      console.error('[BILLING_TEST] RAW customerInfo JSON', JSON.stringify(rawCustomerInfo, null, 2));
    } catch (e) {
      console.error('[BILLING_TEST] RAW customerInfo JSON (stringify failed)', e);
    }
    console.error('[BILLING_TEST] direct entitlements.active', rawCustomerInfo?.entitlements?.active);
    console.error('[BILLING_TEST] nested customerInfo.entitlements.active', rawCustomerInfo?.customerInfo?.entitlements?.active);
    console.error('[BILLING_TEST] begleitung_plus direct?', !!rawCustomerInfo?.entitlements?.active?.['begleitung_plus']);
    console.error('[BILLING_TEST] begleitung_plus nested?', !!rawCustomerInfo?.customerInfo?.entitlements?.active?.['begleitung_plus']);

    syncFromCustomerInfo(rawCustomerInfo);
    const hasAccess = !!getActiveEntitlements(rawCustomerInfo)?.[ENTITLEMENT_BEGLEITUNG_PLUS];
    if (!hasAccess) {
      const msg = 'Purchase succeeded but no begleitung_plus entitlement';
      console.error('[BILLING_TEST] purchaseMonthly: Kauf erfolgreich, aber kein begleitung_plus Entitlement');
      return { success: false, errorKey: 'billing.purchaseFailed', errorMessage: msg };
    }
    return { success: true };
  } catch (err: unknown) {
    const anyErr = err as {
      code?: number;
      message?: string;
      readableErrorCode?: string;
      underlyingErrorMessage?: string;
      userInfo?: unknown;
    };
    const preferredMsg = anyErr?.underlyingErrorMessage ?? anyErr?.message;
    const details = preferredMsg ? String(preferredMsg) : getPurchaseErrorDetails(err);
    if (isUserCancelled(err)) {
      console.warn('[billing] purchaseMonthly cancelled:', details, err);
      console.warn('[billing] parsed error', {
        code: anyErr?.code,
        message: anyErr?.message,
        readableErrorCode: anyErr?.readableErrorCode,
        underlyingErrorMessage: anyErr?.underlyingErrorMessage,
        userInfo: anyErr?.userInfo,
      });
      return {
        success: false,
        cancelled: true,
        errorKey: 'billing.purchaseCancelled',
        errorMessage: details,
      };
    }
    console.warn('[billing] purchaseMonthly error:', details, err);
    console.warn('[billing] parsed error', {
      code: anyErr?.code,
      message: anyErr?.message,
      readableErrorCode: anyErr?.readableErrorCode,
      underlyingErrorMessage: anyErr?.underlyingErrorMessage,
      userInfo: anyErr?.userInfo,
    });
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

  const { current, loadError } = await loadOfferings();
  const pkg = findPackage(current, PACKAGE_IDS_ANNUAL, false);

  if (!pkg) {
    const priorError = loadError != null ? getPurchaseErrorDetails(loadError) : null;
    const msg = priorError ?? 'No annual package found';
    if (import.meta.env.DEV) {
      console.warn('[billing] purchaseYearly: Package nicht gefunden – gesucht:', PACKAGE_IDS_ANNUAL, 'current:', !!current, 'availableIds:', current?.availablePackages?.map((p) => (p as { identifier?: string }).identifier), 'loadError:', !!loadError);
    }
    return { success: false, errorKey: 'billing.purchaseFailed', errorMessage: msg };
  }

  const p = pkg as { identifier?: string; product?: { identifier?: string; storeProductId?: string } };
  console.error('[BILLING_TEST] selected package identifier', p?.identifier);
  console.error('[BILLING_TEST] selected product identifier', p?.product?.identifier ?? (p?.product as { storeProductId?: string })?.storeProductId);
  try {
    console.error('[BILLING_TEST] selected package raw JSON', JSON.stringify(pkg, null, 2));
  } catch (e) {
    console.error('[BILLING_TEST] selected package raw JSON (stringify failed)', e);
  }
  console.error('[BILLING_TEST] about to purchase package');

  try {
    const result = await Purchases.purchasePackage({ aPackage: pkg });
    const rawCustomerInfo = result?.customerInfo ?? result;

    console.error('[BILLING_TEST] RAW purchase result', result);
    try {
      console.error('[BILLING_TEST] RAW purchase result JSON', JSON.stringify(result, null, 2));
    } catch (e) {
      console.error('[BILLING_TEST] RAW purchase result JSON (stringify failed)', e);
    }
    console.error('[BILLING_TEST] RAW customerInfo', rawCustomerInfo);
    try {
      console.error('[BILLING_TEST] RAW customerInfo JSON', JSON.stringify(rawCustomerInfo, null, 2));
    } catch (e) {
      console.error('[BILLING_TEST] RAW customerInfo JSON (stringify failed)', e);
    }
    console.error('[BILLING_TEST] direct entitlements.active', rawCustomerInfo?.entitlements?.active);
    console.error('[BILLING_TEST] nested customerInfo.entitlements.active', rawCustomerInfo?.customerInfo?.entitlements?.active);
    console.error('[BILLING_TEST] begleitung_plus direct?', !!rawCustomerInfo?.entitlements?.active?.['begleitung_plus']);
    console.error('[BILLING_TEST] begleitung_plus nested?', !!rawCustomerInfo?.customerInfo?.entitlements?.active?.['begleitung_plus']);

    syncFromCustomerInfo(rawCustomerInfo);
    const hasAccess = !!getActiveEntitlements(rawCustomerInfo)?.[ENTITLEMENT_BEGLEITUNG_PLUS];
    if (!hasAccess) {
      const msg = 'Purchase succeeded but no begleitung_plus entitlement';
      console.error('[BILLING_TEST] purchaseYearly: Kauf erfolgreich, aber kein begleitung_plus Entitlement');
      return { success: false, errorKey: 'billing.purchaseFailed', errorMessage: msg };
    }
    return { success: true };
  } catch (err: unknown) {
    const anyErr = err as {
      code?: number;
      message?: string;
      readableErrorCode?: string;
      underlyingErrorMessage?: string;
      userInfo?: unknown;
    };
    const preferredMsg = anyErr?.underlyingErrorMessage ?? anyErr?.message;
    const details = preferredMsg ? String(preferredMsg) : getPurchaseErrorDetails(err);
    if (isUserCancelled(err)) {
      console.warn('[billing] purchaseYearly cancelled:', details, err);
      console.warn('[billing] parsed error', {
        code: anyErr?.code,
        message: anyErr?.message,
        readableErrorCode: anyErr?.readableErrorCode,
        underlyingErrorMessage: anyErr?.underlyingErrorMessage,
        userInfo: anyErr?.userInfo,
      });
      return {
        success: false,
        cancelled: true,
        errorKey: 'billing.purchaseCancelled',
        errorMessage: details,
      };
    }
    console.warn('[billing] purchaseYearly error:', details, err);
    console.warn('[billing] parsed error', {
      code: anyErr?.code,
      message: anyErr?.message,
      readableErrorCode: anyErr?.readableErrorCode,
      underlyingErrorMessage: anyErr?.underlyingErrorMessage,
      userInfo: anyErr?.userInfo,
    });
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

  try {
    await initializeBilling();
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[billing] restorePurchases: initializeBilling failed:', err);
      const anyErr = err as {
        code?: number;
        message?: string;
        readableErrorCode?: string;
        underlyingErrorMessage?: string;
        userInfo?: unknown;
      };
      console.warn('[billing] parsed error', {
        code: anyErr?.code,
        message: anyErr?.message,
        readableErrorCode: anyErr?.readableErrorCode,
        underlyingErrorMessage: anyErr?.underlyingErrorMessage,
        userInfo: anyErr?.userInfo,
      });
    }
    return { success: false, errorKey: 'billing.restoreFailed' };
  }

  try {
    const { customerInfo } = await Purchases.restorePurchases();
    const hadPurchase = syncFromCustomerInfo(customerInfo);
    return { success: true, hadPurchase };
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[billing] restorePurchases error:', err);
      const anyErr = err as {
        code?: number;
        message?: string;
        readableErrorCode?: string;
        underlyingErrorMessage?: string;
        userInfo?: unknown;
      };
      console.warn('[billing] parsed error', {
        code: anyErr?.code,
        message: anyErr?.message,
        readableErrorCode: anyErr?.readableErrorCode,
        underlyingErrorMessage: anyErr?.underlyingErrorMessage,
        userInfo: anyErr?.userInfo,
      });
    }
    return { success: false, errorKey: 'billing.restoreFailed' };
  }
}

/**
 * Prüft ob der Nutzer Zugriff auf Begleitung Plus hat.
 */
export async function hasBegleitungPlusAccess(): Promise<boolean> {
  if (!useNativeBilling) return false;

  try {
    await initializeBilling();
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[billing] hasBegleitungPlusAccess: initializeBilling failed:', err);
      const anyErr = err as {
        code?: number;
        message?: string;
        readableErrorCode?: string;
        underlyingErrorMessage?: string;
        userInfo?: unknown;
      };
      console.warn('[billing] parsed error', {
        code: anyErr?.code,
        message: anyErr?.message,
        readableErrorCode: anyErr?.readableErrorCode,
        underlyingErrorMessage: anyErr?.underlyingErrorMessage,
        userInfo: anyErr?.userInfo,
      });
    }
    return false;
  }

  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return !!getActiveEntitlements(customerInfo)?.[ENTITLEMENT_BEGLEITUNG_PLUS];
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[billing] hasBegleitungPlusAccess getCustomerInfo failed:', err);
      const anyErr = err as {
        code?: number;
        message?: string;
        readableErrorCode?: string;
        underlyingErrorMessage?: string;
        userInfo?: unknown;
      };
      console.warn('[billing] parsed error', {
        code: anyErr?.code,
        message: anyErr?.message,
        readableErrorCode: anyErr?.readableErrorCode,
        underlyingErrorMessage: anyErr?.underlyingErrorMessage,
        userInfo: anyErr?.userInfo,
      });
    }
    return false;
  }
}

/**
 * Lädt bestehende Abos und synchronisiert Entitlements.
 * Source of Truth auf Android; Web: no-op.
 */
export async function syncEntitlementsFromStore(): Promise<void> {
  if (!useNativeBilling) return;

  try {
    await initializeBilling();
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[billing] syncEntitlementsFromStore: initializeBilling failed:', err);
      const anyErr = err as {
        code?: number;
        message?: string;
        readableErrorCode?: string;
        underlyingErrorMessage?: string;
        userInfo?: unknown;
      };
      console.warn('[billing] parsed error', {
        code: anyErr?.code,
        message: anyErr?.message,
        readableErrorCode: anyErr?.readableErrorCode,
        underlyingErrorMessage: anyErr?.underlyingErrorMessage,
        userInfo: anyErr?.userInfo,
      });
    }
    return;
  }

  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    syncFromCustomerInfo(customerInfo);
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[billing] syncEntitlementsFromStore failed:', err);
      const anyErr = err as {
        code?: number;
        message?: string;
        readableErrorCode?: string;
        underlyingErrorMessage?: string;
        userInfo?: unknown;
      };
      console.warn('[billing] parsed error', {
        code: anyErr?.code,
        message: anyErr?.message,
        readableErrorCode: anyErr?.readableErrorCode,
        underlyingErrorMessage: anyErr?.underlyingErrorMessage,
        userInfo: anyErr?.userInfo,
      });
    }
  }
}

/**
 * Kauft ein Abo (monatlich oder jährlich). Kompatibilität mit subscribeToPlan.
 */
export async function purchaseSubscription(plan: PlanId): Promise<PurchaseResult> {
  return plan === 'monthly' ? purchaseMonthly() : purchaseYearly();
}
