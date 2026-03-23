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

/** Parst Monatsanzahl. Erlaubt 0–36, keine harte Kürzung. */
function parseMonthCount(value: string): number {
  const n = parseInt(String(value || ''), 10);
  return Number.isNaN(n) ? 0 : Math.max(0, Math.min(36, n));
}

/** Max. sinnvoll initial belegbare Monate je Modell (Basis max 14, Plus/PartnerBonus bis 24). */
const MAX_BELEGUNG_BASIS = 14;
const MAX_BELEGUNG_PLUS = 24;
const MIN_HORIZONT = 14;
const MAX_HORIZONT = 36;

/** Erstellt Monate für einen Elternteil. Planungshorizont = eingegebene Monate, überschüssige auf 'none'. */
function createMonths(
  count: number,
  mode: MonthMode,
  benefitModel: string,
  hoursPerWeek?: number
): ParentMonthInput[] {
  const maxBelegung = benefitModel === 'plus' || benefitModel === 'partnerBonus' ? MAX_BELEGUNG_PLUS : MAX_BELEGUNG_BASIS;
  const horizon = Math.max(MIN_HORIZONT, Math.min(count, MAX_HORIZONT));
  const belegteMonate = Math.min(count, maxBelegung);

  const months: ParentMonthInput[] = [];
  for (let m = 1; m <= horizon; m++) {
    const useMode = m <= belegteMonate ? mode : 'none';
    const base: ParentMonthInput = { month: m, mode: useMode, incomeDuringNet: 0 };
    months.push(
      hoursPerWeek != null && hoursPerWeek > 0 ? { ...base, hoursPerWeek } : base
    );
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

/** Ergänzt Monate auf den gemeinsamen Planungshorizont (beide Eltern gleiche Monatsanzahl). */
function ensureSharedHorizon(
  months: ParentMonthInput[],
  targetHorizon: number
): ParentMonthInput[] {
  const byMonth = new Map(months.map((m) => [m.month, m]));
  const result: ParentMonthInput[] = [];
  for (let m = 1; m <= targetHorizon; m++) {
    const existing = byMonth.get(m);
    result.push(
      existing ?? {
        month: m,
        mode: 'none' as MonthMode,
        incomeDuringNet: 0,
      }
    );
  }
  return result;
}

/** Erstellt ParentMonthInput-Arrays aus konkreter Monatsverteilung. */
function createMonthsFromDistribution(
  distribution: { month: number; modeA: string; modeB: string }[],
  hasSecondParent: boolean,
  hoursA?: number,
  hoursB?: number
): { parentAMonths: ParentMonthInput[]; parentBMonths: ParentMonthInput[] } {
  const parentAMonths: ParentMonthInput[] = distribution.map((d) => ({
    month: d.month,
    mode: (d.modeA === 'none' || d.modeA === 'basis' || d.modeA === 'plus' || d.modeA === 'partnerBonus' ? d.modeA : 'none') as MonthMode,
    incomeDuringNet: 0,
    ...(hoursA != null && hoursA > 0 && d.modeA !== 'none' && { hoursPerWeek: hoursA }),
  }));
  const parentBMonths: ParentMonthInput[] = distribution.map((d) => ({
    month: d.month,
    mode: hasSecondParent && (d.modeB === 'none' || d.modeB === 'basis' || d.modeB === 'plus' || d.modeB === 'partnerBonus')
      ? (d.modeB as MonthMode)
      : ('none' as MonthMode),
    incomeDuringNet: 0,
    ...(hoursB != null && hoursB > 0 && d.modeB !== 'none' && { hoursPerWeek: hoursB }),
  }));
  return { parentAMonths, parentBMonths };
}

export function applicationToCalculationPlan(app: ElterngeldApplication): ElterngeldCalculationPlan {
  const hasActualBirthDate = !!app.child.birthDate?.trim();
  const childBirthDate =
    app.child.birthDate?.trim() || app.child.expectedBirthDate?.trim() || '';
  const model = app.benefitPlan.model;
  const defaultMode = getDefaultMode(model);
  const hasSecondParent = app.applicantMode === 'both_parents' && app.parentB != null;

  const dist = app.benefitPlan.concreteMonthDistribution;
  if (dist && dist.length > 0) {
    const hoursA = app.parentA.plannedPartTime ? app.parentA.hoursPerWeek : undefined;
    const hoursB = app.parentB?.plannedPartTime ? app.parentB.hoursPerWeek : undefined;
    const { parentAMonths: rawAMonths, parentBMonths: rawBMonths } = createMonthsFromDistribution(
      dist,
      hasSecondParent,
      hoursA,
      hoursB
    );
    let parentAMonths = rawAMonths;
    if (hasActualBirthDate) {
      parentAMonths = parentAMonths.map((m) =>
        m.month <= MATERNITY_MONTHS_COUNT ? { ...m, hasMaternityBenefit: true } : m
      );
    }
    const sharedHorizon = Math.max(
      parentAMonths.length,
      rawBMonths.length,
      MIN_HORIZONT
    );
    parentAMonths = ensureSharedHorizon(parentAMonths, sharedHorizon);
    const parentBMonths = ensureSharedHorizon(rawBMonths, sharedHorizon);

    const parentA: CalculationParentInput = {
      id: 'parentA',
      label: 'Sie',
      incomeBeforeNet: parseIncome(app.parentA.incomeBeforeBirth),
      employmentType: app.parentA.employmentType,
      months: parentAMonths,
    };
    const parents: CalculationParentInput[] = [parentA];
    if (hasSecondParent && app.parentB) {
      parents.push({
        id: 'parentB',
        label: 'Partner',
        incomeBeforeNet: parseIncome(app.parentB.incomeBeforeBirth),
        employmentType: app.parentB.employmentType,
        months: parentBMonths,
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

  const countA = parseMonthCount(app.benefitPlan.parentAMonths);
  const countB = hasSecondParent ? parseMonthCount(app.benefitPlan.parentBMonths) : 0;

  let parentAMonths = createMonths(
    countA,
    defaultMode,
    model,
    app.parentA.plannedPartTime ? app.parentA.hoursPerWeek : undefined
  );

  if (hasActualBirthDate) {
    parentAMonths = parentAMonths.map((m) =>
      m.month <= MATERNITY_MONTHS_COUNT ? { ...m, hasMaternityBenefit: true } : m
    );
  }

  const sharedHorizon = Math.max(
    parentAMonths.length,
    countB > 0 ? Math.max(MIN_HORIZONT, Math.min(countB, MAX_HORIZONT)) : 0,
    MIN_HORIZONT
  );

  parentAMonths = ensureSharedHorizon(parentAMonths, sharedHorizon);

  const parentA: CalculationParentInput = {
    id: 'parentA',
    label: 'Sie',
    incomeBeforeNet: parseIncome(app.parentA.incomeBeforeBirth),
    employmentType: app.parentA.employmentType,
    months: parentAMonths,
  };

  const parents: CalculationParentInput[] = [parentA];

  if (hasSecondParent && app.parentB) {
    const partnerMode = app.benefitPlan.partnershipBonus ? 'partnerBonus' : defaultMode;
    const hoursB = app.parentB.plannedPartTime ? app.parentB.hoursPerWeek : undefined;
    let parentBMonths = createMonths(countB, partnerMode, model, hoursB);
    parentBMonths = ensureSharedHorizon(parentBMonths, sharedHorizon);
    parents.push({
      id: 'parentB',
      label: 'Partner',
      incomeBeforeNet: parseIncome(app.parentB.incomeBeforeBirth),
      employmentType: app.parentB.employmentType,
      months: parentBMonths,
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
