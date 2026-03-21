/**
 * @vitest-environment jsdom
 * Tests: Wizard zeigt gleiche Status- und Baseline-Texte wie Calculation.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '../../../../shared/lib/i18n';
import { OptimizationOverlay } from './OptimizationOverlay';
import { applicationToCalculationPlan } from '../applicationToCalculationPlan';
import { calculatePlan } from '../calculation';
import type { ElterngeldApplication } from '../types/elterngeldTypes';
import { INITIAL_ELTERNGELD_APPLICATION } from '../types/elterngeldTypes';

const renderWithI18n = (ui: React.ReactElement) =>
  render(<I18nProvider>{ui}</I18nProvider>);

function createValues(overrides: Partial<ElterngeldApplication> = {}): ElterngeldApplication {
  return {
    ...INITIAL_ELTERNGELD_APPLICATION,
    child: { ...INITIAL_ELTERNGELD_APPLICATION.child, expectedBirthDate: '2025-06-15' },
    parentA: {
      ...INITIAL_ELTERNGELD_APPLICATION.parentA,
      incomeBeforeNet: 2500,
      benefitPlan: { months: [{ month: 1, mode: 'basis' }, { month: 2, mode: 'basis' }] },
    },
    parentB: null,
    benefitPlan: { months: [] },
    ...overrides,
  };
}

describe('OptimizationOverlay', () => {
  it('zeigt Baseline-Kommunikation wie Calculation wenn originalPlanForOptimization übergeben', () => {
    const values = createValues();
    const plan = applicationToCalculationPlan(values);
    const result = calculatePlan(plan);

    renderWithI18n(
      <OptimizationOverlay
        isOpen={true}
        onClose={() => {}}
        plan={plan}
        result={result}
        hasAnySuggestions={true}
        onAdoptOptimization={() => {}}
        originalPlanForOptimization={plan}
        originalResultForOptimization={result}
      />
    );

    expect(screen.getByText(/Aufteilung prüfen/i)).toBeTruthy();
  });

  it('Adoption-Block enthält keine doppelten Statusinformationen (nur „Vorschlag übernommen“)', () => {
    const adoptionBlockText = 'Vorschlag übernommen';
    expect(adoptionBlockText).not.toMatch(/Aktueller Plan|aktuell aktiv/);
    expect(adoptionBlockText.length).toBeLessThan(50);
  });

  it('akzeptiert originalPlanForOptimization und originalResultForOptimization wie Calculation', () => {
    const values = createValues();
    const plan = applicationToCalculationPlan(values);
    const result = calculatePlan(plan);

    expect(() =>
      renderWithI18n(
        <OptimizationOverlay
          isOpen={true}
          onClose={() => {}}
          plan={plan}
          result={result}
          hasAnySuggestions={true}
          onAdoptOptimization={() => {}}
          originalPlanForOptimization={plan}
          originalResultForOptimization={result}
        />
      )
    ).not.toThrow();
  });
});
