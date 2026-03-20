/**
 * Export-Typen für PDF-Generator und Share/Download.
 */

export type ExportScope = 'appointments' | 'checklists' | 'contacts';

export interface ExportPayload {
  scope: ExportScope;
  data: unknown;
}
