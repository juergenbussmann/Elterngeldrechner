/**
 * Datenmodell für den Elterngeld-Vorbereitungsassistenten.
 */

export type EmploymentType = 'employed' | 'self_employed' | 'mixed' | 'none';

export type BenefitModel = 'basis' | 'plus' | 'mixed';

export type FamilyConstellation = 'single' | 'couple' | 'other';

/** Wer beantragt Elterngeld? */
export type ApplicantMode = 'single_applicant' | 'both_parents' | 'single_parent';

export interface ElterngeldChild {
  birthDate: string;
  expectedBirthDate: string;
  multipleBirth: boolean;
}

export interface ElterngeldParent {
  firstName: string;
  lastName: string;
  employmentType: EmploymentType;
  incomeBeforeBirth: string;
  plannedPartTime: boolean;
  /** Geplante Wochenstunden nach Geburt (nur relevant bei plannedPartTime) */
  hoursPerWeek?: number;
}

/** Pro-Monat-Modus für konkrete Verteilung (aus übernommener Variante). */
export type MonthModeForDistribution = 'none' | 'basis' | 'plus' | 'partnerBonus';

/** Optimierungsziele, für die nach Übernahme einer Variante keine striktere Verbesserung mehr vorgeschlagen wird. */
export type OptimizationAdoptableGoal = 'maxMoney' | 'longerDuration' | 'frontLoad' | 'partnerBonus';

/**
 * Nach Übernahme: pro Ziel ein Score aus dem damaligen CalculationResult (keine eigene Neubewertung).
 * Filter in buildOptimizationResult: Kandidaten, die diesen Score für dasselbe Ziel übertreffen, werden ausgeblendet.
 */
export type OptimizationAdoptedBaselineGoals = Partial<Record<OptimizationAdoptableGoal, { score: number }>>;

/** Konkrete Monatsverteilung pro Lebensmonat (überschreibt Count-Logik wenn gesetzt). */
export interface MonthDistributionEntry {
  month: number;
  modeA: MonthModeForDistribution;
  modeB: MonthModeForDistribution;
}

export interface ElterngeldBenefitPlan {
  model: BenefitModel;
  parentAMonths: string;
  parentBMonths: string;
  partnershipBonus: boolean;
  /** Optionale konkrete Verteilung aus übernommener Variante. Hat Vorrang vor Count-Logik. */
  concreteMonthDistribution?: MonthDistributionEntry[];
  /**
   * Nach „Variante übernehmen“: pro Ziel der akzeptierte Score (aus dem angezeigten Ergebnis).
   * Legacy: früher string[] — wird beim Lesen ignoriert.
   */
  optimizationAdoptedBaselineGoals?: OptimizationAdoptedBaselineGoals | OptimizationAdoptableGoal[];
}

export interface ElterngeldApplication {
  state: string;
  applicantMode: ApplicantMode;
  child: ElterngeldChild;
  parentA: ElterngeldParent;
  parentB: ElterngeldParent | null;
  benefitPlan: ElterngeldBenefitPlan;
}

export const EMPTY_ELTERNGELD_PARENT: ElterngeldParent = {
  firstName: '',
  lastName: '',
  employmentType: 'employed',
  incomeBeforeBirth: '',
  plannedPartTime: false,
};

export const INITIAL_ELTERNGELD_APPLICATION: ElterngeldApplication = {
  state: '',
  applicantMode: 'single_applicant',
  child: {
    birthDate: '',
    expectedBirthDate: '',
    multipleBirth: false,
  },
  parentA: {
    firstName: '',
    lastName: '',
    employmentType: 'employed',
    incomeBeforeBirth: '',
    plannedPartTime: false,
  },
  parentB: null,
  benefitPlan: {
    model: 'basis',
    parentAMonths: '',
    parentBMonths: '',
    partnershipBonus: false,
  },
};
