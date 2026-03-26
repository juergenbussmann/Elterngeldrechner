/**
 * Kanonisches Dokumentenmodell für Elterngeld-Ausgaben (UI, PDF).
 * Alle Inhalte leiten sich aus ElterngeldApplication und optional bestehendem
 * calculatePlan-Ergebnis ab — keine eigene Berechnungslogik.
 */

import type { ElterngeldApplication, MonthDistributionEntry } from '../types/elterngeldTypes';
import { resolveDocumentMonthDistribution } from '../monthGridMappings';
import { applicationToCalculationPlan } from '../applicationToCalculationPlan';
import { calculatePlan, type CalculationResult } from '../calculation';
import { resolveBundeslandForDocuments } from '../bundesland/elterngeldBundeslandRegistry';
import type { BundeslandTier } from '../bundesland/bundeslandTypes';
import { getElterngeldDeadlineInfo, type ElterngeldDeadlineInfo } from '../elterngeldDeadlines';
import { buildElterngeldFormSectionA } from './buildElterngeldFormSections';
import type { ElterngeldDocumentFormSection } from './elterngeldDocumentFormTypes';

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
  isKnownBundesland: boolean;
  bundeslandTier: BundeslandTier;
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
  /** Aufgelöste Monatsverteilung für Ausfüllhilfe und PDFs (inkl. Fallback aus Berechnung oder Count-Logik). */
  documentMonthDistribution: MonthDistributionEntry[];
  /**
   * Aus vorhandenen App-Daten aufgelöste Formular-Abschnitte (nur Labels + Werte).
   * Keine zusätzlichen fachlichen Felder.
   */
  formSections: ElterngeldDocumentFormSection[];
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
  const bl = resolveBundeslandForDocuments(values.state);
  const checklistItems = mergeChecklistItems(
    ELTERNGELD_BASE_DOCUMENT_CHECKLIST,
    bl.additionalDocumentHints ? [...bl.additionalDocumentHints] : undefined
  );
  const documentOutputKinds = [...bl.documentOutputKinds];

  const resolved = resolveCalculationResult(values, liveResult);
  const calculation =
    resolved && !resolved.validation.errors.length ? buildCalculationSnapshot(resolved) : null;
  const maxMonths = values.benefitPlan.model === 'plus' ? 24 : 14;
  const documentMonthDistribution = resolveDocumentMonthDistribution(values, resolved, maxMonths);
  const formSections: ElterngeldDocumentFormSection[] = [buildElterngeldFormSectionA(values, bl)];

  return {
    stateCode: bl.stateCode,
    stateDisplayName: bl.displayName,
    isKnownBundesland: bl.isKnownBundesland,
    bundeslandTier: bl.tier,
    applicantMode: values.applicantMode,
    parentA: values.parentA,
    parentB: values.parentB,
    child: values.child,
    benefitPlan: values.benefitPlan,
    deadlines: getElterngeldDeadlineInfo(values),
    checklistItems,
    documentOutputKinds,
    stateNotes: bl.stateNotes,
    calculation,
    documentMonthDistribution,
    formSections,
  };
}
