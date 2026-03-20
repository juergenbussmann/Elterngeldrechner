/**
 * Upgrade-Trigger Anti-Spam & Progress.
 * - Limit erreicht: max 1x pro Session je Feature (sessionStorage)
 * - Progress: 1x pro Nutzer, dismissed in localStorage
 */

const SESSION_PREFIX = 'upgrade_trigger_limit_';
const PROGRESS_COUNT_KEY = 'pwa-skeleton:upgrade_progress_count';
const PROGRESS_DISMISSED_KEY = 'pwa-skeleton:upgrade_progress_dismissed';
const PROGRESS_THRESHOLD = 4;

export type LimitFeatureKey = 'appointments' | 'contacts';

function getSessionKey(feature: LimitFeatureKey): string {
  return `${SESSION_PREFIX}${feature}`;
}

/** Prüft, ob Limit-Trigger diese Session schon gezeigt wurde. */
export function hasLimitTriggerBeenShownThisSession(feature: LimitFeatureKey): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return sessionStorage.getItem(getSessionKey(feature)) === '1';
  } catch {
    return true;
  }
}

/** Markiert Limit-Trigger als gezeigt (diese Session). */
export function markLimitTriggerShownThisSession(feature: LimitFeatureKey): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(getSessionKey(feature), '1');
  } catch {
    /* noop */
  }
}

/** Aktionszähler für Progress-Trigger. */
export function getProgressActionCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(PROGRESS_COUNT_KEY);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return Number.isNaN(n) ? 0 : Math.max(0, n);
  } catch {
    return 0;
  }
}

export function incrementProgressActionCount(): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getProgressActionCount();
    localStorage.setItem(PROGRESS_COUNT_KEY, String(current + 1));
  } catch {
    /* noop */
  }
}

/** Soll Progress-Trigger angezeigt werden? */
export function shouldShowProgressTrigger(): boolean {
  if (isProgressTriggerDismissed()) return false;
  return getProgressActionCount() >= PROGRESS_THRESHOLD;
}

export function isProgressTriggerDismissed(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(PROGRESS_DISMISSED_KEY) === '1';
  } catch {
    return true;
  }
}

export function dismissProgressTrigger(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROGRESS_DISMISSED_KEY, '1');
  } catch {
    /* noop */
  }
}
