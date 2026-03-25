/**
 * @vitest-environment jsdom
 * Übernahme: validatePartnerBonus + explizite Teilzeit bei Partnerschaftsbonus (kein Fallback als Übernahme-Grund).
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OptionCard } from './StepCalculationResult';
import { ADOPTION_EXPLICIT_PART_TIME_HINT } from './adoptionExplicitPartTime';
import { createDefaultPlan, calculatePlan, validatePartnerBonus } from '../calculation';
import type { ElterngeldCalculationPlan, CalculationResult } from '../calculation';
import type { DecisionOption } from '../calculation/decisionContext';
import type { ElterngeldApplication } from '../types/elterngeldTypes';
import { INITIAL_ELTERNGELD_APPLICATION, EMPTY_ELTERNGELD_PARENT } from '../types/elterngeldTypes';

function planWithPartnerBonusHours(hours: number | undefined): ElterngeldCalculationPlan {
  const plan = createDefaultPlan('2025-06-01', true);
  plan.parents[0].incomeBeforeNet = 2500;
  plan.parents[1]!.incomeBeforeNet = 2500;
  for (const m of [5, 6]) {
    const ma = plan.parents[0].months.find((x) => x.month === m)!;
    const mb = plan.parents[1]!.months.find((x) => x.month === m)!;
    ma.mode = 'partnerBonus';
    mb.mode = 'partnerBonus';
    ma.incomeDuringNet = 0;
    mb.incomeDuringNet = 0;
    if (hours != null) {
      ma.hoursPerWeek = hours;
      mb.hoursPerWeek = hours;
    } else {
      delete ma.hoursPerWeek;
      delete mb.hoursPerWeek;
    }
  }
  return plan;
}

/** Nutzerplan ohne Partnerschaftsbonus (Schätzung kann PB nur in der Variante zeigen). */
function userPlanWithoutPartnerBonus(): ElterngeldCalculationPlan {
  const plan = createDefaultPlan('2025-06-01', true);
  plan.parents[0].incomeBeforeNet = 2500;
  plan.parents[1]!.incomeBeforeNet = 2500;
  return plan;
}

function makeOption(plan: ElterngeldCalculationPlan, result: CalculationResult): DecisionOption {
  return {
    id: 'opt-test',
    distinctnessKey: 'opt-test',
    label: 'Testvariante',
    description: '',
    strategyType: 'withPartTime',
    recommended: false,
    recommendedReason: null,
    impact: {
      financialDelta: 0,
      durationDelta: 0,
      bonusDelta: 0,
      changeSummary: [],
      advantage: null,
      tradeoff: null,
      coreChanges: [],
    },
    plan,
    result,
  };
}

function applicationBothParentsPartTime(entered: boolean, hours: number): ElterngeldApplication {
  return {
    ...INITIAL_ELTERNGELD_APPLICATION,
    applicantMode: 'both_parents',
    child: { ...INITIAL_ELTERNGELD_APPLICATION.child, expectedBirthDate: '2025-06-15' },
    parentA: {
      ...INITIAL_ELTERNGELD_APPLICATION.parentA,
      incomeBeforeBirth: '2500',
      plannedPartTime: entered,
      hoursPerWeek: entered ? hours : undefined,
    },
    parentB: {
      ...EMPTY_ELTERNGELD_PARENT,
      incomeBeforeBirth: '2500',
      plannedPartTime: entered,
      hoursPerWeek: entered ? hours : undefined,
    },
  };
}

describe('OptionCard Übernahme (Partnerschaftsbonus + explizite Teilzeit)', () => {
  it('deaktiviert Übernahme bei ungültiger Teilzeit (20 h) und zeigt Validierungstext', () => {
    const plan = planWithPartnerBonusHours(20);
    const result = calculatePlan(plan);
    expect(validatePartnerBonus(plan).isValid).toBe(false);

    const opt = makeOption(plan, result);
    const onAdopt = vi.fn();

    render(
      <OptionCard
        opt={opt}
        idx={0}
        clampedIndex={0}
        currentResult={result}
        formatCurrency={(n) => `€${n}`}
        formatCurrencySigned={(n) => `${n}`}
        onSelectOption={() => {}}
        onAdoptOption={onAdopt}
        adoptUserPlan={plan}
      />
    );

    const adopt = screen.getByRole('button', { name: /^Diese Variante übernehmen$/i });
    expect(adopt.hasAttribute('disabled')).toBe(true);
    expect(
      screen.getByText(/Partnerschaftsbonus erfordert 24[–-]32 Wochenstunden/i)
    ).toBeTruthy();
    fireEvent.click(adopt);
    expect(onAdopt).not.toHaveBeenCalled();
  });

  it('erlaubt Übernahme bei gültiger Teilzeit (28 h) auf Nutzer- und Variantenplan', () => {
    const plan = planWithPartnerBonusHours(28);
    const result = calculatePlan(plan);
    expect(validatePartnerBonus(plan).isValid).toBe(true);

    const opt = makeOption(plan, result);
    const onAdopt = vi.fn();

    render(
      <OptionCard
        opt={opt}
        idx={0}
        clampedIndex={0}
        currentResult={result}
        formatCurrency={(n) => `€${n}`}
        formatCurrencySigned={(n) => `${n}`}
        onSelectOption={() => {}}
        onAdoptOption={onAdopt}
        adoptUserPlan={plan}
      />
    );

    const adopt = screen.getByRole('button', { name: /^Diese Variante übernehmen$/i });
    expect(adopt.hasAttribute('disabled')).toBe(false);
    fireEvent.click(adopt);
    expect(onAdopt).toHaveBeenCalledWith(opt);
  });

  it('Partnerschaftsbonus in Variante mit gültigen Stunden, Nutzerplan ohne Eintrag: gesperrt (Fallback-Hinweis)', () => {
    const variantPlan = planWithPartnerBonusHours(28);
    const userPlan = userPlanWithoutPartnerBonus();
    const result = calculatePlan(variantPlan);
    expect(validatePartnerBonus(variantPlan).isValid).toBe(true);

    const opt = makeOption(variantPlan, result);
    render(
      <OptionCard
        opt={opt}
        idx={0}
        clampedIndex={0}
        currentResult={result}
        formatCurrency={(n) => `€${n}`}
        formatCurrencySigned={(n) => `${n}`}
        onSelectOption={() => {}}
        onAdoptOption={() => {}}
        adoptUserPlan={userPlan}
      />
    );

    const adopt = screen.getByRole('button', { name: /^Diese Variante übernehmen$/i });
    expect(adopt.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(ADOPTION_EXPLICIT_PART_TIME_HINT)).toBeTruthy();
  });

  it('Vorbereitung: PB-Variante schätzbar, ohne geplante Teilzeit → gesperrt mit Hinweis', () => {
    const variantPlan = planWithPartnerBonusHours(28);
    const userPlan = userPlanWithoutPartnerBonus();
    const result = calculatePlan(variantPlan);
    const opt = makeOption(variantPlan, result);
    const app = applicationBothParentsPartTime(false, 28);

    render(
      <OptionCard
        opt={opt}
        idx={0}
        clampedIndex={0}
        currentResult={result}
        formatCurrency={(n) => `€${n}`}
        formatCurrencySigned={(n) => `${n}`}
        onSelectOption={() => {}}
        onAdoptOption={() => {}}
        adoptUserPlan={userPlan}
        adoptApplication={app}
      />
    );

    expect(screen.getByRole('button', { name: /^Diese Variante übernehmen$/i }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(ADOPTION_EXPLICIT_PART_TIME_HINT)).toBeTruthy();
  });

  it('Vorbereitung: geplante Teilzeit 28 h → Übernahme bei gültiger PB-Variante aktiv', () => {
    const variantPlan = planWithPartnerBonusHours(28);
    const userPlan = userPlanWithoutPartnerBonus();
    const result = calculatePlan(variantPlan);
    const opt = makeOption(variantPlan, result);
    const app = applicationBothParentsPartTime(true, 28);

    render(
      <OptionCard
        opt={opt}
        idx={0}
        clampedIndex={0}
        currentResult={result}
        formatCurrency={(n) => `€${n}`}
        formatCurrencySigned={(n) => `${n}`}
        onSelectOption={() => {}}
        onAdoptOption={vi.fn()}
        adoptUserPlan={userPlan}
        adoptApplication={app}
      />
    );

    expect(screen.getByRole('button', { name: /^Diese Variante übernehmen$/i }).hasAttribute('disabled')).toBe(false);
  });

  it('Vorbereitung: explizite 20 h (außerhalb 24–32) → gesperrt mit zentraler PB-Stundenmeldung', () => {
    const variantPlan = planWithPartnerBonusHours(28);
    const userPlan = userPlanWithoutPartnerBonus();
    const result = calculatePlan(variantPlan);
    const opt = makeOption(variantPlan, result);
    const app = applicationBothParentsPartTime(true, 20);

    render(
      <OptionCard
        opt={opt}
        idx={0}
        clampedIndex={0}
        currentResult={result}
        formatCurrency={(n) => `€${n}`}
        formatCurrencySigned={(n) => `${n}`}
        onSelectOption={() => {}}
        onAdoptOption={() => {}}
        adoptUserPlan={userPlan}
        adoptApplication={app}
      />
    );

    expect(screen.getByRole('button', { name: /^Diese Variante übernehmen$/i }).hasAttribute('disabled')).toBe(true);
    expect(
      screen.getByText(/Partnerschaftsbonus erfordert 24[–-]32 Wochenstunden/i)
    ).toBeTruthy();
  });

  it('Vorbereitung: explizite 40 h → gesperrt mit zentraler PB-Stundenmeldung', () => {
    const variantPlan = planWithPartnerBonusHours(28);
    const userPlan = userPlanWithoutPartnerBonus();
    const result = calculatePlan(variantPlan);
    const opt = makeOption(variantPlan, result);
    const app = applicationBothParentsPartTime(true, 40);

    render(
      <OptionCard
        opt={opt}
        idx={0}
        clampedIndex={0}
        currentResult={result}
        formatCurrency={(n) => `€${n}`}
        formatCurrencySigned={(n) => `${n}`}
        onSelectOption={() => {}}
        onAdoptOption={() => {}}
        adoptUserPlan={userPlan}
        adoptApplication={app}
      />
    );

    expect(screen.getByRole('button', { name: /^Diese Variante übernehmen$/i }).hasAttribute('disabled')).toBe(true);
    expect(
      screen.getByText(/Partnerschaftsbonus erfordert 24[–-]32 Wochenstunden/i)
    ).toBeTruthy();
  });

  it('Vorbereitung: explizite 26 h (im Bereich 24–32) → Übernahme aktiv', () => {
    const variantPlan = planWithPartnerBonusHours(28);
    const userPlan = userPlanWithoutPartnerBonus();
    const result = calculatePlan(variantPlan);
    const opt = makeOption(variantPlan, result);
    const app = applicationBothParentsPartTime(true, 26);

    render(
      <OptionCard
        opt={opt}
        idx={0}
        clampedIndex={0}
        currentResult={result}
        formatCurrency={(n) => `€${n}`}
        formatCurrencySigned={(n) => `${n}`}
        onSelectOption={() => {}}
        onAdoptOption={vi.fn()}
        adoptUserPlan={userPlan}
        adoptApplication={app}
      />
    );

    expect(screen.getByRole('button', { name: /^Diese Variante übernehmen$/i }).hasAttribute('disabled')).toBe(false);
  });

  it('Klick auf die Variantenkarte wählt nur aus, löst keine Übernahme aus', () => {
    const plan = planWithPartnerBonusHours(28);
    const result = calculatePlan(plan);
    const opt = makeOption(plan, result);
    const onAdopt = vi.fn();
    const onSelect = vi.fn();

    render(
      <OptionCard
        opt={opt}
        idx={0}
        clampedIndex={0}
        currentResult={result}
        formatCurrency={(n) => `€${n}`}
        formatCurrencySigned={(n) => `${n}`}
        onSelectOption={onSelect}
        onAdoptOption={onAdopt}
        adoptUserPlan={plan}
      />
    );

    const card = screen.getByText('Testvariante').closest('.elterngeld-calculation__suggestion-card');
    expect(card).toBeTruthy();
    fireEvent.click(card!);
    expect(onSelect).toHaveBeenCalledWith(0);
    expect(onAdopt).not.toHaveBeenCalled();
  });

  it('ElterngeldPlus ohne Partnerschaftsbonus: Übernahme nicht durch diese Regel blockiert', () => {
    const plan = createDefaultPlan('2025-06-01', true);
    plan.parents[0].incomeBeforeNet = 2500;
    plan.parents[1]!.incomeBeforeNet = 2500;
    for (const m of [3, 4]) {
      const ma = plan.parents[0].months.find((x) => x.month === m)!;
      ma.mode = 'plus';
      ma.hoursPerWeek = 20;
      ma.incomeDuringNet = 0;
    }
    const result = calculatePlan(plan);
    expect(validatePartnerBonus(plan).isValid).toBe(true);

    const opt = makeOption(plan, result);
    opt.strategyType = 'maxMoney';
    const onAdopt = vi.fn();

    render(
      <OptionCard
        opt={opt}
        idx={0}
        clampedIndex={0}
        currentResult={result}
        formatCurrency={(n) => `€${n}`}
        formatCurrencySigned={(n) => `${n}`}
        onSelectOption={() => {}}
        onAdoptOption={onAdopt}
        adoptUserPlan={plan}
      />
    );

    const adopt = screen.getByRole('button', { name: /^Diese Variante übernehmen$/i });
    expect(adopt.hasAttribute('disabled')).toBe(false);
  });
});
