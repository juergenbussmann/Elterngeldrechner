export const PREGNANCY_WEEKS = 40;
export const DAYS_PER_WEEK = 7;

export const SSW_MIN = 1;
export const SSW_MAX = 42;

/** Clamp value to min..max (inclusive). */
export function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}
