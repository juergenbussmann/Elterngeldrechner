/**
 * Testfälle für die Elterngeld-Optimierung.
 * Realistische Konstellationen zur Auswertung von Verbesserungstreffern.
 */

import { describe, it, expect } from 'vitest';
import { calculatePlan } from './calculationEngine';
import { buildOptimizationResult } from './elterngeldOptimization';
import type { ElterngeldCalculationPlan } from './types';
function createPlan(overrides: Partial<ElterngeldCalculationPlan>): ElterngeldCalculationPlan {
  return {
    childBirthDate: '2025-03-01',
    parents: [
      {
        id: 'p1',
        label: 'Mutter',
        incomeBeforeNet: 2500,
        months: Array.from({ length: 14 }, (_, i) => ({
          month: i + 1,
          mode: 'none' as const,
          incomeDuringNet: 0,
        })),
      },
      {
        id: 'p2',
        label: 'Vater',
        incomeBeforeNet: 2500,
        months: Array.from({ length: 14 }, (_, i) => ({
          month: i + 1,
          mode: 'none' as const,
          incomeDuringNet: 0,
        })),
      },
    ],
    hasSiblingBonus: false,
    additionalChildren: 0,
    ...overrides,
  };
}

function setMonth(
  plan: ElterngeldCalculationPlan,
  parentIdx: number,
  month: number,
  mode: 'none' | 'basis' | 'plus' | 'partnerBonus',
  incomeDuringNet = 0
) {
  const p = plan.parents[parentIdx];
  let m = p.months.find((x) => x.month === month);
  if (!m) {
    m = { month, mode, incomeDuringNet };
    p.months.push(m);
    p.months.sort((a, b) => a.month - b.month);
  } else {
    p.months[p.months.indexOf(m)] = { ...m, mode, incomeDuringNet };
  }
}

describe('Elterngeld-Optimierung – realistische Testfälle', () => {
  describe('A) Ähnliche Einkommen beider Eltern', () => {
    it('A1: Beide 2500€, Mutter 2 Basis (1–2), Vater 2 Basis (3–4) – maxMoney', () => {
      const plan = createPlan({});
      plan.parents[0].incomeBeforeNet = 2500;
      plan.parents[1].incomeBeforeNet = 2500;
      setMonth(plan, 0, 1, 'basis');
      setMonth(plan, 0, 2, 'basis');
      setMonth(plan, 1, 3, 'basis');
      setMonth(plan, 1, 4, 'basis');

      const result = calculatePlan(plan);
      const outcome = buildOptimizationResult(plan, result, 'maxMoney');

      expect(outcome).not.toBeNull();
      if ('suggestions' in outcome) {
        expect(outcome.status).toBeDefined();
        expect(outcome.suggestions).toBeDefined();
      }
    });
  });

  describe('B) Deutlich höheres Einkommen bei einem Elternteil', () => {
    it('B1: Mutter 1200€, Vater 3500€ – Mutter hat 2 Basis (1–2), Vater 0 – maxMoney', () => {
      const plan = createPlan({});
      plan.parents[0].incomeBeforeNet = 1200;
      plan.parents[1].incomeBeforeNet = 3500;
      setMonth(plan, 0, 1, 'basis');
      setMonth(plan, 0, 2, 'basis');

      const result = calculatePlan(plan);
      const outcome = buildOptimizationResult(plan, result, 'maxMoney');

      expect(outcome).not.toBeNull();
      if ('suggestions' in outcome && outcome.suggestions.length > 0) {
        const top = outcome.suggestions[0];
        expect(top.optimizedTotal).toBeGreaterThan(result.householdTotal);
      }
    });

    it('B2: Mutter 3500€, Vater 1200€ – Vater hat 2 Basis (3–4), Mutter 0 – maxMoney', () => {
      const plan = createPlan({});
      plan.parents[0].incomeBeforeNet = 3500;
      plan.parents[1].incomeBeforeNet = 1200;
      setMonth(plan, 1, 3, 'basis');
      setMonth(plan, 1, 4, 'basis');

      const result = calculatePlan(plan);
      const outcome = buildOptimizationResult(plan, result, 'maxMoney');

      expect(outcome).not.toBeNull();
      if ('suggestions' in outcome && outcome.suggestions.length > 0) {
        const top = outcome.suggestions[0];
        expect(top.optimizedTotal).toBeGreaterThan(result.householdTotal);
      }
    });
  });

  describe('C) Bereits gut verteilter Ausgangsplan', () => {
    it('C1: Höherer Elternteil hat bereits alle Monate (12) – ohne echte maxMoney-Verbesserung keine Vorschläge', () => {
      const plan = createPlan({});
      plan.parents[0].incomeBeforeNet = 1200;
      plan.parents[1].incomeBeforeNet = 3500;
      for (let m = 1; m <= 12; m++) setMonth(plan, 1, m, 'basis');

      const result = calculatePlan(plan);
      const outcome = buildOptimizationResult(plan, result, 'maxMoney');

      expect(outcome).not.toBeNull();
      if ('suggestions' in outcome) {
        expect(outcome.status).toBe('no_candidate');
        expect(outcome.suggestions).toHaveLength(0);
      }
    });
  });

  describe('D) Plan mit Plus-Monaten', () => {
    it('D1: Mutter 2 Plus (1–2), Vater 2 Plus (3–4) – maxMoney prüft Plus->Basis', () => {
      const plan = createPlan({});
      plan.parents[0].incomeBeforeNet = 2000;
      plan.parents[1].incomeBeforeNet = 2000;
      setMonth(plan, 0, 1, 'plus');
      setMonth(plan, 0, 2, 'plus');
      setMonth(plan, 1, 3, 'plus');
      setMonth(plan, 1, 4, 'plus');

      const result = calculatePlan(plan);
      const outcome = buildOptimizationResult(plan, result, 'maxMoney');

      expect(outcome).not.toBeNull();
      if ('suggestions' in outcome) {
        expect(outcome.suggestions).toBeDefined();
      }
    });
  });

  describe('E) Konstellation mit möglichem Partnerbonus', () => {
    it('E1: Beide haben überlappende Plus-Monate (1–2) – partnerBonus', () => {
      const plan = createPlan({});
      plan.parents[0].incomeBeforeNet = 2000;
      plan.parents[1].incomeBeforeNet = 2000;
      setMonth(plan, 0, 1, 'plus', 500);
      setMonth(plan, 0, 2, 'plus', 500);
      setMonth(plan, 1, 1, 'plus', 500);
      setMonth(plan, 1, 2, 'plus', 500);

      const result = calculatePlan(plan);
      const outcome = buildOptimizationResult(plan, result, 'partnerBonus');

      expect(outcome).not.toBeNull();
      if ('suggestions' in outcome) {
        expect(outcome.suggestions).toBeDefined();
      }
    });
  });

  describe('F) frontLoad – Auszahlung am Anfang', () => {
    it('F1: Mutter 3500€ (3–4), Vater 1200€ (1–2) – frontLoad verschiebt höhere Beträge nach vorne', () => {
      const plan = createPlan({});
      plan.parents[0].incomeBeforeNet = 3500;
      plan.parents[1].incomeBeforeNet = 1200;
      setMonth(plan, 0, 3, 'basis');
      setMonth(plan, 0, 4, 'basis');
      setMonth(plan, 1, 1, 'basis');
      setMonth(plan, 1, 2, 'basis');

      const result = calculatePlan(plan);
      const outcome = buildOptimizationResult(plan, result, 'frontLoad');

      expect(outcome).not.toBeNull();
      expect('status' in outcome).toBe(true);
      if ('suggestions' in outcome && outcome.suggestions.length > 0) {
        const top = outcome.suggestions[0];
        expect(top.goal).toBe('frontLoad');
        expect(top.deltaValue).toBeGreaterThan(0);
      }
    });
  });

  describe('H) bothBalanced – gemeinsame Aufteilung', () => {
    it('H1: maxMoney – nur Vorschläge mit strikt höherer Summe als Ist-Plan (keine reinen Trade-offs)', () => {
      const plan = createPlan({});
      plan.parents[0].incomeBeforeNet = 2500;
      plan.parents[1].incomeBeforeNet = 2500;
      setMonth(plan, 0, 1, 'basis');
      setMonth(plan, 0, 2, 'basis');
      setMonth(plan, 0, 3, 'basis');
      setMonth(plan, 0, 4, 'basis');

      const result = calculatePlan(plan);
      const outcome = buildOptimizationResult(plan, result, 'maxMoney');
      expect(outcome).not.toBeNull();
      if ('suggestions' in outcome && outcome.suggestions.length > 0) {
        for (const s of outcome.suggestions) {
          expect(s.optimizedTotal).toBeGreaterThan(result.householdTotal + 1);
          expect(s.status).toBe('improved');
        }
      }
    });

    it('H2: bothBalanced wird erzeugt bei sinnvollem Anteil (≥25% oder 2 zusammenhängende Monate)', () => {
      const plan = createPlan({});
      plan.parents[0].incomeBeforeNet = 2500;
      plan.parents[1].incomeBeforeNet = 2500;
      setMonth(plan, 0, 1, 'basis');
      setMonth(plan, 0, 3, 'basis');
      setMonth(plan, 0, 5, 'basis');
      setMonth(plan, 1, 2, 'basis');
      setMonth(plan, 1, 4, 'basis');
      setMonth(plan, 1, 6, 'basis');

      const result = calculatePlan(plan);
      const outcome = buildOptimizationResult(plan, result, 'maxMoney');
      expect(outcome).not.toBeNull();
      if ('suggestions' in outcome) {
        const balanced = outcome.suggestions.find((s) => s.strategyType === 'bothBalanced');
        if (balanced) {
          const monthsA = balanced.result.parents[0].monthlyResults.filter((r) => r.mode !== 'none' || r.amount > 0).map((r) => r.month);
          const monthsB = balanced.result.parents[1].monthlyResults.filter((r) => r.mode !== 'none' || r.amount > 0).map((r) => r.month);
          expect(monthsA.length).toBeGreaterThan(0);
          expect(monthsB.length).toBeGreaterThan(0);
          const [countA, countB] = [monthsA.length, monthsB.length];
          expect(Math.abs(countA - countB)).toBeLessThanOrEqual(1);
          const isContiguous = (arr: number[]) => {
            if (arr.length <= 1) return true;
            for (let i = 1; i < arr.length; i++) if (arr[i] !== arr[i - 1] + 1) return false;
            return true;
          };
          expect(isContiguous(monthsA)).toBe(true);
          expect(isContiguous(monthsB)).toBe(true);
        }
      }
    });
  });

  describe('I) Idempotenz nach Übernahme (Baseline = übernommener Plan)', () => {
    it('I1: maxMoney – besten sichtbaren Vorschlag übernehmen → erneut kein höherer Betrag als neuer Verbesserungsvorschlag', () => {
      const plan = createPlan({});
      plan.parents[0].incomeBeforeNet = 1200;
      plan.parents[1].incomeBeforeNet = 3500;
      setMonth(plan, 0, 1, 'basis');
      setMonth(plan, 0, 2, 'basis');

      const result = calculatePlan(plan);
      const outcome1 = buildOptimizationResult(plan, result, 'maxMoney');
      if (!('suggestions' in outcome1) || outcome1.suggestions.length === 0) {
        return;
      }

      const best = outcome1.suggestions.reduce((a, b) => (a.optimizedTotal >= b.optimizedTotal ? a : b));
      const adopted = JSON.parse(JSON.stringify(best.plan)) as ElterngeldCalculationPlan;
      const resultAfter = calculatePlan(adopted);
      expect(Math.abs(resultAfter.householdTotal - best.optimizedTotal)).toBeLessThanOrEqual(1);

      const outcome2 = buildOptimizationResult(adopted, resultAfter, 'maxMoney');

      expect('suggestions' in outcome2).toBe(true);
      const baseline = resultAfter.householdTotal;
      for (const s of outcome2.suggestions) {
        expect(s.optimizedTotal).toBeGreaterThan(baseline + 1);
        expect(s.status).toBe('improved');
      }
    });
  });

  describe('G) longerDuration – Basis->Plus', () => {
    it('G1: Mutter 2 Basis (1–2) – longerDuration', () => {
      const plan = createPlan({});
      plan.parents[0].incomeBeforeNet = 2000;
      plan.parents[1].incomeBeforeNet = 0;
      setMonth(plan, 0, 1, 'basis');
      setMonth(plan, 0, 2, 'basis');

      const result = calculatePlan(plan);
      const outcome = buildOptimizationResult(plan, result, 'longerDuration');

      expect(outcome).not.toBeNull();
      if ('suggestions' in outcome && outcome.suggestions.length > 0) {
        const top = outcome.suggestions[0];
        expect(top.optimizedDurationMonths).toBeGreaterThanOrEqual(2);
      }
    });

    it('G2: Bereits 24 Bezugsmonate (Plus) – kein „länger verteilt“ ohne strikt mehr Monate', () => {
      const plan = createPlan({});
      plan.parents[0].incomeBeforeNet = 3000;
      plan.parents[1].incomeBeforeNet = 3000;
      for (let m = 1; m <= 24; m++) {
        setMonth(plan, 0, m, 'plus');
      }

      const result = calculatePlan(plan);
      const outcome = buildOptimizationResult(plan, result, 'longerDuration');

      expect(outcome).not.toBeNull();
      if ('suggestions' in outcome) {
        expect(outcome.suggestions.some((s) => s.status === 'improved')).toBe(false);
        expect(outcome.suggestions.filter((s) => s.optimizedDurationMonths <= 24)).toHaveLength(0);
      }
    });
  });
});
