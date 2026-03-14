/**
 * Frist- und Kündigungsschutz-Hinweise für das Elternzeit-Formular.
 * § 16, § 18 BEEG – Anmeldefristen und besonderer Kündigungsschutz.
 */

import type { ParentLeaveFormValues } from './formsConfig';

/** Setzt Datum auf Mitternacht (lokale Zeit). */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Parst ISO-Datum (YYYY-MM-DD) zu Date oder null. */
export function parseIsoDate(value?: string | null): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/** Addiert Tage zu einem Datum (negative Werte = Subtraktion). */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Formatiert Datum als DD.MM.YYYY. */
export function formatDateGerman(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

/** Differenz in Tagen (a - b). Positiv wenn a später. */
export function differenceInDays(a: Date, b: Date): number {
  const a0 = startOfDay(a).getTime();
  const b0 = startOfDay(b).getTime();
  return Math.round((a0 - b0) / (1000 * 60 * 60 * 24));
}

/** Prüft, ob targetIso weniger als weeks Wochen von heute entfernt liegt. */
export function isLessThanWeeksFromToday(
  targetIso: string,
  weeks: number,
  today?: Date
): boolean {
  const target = parseIsoDate(targetIso);
  if (!target) return false;
  const ref = today ? startOfDay(today) : startOfDay(new Date());
  const days = differenceInDays(target, ref);
  return days < weeks * 7 && days >= 0;
}

/** Prüft, ob targetIso in der Zukunft liegt (heute oder später). */
export function isFutureOrToday(targetIso: string, today?: Date): boolean {
  const target = parseIsoDate(targetIso);
  if (!target) return false;
  const ref = today ? startOfDay(today) : startOfDay(new Date());
  return differenceInDays(target, ref) >= 0;
}

/** Prüft, ob targetIso in weniger als 8 Wochen liegt. */
export function isLessThan8WeeksFromToday(targetIso: string, today?: Date): boolean {
  return isLessThanWeeksFromToday(targetIso, 8, today);
}

export interface ParentalLeaveTimingInfo {
  noticeWarning?: string | null;
  dismissalProtectionHint?: string | null;
}

export interface ParentalLeaveDeadlineInfo {
  noticeDeadlineLabel?: string | null;
  dismissalProtectionLabel?: string | null;
}

/**
 * Berechnet konkrete Fristdaten aus dem relevanten Beginn.
 * Regulär: 7 Wochen Anmeldung, 8 Wochen Kündigungsschutz.
 * late_period: 13 Wochen Anmeldung, 14 Wochen Kündigungsschutz.
 */
export function getParentalLeaveDeadlineInfo(
  values: ParentLeaveFormValues,
  today?: Date
): ParentalLeaveDeadlineInfo {
  const startIso = getRelevantStart(values);
  if (!startIso) return {};

  const start = parseIsoDate(startIso);
  if (!start) return {};

  const ref = today ?? new Date();
  if (!isFutureOrToday(startIso, ref)) return {};

  const startDay = startOfDay(start);
  const isLatePeriod = values.requestType === 'late_period';

  const noticeDays = isLatePeriod ? 91 : 49;
  const dismissalDays = isLatePeriod ? 98 : 56;

  const noticeDate = addDays(startDay, -noticeDays);
  const dismissalDate = addDays(startDay, -dismissalDays);

  return {
    noticeDeadlineLabel: `Späteste Anmeldung: ${formatDateGerman(noticeDate)}`,
    dismissalProtectionLabel: `Kündigungsschutz ab: ${formatDateGerman(dismissalDate)}`,
  };
}

const WARNING_7_WEEKS =
  'Achtung: Die Elternzeit muss in der Regel spätestens 7 Wochen vor Beginn beim Arbeitgeber angemeldet werden.';

const WARNING_13_WEEKS =
  'Achtung: Für Elternzeit zwischen dem 3. und 8. Geburtstag gilt in der Regel eine Anmeldefrist von 13 Wochen.';

const HINT_DISMISSAL_PROTECTION =
  'Hinweis: Der besondere Kündigungsschutz beginnt frühestens 8 Wochen vor der geplanten Elternzeit. Vorher besteht dieser Schutz in der Regel noch nicht.';

const HINT_DISMISSAL_PROTECTION_SOON =
  'Hinweis: Der besondere Kündigungsschutz beginnt frühestens 8 Wochen vor dem geplanten Beginn der Elternzeit. Prüfe zur Sicherheit deinen konkreten Fall.';

/**
 * Ermittelt den relevanten Beginn der Elternzeit je nach Antragstyp.
 */
function getRelevantStart(values: ParentLeaveFormValues): string | null {
  switch (values.requestType) {
    case 'basic_leave':
    case 'leave_with_part_time':
      return values.startDate?.trim() || null;
    case 'late_period':
      return values.requestedLateStartDate?.trim() || null;
    case 'change_extend_end_early':
      return null;
    default:
      return null;
  }
}

/**
 * Liefert Frist-Warnung und Kündigungsschutz-Hinweis für das Formular.
 */
export function getParentalLeaveTimingInfo(
  values: ParentLeaveFormValues,
  today?: Date
): ParentalLeaveTimingInfo {
  const ref = today ?? new Date();
  const startIso = getRelevantStart(values);
  if (!startIso) return {};

  const start = parseIsoDate(startIso);
  if (!start) return {};

  if (!isFutureOrToday(startIso, ref)) return {};

  const weeks7 = isLessThanWeeksFromToday(startIso, 7, ref);
  const weeks13 = isLessThanWeeksFromToday(startIso, 13, ref);
  const weeks8 = isLessThan8WeeksFromToday(startIso, ref);

  let noticeWarning: string | null = null;
  if (values.requestType === 'late_period') {
    if (weeks13) noticeWarning = WARNING_13_WEEKS;
  } else if (values.requestType === 'basic_leave' || values.requestType === 'leave_with_part_time') {
    if (weeks7) noticeWarning = WARNING_7_WEEKS;
  }

  const dismissalProtectionHint = weeks8 ? HINT_DISMISSAL_PROTECTION_SOON : HINT_DISMISSAL_PROTECTION;

  return {
    noticeWarning: noticeWarning ?? undefined,
    dismissalProtectionHint,
  };
}
