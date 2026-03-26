/**
 * Formularfamilien für die Ausfüllhilfe (Abschnitt A): Zuordnung nach belastbarer Vorlagenlage,
 * nicht pro Bundesland eigene Logik. bundleStateCode → Profil.
 */

import type { FormSubsectionKey } from '../formLayout/formSubsectionKeys';

export type FormularProfil = 'nrw_like' | 'one_to_thirteen' | 'sixteen' | 'hessen' | 'generic';

/** Eine sichtbare Gruppe in Abschnitt A: Titel aus der jeweiligen Formularfamilie + interne App-Schlüssel. */
export interface FormProfileSubsectionGroup {
  readonly displayTitle: string;
  readonly keys: readonly FormSubsectionKey[];
}

/**
 * Quellenlage (PDF-Textextraktion / Projekt-Recherche):
 * - nrw_like: NRW „Antragsformular BEEG NRW Stand Mai 2025“ (Formular 1); BW L-Bank Antrag ab 01.05.2025 (gleiche Dreiteilung).
 * - one_to_thirteen: u. a. NI/RLP/ST „Einheitlicher Elterngeldantrag“ August 2025.
 * - sixteen: BE/SN Antrags-PDFs (16 nummerierte Abschnitte, u. a. „11. Planung der Elterngeld-Monate“).
 * - hessen: HE Antrag ab 01.04.2025 — Gliederung A / A.1 …; für die vorhandenen App-Felder keine 1:1-Abschnittsnamen ohne Überinterpretation → Darstellung wie generic.
 * - generic: BY, BB, MV, SL, TH und unbekannte Codes.
 */
const FORMULAR_PROFIL_BY_STATE_CODE: Readonly<Record<string, FormularProfil>> = {
  NW: 'nrw_like',
  BW: 'nrw_like',
  NI: 'one_to_thirteen',
  RP: 'one_to_thirteen',
  ST: 'one_to_thirteen',
  SH: 'one_to_thirteen',
  HH: 'one_to_thirteen',
  HB: 'one_to_thirteen',
  BE: 'sixteen',
  SN: 'sixteen',
  HE: 'hessen',
  BY: 'generic',
  BB: 'generic',
  MV: 'generic',
  SL: 'generic',
  TH: 'generic',
};

export function getFormularProfil(stateCode: string | undefined): FormularProfil {
  const c = stateCode?.trim();
  if (!c) return 'generic';
  return FORMULAR_PROFIL_BY_STATE_CODE[c] ?? 'generic';
}

export function listStateCodesForFormularProfil(profil: FormularProfil): string[] {
  return (Object.entries(FORMULAR_PROFIL_BY_STATE_CODE) as [string, FormularProfil][])
    .filter(([, p]) => p === profil)
    .map(([code]) => code)
    .sort();
}
