/**
 * Fristenlogik für den Elternzeit-Hinweis auf der Startseite.
 * CTA erst ab 7 Wochen vor ET, nach Geburt immer sichtbar.
 * Nutzt getChildDateContext für zentrale Datumsauswertung.
 */

import { getChildDateContext } from '../../shared/lib/childDateContext';

export interface PhaseProfileLike {
  dueDateIso?: string | null;
  birthDateIso?: string | null;
}

export interface ParentalLeaveReminderState {
  shouldShowCTA: boolean;
  shouldShowMissingDateLink: boolean;
  hintText?: string;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseIsoDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : startOfDay(parsed);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfDay(next);
}

function isOnOrAfter(a: Date, b: Date): boolean {
  return a.getTime() >= b.getTime();
}

/**
 * Ermittelt, ob und was für den Elternzeit-Bereich auf der Startseite angezeigt werden soll.
 *
 * Regeln:
 * - Geburtsdatum gesetzt → CTA anzeigen
 * - ET gesetzt, ab 7 Wochen vor ET → CTA anzeigen
 * - ET gesetzt, vor 7 Wochen vor ET → nichts anzeigen
 * - Kein Datum → Link "Geburtstermin hinterlegen" anzeigen
 */
export function getParentalLeaveReminderState(
  profile: PhaseProfileLike | null | undefined,
  today: Date = startOfDay(new Date())
): ParentalLeaveReminderState {
  const child = getChildDateContext(profile);
  const normalizedToday = startOfDay(today);

  // Fall A: Geburtsdatum vorhanden → CTA anzeigen
  if (child.isBorn && child.birthDate) {
    return {
      shouldShowCTA: true,
      shouldShowMissingDateLink: false,
      hintText: 'Bald könnte wichtig werden',
    };
  }

  // Fall B: ET vorhanden, noch nicht geboren → CTA erst ab 7 Wochen vor ET
  if (child.expectedBirthDate) {
    const dueDate = parseIsoDate(child.expectedBirthDate);
    if (dueDate) {
      const reminderStart = addDays(dueDate, -49); // 49 Tage = 7 Wochen
      const shouldShowCTA = isOnOrAfter(normalizedToday, reminderStart);

      return {
        shouldShowCTA,
        shouldShowMissingDateLink: false,
        hintText: 'Bald könnte wichtig werden',
      };
    }
  }

  // Fall C: Kein Datum → Link anzeigen
  return {
    shouldShowCTA: false,
    shouldShowMissingDateLink: true,
  };
}
