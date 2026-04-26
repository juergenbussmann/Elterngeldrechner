/**
 * Skalierbare Formular-Konfiguration für Elternzeit-Dokumente.
 * Dynamische Felder je nach Falltyp (requestType) und Unterfall (changeType).
 */

import type { ParentLeaveRequestType, ParentLeaveChangeType } from './parentalLeaveHelpers';
import { REQUEST_TYPE_LABELS, CHANGE_TYPE_LABELS, isFutureDate, isBefore } from './parentalLeaveHelpers';

export type FormFieldType = 'text' | 'textarea' | 'date' | 'select' | 'number';

export interface FormFieldOption {
  value: string;
  label: string;
}

export interface FormFieldConfig {
  id: string;
  type: FormFieldType;
  label: string;
  required?: boolean;
  options?: FormFieldOption[];
  hint?: string;
  placeholder?: string;
  /** Felder nur anzeigen, wenn Bedingung erfüllt */
  showWhen?: (values: ParentLeaveFormValues) => boolean;
  /** Statisches min/max für Date-Inputs */
  min?: string;
  max?: string;
  /** Dynamisches min/max (überschreibt statische Werte) */
  getMin?: (values: ParentLeaveFormValues) => string | undefined;
  getMax?: (values: ParentLeaveFormValues) => string | undefined;
}

export interface ParentLeaveFormValues {
  requestType: ParentLeaveRequestType | '';
  changeType?: ParentLeaveChangeType | '';
  name: string;
  address: string;
  postalCode: string;
  city: string;
  employer: string;
  employerAddress: string;
  childName: string;
  birthDate: string;
  expectedBirthDate: string;
  startDate: string;
  endDate: string;
  leaveDuration: string;
  createdAtPlace: string;
  createdAtDate: string;
  weeklyHours: string;
  workDistribution: string;
  /** UI: gleichmäßig vs. individuell (PDF-Text daraus; leer = wie „even“ behandeln). */
  workDistributionMode: 'even' | 'individual' | '';
  workDistributionMonday: string;
  workDistributionTuesday: string;
  workDistributionWednesday: string;
  workDistributionThursday: string;
  workDistributionFriday: string;
  optionalDesiredSchedule: string;
  optionalRemoteNote: string;
  previousStartDate: string;
  previousEndDate: string;
  newEndDate: string;
  newRequestedEndDate: string;
  reasonOptional: string;
  latePeriodExplanation: string;
  requestedLateStartDate: string;
  requestedLateEndDate: string;
}

/** Initiale leere Werte für das Formular */
export const INITIAL_FORM_VALUES: ParentLeaveFormValues = {
  requestType: '',
  changeType: '',
  name: '',
  address: '',
  postalCode: '',
  city: '',
  employer: '',
  employerAddress: '',
  childName: '',
  birthDate: '',
  expectedBirthDate: '',
  startDate: '',
  endDate: '',
  leaveDuration: '',
  createdAtPlace: '',
  createdAtDate: '',
  weeklyHours: '',
  workDistribution: '',
  workDistributionMode: 'even',
  workDistributionMonday: '',
  workDistributionTuesday: '',
  workDistributionWednesday: '',
  workDistributionThursday: '',
  workDistributionFriday: '',
  optionalDesiredSchedule: '',
  optionalRemoteNote: '',
  previousStartDate: '',
  previousEndDate: '',
  newEndDate: '',
  newRequestedEndDate: '',
  reasonOptional: '',
  latePeriodExplanation: '',
  requestedLateStartDate: '',
  requestedLateEndDate: '',
};

/** Request-Type Auswahl (für internes Mapping) */
export const REQUEST_TYPE_OPTIONS: FormFieldOption[] = (
  Object.entries(REQUEST_TYPE_LABELS) as [ParentLeaveRequestType, string][]
).map(([value, label]) => ({ value, label }));

/** Request-Type für UI: Labels + Beschreibungen (kein natives Select) */
export interface RequestTypeOption {
  value: ParentLeaveRequestType;
  label: string;
  description: string;
}

export const REQUEST_TYPE_OPTIONS_UI: RequestTypeOption[] = [
  {
    value: 'basic_leave',
    label: 'Elternzeit beantragen',
    description: 'Klassischer Antrag beim Arbeitgeber',
  },
  {
    value: 'leave_with_part_time',
    label: 'Elternzeit mit Teilzeit',
    description: 'Teilzeit während der Elternzeit beantragen',
  },
  {
    value: 'change_extend_end_early',
    label: 'Elternzeit ändern / verlängern',
    description: 'Bestehende Elternzeit anpassen',
  },
  {
    value: 'late_period',
    label: 'Elternzeit späterer Zeitraum (3–8 Jahre)',
    description: 'Für einen späteren Abschnitt der Elternzeit',
  },
];

/** Change-Type Auswahl (für change_extend_end_early) */
export const CHANGE_TYPE_OPTIONS: FormFieldOption[] = (
  Object.entries(CHANGE_TYPE_LABELS) as [ParentLeaveChangeType, string][]
).map(([value, label]) => ({ value, label }));

/** Basis-Felder, die für alle Falltypen gelten */
const BASE_FIELDS: FormFieldConfig[] = [
  {
    id: 'requestType',
    type: 'select',
    label: 'Art des Antrags',
    required: true,
    options: REQUEST_TYPE_OPTIONS,
    hint: 'Wähle die Situation, die am besten zu deinem Anliegen passt.',
  },
  {
    id: 'name',
    type: 'text',
    label: 'Name',
    required: true,
    showWhen: (v) => v.requestType !== '',
  },
  {
    id: 'address',
    type: 'text',
    label: 'Straße und Hausnummer',
    showWhen: (v) => v.requestType !== '',
  },
  {
    id: 'postalCode',
    type: 'text',
    label: 'PLZ',
    showWhen: (v) => v.requestType !== '',
  },
  {
    id: 'city',
    type: 'text',
    label: 'Ort',
    showWhen: (v) => v.requestType !== '',
  },
  {
    id: 'employer',
    type: 'text',
    label: 'Arbeitgeber',
    required: true,
    showWhen: (v) => v.requestType !== '',
  },
  {
    id: 'employerAddress',
    type: 'text',
    label: 'Adresse Arbeitgeber',
    showWhen: (v) => v.requestType !== '',
  },
  {
    id: 'childName',
    type: 'text',
    label: 'Name des Kindes',
    required: true,
    showWhen: (v) => v.requestType !== '',
  },
  {
    id: 'birthDate',
    type: 'date',
    label: 'Geburtsdatum',
    max: new Date().toISOString().slice(0, 10),
    showWhen: (v) => v.requestType !== '',
  },
  {
    id: 'expectedBirthDate',
    type: 'date',
    label: 'Voraussichtliches Geburtsdatum (wenn Kind noch nicht geboren)',
    showWhen: (v) => v.requestType !== '',
  },
  {
    id: 'startDate',
    type: 'date',
    label: 'Beginn Elternzeit',
    showWhen: (v) =>
      v.requestType === 'basic_leave' || v.requestType === 'leave_with_part_time',
  },
  {
    id: 'endDate',
    type: 'date',
    label: 'Ende Elternzeit',
    getMin: (v) => v.startDate || undefined,
    showWhen: (v) =>
      v.requestType === 'basic_leave' || v.requestType === 'leave_with_part_time',
  },
  {
    id: 'createdAtPlace',
    type: 'text',
    label: 'Ort der Ausstellung des Dokumentes',
    showWhen: (v) => v.requestType !== '',
  },
  {
    id: 'createdAtDate',
    type: 'date',
    label: 'Datum des Dokumentes',
    getMax: () => new Date().toISOString().slice(0, 10),
    showWhen: (v) => v.requestType !== '',
  },
];

/** Zusatzfelder für leave_with_part_time (Wochenstunden/Verteilung: eigener Block in ParentLeaveFormPage) */
const PART_TIME_FIELDS: FormFieldConfig[] = [
  {
    id: 'optionalDesiredSchedule',
    type: 'textarea',
    label: 'Gewünschter Zeitplan (optional)',
    showWhen: (v) => v.requestType === 'leave_with_part_time',
    placeholder: 'z. B. Mo–Do vormittags, Fr frei',
  },
];

/** Zusatzfelder für change_extend_end_early */
const CHANGE_FIELDS: FormFieldConfig[] = [
  {
    id: 'changeType',
    type: 'select',
    label: 'Art der Änderung',
    required: true,
    options: CHANGE_TYPE_OPTIONS,
    showWhen: (v) => v.requestType === 'change_extend_end_early',
  },
  {
    id: 'previousStartDate',
    type: 'date',
    label: 'Bisheriger Beginn',
    required: true,
    showWhen: (v) => v.requestType === 'change_extend_end_early',
  },
  {
    id: 'previousEndDate',
    type: 'date',
    label: 'Bisheriges Ende',
    required: true,
    getMin: (v) => v.previousStartDate || undefined,
    showWhen: (v) => v.requestType === 'change_extend_end_early',
  },
  {
    id: 'newEndDate',
    type: 'date',
    label: 'Neues Ende',
    required: true,
    getMin: (v) => {
      if (v.changeType === 'extend') return v.previousEndDate || undefined;
      if (v.changeType === 'change') return v.previousStartDate || undefined;
      return undefined;
    },
    showWhen: (v) =>
      v.requestType === 'change_extend_end_early' &&
      (v.changeType === 'change' || v.changeType === 'extend'),
  },
  {
    id: 'newRequestedEndDate',
    type: 'date',
    label: 'Gewünschtes neues Ende',
    required: true,
    getMin: (v) => v.previousStartDate || undefined,
    showWhen: (v) =>
      v.requestType === 'change_extend_end_early' && v.changeType === 'end_early',
  },
  {
    id: 'reasonOptional',
    type: 'textarea',
    label: 'Grund (optional)',
    showWhen: (v) => v.requestType === 'change_extend_end_early',
  },
];

/** Zusatzfelder für late_period */
const LATE_PERIOD_FIELDS: FormFieldConfig[] = [
  {
    id: 'requestedLateStartDate',
    type: 'date',
    label: 'Gewünschter Beginn',
    required: true,
    showWhen: (v) => v.requestType === 'late_period',
  },
  {
    id: 'requestedLateEndDate',
    type: 'date',
    label: 'Gewünschtes Ende',
    required: true,
    getMin: (v) => v.requestedLateStartDate || undefined,
    showWhen: (v) => v.requestType === 'late_period',
  },
  {
    id: 'latePeriodExplanation',
    type: 'textarea',
    label: 'Erläuterung (optional)',
    showWhen: (v) => v.requestType === 'late_period',
  },
];

/** Alle Felddefinitionen */
export const PARENTAL_LEAVE_FIELDS: FormFieldConfig[] = [
  ...BASE_FIELDS,
  ...PART_TIME_FIELDS,
  ...CHANGE_FIELDS,
  ...LATE_PERIOD_FIELDS,
];

/** Anzeige-/Fokus-Label (u. a. für Pflichtfeld-Hinweis beim PDF-Versuch). */
export function getParentLeaveFieldLabel(fieldId: string): string {
  const f = PARENTAL_LEAVE_FIELDS.find((x) => x.id === fieldId);
  if (f) return f.label;
  if (fieldId === 'weeklyHours') return 'Wochenstunden';
  if (fieldId === 'workDistribution') return 'Verteilung der Arbeitszeit';
  return fieldId;
}

/**
 * Gibt die sichtbaren Felder für die aktuellen Formularwerte zurück.
 */
export function getVisibleFields(values: ParentLeaveFormValues): FormFieldConfig[] {
  return PARENTAL_LEAVE_FIELDS.filter((field) => {
    if (!field.showWhen) return true;
    return field.showWhen(values);
  });
}

const PART_TIME_DAY_KEYS = [
  'workDistributionMonday',
  'workDistributionTuesday',
  'workDistributionWednesday',
  'workDistributionThursday',
  'workDistributionFriday',
] as const;

/** Dezimalstunden aus Eingabetext (Komma/Punkt). */
export function parseParentLeaveHours(raw: string): number {
  const t = raw.replace(',', '.').trim();
  if (!t) return 0;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Summe der Wochentags-Stunden (nur Anzeige/Validierung). */
export function sumPartTimeDayHours(values: ParentLeaveFormValues): number {
  return PART_TIME_DAY_KEYS.reduce((acc, k) => acc + parseParentLeaveHours(String(values[k] ?? '')), 0);
}

/**
 * Validiert das Formular je nach Falltyp.
 */
export function validateParentLeaveForm(values: ParentLeaveFormValues): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!values.requestType) {
    errors.requestType = 'Bitte wähle die Art des Antrags.';
    return errors;
  }

  if (!values.name?.trim()) errors.name = 'Name ist erforderlich.';
  if (!values.employer?.trim()) errors.employer = 'Arbeitgeber ist erforderlich.';
  if (!values.childName?.trim()) errors.childName = 'Name des Kindes ist erforderlich.';

  if (values.createdAtDate && isFutureDate(values.createdAtDate)) {
    errors.createdAtDate = 'Das Dokumentdatum darf nicht in der Zukunft liegen.';
  }

  switch (values.requestType) {
    case 'basic_leave':
      if (!values.startDate) errors.startDate = 'Beginn der Elternzeit ist erforderlich.';
      if (!values.endDate) errors.endDate = 'Ende der Elternzeit ist erforderlich.';
      if (values.startDate && values.endDate && isBefore(values.endDate, values.startDate)) {
        errors.endDate = 'Das Enddatum darf nicht vor dem Startdatum liegen.';
      }
      break;

    case 'leave_with_part_time':
      if (!values.startDate) errors.startDate = 'Beginn der Elternzeit ist erforderlich.';
      if (!values.endDate) errors.endDate = 'Ende der Elternzeit ist erforderlich.';
      if (values.startDate && values.endDate && isBefore(values.endDate, values.startDate)) {
        errors.endDate = 'Das Enddatum darf nicht vor dem Startdatum liegen.';
      }
      if (!values.weeklyHours?.trim()) errors.weeklyHours = 'Wochenstunden sind erforderlich.';
      const mode = values.workDistributionMode || 'even';
      if (mode === 'individual' && sumPartTimeDayHours(values) <= 0) {
        errors.workDistribution = 'Bitte die Arbeitsstunden je Wochentag eintragen.';
      }
      break;

    case 'change_extend_end_early':
      if (!values.changeType) errors.changeType = 'Bitte wähle die Art der Änderung.';
      if (!values.previousStartDate)
        errors.previousStartDate = 'Bisheriger Beginn ist erforderlich.';
      if (!values.previousEndDate) errors.previousEndDate = 'Bisheriges Ende ist erforderlich.';
      if (values.previousStartDate && values.previousEndDate && isBefore(values.previousEndDate, values.previousStartDate)) {
        errors.previousEndDate = 'Das bisherige Ende darf nicht vor dem bisherigen Beginn liegen.';
      }
      if (values.changeType === 'change' || values.changeType === 'extend') {
        if (!values.newEndDate) errors.newEndDate = 'Neues Ende ist erforderlich.';
        if (values.changeType === 'extend' && values.previousEndDate && values.newEndDate && isBefore(values.newEndDate, values.previousEndDate)) {
          errors.newEndDate = 'Das neue Enddatum darf nicht vor dem bisherigen Ende liegen.';
        }
        if (values.changeType === 'change' && values.previousStartDate && values.newEndDate && isBefore(values.newEndDate, values.previousStartDate)) {
          errors.newEndDate = 'Das neue Enddatum darf nicht vor dem bisherigen Beginn liegen.';
        }
      }
      if (values.changeType === 'end_early') {
        if (!values.newRequestedEndDate)
          errors.newRequestedEndDate = 'Gewünschtes neues Ende ist erforderlich.';
        if (values.previousStartDate && values.newRequestedEndDate && isBefore(values.newRequestedEndDate, values.previousStartDate)) {
          errors.newRequestedEndDate = 'Das gewünschte Ende darf nicht vor dem bisherigen Start liegen.';
        }
      }
      break;

    case 'late_period':
      if (!values.requestedLateStartDate)
        errors.requestedLateStartDate = 'Gewünschter Beginn ist erforderlich.';
      if (!values.requestedLateEndDate)
        errors.requestedLateEndDate = 'Gewünschtes Ende ist erforderlich.';
      if (values.requestedLateStartDate && values.requestedLateEndDate && isBefore(values.requestedLateEndDate, values.requestedLateStartDate)) {
        errors.requestedLateEndDate = 'Das gewünschte Ende darf nicht vor dem gewünschten Beginn liegen.';
      }
      break;
  }

  return errors;
}
