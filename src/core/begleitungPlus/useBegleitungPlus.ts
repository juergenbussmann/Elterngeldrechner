/**
 * Begleitung Plus – Hook für Feature-Flags und Limits.
 * Production Android: activate/deactivate sind no-op (nur Store darf Premium setzen).
 *
 * Dev-Override (nur wenn VITE_DEV_PLAN gesetzt und nicht leer): überschreibt Hook + hasYearlyAccess()
 * gegenüber localStorage. Ohne Variable: es gilt der Store (inkl. Default bei leerem Storage).
 *
 * PowerShell:
 *   Jahresabo: $env:VITE_DEV_PLAN="yearly"; npm run dev
 *   Monatsabo: $env:VITE_DEV_PLAN="monthly"; npm run dev
 *   Kein Abo (erzwingen): $env:VITE_DEV_PLAN="none"; npm run dev
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
  activatePlusWithPlan,
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

/** Explizit gesetztes VITE_DEV_PLAN steuert Entitlements nur, wenn die Variable nicht leer ist. */
function devPlanEnvOverrides(): boolean {
  if (!import.meta.env.DEV) return false;
  const raw = import.meta.env.VITE_DEV_PLAN as string | undefined;
  return typeof raw === 'string' && raw.length > 0;
}

/** Jahresabo-Zugriff (z. B. Elterngeld-Flow). Mit gesetztem VITE_DEV_PLAN: Simulation; sonst Store. */
export function hasYearlyAccess(): boolean {
  if (import.meta.env.DEV && devPlanEnvOverrides()) {
    const devPlan = import.meta.env.VITE_DEV_PLAN as string;
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
  /** Plus mit Jahresplan (z. B. Elterngeld-Wizard); schreibt Store + feuert Event. */
  activateYearly: () => void;
  deactivate: () => void;
};

export function useBegleitungPlus(): UseBegleitungPlusResult {
  const isDev = import.meta.env.DEV;
  const devPlanSim =
    isDev && devPlanEnvOverrides() ? parseDevPlanSim(import.meta.env.VITE_DEV_PLAN as string) : null;

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

  const activateYearly = useCallback(() => {
    if (BLOCK_LOCAL_ACTIVATE) return;
    activatePlusWithPlan('yearly');
    setState(getEntitlements());
  }, []);

  const deactivate = useCallback(() => {
    if (BLOCK_LOCAL_ACTIVATE) return;
    deactivatePlus();
    setState(getEntitlements());
  }, []);

  return {
    isPlus,
    planType,
    isYearly,
    hasYearlyAccess: hasYearlyAccessCb,
    hasFeature,
    limits,
    entitlements: effectiveEntitlements,
    activate,
    activateYearly,
    deactivate,
  };
}
