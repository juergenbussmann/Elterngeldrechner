import type { Appointment } from '../../../modules/appointments/domain/types';

type ReminderRunnerConfig = {
  getAppointments: () => Promise<Appointment[]>;
  markFired: (id: string, firedAt: string) => Promise<void>;
  t: (key: string) => string;
};

const showReminderNotification = async (title: string, body: string): Promise<void> => {
  if (typeof Notification === 'undefined') {
    return;
  }
  if (Notification.permission !== 'granted') {
    return;
  }

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration) {
        await registration.showNotification(title, { body });
        return;
      }
    } catch {
      // fall through
    }
  }

  try {
    new Notification(title, { body });
  } catch {
    // noop
  }
};

const formatTime = (iso: string, locale: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const formatter = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
  return formatter.format(date);
};

export const startReminderRunner = ({ getAppointments, markFired, t }: ReminderRunnerConfig): (() => void) => {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  let stopped = false;

  const tick = async () => {
    if (stopped) {
      return;
    }
    const now = new Date();
    const appointments = await getAppointments();
    for (const appointment of appointments) {
      if (appointment.reminderMinutesBefore === null || appointment.reminderMinutesBefore === undefined) {
        continue;
      }
      if (appointment.reminderFiredAt) {
        continue;
      }
      const startAt = new Date(appointment.startAt);
      if (Number.isNaN(startAt.getTime())) {
        continue;
      }
      const reminderAt = new Date(startAt.getTime() - appointment.reminderMinutesBefore * 60 * 1000);
      if (now >= reminderAt) {
        const locale = typeof navigator !== 'undefined' ? navigator.language || 'de-DE' : 'de-DE';
        const time = formatTime(appointment.startAt, locale);
        const body = time ? `${appointment.title} (${time})` : appointment.title;
        await showReminderNotification(t('appointments.reminderTitle'), body);
        await markFired(appointment.id, now.toISOString());
      }
    }
  };

  void tick();
  const intervalId = window.setInterval(() => {
    void tick();
  }, 60_000);

  return () => {
    stopped = true;
    window.clearInterval(intervalId);
  };
};
