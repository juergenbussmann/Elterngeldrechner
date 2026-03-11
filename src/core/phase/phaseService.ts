import type { PhaseProfile, PhaseSnapshot } from './types';
import { clamp, PREGNANCY_WEEKS, DAYS_PER_WEEK, SSW_MIN, SSW_MAX } from './phaseConfig';

/** Parse ISO date-only (YYYY-MM-DD) to local date at noon to avoid UTC off-by-one. */
export function parseIsoDateOnlyToLocalNoon(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

/** Difference in days: (b - a). Positive = b is later. */
export function diffDays(a: Date, b: Date): number {
  const msPerDay = 86400000;
  return Math.floor((b.getTime() - a.getTime()) / msPerDay);
}

function toIsoDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function computePhaseSnapshot(
  profile: PhaseProfile,
  now: Date = new Date()
): PhaseSnapshot {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  const todayIso = toIsoDateOnly(today);

  if (profile.mode === 'pregnancy') {
    const dueDateIso = profile.dueDateIso;
    if (!dueDateIso) {
      return {
        mode: 'pregnancy',
        todayIso,
        label: '',
      };
    }
    const dueDate = parseIsoDateOnlyToLocalNoon(dueDateIso);
    const daysToDue = diffDays(today, dueDate);
    const pregnancyDaysTotal = PREGNANCY_WEEKS * DAYS_PER_WEEK;
    const pregnancyDay = pregnancyDaysTotal - daysToDue;
    const sswRaw = Math.floor(pregnancyDay / DAYS_PER_WEEK) + 1;
    const ssw = clamp(SSW_MIN, SSW_MAX, sswRaw);
    return {
      mode: 'pregnancy',
      todayIso,
      ssw,
      daysToDue,
      label: `SSW ${ssw}`,
    };
  }

  // postpartum
  const birthDateIso = profile.birthDateIso;
  if (!birthDateIso) {
    return {
      mode: 'postpartum',
      todayIso,
      label: '',
    };
  }
  const birthDate = parseIsoDateOnlyToLocalNoon(birthDateIso);
  const babyAgeDays = Math.max(0, diffDays(birthDate, today));
  const babyWeek = Math.floor(babyAgeDays / DAYS_PER_WEEK) + 1;
  const babyMonth = Math.floor(babyAgeDays / 30.4375) + 1;
  return {
    mode: 'postpartum',
    todayIso,
    babyAgeDays,
    babyWeek,
    babyMonth,
    label: `${babyWeek}. Lebenswoche`,
  };
}
