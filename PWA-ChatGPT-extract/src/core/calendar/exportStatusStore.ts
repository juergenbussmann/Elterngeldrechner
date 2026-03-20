/**
 * Persistenter Export-Status pro Termin (Kalender-ICS).
 * MVP: lokal in localStorage.
 */

import { getValue, setValue } from '../../shared/lib/storage';

const STORAGE_KEY = 'app_calendar_export_status_v1';

export interface ExportStatusEntry {
  exportedAt: string;
  icsUid?: string;
  signature?: string;
}

export type ExportStatusMap = Record<string, ExportStatusEntry>;

function loadMap(): ExportStatusMap {
  return getValue<ExportStatusMap>(STORAGE_KEY) ?? {};
}

function saveMap(map: ExportStatusMap): void {
  setValue(STORAGE_KEY, map);
}

export function getExportStatus(appointmentId: string): ExportStatusEntry | undefined {
  const map = loadMap();
  return map[appointmentId];
}

export function setExportStatus(
  appointmentId: string,
  entry: { exportedAt: string; icsUid?: string; signature?: string }
): void {
  const map = loadMap();
  map[appointmentId] = entry;
  saveMap(map);
}

export function clearExportStatus(appointmentId: string): void {
  const map = loadMap();
  delete map[appointmentId];
  saveMap(map);
}

/** Signatur aus relevanten Feldern für Änderungserkennung. */
export function getAppointmentSignature(a: {
  title: string;
  startAt: string;
  endAt?: string;
  location?: string;
  notes?: string;
}): string {
  const parts = [
    a.title,
    a.startAt,
    a.endAt ?? '',
    a.location ?? '',
    a.notes ?? '',
  ];
  return parts.join('|');
}
