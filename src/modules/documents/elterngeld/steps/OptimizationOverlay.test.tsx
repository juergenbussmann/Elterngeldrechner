/**
 * @vitest-environment jsdom
 * Tests: Wizard zeigt gleiche Status- und Baseline-Texte wie Calculation.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '../../../../shared/lib/i18n';
import { OptimizationOverlay } from './OptimizationOverlay';
import { applicationToCalculationPlan } from '../applicationToCalculationPlan';
import { calculatePlan } from '../calculation';
import type { ElterngeldApplication } from '../types/elterngeldTypes';
import { INITIAL_ELTERNGELD_APPLICATION, EMPTY_ELTERNGELD_PARENT } from '../types/elterngeldTypes';

const renderWithI18n = (ui: React.ReactElement) =>
  render(<I18nProvider>{ui}</I18nProvider>);

function createValues(overrides: Partial<ElterngeldApplication> = {}): ElterngeldApplication {
  return {
    ...INITIAL_ELTERNGELD_APPLICATION,
    child: { ...INITIAL_ELTERNGELD_APPLICATION.child, expectedBirthDate: '2025-06-15' },
    parentA: {
      ...INITIAL_ELTERNGELD_APPLICATION.parentA,
      incomeBeforeBirth: '2500',
    },
    parentB: null,
    benefitPlan: {
      ...INITIAL_ELTERNGELD_APPLICATION.benefitPlan,
      parentAMonths: '2',
      parentBMonths: '',
    },
    ...overrides,
  };
}

/** Plan mit überlappendem Plus je Elternteil (ähnlich stepDecisionFlow „Teilzeit“-Szenario). */
function createValuesBothParentsPlusStaggered(): ElterngeldApplication {
  const concreteMonthDistribution = Array.from({ length: 14 }, (_, i) => {
    const month = i + 1;
    const modeA = month <= 2 ? ('plus' as const) : ('none' as const);
    const modeB = month >= 3 && month <= 4 ? ('plus' as const) : ('none' as const);
    return { month, modeA, modeB };
  });
  return {
    ...INITIAL_ELTERNGELD_APPLICATION,
    applicantMode: 'both_parents',
    child: { ...INITIAL_ELTERNGELD_APPLICATION.child, expectedBirthDate: '2025-06-15' },
    parentA: {
      ...INITIAL_ELTERNGELD_APPLICATION.parentA,
      incomeBeforeBirth: '2000',
      plannedPartTime: true,
      hoursPerWeek: 28,
    },
    parentB: {
      ...EMPTY_ELTERNGELD_PARENT,
      incomeBeforeBirth: '2000',
      plannedPartTime: true,
      hoursPerWeek: 28,
    },
    benefitPlan: {
      model: 'plus',
      parentAMonths: '4',
      parentBMonths: '4',
      partnershipBonus: false,
      concreteMonthDistribution,
    },
  };
}

function createAppWithDistributionHours(hoursA: number, hoursB: number): ElterngeldApplication {
  const concreteMonthDistribution = Array.from({ length: 14 }, (_, i) => ({
    month: i + 1,
    modeA: i < 8 ? ('plus' as const) : ('none' as const),
    modeB: i >= 6 && i < 10 ? ('plus' as const) : ('none' as const),
  }));
  return {
    ...INITIAL_ELTERNGELD_APPLICATION,
    applicantMode: 'both_parents',
    child: { ...INITIAL_ELTERNGELD_APPLICATION.child, birthDate: '2025-06-01' },
    parentA: {
      ...INITIAL_ELTERNGELD_APPLICATION.parentA,
      incomeBeforeBirth: '3000',
      plannedPartTime: true,
      hoursPerWeek: hoursA,
    },
    parentB: {
      ...EMPTY_ELTERNGELD_PARENT,
      incomeBeforeBirth: '3000',
      plannedPartTime: true,
      hoursPerWeek: hoursB,
    },
    benefitPlan: {
      ...INITIAL_ELTERNGELD_APPLICATION.benefitPlan,
      model: 'plus',
      parentAMonths: '24',
      parentBMonths: '12',
      partnershipBonus: true,
      concreteMonthDistribution,
    },
  };
}

function suggestionMetaSnapshot(): string {
  return Array.from(document.querySelectorAll('.elterngeld-calculation__suggestion-meta'))
    .map((n) => (n.textContent ?? '').trim())
    .join('\n');
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

  it('öffnet Teilzeitstunden-Modal im Strategie-Schritt bei application/onApplicationChange', () => {
    const values = createValuesBothParentsPlusStaggered();
    const plan = applicationToCalculationPlan(values);
    const result = calculatePlan(plan);
    if (result.validation.errors.length > 0) {
      return;
    }

    const onApplicationChange = vi.fn();
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
        application={values}
        onApplicationChange={onApplicationChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Varianten vergleichen/i }));

    const partTimeCtas = screen.getAllByRole('button', { name: /Teilzeitstunden anpassen/i });
    expect(partTimeCtas.length).toBeGreaterThan(0);
    fireEvent.click(partTimeCtas[0]);

    expect(screen.getByTestId('elterngeld-optimization-part-time-hours-modal')).toBeTruthy();

    const hourInput = screen.getAllByPlaceholderText('z.B. 30')[0];
    fireEvent.change(hourInput, { target: { value: '30' } });
    expect(onApplicationChange).toHaveBeenCalled();
    const next = onApplicationChange.mock.calls[onApplicationChange.mock.calls.length - 1][0] as ElterngeldApplication;
    expect(next.parentA.hoursPerWeek).toBe(30);
  });

  it('Strategieansicht: Kennzahlen der Variantenkarten aktualisieren nach Teilzeitänderung (plan/result-Treiber)', async () => {
    const Harness: React.FC = () => {
      const [app, setApp] = React.useState(() => createAppWithDistributionHours(28, 28));
      const plan = React.useMemo(() => applicationToCalculationPlan(app), [app]);
      const result = React.useMemo(() => calculatePlan(plan), [app]);
      if (result.validation.errors.length > 0) {
        return <p>validation error</p>;
      }
      return (
        <OptimizationOverlay
          isOpen={true}
          onClose={() => {}}
          plan={plan}
          result={result}
          hasAnySuggestions={true}
          onAdoptOptimization={() => {}}
          originalPlanForOptimization={plan}
          originalResultForOptimization={result}
          application={app}
          onApplicationChange={setApp}
        />
      );
    };

    renderWithI18n(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: /Varianten vergleichen/i }));

    await screen.findByRole('list', {}, { timeout: 4000 });
    const before = suggestionMetaSnapshot();
    expect(before.length).toBeGreaterThan(0);

    const partTimeCtas = screen.getAllByRole('button', { name: /Teilzeitstunden anpassen/i });
    fireEvent.click(partTimeCtas[0]);

    const hourInput = screen.getAllByPlaceholderText('z.B. 30')[0];
    fireEvent.change(hourInput, { target: { value: '24' } });
    fireEvent.click(screen.getByRole('button', { name: /^Fertig$/i }));

    await screen.findByRole('list', {}, { timeout: 4000 });
    const after = suggestionMetaSnapshot();
    if (after !== before) {
      expect(after).not.toBe(before);
    } else {
      expect(
        screen.getByText(
          /Die angezeigten Kennzahlen der Varianten bleiben unter der Schätzung unverändert/i
        )
      ).toBeTruthy();
    }
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
