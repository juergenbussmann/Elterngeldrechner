/**
 * Begleitung Plus – Hook für Feature-Flags und Limits.
 * Production Android: activate/deactivate sind no-op (nur Store darf Premium setzen).
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
import type { Entitlements } from './entitlements';

/** Production Android: lokale Freischaltung blockieren. */
const BLOCK_LOCAL_ACTIVATE = import.meta.env.PROD && isNativeAndroid;

export type UseBegleitungPlusResult = {
  isPlus: boolean;
  hasFeature: (feature: FeatureKey) => boolean;
  limits: FreeLimits;
  entitlements: Entitlements;
  activate: (expiresAt?: string) => void;
  deactivate: () => void;
};

export function useBegleitungPlus(): UseBegleitungPlusResult {
  const [entitlements, setState] = useState<Entitlements>(() => getEntitlements());

  useEffect(() => {
    setState(getEntitlements());
    const handler = () => setState(getEntitlements());
    window.addEventListener('begleitung-plus-changed', handler);
    return () => window.removeEventListener('begleitung-plus-changed', handler);
  }, []);

  const isPlus = entitlements.isPremium;

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

  return {
    isPlus,
    hasFeature,
    limits,
    entitlements,
    activate,
    deactivate,
  };
}
