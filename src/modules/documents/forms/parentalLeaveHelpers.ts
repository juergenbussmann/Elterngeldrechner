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

/**
 * Berechnet aus Start- und Enddatum eine menschenlesbare Dauer.
 * Vereinfachte Logik: Differenz in Tagen, grob in Monate umgerechnet.
 * 30 Tage ≈ 1 Monat für konsistente Darstellung.
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

  // Grobe Umrechnung: 30 Tage ≈ 1 Monat
  const months = Math.floor(diffDays / 30);
  const remainingDays = diffDays % 30;

  if (months === 0) {
    return diffDays === 1 ? '1 Tag' : `${diffDays} Tage`;
  }

  if (remainingDays === 0) {
    return months === 1 ? '1 Monat' : `${months} Monate`;
  }

  const parts: string[] = [];
  if (months === 1) {
    parts.push('1 Monat');
  } else if (months > 1) {
    parts.push(`${months} Monate`);
  }
  if (remainingDays > 0) {
    parts.push(remainingDays === 1 ? '1 Tag' : `${remainingDays} Tage`);
  }
  return parts.join(' und ');
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
