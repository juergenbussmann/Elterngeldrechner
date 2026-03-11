import type { Appointment } from './types';

type UCheckTemplate = {
  code: string;
  min: number;
  max: number;
  unit: 'days' | 'weeks' | 'months';
  label: string;
};

const TEMPLATES: UCheckTemplate[] = [
  { code: 'U1', min: 0, max: 0, unit: 'days', label: '0 Tage' },
  { code: 'U2', min: 3, max: 10, unit: 'days', label: '3–10 Tage' },
  { code: 'U3', min: 4, max: 5, unit: 'weeks', label: '4–5 Wochen' },
  { code: 'U4', min: 3, max: 4, unit: 'months', label: '3–4 Monate' },
  { code: 'U5', min: 6, max: 7, unit: 'months', label: '6–7 Monate' },
  { code: 'U6', min: 10, max: 12, unit: 'months', label: '10–12 Monate' },
  { code: 'U7', min: 21, max: 24, unit: 'months', label: '21–24 Monate' },
  { code: 'U7a', min: 34, max: 36, unit: 'months', label: '34–36 Monate' },
  { code: 'U8', min: 46, max: 48, unit: 'months', label: '46–48 Monate' },
  { code: 'U9', min: 60, max: 64, unit: 'months', label: '60–64 Monate' },
];

const toDays = (value: number, unit: UCheckTemplate['unit']): number => {
  switch (unit) {
    case 'weeks':
      return value * 7;
    case 'months':
      return value * 30;
    default:
      return value;
  }
};

const addDaysAtTen = (base: Date, days: number): string => {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  date.setHours(10, 0, 0, 0);
  return date.toISOString();
};

const toRangeNote = (template: UCheckTemplate): string => `Zeitraum: ${template.label}`;

export const createUCheckAppointments = (birthDateISO: string): Appointment[] => {
  const parts = birthDateISO.split('-').map((value) => Number(value));
  const birthDate =
    parts.length === 3 && parts.every((value) => Number.isFinite(value))
      ? new Date(parts[0], parts[1] - 1, parts[2])
      : new Date(birthDateISO);
  if (Number.isNaN(birthDate.getTime())) {
    return [];
  }

  return TEMPLATES.map((template) => {
    const minDays = toDays(template.min, template.unit);
    const maxDays = toDays(template.max, template.unit);
    const targetDays = Math.round((minDays + maxDays) / 2);

    return {
      id: '',
      title: template.code,
      startAt: addDaysAtTen(birthDate, targetDays),
      notes: toRangeNote(template),
      reminderMinutesBefore: null,
      reminderFiredAt: null,
      category: 'u-check',
      status: 'draft',
    };
  });
};
