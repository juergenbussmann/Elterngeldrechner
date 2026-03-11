import type { Appointment } from '../domain/types';
import { loadAppointments, removeAppointment, saveAppointment } from '../infra/storage';

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `appointment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const listAppointments = async (): Promise<Appointment[]> => {
  return await loadAppointments();
};

export const getAppointmentById = async (id: string): Promise<Appointment | undefined> => {
  const items = await loadAppointments();
  return items.find((a) => a.id === id);
};

export const upsertAppointment = async (appointment: Appointment): Promise<Appointment> => {
  const next: Appointment = {
    ...appointment,
    id: appointment.id || generateId(),
    reminderMinutesBefore: appointment.reminderMinutesBefore ?? null,
    reminderFiredAt: appointment.reminderFiredAt ?? null,
  };
  await saveAppointment(next);
  return next;
};

export const deleteAppointment = async (id: string): Promise<void> => {
  await removeAppointment(id);
};

export const addAppointments = async (appointments: Appointment[]): Promise<Appointment[]> => {
  const saved: Appointment[] = [];
  for (const appointment of appointments) {
    const next = await upsertAppointment(appointment);
    saved.push(next);
  }
  return saved;
};

export const markReminderFired = async (id: string, firedAt: string): Promise<void> => {
  const items = await loadAppointments();
  const current = items.find((item) => item.id === id);
  if (!current) {
    return;
  }
  await saveAppointment({
    ...current,
    reminderFiredAt: firedAt,
  });
};
