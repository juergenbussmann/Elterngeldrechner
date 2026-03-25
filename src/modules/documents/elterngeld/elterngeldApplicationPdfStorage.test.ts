import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildElterngeldDocumentModel } from './documentModel/buildElterngeldDocumentModel';
import { buildElterngeldApplicationPdf } from './pdf/buildElterngeldApplicationPdf';
import { INITIAL_ELTERNGELD_APPLICATION } from './types/elterngeldTypes';
import * as documentService from '../application/service';

describe('Elterngeld Antragsvorbereitung-PDF Speicherung', () => {
  let addDocumentSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addDocumentSpy = vi.spyOn(documentService, 'addDocument').mockResolvedValue({
      id: 'test-doc-id',
      title: 'Elterngeld-Antragsvorbereitung (PDF)',
      createdAt: new Date().toISOString(),
      mimeType: 'application/pdf',
      blob: new Blob(),
    });
  });

  afterEach(() => {
    addDocumentSpy.mockRestore();
  });

  it('addDocument wird mit PDF-Blob und erwartetem Titel aufgerufen (gleicher Pfad wie Wizard)', async () => {
    const model = buildElterngeldDocumentModel({
      ...INITIAL_ELTERNGELD_APPLICATION,
      state: 'NW',
    });
    const blob = buildElterngeldApplicationPdf(model);
    await documentService.addDocument({
      title: 'Elterngeld-Antragsvorbereitung (PDF)',
      createdAt: new Date().toISOString(),
      mimeType: 'application/pdf',
      blob,
    });

    expect(addDocumentSpy).toHaveBeenCalledTimes(1);
    const payload = addDocumentSpy.mock.calls[0][0];
    expect(payload.mimeType).toBe('application/pdf');
    expect(payload.title).toBe('Elterngeld-Antragsvorbereitung (PDF)');
    expect(payload.blob).toBeInstanceOf(Blob);
    expect((payload.blob as Blob).size).toBeGreaterThan(500);
  });
});
