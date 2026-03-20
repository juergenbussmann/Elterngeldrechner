/**
 * Fristen-Helper für Elterngeld.
 * Elterngeld wird rückwirkend nur für die letzten 3 Lebensmonate gezahlt.
 */

import type { ElterngeldApplication } from './types/elterngeldTypes';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseIsoDate(value?: string | null): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonthsSafe(date: Date, months: number): Date | null {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateGerman(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

function differenceInDays(a: Date, b: Date): number {
  const a0 = startOfDay(a).getTime();
  const b0 = startOfDay(b).getTime();
  return Math.round((a0 - b0) / (1000 * 60 * 60 * 24));
}

export interface ElterngeldDeadlineInfo {
  deadlineLabel?: string | null;
  noticeText?: string | null;
  noticeLevel?: 'tip' | 'hint' | 'warning' | 'urgent';
}

export function getElterngeldDeadlineInfo(
  values: ElterngeldApplication,
  today?: Date
): ElterngeldDeadlineInfo {
  const ref = today ?? new Date();
  const birthIso = values.child.birthDate?.trim() || null;
  const expectedIso = values.child.expectedBirthDate?.trim() || null;

  if (!birthIso && !expectedIso) {
    return {
      noticeText:
        'Du kannst den Antrag schon vorbereiten. Abschicken kannst du ihn in der Regel nach der Geburt mit den vollständigen Unterlagen.',
      noticeLevel: 'tip',
    };
  }

  const birthDate = birthIso ? parseIsoDate(birthIso) : null;
  if (!birthDate) {
    return {
      noticeText:
        'Du kannst den Antrag schon vorbereiten. Abschicken kannst du ihn in der Regel nach der Geburt mit den vollständigen Unterlagen.',
      noticeLevel: 'tip',
    };
  }

  const deadline = addMonthsSafe(birthDate, 3);
  if (!deadline) return {};

  const daysSinceBirth = differenceInDays(ref, birthDate);
  const daysUntilDeadline = differenceInDays(deadline, ref);

  const deadlineLabel = `Spätestens sinnvoll beantragen bis: ${formatDateGerman(deadline)}`;

  if (daysSinceBirth < 0) {
    return { deadlineLabel, noticeLevel: 'tip' };
  }

  if (daysSinceBirth <= 42) {
    return {
      deadlineLabel,
      noticeText: 'Tipp: Bereite den Antrag jetzt möglichst vollständig vor.',
      noticeLevel: 'tip',
    };
  }

  if (daysSinceBirth <= 70) {
    return {
      deadlineLabel,
      noticeText: 'Hinweis: Stelle den Antrag bald, damit keine Monate verloren gehen.',
      noticeLevel: 'hint',
    };
  }

  if (daysSinceBirth <= 90) {
    return {
      deadlineLabel,
      noticeText:
        'Achtung: Elterngeld wird nur für die letzten 3 Lebensmonate rückwirkend gezahlt.',
      noticeLevel: 'warning',
    };
  }

  return {
    deadlineLabel,
    noticeText: 'Achtung: Möglicherweise sind bereits Monate verloren gegangen.',
    noticeLevel: 'urgent',
  };
}
