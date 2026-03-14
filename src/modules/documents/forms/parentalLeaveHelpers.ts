/**
 * Hilfsfunktionen für den Elternzeit-Dokumentgenerator.
 * Dauerberechnung, Titelgenerierung, Typ-Mapping.
 */

export type ParentLeaveRequestType =
  | 'basic_leave'
  | 'leave_with_part_time'
  | 'change_extend_end_early'
  | 'late_period';

export type ParentLeaveChangeType = 'change' | 'extend' | 'end_early';

/** Minimales Interface für Dauerberechnung (vermeidet Zirkelimport) */
export interface ParentLeaveValuesForDuration {
  requestType: ParentLeaveRequestType | '';
  changeType?: ParentLeaveChangeType | '';
  startDate: string;
  endDate: string;
  previousStartDate: string;
  previousEndDate: string;
  newEndDate: string;
  newRequestedEndDate: string;
  requestedLateStartDate: string;
  requestedLateEndDate: string;
}

/**
 * Prüft, ob ein Datum in der Zukunft liegt.
 */
export function isFutureDate(dateIso: string): boolean {
  if (!dateIso?.trim()) return false;
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return d > today;
}

/**
 * Addiert Jahre zu einem Datum (ISO YYYY-MM-DD).
 */
export function addYearsSafe(dateIso: string, years: number): string | null {
  if (!dateIso?.trim() || typeof years !== 'number') return null;
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return null;
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

/**
 * Prüft, ob dateA vor dateB liegt.
 */
export function isBefore(dateA: string, dateB: string): boolean {
  if (!dateA?.trim() || !dateB?.trim()) return false;
  const a = new Date(dateA);
  const b = new Date(dateB);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
  return a < b;
}

/**
 * Berechnet aus Start- und Enddatum eine menschenlesbare Dauer.
 * Format: "1 Jahr", "2 Jahre", "1 Jahr, 2 Monate", "6 Monate" etc.
 */
export function formatLeaveDuration(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return '';

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';
  if (end < start) return '';

  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return '';
  if (diffDays === 0) return '0 Tage';

  // Grobe Umrechnung: ~30,44 Tage pro Monat
  const totalMonths = Math.floor(diffDays / 30.44);
  const remainingMonths = totalMonths % 12;
  const totalYears = Math.floor(totalMonths / 12);

  if (totalMonths === 0) {
    return diffDays === 1 ? '1 Tag' : `${diffDays} Tage`;
  }

  const parts: string[] = [];
  if (totalYears === 1) {
    parts.push('1 Jahr');
  } else if (totalYears > 1) {
    parts.push(`${totalYears} Jahre`);
  }
  if (remainingMonths > 0) {
    parts.push(remainingMonths === 1 ? '1 Monat' : `${remainingMonths} Monate`);
  }
  return parts.join(', ');
}

/**
 * Berechnet die Dauer in Monaten (für Dokumenttext).
 */
export function getDurationInMonths(startDate: string, endDate: string): number | null {
  if (!startDate || !endDate) return null;

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (end < start) return null;

  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 30);
}

/**
 * Generiert den Dokumenttitel je nach Falltyp.
 */
export function getParentLeaveDocumentTitle(
  requestType: ParentLeaveRequestType,
  changeType?: ParentLeaveChangeType,
  childName?: string
): string {
  const suffix = childName ? ` – ${childName}` : '';

  switch (requestType) {
    case 'basic_leave':
      return `Elternzeit-Antrag${suffix}`;
    case 'leave_with_part_time':
      return `Elternzeit mit Teilzeit${suffix}`;
    case 'change_extend_end_early':
      if (changeType === 'change') return `Elternzeit Änderung${suffix}`;
      if (changeType === 'extend') return `Elternzeit Verlängerung${suffix}`;
      if (changeType === 'end_early') return `Elternzeit vorzeitige Beendigung${suffix}`;
      return `Elternzeit Änderung${suffix}`;
    case 'late_period':
      return `Elternzeit späterer Zeitraum${suffix}`;
    default:
      return `Elternzeit-Antrag${suffix}`;
  }
}

export const REQUEST_TYPE_LABELS: Record<ParentLeaveRequestType, string> = {
  basic_leave: 'Reine Elternzeit',
  leave_with_part_time: 'Elternzeit mit Teilzeit während der Elternzeit',
  change_extend_end_early: 'Änderung / Verlängerung / vorzeitige Beendigung',
  late_period: 'Beginn vor dem 3. Geburtstag oder Anteil zwischen 3. und 8. Geburtstag',
};

export const CHANGE_TYPE_LABELS: Record<ParentLeaveChangeType, string> = {
  change: 'Änderung',
  extend: 'Verlängerung',
  end_early: 'Vorzeitige Beendigung',
};

/**
 * Berechnet die Dauer der Elternzeit je nach Antragstyp.
 */
export function getDurationDisplay(values: ParentLeaveValuesForDuration): string | null {
  const { requestType, changeType } = values;

  if (requestType === 'basic_leave' || requestType === 'leave_with_part_time') {
    const s = values.startDate;
    const e = values.endDate;
    if (!s || !e) return null;
    const result = formatLeaveDuration(s, e);
    return result || null;
  }

  if (requestType === 'change_extend_end_early' && changeType === 'extend') {
    const s = values.previousStartDate;
    const e = values.newEndDate;
    if (!s || !e) return null;
    const result = formatLeaveDuration(s, e);
    return result || null;
  }

  if (requestType === 'change_extend_end_early' && (changeType === 'change' || changeType === 'end_early')) {
    const s = values.previousStartDate;
    const e = changeType === 'end_early' ? values.newRequestedEndDate : values.newEndDate;
    if (!s || !e) return null;
    const result = formatLeaveDuration(s, e);
    return result || null;
  }

  if (requestType === 'change_extend_end_early') {
    const s = values.previousStartDate;
    const e = values.previousEndDate;
    if (!s || !e) return null;
    const result = formatLeaveDuration(s, e);
    return result || null;
  }

  if (requestType === 'late_period') {
    const s = values.requestedLateStartDate;
    const e = values.requestedLateEndDate;
    if (!s || !e) return null;
    const result = formatLeaveDuration(s, e);
    return result || null;
  }

  return null;
}
