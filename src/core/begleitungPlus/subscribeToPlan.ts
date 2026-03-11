/**
 * Begleitung Plus – Abo-Kauf / Subscribe-Logik.
 * Android: Echter Google-Play-Kauf (activatePlus nur bei Store-Erfolg).
 * Web: Kein Kauf – Hinweis "nur in Android-App". BILLING_STUB_ACTIVATE optional für Dev-Tests.
 */

import type { PlanId } from './planTypes';
import { BILLING_STUB_ACTIVATE, BILLING_ENABLED, isNativeAndroid } from '../../config/billing';
import { activatePlus } from './begleitungPlusStore';
import { purchaseSubscription, useNativeBilling } from '../billing';

const SUB_DEBUG = import.meta.env.DEV;

export type SubscribeResult = {
  success: boolean;
  /** i18n key oder echter Fehlertext für Toast. Bevorzugt errorMessage (echter Fehler), sonst errorKey, Fallback billing.purchaseFailed. */
  stubMessageKey?: string;
};

/**
 * Abonniert einen Plan (monatlich/jährlich).
 * Android: Echter Kauf → productId "2.23", Base Plan je nach Auswahl.
 * Web: Kein Kauf, Hinweis anzeigen. Optional BILLING_STUB_ACTIVATE für lokale Dev-Tests.
 */
export async function subscribeToPlan(plan: PlanId): Promise<SubscribeResult> {
  if (SUB_DEBUG) {
    console.debug('[billing] subscribeToPlan ENTRY', { plan, useNativeBilling, BILLING_ENABLED, isNativeAndroid });
  }

  if (useNativeBilling) {
    const result = await purchaseSubscription(plan);
    if (result.success) return { success: true };
    const visibleMessage =
      result.errorMessage ?? result.errorKey ?? 'billing.purchaseFailed';
    if (SUB_DEBUG) {
      console.debug('[billing] subscribeToPlan FALLBACK: purchase failed', { visibleMessage });
    }
    return { success: false, stubMessageKey: visibleMessage };
  }

  /* Web: Optional Dev-Stub (VITE_BILLING_STUB_ACTIVATE) für lokale Plus-Tests. */
  if (BILLING_STUB_ACTIVATE) {
    if (import.meta.env.DEV) {
      console.debug('[billing] Stub: subscribeToPlan (DEV activate)', { plan });
    }
    activatePlus();
    return { success: true };
  }

  /* Web: Kein Kauf möglich – Hinweis, Nutzer bleibt auf Paywall. */
  if (SUB_DEBUG) {
    console.debug('[billing] subscribeToPlan FALLBACK: web only');
  }
  return {
    success: false,
    stubMessageKey: 'billing.webOnly',
  };
}
