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

export interface ElterngeldBenefitPlan {
  model: BenefitModel;
  parentAMonths: string;
  parentBMonths: string;
  partnershipBonus: boolean;
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
