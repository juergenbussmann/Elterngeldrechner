/**
 * Bundesland-Konfiguration für Elterngeld.
 * Struktur vorbereitet für spätere Erweiterungen.
 */

export interface StateConfig {
  stateCode: string;
  displayName: string;
  notes?: string;
  applicationInfoUrl?: string;
  supportsDigitalFlow?: boolean;
}

export const GERMAN_STATES: StateConfig[] = [
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
];
