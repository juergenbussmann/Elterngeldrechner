import type { ElterngeldFormFieldId } from '../bundesland/elterngeldFormFieldIds';

export interface ElterngeldDocumentFormField {
  id: ElterngeldFormFieldId;
  /** Anzuzeigende Bezeichnung (generisch oder landesspezifisch aufgelöst). */
  label: string;
  /** Darstellung aus App-Daten; absichtlich leer wenn kein Wert (kein Platzhalterzeichen). */
  value: string;
  empty: boolean;
}

export interface ElterngeldDocumentFormSubsection {
  subsectionTitle: string;
  fields: ElterngeldDocumentFormField[];
}

export interface ElterngeldDocumentFormSection {
  sectionCode: 'A';
  sectionHeading: string;
  subsections: ElterngeldDocumentFormSubsection[];
}
