/**
 * UI-Darstellung der verfügbaren Elterngeld-Dokumente ausschließlich aus
 * ElterngeldDocumentModel (keine zweite Datenlogik).
 */

import type { ElterngeldDocumentModel } from './buildElterngeldDocumentModel';
import { ELTERNGELD_APPLICATION_PDF_OUTPUT_KIND } from './elterngeldOutputKindConstants';

export type DocumentOutputUiStatus = 'available' | 'planned' | 'info';

/** Welche Aktion die StepDocuments-UI anbieten darf (ohne neue Logik). */
export type DocumentOutputAction = 'summaryPdf' | 'scrollChecklist' | 'applicationPdf' | 'none';

export interface ElterngeldDocumentOutputRow {
  id: string;
  title: string;
  description: string;
  status: DocumentOutputUiStatus;
  /** Anzeige-Label für Nutzer (z. B. „Verfügbar“). */
  statusLabel: string;
  action: DocumentOutputAction;
}

const STATUS_LABEL: Record<DocumentOutputUiStatus, string> = {
  available: 'Verfügbar',
  planned: 'Folgt später',
  info: 'Nur Hinweis',
};

/** Bekannte Schlüssel aus StateConfig.documentOutputKinds → kurze Copy (nur Darstellung). */
const DOCUMENT_OUTPUT_KIND_COPY: Record<string, { title: string; description: string }> = {
  [ELTERNGELD_APPLICATION_PDF_OUTPUT_KIND]: {
    title: 'Antragsvorbereitung (PDF)',
    description:
      'Entspricht der Ausfüllhilfe-PDF unten; der Eintrag dient nur der Konfiguration pro Bundesland.',
  },
  landesformular: {
    title: 'Landesformular (geplant)',
    description:
      'Geplante Ausgabe — noch nicht verfügbar. Beantragung erfolgt mit den Vorgaben und Formularen der zuständigen Elterngeldstelle.',
  },
};

function kindRow(kind: string, index: number): ElterngeldDocumentOutputRow {
  const copy = DOCUMENT_OUTPUT_KIND_COPY[kind];
  const title = copy?.title ?? `Ausgabe (${kind})`;
  const description =
    copy?.description ?? 'Diese Ausgabe ist in der App noch nicht verfügbar und wird vorbereitet.';
  return {
    id: `output-kind-${kind}-${index}`,
    title,
    description,
    status: 'planned',
    statusLabel: STATUS_LABEL.planned,
    action: 'none',
  };
}

export function getElterngeldDocumentOutputRows(model: ElterngeldDocumentModel): ElterngeldDocumentOutputRow[] {
  const rows: ElterngeldDocumentOutputRow[] = [];

  rows.push({
    id: 'output-summary-pdf',
    title: 'Kurzüberblick (PDF)',
    description:
      'Kompakte Zusammenfassung: Grunddaten, Bezugsüberblick (Anzahl Monate, Modell, Bonus), ggf. Schätzung, kurze Checkliste und Fristen — ohne Monatsliste. Wird als „Elterngeld-Vorbereitung – Kurzüberblick“ gespeichert.',
    status: 'available',
    statusLabel: STATUS_LABEL.available,
    action: 'summaryPdf',
  });

  rows.push({
    id: 'output-checklist',
    title: 'Unterlagen-Checkliste',
    description:
      'Liste der Unterlagen aus deinen Daten und dem gewählten Bundesland — siehe Abschnitt unten auf dieser Seite.',
    status: 'available',
    statusLabel: STATUS_LABEL.available,
    action: 'scrollChecklist',
  });

  rows.push({
    id: 'output-application-fill-helper',
    title: 'Ausfüllhilfe für den Antrag (PDF)',
    description:
      'Ausführliche Formularhilfe (Abschnitte A–E): Monatsaufstellung je Lebensmonat, erste/zweite Elternperson, Bezugsarten — kein amtliches Formular. Wird als „Elterngeld-Antragsvorbereitung – Ausfüllhilfe (PDF)“ gespeichert.',
    status: 'available',
    statusLabel: STATUS_LABEL.available,
    action: 'applicationPdf',
  });

  model.documentOutputKinds.forEach((kind, index) => {
    if (kind === ELTERNGELD_APPLICATION_PDF_OUTPUT_KIND) return;
    rows.push(kindRow(kind, index));
  });

  if (model.stateNotes?.trim()) {
    rows.push({
      id: 'output-state-notes',
      title: 'Hinweise zum Bundesland',
      description: model.stateNotes.trim(),
      status: 'info',
      statusLabel: STATUS_LABEL.info,
      action: 'none',
    });
  }

  if (model.deadlines.deadlineLabel?.trim() || model.deadlines.noticeText?.trim()) {
    const parts = [model.deadlines.deadlineLabel?.trim(), model.deadlines.noticeText?.trim()].filter(
      Boolean
    ) as string[];
    rows.push({
      id: 'output-deadlines',
      title: 'Fristen und Tipps',
      description: parts.join(' '),
      status: 'info',
      statusLabel: STATUS_LABEL.info,
      action: 'none',
    });
  }

  return rows;
}
