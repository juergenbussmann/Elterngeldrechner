export type AppointmentCategory = 'u-check' | 'doctor' | 'lactation' | 'other';

export type AppointmentStatus = 'draft' | 'confirmed';

export type Appointment = {
  id: string;
  title: string;
  notes?: string;
  startAt: string;
  endAt?: string;
  location?: string;
  reminderMinutesBefore?: number | null;
  reminderFiredAt?: string | null;
  category?: AppointmentCategory;
  status?: AppointmentStatus;
  calendarExportedAt?: string;
  calendarUid?: string;
};
