/**
 * Persistenz für den Elterngeld-Berechnungsstand.
 * Nutzt das bestehende getValue/setValue-Muster der App.
 */

import { clearItems, getValue, setValue } from '../../../../shared/lib/storage';
import type { ElterngeldCalculationPlan, CalculationParentInput, ParentMonthInput } from '../calculation';
import type { MonthMode } from '../calculation';

/** Vergleicht zwei Pläne anhand relevanter Felder. Gibt true zurück, wenn sie inhaltlich gleich sind. */
export function plansAreEqual(a: ElterngeldCalculationPlan, b: ElterngeldCalculationPlan): boolean {
  if (a.childBirthDate !== b.childBirthDate) return false;
  if (a.hasSiblingBonus !== b.hasSiblingBonus) return false;
  if (a.additionalChildren !== b.additionalChildren) return false;
  if (a.parents.length !== b.parents.length) return false;
  for (let i = 0; i < a.parents.length; i++) {
    const pa = a.parents[i];
    const pb = b.parents[i];
    if (pa.id !== pb.id || pa.label !== pb.label || pa.incomeBeforeNet !== pb.incomeBeforeNet) return false;
    if (pa.months.length !== pb.months.length) return false;
    for (let j = 0; j < pa.months.length; j++) {
      const ma = pa.months[j];
      const mb = pb.months[j];
      if (ma.month !== mb.month || ma.mode !== mb.mode || ma.incomeDuringNet !== mb.incomeDuringNet || ma.hoursPerWeek !== mb.hoursPerWeek || ma.hasMaternityBenefit !== mb.hasMaternityBenefit) return false;
    }
  }
  return true;
}

const STORAGE_KEY = 'elterngeld.calculationPlan.v1';
const VARIANT_B_STORAGE_KEY = 'elterngeld.calculationPlan.variantB.v1';

const VALID_MODES: MonthMode[] = ['none', 'basis', 'plus', 'partnerBonus'];
/** Erwartete Monatsanzahl (Lebensmonate 1–14). Fehlende Monate werden mit mode 'none' ergänzt. */
const EXPECTED_MONTH_COUNT = 14;

function isValidMode(v: unknown): v is MonthMode {
  return typeof v === 'string' && VALID_MODES.includes(v as MonthMode);
}

function normalizeMonth(raw: unknown): ParentMonthInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const month = typeof o.month === 'number' ? o.month : parseInt(String(o.month), 10);
  if (Number.isNaN(month) || month < 1 || month > 36) return null;
  const mode = isValidMode(o.mode) ? o.mode : 'none';
  return {
    month,
    mode,
    incomeDuringNet: typeof o.incomeDuringNet === 'number' ? o.incomeDuringNet : 0,
    hoursPerWeek: typeof o.hoursPerWeek === 'number' ? o.hoursPerWeek : undefined,
    ...(o.hasMaternityBenefit === true && { hasMaternityBenefit: true }),
  };
}

function normalizeParent(raw: unknown): CalculationParentInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id : 'parent';
  const rawLabel = typeof o.label === 'string' ? o.label : '';
  const label =
    rawLabel === 'Elternteil A'
      ? 'Sie'
      : rawLabel === 'Elternteil B'
        ? 'Partner'
        : rawLabel || (id === 'parentB' ? 'Partner' : 'Sie');
  const monthsRaw = Array.isArray(o.months) ? o.months : [];
  const normalized = monthsRaw
    .map(normalizeMonth)
    .filter((m): m is ParentMonthInput => m !== null)
    .sort((a, b) => a.month - b.month);
  const byMonth = new Map(normalized.map((m) => [m.month, m]));
  const months: ParentMonthInput[] = [];
  for (let m = 1; m <= EXPECTED_MONTH_COUNT; m++) {
    const existing = byMonth.get(m);
    months.push(
      existing ?? {
        month: m,
        mode: 'none' as MonthMode,
        incomeDuringNet: 0,
      }
    );
  }
  return {
    id,
    label,
    incomeBeforeNet: typeof o.incomeBeforeNet === 'number' ? o.incomeBeforeNet : 0,
    months,
  };
}

/**
 * Validiert und normalisiert gespeicherte Daten.
 * Gibt null zurück, wenn die Struktur ungültig ist.
 */
export function normalizeStoredPlan(raw: unknown): ElterngeldCalculationPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  const childBirthDate = typeof o.childBirthDate === 'string' ? o.childBirthDate : '';
  const parentsRaw = Array.isArray(o.parents) ? o.parents : [];
  const parents = parentsRaw
    .map(normalizeParent)
    .filter((p): p is CalculationParentInput => p !== null);

  if (parents.length === 0) return null;

  return {
    childBirthDate,
    parents,
    hasSiblingBonus: Boolean(o.hasSiblingBonus),
    additionalChildren: typeof o.additionalChildren === 'number' ? Math.max(0, o.additionalChildren) : 0,
  };
}

/** Prüft, ob der Plan als „leer“ gilt und nicht persistiert werden sollte. */
export function isPlanEmpty(plan: ElterngeldCalculationPlan): boolean {
  if (plan.childBirthDate?.trim()) return false;
  if (plan.hasSiblingBonus) return false;
  if (plan.additionalChildren > 0) return false;
  return plan.parents.every(
    (p) =>
      p.incomeBeforeNet <= 0 &&
      p.months.every((m) => m.mode === 'none')
  );
}

export function loadCalculationPlan(): ElterngeldCalculationPlan | null {
  try {
    const raw = getValue<unknown>(STORAGE_KEY);
    return normalizeStoredPlan(raw);
  } catch {
    return null;
  }
}

export function saveCalculationPlan(plan: ElterngeldCalculationPlan): void {
  if (isPlanEmpty(plan)) return;
  try {
    setValue(STORAGE_KEY, plan);
  } catch {
    /* noop */
  }
}

export function clearCalculationPlan(): void {
  try {
    clearItems(STORAGE_KEY);
  } catch {
    /* noop */
  }
}

/** Lädt die alternative Variante B (falls vorhanden). */
export function loadVariantBPlan(): ElterngeldCalculationPlan | null {
  try {
    const raw = getValue<unknown>(VARIANT_B_STORAGE_KEY);
    return normalizeStoredPlan(raw);
  } catch {
    return null;
  }
}

/** Speichert die alternative Variante B. */
export function saveVariantBPlan(plan: ElterngeldCalculationPlan): void {
  if (isPlanEmpty(plan)) return;
  try {
    setValue(VARIANT_B_STORAGE_KEY, plan);
  } catch {
    /* noop */
  }
}

/** Löscht die alternative Variante B. */
export function clearVariantBPlan(): void {
  try {
    clearItems(VARIANT_B_STORAGE_KEY);
  } catch {
    /* noop */
  }
}
