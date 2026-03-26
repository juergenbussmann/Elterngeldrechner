/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StepDocumentsPdfBundle } from './StepDocumentsPdfBundle';
import { INITIAL_ELTERNGELD_APPLICATION } from '../types/elterngeldTypes';

vi.mock('../../../../shared/lib/navigation/useNavigation', () => ({
  useNavigation: () => ({ goTo: vi.fn() }),
}));

function renderBundle(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('StepDocumentsPdfBundle', () => {
  it('ruft onSaveAllPdfs beim Klick auf „Alle in Dokumente speichern“ auf', () => {
    const onSaveAllPdfs = vi.fn();
    renderBundle(
      <StepDocumentsPdfBundle
        values={{
          ...INITIAL_ELTERNGELD_APPLICATION,
          state: 'HE',
          child: { ...INITIAL_ELTERNGELD_APPLICATION.child, expectedBirthDate: '2025-06-15' },
        }}
        onSaveAllPdfs={onSaveAllPdfs}
        isSubmitting={false}
        saveComplete={false}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /Alle in Dokumente speichern/i }));
    expect(onSaveAllPdfs).toHaveBeenCalledTimes(1);
  });

  it('zeigt nach Speicherung Erfolg und Link-Ziel-Button', () => {
    renderBundle(
      <StepDocumentsPdfBundle
        values={INITIAL_ELTERNGELD_APPLICATION}
        onSaveAllPdfs={vi.fn()}
        isSubmitting={false}
        saveComplete
      />
    );
    expect(
      screen.getByText(/Kurzüberblick und Ausfüllhilfe wurden als zwei unterschiedliche PDFs in „Dokumente“ gespeichert/i)
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: /Zu Dokumente/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Alle in Dokumente speichern/i })).toBeNull();
  });
});
