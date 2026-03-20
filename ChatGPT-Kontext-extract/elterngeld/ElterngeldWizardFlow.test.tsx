/**
 * @vitest-environment jsdom
 * Reproduktion des Fehlers: Eltern & Arbeit → Weiter → Crash
 * Isolierter Test von StepPlan (der Step nach "Eltern & Arbeit").
 * Kritischer Flow: Intro → Geburt & Kind → Eltern & Arbeit → Weiter → Monate planen.
 */

import { describe, it, expect } from 'vitest';
import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '../../../shared/lib/i18n';
import { Button } from '../../../shared/ui/Button';
import { StepIntro } from './steps/StepIntro';
import { StepGeburtKind } from './steps/StepGeburtKind';
import { StepEinkommen } from './steps/StepEinkommen';
import { StepElternArbeit } from './steps/StepElternArbeit';
import { StepPlan } from './steps/StepPlan';
import type { ElterngeldApplication } from './types/elterngeldTypes';
import { INITIAL_ELTERNGELD_APPLICATION } from './types/elterngeldTypes';

const WIZARD_STEPS = [
  { id: 'geburtKind', title: 'Geburt & Kind' },
  { id: 'einkommen', title: 'Einkommen' },
  { id: 'elternArbeit', title: 'Eltern & Arbeit' },
  { id: 'plan', title: 'Monate planen' },
] as const;

/** Minimaler Wizard für Flow-Test ohne Storage/Phase/Navigation. */
const MinimalWizardFlow: React.FC = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [values, setValues] = useState<ElterngeldApplication>(() => ({
    ...INITIAL_ELTERNGELD_APPLICATION,
    child: { ...INITIAL_ELTERNGELD_APPLICATION.child, expectedBirthDate: '2025-06-15' },
  }));

  if (showIntro) {
    return <StepIntro onStart={() => setShowIntro(false)} />;
  }

  const step = WIZARD_STEPS[stepIndex] ?? WIZARD_STEPS[0];
  const isLast = stepIndex >= WIZARD_STEPS.length - 1;

  return (
    <>
      {step.id === 'geburtKind' && <StepGeburtKind values={values} onChange={setValues} />}
      {step.id === 'einkommen' && <StepEinkommen values={values} onChange={setValues} />}
      {step.id === 'elternArbeit' && <StepElternArbeit values={values} onChange={setValues} />}
      {step.id === 'plan' && (
        <StepPlan
          values={values}
          onChange={setValues}
          onNavigateToStep={() => {}}
        />
      )}
      {!isLast && (
        <Button type="button" onClick={() => setStepIndex((i) => i + 1)}>
          Weiter
        </Button>
      )}
    </>
  );
};

const renderWithI18n = (ui: React.ReactElement) =>
  render(<I18nProvider>{ui}</I18nProvider>);

const baseValues: ElterngeldApplication = {
  ...INITIAL_ELTERNGELD_APPLICATION,
  child: { ...INITIAL_ELTERNGELD_APPLICATION.child, expectedBirthDate: '2025-06-15' },
};

describe('Elterngeld-Wizard – kritischer Flow', () => {
  it('Intro → Geburt & Kind → Eltern & Arbeit → Weiter → Monate planen ohne Runtime-Error', () => {
    expect(() => {
      renderWithI18n(<MinimalWizardFlow />);
    }).not.toThrow();

    fireEvent.click(screen.getByRole('button', { name: /Jetzt planen/i }));
    expect(screen.getByText(/Geburt & Kind/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Weiter/i }));
    expect(screen.getByText(/Mutter/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Weiter/i }));
    expect(screen.getByText(/Wer nimmt Elternzeit/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Weiter/i }));
    expect(screen.getByText(/Monate planen/i)).toBeTruthy();
  });
});

describe('StepPlan (Monate planen) – Fehlerreproduktion', () => {
  it('rendert ohne Crash mit Initial-Werten', () => {
    expect(() => {
      renderWithI18n(
        <StepPlan
          values={baseValues}
          onChange={() => {}}
        />
      );
    }).not.toThrow();

    expect(screen.getByText(/Monate planen/i)).toBeTruthy();
  });

  it('rendert ohne Crash mit both_parents und parentB', () => {
    const valuesWithPartner: ElterngeldApplication = {
      ...baseValues,
      applicantMode: 'both_parents',
      parentB: {
        ...INITIAL_ELTERNGELD_APPLICATION.parentA,
        firstName: 'P',
        lastName: 'T',
      },
    };

    expect(() => {
      renderWithI18n(
        <StepPlan
          values={valuesWithPartner}
          onChange={() => {}}
        />
      );
    }).not.toThrow();

    expect(screen.getByText(/Monate planen/i)).toBeTruthy();
  });

  it('rendert ohne Crash mit benefitPlan-Monaten', () => {
    const valuesWithMonths: ElterngeldApplication = {
      ...baseValues,
      applicantMode: 'both_parents',
      parentB: { ...INITIAL_ELTERNGELD_APPLICATION.parentA },
      benefitPlan: {
        ...baseValues.benefitPlan,
        parentAMonths: '12',
        parentBMonths: '2',
        partnershipBonus: false,
      },
    };

    expect(() => {
      renderWithI18n(
        <StepPlan
          values={valuesWithMonths}
          onChange={() => {}}
        />
      );
    }).not.toThrow();
  });

  it('Range-Buttons: Klick auf „nächsten Monat“ markiert diesen sichtbar aktiv', () => {
    renderWithI18n(<StepPlan values={baseValues} onChange={() => {}} />);

    const month1 = screen.getByRole('button', { name: /^Lebensmonat 1:/i });
    fireEvent.click(month1);

    const next1Btn = screen.getByRole('button', { name: /nächsten Monat/i });
    expect(next1Btn.getAttribute('aria-pressed')).not.toBe('true');
    fireEvent.click(next1Btn);
    expect(next1Btn.getAttribute('aria-pressed')).toBe('true');
    expect(next1Btn.classList.contains('elterngeld-select-btn--selected')).toBe(true);

    const next3Btn = screen.getByRole('button', { name: /nächste 3 Monate/i });
    fireEvent.click(next3Btn);
    expect(next3Btn.getAttribute('aria-pressed')).toBe('true');
    expect(next1Btn.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(next3Btn);
    expect(next3Btn.getAttribute('aria-pressed')).toBe('false');
  });
});
