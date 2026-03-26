/**
 * Kanonische Liste der Bundesländer (ISO-ähnliche Codes) – eine Quelle für
 * Dropdown (Wizard) und Resolver. Keine bundeslandspezifische Fachlogik.
 */

export interface GermanBundeslandMeta {
  readonly stateCode: string;
  readonly displayName: string;
}

export const GERMAN_BUNDESLAENDER: readonly GermanBundeslandMeta[] = [
  { stateCode: 'BW', displayName: 'Baden-Württemberg' },
  { stateCode: 'BY', displayName: 'Bayern' },
  { stateCode: 'BE', displayName: 'Berlin' },
  { stateCode: 'BB', displayName: 'Brandenburg' },
  { stateCode: 'HB', displayName: 'Bremen' },
  { stateCode: 'HH', displayName: 'Hamburg' },
  { stateCode: 'HE', displayName: 'Hessen' },
  { stateCode: 'MV', displayName: 'Mecklenburg-Vorpommern' },
  { stateCode: 'NI', displayName: 'Niedersachsen' },
  { stateCode: 'NW', displayName: 'Nordrhein-Westfalen' },
  { stateCode: 'RP', displayName: 'Rheinland-Pfalz' },
  { stateCode: 'SL', displayName: 'Saarland' },
  { stateCode: 'SN', displayName: 'Sachsen' },
  { stateCode: 'ST', displayName: 'Sachsen-Anhalt' },
  { stateCode: 'SH', displayName: 'Schleswig-Holstein' },
  { stateCode: 'TH', displayName: 'Thüringen' },
] as const;
