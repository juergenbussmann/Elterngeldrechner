/**
 * Begleitung Plus – Helper zum Navigieren zur Upgrade-Seite.
 * Kann von überall aufgerufen werden, wenn der Opener registriert ist.
 */

import type { FeatureKey } from '../../config/begleitungPlus';

export type OpenBegleitungPlusUpsellOptions = {
  reason?: string;
  feature?: FeatureKey;
};

type OpenerFn = (path: string) => void;

let opener: OpenerFn | null = null;

const BASE_PATH = '/begleitung-plus';

/**
 * Registriert den Navigate-Opener (wird von AppShell beim Mount aufgerufen).
 */
export function registerBegleitungPlusOpener(navigateToBegleitungPlus: OpenerFn): void {
  opener = navigateToBegleitungPlus;
}

/**
 * Navigiert zur Begleitung-Plus-Upgrade-Seite.
 * Beispiel: openBegleitungPlusUpsell({ reason: "limit_reached", feature: "EXPORT" })
 */
export function openBegleitungPlusUpsell(options?: OpenBegleitungPlusUpsellOptions): void {
  if (!opener) {
    return;
  }
  const params = new URLSearchParams();
  if (options?.feature) {
    params.set('feature', options.feature);
  }
  if (options?.reason) {
    params.set('reason', options.reason);
  }
  const query = params.toString();
  const path = query ? `${BASE_PATH}?${query}` : BASE_PATH;
  opener(path);
}
