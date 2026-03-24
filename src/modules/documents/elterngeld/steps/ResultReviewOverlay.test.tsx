/**
 * @vitest-environment jsdom
 * „Ergebnis prüfen“: reine Übersicht, kein Optimierungs-Overlay / keine Varianten-CTAs.
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  it('zeigt Ergebnistitel und Kennzahlen, aber keine Optimierungs-UI', () => {
    const values = minimalValues();
    const plan = applicationToCalculationPlan(values);
    const result = calculatePlan(plan);
    if (result.validation.errors.length > 0) {
      return;
    }

    renderWithI18n(
      <ResultReviewOverlay isOpen={true} onClose={() => {}} values={values} result={result} />
    );

    expect(screen.getByText(/Ergebnis prüfen/i)).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Kennzahlen/i })).toBeTruthy();
    const dialog = screen.getByRole('dialog');
    const wrap = dialog.querySelector('#elterngeld-plan-month-grid.elterngeld-plan__month-grid-wrap');
    expect(wrap).toBeTruthy();
    expect(wrap?.querySelector('.elterngeld-month-grid')).toBeTruthy();
    expect(dialog.querySelector('.elterngeld-plan-card .elterngeld-plan__month-grid-wrap')).toBeTruthy();
    const firstTile = wrap?.querySelector('.elterngeld-tile');
    expect(firstTile?.tagName.toLowerCase()).toBe('button');
    expect(screen.queryByText(/Was ist dir wichtiger/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Varianten vergleichen/i })).toBeNull();
    expect(screen.queryByText(/Aufteilung prüfen/i)).toBeNull();
    expect(document.querySelector('.elterngeld-calculation__optimization-block')).toBeNull();
  });
});
