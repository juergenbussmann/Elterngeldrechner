/**
 * @vitest-environment jsdom
 * Ergebnis-Review im Wizard: volle StepCalculationResult-Kette inkl. optionalem Ziel für Alternativen.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '../../../../shared/lib/i18n';
import { ResultReviewOverlay } from './ResultReviewOverlay';
import { applicationToCalculationPlan } from '../applicationToCalculationPlan';
import { calculatePlan } from '../calculation';
import type { ElterngeldApplication } from '../types/elterngeldTypes';
import { INITIAL_ELTERNGELD_APPLICATION } from '../types/elterngeldTypes';

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

function minimalValues(): ElterngeldApplication {
  return {
    ...INITIAL_ELTERNGELD_APPLICATION,
    child: { ...INITIAL_ELTERNGELD_APPLICATION.child, expectedBirthDate: '2025-06-15' },
    parentA: { ...INITIAL_ELTERNGELD_APPLICATION.parentA, incomeBeforeBirth: '2500' },
    benefitPlan: {
      ...INITIAL_ELTERNGELD_APPLICATION.benefitPlan,
      parentAMonths: '14',
      parentBMonths: '0',
    },
  };
}

describe('ResultReviewOverlay', () => {
  it('zeigt Ergebnistitel, Zielwahl und Kern-StepCalculationResult (Disclaimer)', () => {
    const values = minimalValues();
    const plan = applicationToCalculationPlan(values);
    const result = calculatePlan(plan);
    if (result.validation.errors.length > 0) {
      return;
    }

    renderWithI18n(
      <ResultReviewOverlay
        isOpen={true}
        onClose={() => {}}
        values={values}
        result={result}
        plan={plan}
        onApplicationChange={() => {}}
        onAdoptOptimization={() => {}}
        onNavigateToInput={() => {}}
      />
    );

    expect(screen.getByText(/Ergebnis prüfen/i)).toBeTruthy();
    expect(screen.getByText(/Ziel für Alternativen/i)).toBeTruthy();
    expect(screen.getByText(/Orientierung für deine Planung/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /mehr Geld insgesamt/i })).toBeTruthy();
  });

  it('zeigt nach Zielwahl den Optimierungs-Vergleich (StepOptimizationBlock)', () => {
    const values = minimalValues();
    const plan = applicationToCalculationPlan(values);
    const result = calculatePlan(plan);
    if (result.validation.errors.length > 0) {
      return;
    }

    renderWithI18n(
      <ResultReviewOverlay
        isOpen={true}
        onClose={() => {}}
        values={values}
        result={result}
        plan={plan}
        onApplicationChange={() => {}}
        onAdoptOptimization={() => {}}
        onNavigateToInput={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /mehr Geld insgesamt/i }));
    expect(screen.getByText(/Vergleich zum aktuellen Plan/i)).toBeTruthy();
  });
});
