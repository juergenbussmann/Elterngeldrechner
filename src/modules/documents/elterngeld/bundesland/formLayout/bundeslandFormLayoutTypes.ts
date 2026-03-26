import type { ElterngeldFormFieldId } from '../elterngeldFormFieldIds';
import type { FormSubsectionKey } from './formSubsectionKeys';

/** Verweis auf eine geprüfte Formularquelle (LAND/PDF); nur setzen, wenn URL im Team verifiziert ist. */
export interface BundeslandFormSourceReference {
  readonly title: string;
  readonly url: string;
}

/**
 * Landesspezifische Darstellung für Abschnitt A (nur Labels, Überschriften, Reihenfolge).
 * Feld-IDs müssen in ElterngeldFormFieldId existieren — keine neuen App-Daten.
 */
export interface BundeslandFormSectionALayout {
  readonly source?: BundeslandFormSourceReference;
  readonly subsectionOrder: readonly FormSubsectionKey[];
  readonly subsectionTitles?: Partial<Readonly<Record<FormSubsectionKey, string>>>;
  readonly labelOverrides?: Partial<Readonly<Record<ElterngeldFormFieldId, string>>>;
  /** Ausfüllhinweise bei leerem Wert; gehen vor GENERIC_FORM_FIELD_HINTS. */
  readonly hintOverrides?: Partial<Readonly<Record<ElterngeldFormFieldId, string>>>;
  readonly fieldOrder?: Partial<
    Readonly<Record<FormSubsectionKey, readonly ElterngeldFormFieldId[]>>
  >;
}
