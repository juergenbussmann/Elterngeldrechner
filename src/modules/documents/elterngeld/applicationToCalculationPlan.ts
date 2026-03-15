/**
 * Konvertiert ElterngeldApplication (Vorbereitung) zu ElterngeldCalculationPlan (Berechnung).
 */

import type { ElterngeldApplication } from './types/elterngeldTypes';
import type {
  ElterngeldCalculationPlan,
  CalculationParentInput,
  ParentMonthInput,
  MonthMode,
} from './calculation';

function parseIncome(value: string): number {
  const n = parseFloat(String(value || '').replace(',', '.').replace(/\s/g, ''));
  return Number.isNaN(n) ? 0 : Math.max(0, n);
}

function parseMonthCount(value: string): number {
  const n = parseInt(String(value || ''), 10);
  return Number.isNaN(n) ? 0 : Math.max(0, Math.min(14, n));
}

/** Erstellt leere Monate für einen Elternteil. */
function createMonths(
  count: number,
  mode: MonthMode,
  benefitModel: string
): ParentMonthInput[] {
  const months: ParentMonthInput[] = [];
  for (let m = 1; m <= 14; m++) {
    const useMode = m <= count ? mode : 'none';
    months.push({
      month: m,
      mode: useMode,
      incomeDuringNet: 0,
    });
  }
  return months;
}

/**
 * Mappt benefitPlan.model und Monatsanzahl auf Bezugsmodus.
 * basis → basis, plus → plus, mixed → basis (vereinfacht)
 */
function getDefaultMode(model: string): MonthMode {
  if (model === 'plus') return 'plus';
  if (model === 'partnerBonus') return 'partnerBonus';
  return 'basis';
}

/** Erste N Lebensmonate der Mutter als Mutterschutz/Mutterschaftsleistungen (MVP) */
const MATERNITY_MONTHS_COUNT = 2;

export function applicationToCalculationPlan(app: ElterngeldApplication): ElterngeldCalculationPlan {
  const hasActualBirthDate = !!app.child.birthDate?.trim();
  const childBirthDate =
    app.child.birthDate?.trim() || app.child.expectedBirthDate?.trim() || '';
  const model = app.benefitPlan.model;
  const defaultMode = getDefaultMode(model);

  let parentAMonths = createMonths(
    parseMonthCount(app.benefitPlan.parentAMonths),
    defaultMode,
    model
  );

  if (hasActualBirthDate) {
    parentAMonths = parentAMonths.map((m) =>
      m.month <= MATERNITY_MONTHS_COUNT ? { ...m, hasMaternityBenefit: true } : m
    );
  }

  const parentA: CalculationParentInput = {
    id: 'parentA',
    label: 'Sie',
    incomeBeforeNet: parseIncome(app.parentA.incomeBeforeBirth),
    employmentType: app.parentA.employmentType,
    months: parentAMonths,
  };

  const parents: CalculationParentInput[] = [parentA];

  const hasSecondParent =
    app.applicantMode === 'both_parents' && app.parentB != null;

  if (hasSecondParent && app.parentB) {
    const partnerMode = app.benefitPlan.partnershipBonus ? 'partnerBonus' : defaultMode;
    parents.push({
      id: 'parentB',
      label: 'Partner',
      incomeBeforeNet: parseIncome(app.parentB.incomeBeforeBirth),
      employmentType: app.parentB.employmentType,
      months: createMonths(
        parseMonthCount(app.benefitPlan.parentBMonths),
        partnerMode,
        model
      ),
    });
  } else {
    parents.push({
      id: 'parentB',
      label: 'Partner',
      incomeBeforeNet: 0,
      months: createMonths(0, 'none', model),
    });
  }

  return {
    childBirthDate,
    parents,
    hasSiblingBonus: false,
    additionalChildren: app.child.multipleBirth ? 1 : 0,
  };
}
