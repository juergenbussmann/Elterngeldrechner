/**
 * @vitest-environment jsdom
 * Zusammenfassung: ein Optimierungs-CTA, primärer Antrag-Schritt, kein Bundesland-Hinweis.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StepSummary } from './StepSummary';
import type { ElterngeldApplication } from '../types/elterngeldTypes';
import { INITIAL_ELTERNGELD_APPLICATION } from '../types/elterngeldTypes';
import type { CalculationResult } from '../calculation';

function minimalApp(overrides: Partial<ElterngeldApplication> = {}): ElterngeldApplication {
  return {
    ...INITIAL_ELTERNGELD_APPLICATION,
    child: { ...INITIAL_ELTERNGELD_APPLICATION.child, expectedBirthDate: '2025-06-15' },
    parentA: { ...INITIAL_ELTERNGELD_APPLICATION.parentA, incomeBeforeBirth: '2500' },
    benefitPlan: {
      ...INITIAL_ELTERNGELD_APPLICATION.benefitPlan,
      parentAMonths: '14',
      parentBMonths: '0',
    },
    ...overrides,
  };
}

function okResult(): CalculationResult {
  return {
    householdTotal: 10000,
    parents: [
      {
        id: 'a',
        label: 'Sie',
        total: 10000,
        monthlyResults: [],
        warnings: [],
      },
    ],
    validation: { isValid: true, errors: [], warnings: [] },
    meta: { isEstimate: true, disclaimer: '', transparencyHints: [] },
  };
}

describe('StepSummary – Aktionen', () => {
  it('genau ein „Optimierung ansehen“, primärer „Antrag vorbereiten“, kein Bundesland-Text', () => {
    const values = minimalApp();
    const result = okResult();

    render(
      <StepSummary
        values={values}
        onCreatePdf={vi.fn()}
        isSubmitting={false}
        onBackToPlan={vi.fn()}
        onOpenOptimization={vi.fn()}
        onNavigateToCalculation={vi.fn()}
        onProceedToDocuments={vi.fn()}
        liveResult={result}
        optimizationSummary={{ hasAnySuggestions: true, partnerBonusSuggestion: null }}
      />
    );

    expect(screen.getAllByRole('button', { name: /Optimierung ansehen/i })).toHaveLength(1);
    expect(screen.getByRole('button', { name: /Antrag vorbereiten/i })).toBeTruthy();
    expect(
      screen.getByText(/Aus deinen Angaben: Formulare und Checkliste im nächsten Schritt/i)
    ).toBeTruthy();
    expect(screen.queryByText(/Bundesland/i)).toBeNull();
  });
});
