/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../../shared/lib/navigation/useNavigation', () => ({
  useNavigation: () => ({ goTo: vi.fn() }),
}));
import { render, screen, fireEvent } from '@testing-library/react';
import { StepDocuments } from './StepDocuments';
import { INITIAL_ELTERNGELD_APPLICATION } from '../types/elterngeldTypes';
describe('StepDocuments Antrags-PDF', () => {
  it('ruft onCreateApplicationPdf beim Klick auf Antrags-PDF erstellen auf', () => {
    const onCreateApplicationPdf = vi.fn();

    render(
      <StepDocuments
        values={{
          ...INITIAL_ELTERNGELD_APPLICATION,
          state: 'NW',
        }}
        onCreatePdf={vi.fn()}
        isSubmitting={false}
        onCreateApplicationPdf={onCreateApplicationPdf}
        isApplicationPdfSubmitting={false}
      />
    );

    const btn = screen.getByRole('button', { name: /Antrags-PDF erstellen/i });
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(onCreateApplicationPdf).toHaveBeenCalledTimes(1);
  });

  it('zeigt keinen Antrags-PDF-Button ohne application_pdf in der Landes-Konfiguration (z. B. Hessen)', () => {
    render(
      <StepDocuments
        values={{
          ...INITIAL_ELTERNGELD_APPLICATION,
          state: 'HE',
        }}
        onCreatePdf={vi.fn()}
        isSubmitting={false}
        onCreateApplicationPdf={vi.fn()}
        isApplicationPdfSubmitting={false}
      />
    );

    expect(screen.queryByRole('button', { name: /Antrags-PDF erstellen/i })).toBeNull();
  });
});
