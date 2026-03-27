/**
 * Begleitung Plus – Hook für Feature-Flags und Limits.
 * Production Android: activate/deactivate sind no-op (nur Store darf Premium setzen).
 *
 * Dev-Override für Abo (nur import.meta.env.DEV): import.meta.env.VITE_DEV_PLAN überschreibt zur Laufzeit
 * die sichtbaren Entitlements im Hook und in hasYearlyAccess() – ohne localStorage, ohne Events, ohne Billing.
 *
 * PowerShell:
 *   Jahresabo: $env:VITE_DEV_PLAN="yearly"; npm run dev
 *   Monatsabo: $env:VITE_DEV_PLAN="monthly"; npm run dev
 *   Kein Abo: Remove-Item Env:VITE_DEV_PLAN -ErrorAction SilentlyContinue; npm run dev
 */

import { useState, useEffect, useCallback } from 'react';
import {
  type FeatureKey,
  isFeaturePlus,
  FREE_LIMITS,
  type FreeLimits,
} from '../../config/begleitungPlus';
import { isNativeAndroid } from '../../config/billing';
import {
  getEntitlements,
  activatePlus,
  deactivatePlus,
} from './begleitungPlusStore';
import type { Entitlements, PlanType } from './entitlements';
import { DEFAULT_FREE_ENTITLEMENTS } from './entitlements';

/** Production Android: lokale Freischaltung blockieren. */
const BLOCK_LOCAL_ACTIVATE = import.meta.env.PROD && isNativeAndroid;

type DevPlanSim = 'none' | 'monthly' | 'yearly';

function parseDevPlanSim(raw: string | undefined): DevPlanSim {
  if (raw === 'monthly') return 'monthly';
  if (raw === 'yearly') return 'yearly';
  /* 'none', undefined, leer oder unbekannt → kein Abo */
  return 'none';
}

function devSimulatedEntitlements(plan: DevPlanSim): Entitlements {
  if (plan === 'none') {
    return { ...DEFAULT_FREE_ENTITLEMENTS };
  }
  if (plan === 'monthly') {
    return { isPremium: true, planType: 'monthly' };
  }
  return { isPremium: true, planType: 'yearly' };
}

/** Jahresabo-Zugriff (z. B. Elterngeld-Flow). In DEV: VITE_DEV_PLAN=yearly, sonst Store. */
export function hasYearlyAccess(): boolean {
  if (import.meta.env.DEV) {
    const devPlan = import.meta.env.VITE_DEV_PLAN;
    return parseDevPlanSim(devPlan) === 'yearly';
  }
  const e = getEntitlements();
  return e.isPremium === true && e.planType === 'yearly';
}

export type UseBegleitungPlusResult = {
  isPlus: boolean;
  planType: PlanType;
  isYearly: boolean;
  hasYearlyAccess: () => boolean;
  hasFeature: (feature: FeatureKey) => boolean;
  limits: FreeLimits;
  entitlements: Entitlements;
  activate: (expiresAt?: string) => void;
  deactivate: () => void;
};

export function useBegleitungPlus(): UseBegleitungPlusResult {
  console.log('DEV MODE:', import.meta.env.DEV);
  console.log('DEV PLAN:', import.meta.env.VITE_DEV_PLAN);

  const isDev = import.meta.env.DEV;
  const devPlan = import.meta.env.VITE_DEV_PLAN;
  const devPlanSim = isDev ? parseDevPlanSim(devPlan) : null;

  const [entitlements, setState] = useState<Entitlements>(() => getEntitlements());

  useEffect(() => {
    setState(getEntitlements());
    const handler = () => setState(getEntitlements());
    window.addEventListener('begleitung-plus-changed', handler);
    return () => window.removeEventListener('begleitung-plus-changed', handler);
  }, []);

  const effectiveEntitlements =
    devPlanSim != null ? devSimulatedEntitlements(devPlanSim) : entitlements;

  const isPlus = effectiveEntitlements.isPremium;
  const planType = effectiveEntitlements.planType;
  const isYearly = isPlus && planType === 'yearly';

  const hasYearlyAccessCb = useCallback(() => hasYearlyAccess(), []);

  const hasFeature = useCallback(
    (feature: FeatureKey): boolean => {
      if (isPlus) return true;
      return !isFeaturePlus(feature);
    },
    [isPlus]
  );

  const limits: FreeLimits = isPlus
    ? { appointmentsMax: Infinity, contactsMax: Infinity }
    : FREE_LIMITS;

  const activate = useCallback((expiresAt?: string) => {
    if (BLOCK_LOCAL_ACTIVATE) return;
    activatePlus(expiresAt);
    setState(getEntitlements());
  }, []);

  const deactivate = useCallback(() => {
    if (BLOCK_LOCAL_ACTIVATE) return;
    deactivatePlus();
    setState(getEntitlements());
  }, []);

  if (isDev) {
    console.log('DEV OVERRIDE ACTIVE', {
      isPlus,
      planType,
      isYearly,
    });
  }
  console.log('useBegleitungPlus RETURN', {
    isPlus,
    planType,
    isYearly,
  });

  return {
    isPlus,
    planType,
    isYearly,
    hasYearlyAccess: hasYearlyAccessCb,
    hasFeature,
    limits,
    entitlements: effectiveEntitlements,
    activate,
    deactivate,
  };
}
