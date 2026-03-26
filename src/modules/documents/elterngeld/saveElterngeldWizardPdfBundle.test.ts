import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveElterngeldWizardPdfBundle } from './saveElterngeldWizardPdfBundle';
import { INITIAL_ELTERNGELD_APPLICATION } from './types/elterngeldTypes';
import * as documentService from '../application/service';

describe('saveElterngeldWizardPdfBundle', () => {
  let addDocumentSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addDocumentSpy = vi.spyOn(documentService, 'addDocument').mockResolvedValue({
      id: 'id',
      title: 't',
      createdAt: new Date().toISOString(),
      mimeType: 'application/pdf',
      blob: new Blob(),
    });
  });

  afterEach(() => {
    addDocumentSpy.mockRestore();
  });

  it('speichert Zusammenfassungs- und Ausfüllhilfe-PDF (zwei Aufrufe)', async () => {
    await saveElterngeldWizardPdfBundle(
      {
        ...INITIAL_ELTERNGELD_APPLICATION,
        state: 'HE',
        child: {
          ...INITIAL_ELTERNGELD_APPLICATION.child,
          birthDate: '2024-01-10',
          expectedBirthDate: '',
        },
        parentA: {
          ...INITIAL_ELTERNGELD_APPLICATION.parentA,
          firstName: 'A',
          lastName: 'B',
          incomeBeforeBirth: '2000',
        },
      },
      null
    );

    expect(addDocumentSpy).toHaveBeenCalledTimes(2);
    expect(addDocumentSpy.mock.calls[0][0].title).toBe('Elterngeld-Vorbereitung – Kurzüberblick');
    expect(addDocumentSpy.mock.calls[1][0].title).toBe('Elterngeld-Antragsvorbereitung – Ausfüllhilfe (PDF)');
    const b0 = addDocumentSpy.mock.calls[0][0].blob as Blob;
    const b1 = addDocumentSpy.mock.calls[1][0].blob as Blob;
    expect(b0.size).toBeGreaterThan(400);
    expect(b1.size).toBeGreaterThan(400);
  });
});
