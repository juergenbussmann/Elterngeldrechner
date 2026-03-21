/**
 * Tests für das Übernahme-Statusmodell (adoptionStatus).
 * Prüft die korrekte Ermittlung von Status nach Übernahme, Rückkehr, manueller Änderung und veralteter Optimierung.
 */

import { describe, it, expect } from 'vitest';
import { getAdoptionStatus } from './adoptionStatus';
import { calculatePlan } from '../calculation/calculationEngine';
import { duplicatePlan } from '../calculation';
import type { ElterngeldCalculationPlan } from '../calculation/types';

function createPlan(overrides: Partial<ElterngeldCalculationPlan> = {}): ElterngeldCalculationPlan {
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
    const idx = p.months.indexOf(m);
    p.months[idx] = { ...m, mode, incomeDuringNet };
  }
}

describe('adoptionStatus', () => {
  describe('1. Übernahme-Status (Variante übernommen → aktiv/übernommen)', () => {
    it('zeigt adopted_active wenn plan === lastAdoptedPlan', () => {
      const original = createPlan();
      setMonth(original, 0, 1, 'basis');
      setMonth(original, 0, 2, 'basis');
      const adopted = duplicatePlan(original);
      setMonth(adopted, 0, 3, 'basis');
      setMonth(adopted, 0, 4, 'basis');

      const result = calculatePlan(adopted);
      const status = getAdoptionStatus(adopted, result, {
        lastAdoptedPlan: adopted,
        lastAdoptedResult: result,
        originalPlanForOptimization: original,
        optimizationStatus: 'adopted',
        optimizationGoal: 'maxMoney',
      });

      expect(status.kind).toBe('adopted_active');
      expect(status.message).toContain('übernommen');
      expect(status.activeVariantLabel).toBeDefined();
    });
  });

  describe('2. Rückkehr zum Ursprung (ursprünglicher Plan aktiv)', () => {
    it('zeigt original_active wenn plan === originalPlanForOptimization nach Rückkehr', () => {
      const original = createPlan();
      setMonth(original, 0, 1, 'basis');
      setMonth(original, 0, 2, 'basis');
      const adopted = duplicatePlan(original);
      setMonth(adopted, 0, 3, 'basis');
      setMonth(adopted, 0, 4, 'basis');

      const originalResult = calculatePlan(original);
      const status = getAdoptionStatus(original, originalResult, {
        lastAdoptedPlan: adopted,
        lastAdoptedResult: calculatePlan(adopted),
        originalPlanForOptimization: original,
        optimizationStatus: 'idle',
        optimizationGoal: 'maxMoney',
      });

      expect(status.kind).toBe('original_active');
      expect(status.message).toContain('ursprünglichen Plan');
      expect(status.hint).toContain('nicht mehr aktiv');
    });
  });

  describe('3. Manuelle Änderung nach Übernahme', () => {
    it('zeigt adopted_manually_changed wenn lastAdopted vorhanden und plan weicht ab', () => {
      const original = createPlan();
      setMonth(original, 0, 1, 'basis');
      setMonth(original, 0, 2, 'basis');
      const adopted = duplicatePlan(original);
      setMonth(adopted, 0, 3, 'basis');
      setMonth(adopted, 0, 4, 'basis');
      const manuallyChanged = duplicatePlan(adopted);
      setMonth(manuallyChanged, 0, 5, 'basis');

      const result = calculatePlan(manuallyChanged);
      const status = getAdoptionStatus(manuallyChanged, result, {
        lastAdoptedPlan: adopted,
        lastAdoptedResult: calculatePlan(adopted),
        originalPlanForOptimization: original,
        optimizationStatus: 'adopted',
        optimizationGoal: 'maxMoney',
      });

      expect(status.kind).toBe('adopted_manually_changed');
      expect(status.message).toContain('noch angepasst');
      expect(status.hint).toContain('nicht mehr unverändert aktiv');
    });
  });

  describe('4. Veraltete Optimierung (stale)', () => {
    it('zeigt optimization_stale wenn optimizationGoal gesetzt und plan !== originalPlanForOptimization ohne Adoption', () => {
      const original = createPlan();
      setMonth(original, 0, 1, 'basis');
      setMonth(original, 0, 2, 'basis');
      const differentPlan = duplicatePlan(original);
      setMonth(differentPlan, 0, 3, 'basis');

      const result = calculatePlan(differentPlan);
      const status = getAdoptionStatus(differentPlan, result, {
        originalPlanForOptimization: original,
        optimizationStatus: 'proposed',
        optimizationGoal: 'maxMoney',
      });

      expect(status.kind).toBe('optimization_stale');
      expect(status.message).toContain('nicht mehr vollständig');
      expect(status.hint).toContain('noch einmal');
    });
  });

  describe('5. Display-Kategorien (max. 3 + Ausnahme)', () => {
    it('adopted_active → displayCategory aktiv', () => {
      const plan = createPlan();
      setMonth(plan, 0, 1, 'basis');
      const result = calculatePlan(plan);
      const status = getAdoptionStatus(plan, result, {
        lastAdoptedPlan: plan,
        lastAdoptedResult: result,
        optimizationStatus: 'adopted',
        optimizationGoal: 'maxMoney',
      });
      expect(status.displayCategory).toBe('aktiv');
    });

    it('adopted_manually_changed → displayCategory geändert', () => {
      const original = createPlan();
      setMonth(original, 0, 1, 'basis');
      const adopted = duplicatePlan(original);
      setMonth(adopted, 0, 2, 'basis');
      const changed = duplicatePlan(adopted);
      setMonth(changed, 0, 3, 'basis');
      const result = calculatePlan(changed);
      const status = getAdoptionStatus(changed, result, {
        lastAdoptedPlan: adopted,
        lastAdoptedResult: calculatePlan(adopted),
        optimizationStatus: 'adopted',
        optimizationGoal: 'maxMoney',
      });
      expect(status.displayCategory).toBe('geändert');
    });

    it('optimization_stale → displayCategory nicht mehr aktuell', () => {
      const original = createPlan();
      setMonth(original, 0, 1, 'basis');
      const different = duplicatePlan(original);
      setMonth(different, 0, 2, 'basis');
      const result = calculatePlan(different);
      const status = getAdoptionStatus(different, result, {
        originalPlanForOptimization: original,
        optimizationStatus: 'proposed',
        optimizationGoal: 'maxMoney',
      });
      expect(status.displayCategory).toBe('nicht mehr aktuell');
    });

    it('selected_not_adopted → displayCategory noch nicht übernommen', () => {
      const plan = createPlan();
      setMonth(plan, 0, 1, 'basis');
      const result = calculatePlan(plan);
      const status = getAdoptionStatus(plan, result, {
        originalPlanForOptimization: plan,
        optimizationStatus: 'proposed',
        optimizationGoal: 'maxMoney',
      });
      expect(status.displayCategory).toBe('noch nicht übernommen');
    });

    it('keine widersprüchlichen displayCategory-Zustände', () => {
      const plan = createPlan();
      setMonth(plan, 0, 1, 'basis');
      const result = calculatePlan(plan);
      const status = getAdoptionStatus(plan, result, {
        lastAdoptedPlan: plan,
        lastAdoptedResult: result,
        optimizationStatus: 'adopted',
      });
      expect(['aktiv', 'geändert', 'nicht mehr aktuell', 'noch nicht übernommen', null]).toContain(status.displayCategory);
      expect(status.kind === 'adopted_active').toBe(status.displayCategory === 'aktiv');
    });
  });

  describe('6. Baseline-/Status-Konsistenz', () => {
    it('selected_not_adopted wenn proposed und optimizationGoal gesetzt', () => {
      const plan = createPlan();
      setMonth(plan, 0, 1, 'basis');
      setMonth(plan, 0, 2, 'basis');
      const result = calculatePlan(plan);

      const status = getAdoptionStatus(plan, result, {
        originalPlanForOptimization: plan,
        optimizationStatus: 'proposed',
        optimizationGoal: 'maxMoney',
      });

      expect(status.kind).toBe('selected_not_adopted');
      expect(status.message).toContain('noch nicht übernommen');
    });

    it('idle wenn keine Optimierungskontext', () => {
      const plan = createPlan();
      setMonth(plan, 0, 1, 'basis');
      const result = calculatePlan(plan);

      const status = getAdoptionStatus(plan, result, {});

      expect(status.kind).toBe('idle');
      expect(status.message).toBe('');
    });
  });
});
