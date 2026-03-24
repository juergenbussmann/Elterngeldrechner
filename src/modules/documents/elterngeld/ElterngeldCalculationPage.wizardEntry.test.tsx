/**
 * @vitest-environment jsdom
 * Regression: Wizard „Ergebnis prüfen“ soll bei Konflikt Vorbereitung vs. Persistenz
 * nicht das Konflikt-Panel, nicht den Legacy-Zielschritt und nicht den Legacy-Drei-Stufen-Stepper.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { I18nProvider } from '../../../shared/lib/i18n';
import type { ElterngeldCalculationPlan } from './calculation';
import { createDefaultPlan } from './calculation';
import * as calculationPlanStorage from './infra/calculationPlanStorage';
import * as elterngeldPreparationStorage from './infra/elterngeldPreparationStorage';
import { INITIAL_ELTERNGELD_APPLICATION } from './types/elterngeldTypes';

vi.mock('../../../core/phase/usePhase', () => ({
  usePhase: () => ({ profile: { dueDateIso: '2025-06-15', birthDateIso: null } }),
}));

vi.mock('../../../shared/lib/navigation/useNavigation', () => ({
  useNavigation: () => ({ goTo: vi.fn() }),
}));

vi.mock('../../../shared/lib/notifications', () => ({
  useNotifications: () => ({ showToast: vi.fn() }),
}));

const loadCalculationPlanMock = vi.spyOn(calculationPlanStorage, 'loadCalculationPlan');
const loadVariantBPlanMock = vi.spyOn(calculationPlanStorage, 'loadVariantBPlan');

vi.spyOn(elterngeldPreparationStorage, 'loadPreparation').mockReturnValue({
  ...INITIAL_ELTERNGELD_APPLICATION,
});

function buildPlans(): { persisted: ElterngeldCalculationPlan; fromWizard: ElterngeldCalculationPlan } {
  const persisted = createDefaultPlan('2025-06-15', true);
  persisted.parents[0].incomeBeforeNet = 3000;
  persisted.parents[0].months[0].mode = 'basis';

  const fromWizard = createDefaultPlan('2025-06-15', true);
  fromWizard.parents[0].incomeBeforeNet = 3500;
  fromWizard.parents[0].months[0].mode = 'basis';

  return { persisted, fromWizard };
}

describe('ElterngeldCalculationPage – Wizard „Ergebnis prüfen“', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadVariantBPlanMock.mockReturnValue(null);
  });

  it('bei fromWizardErgebnisPruefen + Datenkonflikt: kein Konflikt-Panel, kein Zielschritt, Ergebnisansicht', async () => {
    const { persisted, fromWizard } = buildPlans();
    loadCalculationPlanMock.mockReturnValue(persisted);

    const { ElterngeldCalculationPage } = await import('./ElterngeldCalculationPage');

    render(
      <I18nProvider>
        <MemoryRouter
          initialEntries={[
            {
              pathname: '/documents/elterngeld-calculation',
              state: { fromPreparation: fromWizard, fromWizardErgebnisPruefen: true },
            },
          ]}
        >
          <Routes>
            <Route path="/documents/elterngeld-calculation" element={<ElterngeldCalculationPage />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    );

    expect(screen.queryByText(/Du hast bereits einen gespeicherten Plan/i)).toBeNull();
    expect(screen.queryByText(/Vorbereitungsdaten übernehmen/i)).toBeNull();
    expect(screen.queryByRole('heading', { name: /Was ist dir wichtiger/i })).toBeNull();
    expect(document.querySelector('.elterngeld-calculation-result')).toBeTruthy();
    expect(document.querySelector('.elterngeld-flow-stepper')).toBeNull();
    expect(
      screen.queryByRole('navigation', { name: /Fortschritt im Elterngeld-Flow/i })
    ).toBeNull();
  });

  it('ohne Wizard-Flag bei gleichem Konflikt: Konflikt-Panel sichtbar', async () => {
    const { persisted, fromWizard } = buildPlans();
    loadCalculationPlanMock.mockReturnValue(persisted);

    const { ElterngeldCalculationPage } = await import('./ElterngeldCalculationPage');

    render(
      <I18nProvider>
        <MemoryRouter
          initialEntries={[
            {
              pathname: '/documents/elterngeld-calculation',
              state: { fromPreparation: fromWizard },
            },
          ]}
        >
          <Routes>
            <Route path="/documents/elterngeld-calculation" element={<ElterngeldCalculationPage />} />
          </Routes>
        </MemoryRouter>
      </I18nProvider>
    );

    expect(screen.getByText(/Du hast bereits einen gespeicherten Plan/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Vorbereitungsdaten übernehmen/i })).toBeTruthy();
    expect(document.querySelector('.elterngeld-flow-stepper')).toBeTruthy();
  });
});
