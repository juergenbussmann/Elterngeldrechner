/**
 * Kanonisches Dokumentenmodell für Elterngeld-Ausgaben (UI, PDF).
 * Alle Inhalte leiten sich aus ElterngeldApplication und optional bestehendem
 * calculatePlan-Ergebnis ab — keine eigene Berechnungslogik.
 */

import type { ElterngeldApplication } from '../types/elterngeldTypes';
import { applicationToCalculationPlan } from '../applicationToCalculationPlan';
import { calculatePlan, type CalculationResult } from '../calculation';
import { GERMAN_STATES } from '../stateConfig';
import { getElterngeldDeadlineInfo, type ElterngeldDeadlineInfo } from '../elterngeldDeadlines';

/** Gemeinsame Basis-Checkliste für alle Bundesländer (eine Quelle für UI + PDF). */
export const ELTERNGELD_BASE_DOCUMENT_CHECKLIST: readonly string[] = [
  'Geburtsurkunde',
  'Einkommensnachweise',
  'Arbeitgeberbescheinigung',
  'Steuer-ID',
  'Bankverbindung',
] as const;

export interface ElterngeldDocumentCalculationSnapshot {
  householdTotal: number;
  parentTotals: { label: string; total: number }[];
  validationHasErrors: boolean;
}

export interface ElterngeldDocumentModel {
  stateCode: string;
  stateDisplayName: string;
  applicantMode: ElterngeldApplication['applicantMode'];
  parentA: ElterngeldApplication['parentA'];
  parentB: ElterngeldApplication['parentB'];
  child: ElterngeldApplication['child'];
  benefitPlan: ElterngeldApplication['benefitPlan'];
  deadlines: ElterngeldDeadlineInfo;
  /** Basis + bundeslandspezifische Ergänzungen aus StateConfig, ohne Duplikate. */
  checklistItems: string[];
  /** Konfigurierte optionale Ausgabearten (z. B. spätere Formular-Typen), nur Metadaten. */
  documentOutputKinds: string[];
  /** Freitext aus StateConfig.notes, falls gesetzt. */
  stateNotes: string | undefined;
  calculation: ElterngeldDocumentCalculationSnapshot | null;
}

function mergeChecklistItems(
  base: readonly string[],
  extras: string[] | undefined
): string[] {
  const out = [...base];
  if (!extras?.length) return out;
  for (const x of extras) {
    if (x && !out.includes(x)) out.push(x);
  }
  return out;
}

function resolveCalculationResult(
  values: ElterngeldApplication,
  liveResult?: CalculationResult | null
): CalculationResult | null {
  if (liveResult != null) return liveResult;
  const birthDate = values.child.birthDate?.trim() || values.child.expectedBirthDate?.trim();
  if (!birthDate) return null;
  try {
    const plan = applicationToCalculationPlan(values);
    return calculatePlan(plan);
  } catch {
    return null;
  }
}

function buildCalculationSnapshot(result: CalculationResult): ElterngeldDocumentCalculationSnapshot {
  return {
    householdTotal: result.householdTotal,
    parentTotals: result.parents.map((p) => ({ label: p.label, total: p.total })),
    validationHasErrors: result.validation.errors.length > 0,
  };
}

export function buildElterngeldDocumentModel(
  values: ElterngeldApplication,
  liveResult?: CalculationResult | null
): ElterngeldDocumentModel {
  const stateEntry = values.state?.trim()
    ? GERMAN_STATES.find((s) => s.stateCode === values.state)
    : undefined;
  const stateDisplayName = stateEntry?.displayName || values.state?.trim() || '–';
  const extras = stateEntry?.additionalDocumentHints;
  const checklistItems = mergeChecklistItems(ELTERNGELD_BASE_DOCUMENT_CHECKLIST, extras);
  const documentOutputKinds = stateEntry?.documentOutputKinds ?? [];

  const resolved = resolveCalculationResult(values, liveResult);
  const calculation =
    resolved && !resolved.validation.errors.length ? buildCalculationSnapshot(resolved) : null;

  return {
    stateCode: values.state ?? '',
    stateDisplayName,
    applicantMode: values.applicantMode,
    parentA: values.parentA,
    parentB: values.parentB,
    child: values.child,
    benefitPlan: values.benefitPlan,
    deadlines: getElterngeldDeadlineInfo(values),
    checklistItems,
    documentOutputKinds,
    stateNotes: stateEntry?.notes,
    calculation,
  };
}
