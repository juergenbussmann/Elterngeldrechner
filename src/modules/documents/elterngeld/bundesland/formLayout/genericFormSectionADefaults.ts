import type { FormSubsectionKey } from './formSubsectionKeys';

/** Generische Reihenfolge und Überschriften (bisherige App-Struktur), wenn kein Landes-Layout greift. */
export const DEFAULT_FORM_SUBSECTION_ORDER: readonly FormSubsectionKey[] = [
  'bundesland',
  'kind',
  'eltern',
  'antragstellung',
  'bezug',
] as const;

export const DEFAULT_FORM_SUBSECTION_TITLES: Readonly<Record<FormSubsectionKey, string>> = {
  bundesland: 'Bundesland',
  kind: 'Kind',
  eltern: 'Eltern',
  antragstellung: 'Antragsteller-Konstellation',
  bezug: 'Bezug (Überblick aus der App)',
};
