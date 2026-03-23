/**
 * Persistenz für den Elterngeld-Vorbereitungsstand.
 * Nutzt das bestehende getValue/setValue-Muster der App.
 */

import { clearItems, getValue, setValue } from '../../../../shared/lib/storage';
import type { ElterngeldApplication, MonthDistributionEntry } from '../types/elterngeldTypes';
import { INITIAL_ELTERNGELD_APPLICATION, EMPTY_ELTERNGELD_PARENT } from '../types/elterngeldTypes';

const STORAGE_KEY = 'elterngeld.preparation.v1';

/** Prüft, ob die Vorbereitung sinnvolle Nutzerdaten enthält. */
export function isPreparationEmpty(values: ElterngeldApplication): boolean {
  const def = INITIAL_ELTERNGELD_APPLICATION;
  if (values.state?.trim()) return false;
  if (values.child.birthDate?.trim() || values.child.expectedBirthDate?.trim()) return false;
  if (values.child.multipleBirth) return false;
  if (values.applicantMode !== def.applicantMode) return false;
  if (values.parentA.firstName?.trim() || values.parentA.lastName?.trim()) return false;
  if (values.parentA.incomeBeforeBirth?.trim()) return false;
  if (values.parentA.employmentType !== def.parentA.employmentType) return false;
  if (values.parentA.plannedPartTime) return false;
  if (values.parentB) {
    if (values.parentB.firstName?.trim() || values.parentB.lastName?.trim()) return false;
    if (values.parentB.incomeBeforeBirth?.trim()) return false;
  }
  if (values.benefitPlan.model !== def.benefitPlan.model) return false;
  if (values.benefitPlan.parentAMonths?.trim() || values.benefitPlan.parentBMonths?.trim()) return false;
  if (values.benefitPlan.partnershipBonus) return false;
  return true;
}

function normalizeString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function normalizeBoolean(v: unknown): boolean {
  return Boolean(v);
}

function normalizeHoursPerWeek(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isNaN(n) || n < 0 ? undefined : n;
}

function normalizeParent(raw: unknown): ElterngeldApplication['parentA'] | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const validEmployment = ['employed', 'self_employed', 'mixed', 'none'].includes(String(o.employmentType ?? ''));
  return {
    firstName: normalizeString(o.firstName ?? ''),
    lastName: normalizeString(o.lastName ?? ''),
    employmentType: validEmployment ? (o.employmentType as ElterngeldApplication['parentA']['employmentType']) : 'employed',
    incomeBeforeBirth: normalizeString(o.incomeBeforeBirth ?? ''),
    plannedPartTime: normalizeBoolean(o.plannedPartTime),
    hoursPerWeek: normalizeHoursPerWeek(o.hoursPerWeek),
  };
}

function isValidMode(v: unknown): v is MonthDistributionEntry['modeA'] {
  return v === 'none' || v === 'basis' || v === 'plus' || v === 'partnerBonus';
}

function normalizeMonthDistributionEntry(raw: unknown): MonthDistributionEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const month = typeof o.month === 'number' ? o.month : parseInt(String(o.month ?? 0), 10);
  if (Number.isNaN(month) || month < 1 || month > 36) return null;
  const modeA = isValidMode(o.modeA) ? o.modeA : 'none';
  const modeB = isValidMode(o.modeB) ? o.modeB : 'none';
  return { month, modeA, modeB };
}

function normalizeBenefitPlan(raw: unknown): ElterngeldApplication['benefitPlan'] {
  if (!raw || typeof raw !== 'object') {
    return INITIAL_ELTERNGELD_APPLICATION.benefitPlan;
  }
  const o = raw as Record<string, unknown>;
  const validModel = ['basis', 'plus', 'mixed'].includes(String(o.model ?? ''));
  const distRaw = Array.isArray(o.concreteMonthDistribution) ? o.concreteMonthDistribution : [];
  const concreteMonthDistribution = distRaw
    .map(normalizeMonthDistributionEntry)
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => a.month - b.month);
  return {
    model: validModel ? (o.model as ElterngeldApplication['benefitPlan']['model']) : 'basis',
    parentAMonths: normalizeString(o.parentAMonths ?? ''),
    parentBMonths: normalizeString(o.parentBMonths ?? ''),
    partnershipBonus: normalizeBoolean(o.partnershipBonus),
    ...(concreteMonthDistribution.length > 0 && { concreteMonthDistribution }),
  };
}

function normalizeChild(raw: unknown): ElterngeldApplication['child'] {
  if (!raw || typeof raw !== 'object') {
    return INITIAL_ELTERNGELD_APPLICATION.child;
  }
  const o = raw as Record<string, unknown>;
  return {
    birthDate: normalizeString(o.birthDate ?? ''),
    expectedBirthDate: normalizeString(o.expectedBirthDate ?? ''),
    multipleBirth: normalizeBoolean(o.multipleBirth),
  };
}

/** Validiert und normalisiert gespeicherte Vorbereitungsdaten. */
export function normalizeStoredPreparation(raw: unknown): ElterngeldApplication | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  const applicantMode = ['single_applicant', 'both_parents', 'single_parent'].includes(String(o.applicantMode ?? ''))
    ? (o.applicantMode as ElterngeldApplication['applicantMode'])
    : 'single_applicant';

  const parentA = normalizeParent(o.parentA);
  if (!parentA) return null;

  const parentB = applicantMode === 'single_parent' ? null : normalizeParent(o.parentB) ?? { ...EMPTY_ELTERNGELD_PARENT };

  return {
    state: normalizeString(o.state ?? ''),
    applicantMode,
    child: normalizeChild(o.child),
    parentA,
    parentB,
    benefitPlan: normalizeBenefitPlan(o.benefitPlan),
  };
}

export function loadPreparation(): ElterngeldApplication | null {
  try {
    const raw = getValue<unknown>(STORAGE_KEY);
    return normalizeStoredPreparation(raw);
  } catch {
    return null;
  }
}

export function savePreparation(values: ElterngeldApplication): void {
  if (isPreparationEmpty(values)) return;
  try {
    setValue(STORAGE_KEY, values);
  } catch {
    /* noop */
  }
}

export function clearPreparation(): void {
  try {
    clearItems(STORAGE_KEY);
  } catch {
    /* noop */
  }
}
