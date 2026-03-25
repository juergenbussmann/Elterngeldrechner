/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StepDocumentsApplicationPdf } from './StepDocumentsApplicationPdf';
import { INITIAL_ELTERNGELD_APPLICATION } from '../types/elterngeldTypes';

describe('StepDocumentsApplicationPdf – Antragsvorbereitung-PDF', () => {
  it('ruft onCreateApplicationPdf beim Klick auf Antragsvorbereitung (PDF) erstellen auf', () => {
    const onCreateApplicationPdf = vi.fn();

    render(
      <StepDocumentsApplicationPdf
        values={{
          ...INITIAL_ELTERNGELD_APPLICATION,
          state: 'NW',
        }}
        onCreateApplicationPdf={onCreateApplicationPdf}
        isApplicationPdfSubmitting={false}
      />
    );

    const btn = screen.getByRole('button', { name: /Antragsvorbereitung \(PDF\) erstellen/i });
    expect(btn).toBeTruthy();
    fireEvent.click(btn);
    expect(onCreateApplicationPdf).toHaveBeenCalledTimes(1);
  });

  it('zeigt keinen Antragsvorbereitung-Button ohne application_pdf in der Landes-Konfiguration (z. B. Hessen)', () => {
    render(
      <StepDocumentsApplicationPdf
        values={{
          ...INITIAL_ELTERNGELD_APPLICATION,
          state: 'HE',
        }}
        onCreateApplicationPdf={vi.fn()}
        isApplicationPdfSubmitting={false}
      />
    );

    expect(
      screen.queryByRole('button', { name: /Antragsvorbereitung \(PDF\) erstellen/i })
    ).toBeNull();
  });
});
