/**
 * Gemeinsame Logik für Geburtsdatum und voraussichtlichen Geburtstermin.
 * Beide Felder schließen sich gegenseitig aus.
 * Vorbefüllung aus App-Einstellungen (Phase-Profil).
 */

import { getChildDateContext } from './childDateContext';

export interface PhaseProfileDateSource {
  birthDateIso?: string | null;
  dueDateIso?: string | null;
}

export interface BirthDateFormValues {
  birthDate: string;
  expectedBirthDate: string;
}

/**
 * Ermittelt Initialwerte für Geburtsdatum und voraussichtlichen Termin.
 * Priorität: 1. bestehende Formulardaten, 2. Einstellungen (Profil), 3. leer.
 * Bei Alt-Daten mit beiden Werten: Geburtsdatum hat Vorrang, ET wird ignoriert.
 */
export function getInitialBirthDateValues(
  profile: PhaseProfileDateSource | null | undefined,
  existing?: Partial<BirthDateFormValues> | null
): BirthDateFormValues {
  const existingBirth = existing?.birthDate?.trim();
  const existingExpected = existing?.expectedBirthDate?.trim();

  // Bereits vorhandene Formulardaten haben Vorrang
  if (existingBirth || existingExpected) {
    // Alt-Daten: wenn beide gesetzt, Geburtsdatum hat Vorrang
    if (existingBirth && existingExpected) {
      return { birthDate: existingBirth, expectedBirthDate: '' };
    }
    return {
      birthDate: existingBirth ?? '',
      expectedBirthDate: existingExpected ?? '',
    };
  }

  // Aus Einstellungen vorbefüllen (zentrale Datumsquelle)
  const child = getChildDateContext(profile);
  if (child.birthDate) {
    return { birthDate: child.birthDate, expectedBirthDate: '' };
  }
  if (child.expectedBirthDate) {
    return { birthDate: '', expectedBirthDate: child.expectedBirthDate };
  }
  return { birthDate: '', expectedBirthDate: '' };
}

/**
 * Prüft, ob das Geburtsdatum-Feld deaktiviert werden soll.
 * Deaktiviert, wenn voraussichtlicher Termin befüllt ist.
 */
export function isBirthDateDisabled(
  birthDate: string,
  expectedBirthDate: string
): boolean {
  return !!expectedBirthDate?.trim();
}

/**
 * Prüft, ob das Feld „Voraussichtlicher Geburtstermin“ deaktiviert werden soll.
 * Deaktiviert, wenn Geburtsdatum befüllt ist.
 */
export function isExpectedBirthDateDisabled(
  birthDate: string,
  expectedBirthDate: string
): boolean {
  return !!birthDate?.trim();
}

/**
 * Aktualisiert die Werte bei Änderung des Geburtsdatums.
 * Wenn Geburtsdatum gesetzt wird, wird der voraussichtliche Termin geleert.
 */
export function applyBirthDateChange(
  newBirthDate: string,
  currentExpected: string
): BirthDateFormValues {
  const trimmed = newBirthDate?.trim() ?? '';
  if (trimmed) {
    return { birthDate: trimmed, expectedBirthDate: '' };
  }
  return { birthDate: trimmed, expectedBirthDate: currentExpected };
}

/**
 * Aktualisiert die Werte bei Änderung des voraussichtlichen Termins.
 * Wenn voraussichtlicher Termin gesetzt wird, wird das Geburtsdatum geleert.
 */
export function applyExpectedBirthDateChange(
  currentBirth: string,
  newExpectedBirthDate: string
): BirthDateFormValues {
  const trimmed = newExpectedBirthDate?.trim() ?? '';
  if (trimmed) {
    return { birthDate: '', expectedBirthDate: trimmed };
  }
  return { birthDate: currentBirth, expectedBirthDate: trimmed };
}
