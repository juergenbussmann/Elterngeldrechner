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
    title: 'Amtliches Antragsformular',
    description:
      'Strukturierte Antrags-Vorbereitung als PDF (Felder zu Kind, Bezug und Antragstellern). Für ausgewählte Bundesländer freigeschaltet — kein Original-Formular der Behörde.',
  },
  landesformular: {
    title: 'Landesformular',
    description: 'Vorgefertigtes Formular der zuständigen Landesstelle',
  },
};

function kindRow(kind: string, index: number): ElterngeldDocumentOutputRow {
  if (kind === ELTERNGELD_APPLICATION_PDF_OUTPUT_KIND) {
    const copy = DOCUMENT_OUTPUT_KIND_COPY[kind];
    return {
      id: `output-kind-${kind}-${index}`,
      title: copy.title,
      description: copy.description,
      status: 'available',
      statusLabel: STATUS_LABEL.available,
      action: 'applicationPdf',
    };
  }

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
    title: 'Zusammenfassung (PDF)',
    description:
      'Deine Angaben, der geplante Bezug, Orientierungswerte (falls möglich) und die Unterlagen-Checkliste als PDF. Wird in „Dokumente“ gespeichert.',
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

  if (model.documentOutputKinds.length > 0) {
    model.documentOutputKinds.forEach((kind, index) => {
      rows.push(kindRow(kind, index));
    });
  } else {
    rows.push({
      id: 'output-form-state',
      title: 'Amtliches Antragsformular',
      description:
        'Die App erstellt noch kein ausfüllbares Landeseinzel-Formular. Nutze die Zusammenfassung und die Angaben beim zuständigen Amt.',
      status: 'planned',
      statusLabel: 'Für dein Bundesland noch nicht in der App',
      action: 'none',
    });
  }

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
