/**
 * Zentrale Datenquelle für Geburtsdatum und voraussichtlichen Geburtstermin.
 * Alle relevanten Bereiche der App sollen diese Funktion nutzen, um einheitlich
 * auf Datumsinformationen zu reagieren.
 */

export interface PhaseProfileDateSource {
  birthDateIso?: string | null;
  dueDateIso?: string | null;
}

export interface ChildDateContext {
  /** Tatsächliches Geburtsdatum (falls gesetzt) */
  birthDate: string | null;
  /** Voraussichtlicher Geburtstermin (falls kein Geburtsdatum) */
  expectedBirthDate: string | null;
  /** Effektives Datum: birthDate hat Vorrang, sonst expectedBirthDate, sonst null */
  effectiveDate: string | null;
  /** true, wenn Geburtsdatum gesetzt ist (Kind bereits geboren) */
  isBorn: boolean;
}

/**
 * Liefert ein einheitliches Kontextobjekt für Geburtsdatum/ET.
 *
 * Regeln:
 * 1. birthDate hat Vorrang
 * 2. Wenn kein birthDate vorhanden → expectedBirthDate (ET)
 * 3. Wenn beides fehlt oder leer → effectiveDate = null
 * 4. Leere Strings ("") werden als null behandelt
 *
 * @param profile Phase-Profil oder beliebiges Objekt mit birthDateIso/dueDateIso
 */
export function getChildDateContext(
  profile: PhaseProfileDateSource | null | undefined
): ChildDateContext {
  const birthDate = profile?.birthDateIso?.trim() || null;
  const expectedBirthDate = profile?.dueDateIso?.trim() || null;
  const effectiveDate = birthDate ?? expectedBirthDate ?? null;
  const isBorn = birthDate !== null;

  return {
    birthDate,
    expectedBirthDate,
    effectiveDate,
    isBorn,
  };
}
