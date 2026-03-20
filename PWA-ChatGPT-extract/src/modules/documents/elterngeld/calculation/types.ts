/**
 * Datenmodell für die Elterngeld-Berechnung (unverbindliche Schätzung).
 * Erweitert die Vorbereitungsdaten um monatsspezifische Eingaben.
 */

/** Bezugsmodus pro Lebensmonat */
export type MonthMode = 'none' | 'basis' | 'plus' | 'partnerBonus';

/** Ein Monat im Plan eines Elternteils */
export interface ParentMonthInput {
  /** Lebensmonat des Kindes (1–14 typisch) */
  month: number;
  mode: MonthMode;
  /** Nettoeinkommen während des Bezugs (€/Monat) */
  incomeDuringNet: number;
  /** Wochenstunden während des Bezugs (undefined = noch nicht ausgefüllt) */
  hoursPerWeek?: number;
  /** Mutterschutzgeld in diesem Monat (optional, MVP vorbereitet) */
  hasMaternityBenefit?: boolean;
}

/** Ein Elternteil in der Berechnung */
export interface CalculationParentInput {
  id: string;
  label: string;
  /** Nettoeinkommen vor Geburt (€/Monat) – Pflicht für Berechnung */
  incomeBeforeNet: number;
  /** Beschäftigungsart (optional, für spätere Erweiterung) */
  employmentType?: 'employed' | 'self_employed' | 'mixed' | 'none';
  months: ParentMonthInput[];
}

/** Eingabe für die Gesamtberechnung */
export interface ElterngeldCalculationPlan {
  /** Geburtsdatum oder voraussichtlicher Termin (YYYY-MM-DD) */
  childBirthDate: string;
  parents: CalculationParentInput[];
  /** Geschwisterbonus (10 %, mind. 75 €) */
  hasSiblingBonus: boolean;
  /** Zusätzliche Kinder bei Mehrlingsgeburt (pro Kind +300 €) */
  additionalChildren: number;
}

/** Aufschlüsselung der Schätzung pro Monat – für „So wurde geschätzt“ */
export interface MonthlyBreakdown {
  incomeBeforeNet: number;
  incomeDuringNet: number;
  loss: number;
  replacementRatePercent: number;
  baseAmount: number;
  siblingBonus?: number;
  additionalChildrenAmount?: number;
  appliedMin?: number;
  appliedMax?: number;
  /** ElterngeldPlus: theoretisches Basis ohne Einkommen (geclampt) */
  theoreticalBaseClamp?: number;
  /** ElterngeldPlus: max. Plus-Betrag (Hälfte von theoreticalBaseClamp) */
  maxPlus?: number;
  /** Mutterschutz / Mutterschaftsleistungen – Schätzung vereinfacht */
  hasMaternityBenefit?: boolean;
}

/** Ergebnis eines einzelnen Monats */
export interface MonthlyResult {
  month: number;
  mode: MonthMode;
  amount: number;
  warnings: string[];
  /** Aufschlüsselung für verständliche Darstellung (nur bei mode !== 'none') */
  breakdown?: MonthlyBreakdown;
  /** Mutterschutz / Mutterschaftsleistungen in diesem Monat (Mutter, MVP) */
  hasMaternityBenefit?: boolean;
}

/** Ergebnis je Elternteil */
export interface ParentCalculationResult {
  id: string;
  label: string;
  monthlyResults: MonthlyResult[];
  total: number;
  warnings: string[];
}

/** Gesamtergebnis der Berechnung */
export interface CalculationResult {
  parents: ParentCalculationResult[];
  householdTotal: number;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  meta: {
    isEstimate: true;
    disclaimer: string;
  };
}
