/* eslint-disable react-refresh/only-export-components */
import React, { useMemo, useState } from 'react';
import type { PwaFactoryModule } from '../../core/contracts/moduleContract';
import { useI18n } from '../../shared/lib/i18n';
import { getValue, setValue } from '../../shared/lib/storage';
import { requestNotificationPermission, showNotification } from '../../shared/lib/notifications';
import { Button } from '../../shared/ui/Button';

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

type NotificationSchedule = {
  days: DayKey[];
  times: string[];
};

const STORAGE_KEY = 'std-notifications-schedule';

const DAY_ORDER: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const DEFAULT_SCHEDULE: NotificationSchedule = {
  days: ['mon', 'tue', 'wed', 'thu', 'fri'],
  times: ['09:00'],
};

const loadSchedule = (): NotificationSchedule => {
  const stored = getValue<NotificationSchedule | null>(STORAGE_KEY, null);
  if (stored?.days && stored?.times) {
    return {
      days: Array.isArray(stored.days) ? (stored.days as DayKey[]) : DEFAULT_SCHEDULE.days,
      times: Array.isArray(stored.times) ? stored.times : DEFAULT_SCHEDULE.times,
    };
  }
  return DEFAULT_SCHEDULE;
};

const normalizeTimes = (times: string[]): string[] => {
  const timePattern = /^([01]?\d|2[0-3]):[0-5]\d$/;
  return Array.from(new Set(times.filter((time) => timePattern.test(time)))).sort();
};

let cachedSchedule: NotificationSchedule = loadSchedule();
let lastFiredKey: string | null = null;

const updateSchedule = (next: NotificationSchedule): void => {
  cachedSchedule = {
    days: [...next.days],
    times: normalizeTimes(next.times),
  };
  setValue<NotificationSchedule>(STORAGE_KEY, cachedSchedule);
};

const mapDayIndexToKey = (dayIndex: number): DayKey => DAY_ORDER[dayIndex] ?? 'mon';

const isDue = (schedule: NotificationSchedule, now: Date): string | null => {
  if (!schedule.times.length) {
    return null;
  }

  const dayKey = mapDayIndexToKey(now.getDay());
  if (!schedule.days.includes(dayKey)) {
    return null;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  for (const time of schedule.times) {
    const [hours, minutes] = time.split(':').map((part) => parseInt(part, 10));
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      continue;
    }
    if (hours * 60 + minutes === currentMinutes) {
      const dateKey = now.toISOString().slice(0, 10);
      return `${dateKey}-${time}`;
    }
  }

  return null;
};

const runNotificationJob = async (): Promise<void> => {
  const schedule = cachedSchedule;
  const now = new Date();
  const dueKey = isDue(schedule, now);

  if (!dueKey || dueKey === lastFiredKey) {
    return;
  }

  lastFiredKey = dueKey;
  await requestNotificationPermission();
  showNotification('Reminder', 'You have a scheduled notification.');
};

const dayLabels: Record<DayKey, { key: DayKey; labelKey: string }> = {
  mon: { key: 'mon', labelKey: 'settings.days.mon' },
  tue: { key: 'tue', labelKey: 'settings.days.tue' },
  wed: { key: 'wed', labelKey: 'settings.days.wed' },
  thu: { key: 'thu', labelKey: 'settings.days.thu' },
  fri: { key: 'fri', labelKey: 'settings.days.fri' },
  sat: { key: 'sat', labelKey: 'settings.days.sat' },
  sun: { key: 'sun', labelKey: 'settings.days.sun' },
};

const NotificationsSettings: React.FC = () => {
  const { t } = useI18n();
  const [schedule, setSchedule] = useState<NotificationSchedule>(() => cachedSchedule);
  const [newTime, setNewTime] = useState('');
  const [lastSavedMessage, setLastSavedMessage] = useState<string | null>(null);

  const toggleDay = (day: DayKey): void => {
    setSchedule((prev) => {
      const exists = prev.days.includes(day);
      const nextDays = exists ? prev.days.filter((item) => item !== day) : [...prev.days, day];
      return { ...prev, days: nextDays };
    });
  };

  const removeTime = (time: string): void => {
    setSchedule((prev) => ({ ...prev, times: prev.times.filter((item) => item !== time) }));
  };

  const addTime = (): void => {
    const trimmed = newTime.trim();
    const normalized = normalizeTimes(trimmed ? [...schedule.times, trimmed] : schedule.times);
    setSchedule((prev) => ({ ...prev, times: normalized }));
    setNewTime('');
  };

  const saveSchedule = async (): Promise<void> => {
    const normalized = {
      days: schedule.days,
      times: normalizeTimes(schedule.times),
    };

    updateSchedule(normalized);
    setSchedule(normalized);
    setLastSavedMessage(t('settings.saved', 'stdNotifications'));
    await requestNotificationPermission();
  };

  const sortedDays = useMemo(() => {
    const order: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    return order.filter((day) => dayLabels[day]);
  }, []);

  return (
    <div className="settings-section__content">
      <p className="settings-layout__description">
        {t('settings.description', 'stdNotifications')}
      </p>

      <div className="settings-field">
        <h4 className="settings-layout__section-title">
          {t('settings.daysLabel', 'stdNotifications')}
        </h4>
        <div className="settings-checkbox-group">
          {sortedDays.map((day) => (
            <label key={day} className="settings-checkbox">
              <input
                type="checkbox"
                checked={schedule.days.includes(day)}
                onChange={() => toggleDay(day)}
              />
              <span>{t(dayLabels[day].labelKey, 'stdNotifications')}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="settings-field">
        <h4 className="settings-layout__section-title">
          {t('settings.timesLabel', 'stdNotifications')}
        </h4>
        <div className="settings-section__row">
          <input
            type="text"
            value={newTime}
            onChange={(event) => setNewTime(event.target.value)}
            placeholder={t('settings.timePlaceholder', 'stdNotifications')}
          />
          <Button type="button" variant="secondary" onClick={addTime}>
            {t('settings.addTime', 'stdNotifications')}
          </Button>
        </div>
        {schedule.times.length === 0 ? (
          <p className="settings-layout__muted">{t('settings.noTimes', 'stdNotifications')}</p>
        ) : (
          <div className="settings-tag-list">
            {schedule.times.map((time) => (
              <span key={time} className="settings-tag">
                {time}
                <Button type="button" variant="ghost" onClick={() => removeTime(time)} aria-label={t('settings.removeTime', 'stdNotifications')}>
                  ×
                </Button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="settings-section__row">
        <Button type="button" onClick={saveSchedule}>
          {t('settings.save', 'stdNotifications')}
        </Button>
      </div>
      {lastSavedMessage ? (
        <p className="settings-layout__muted">{lastSavedMessage}</p>
      ) : null}
      <p className="settings-layout__muted">
        {t('settings.permissionHint', 'stdNotifications')}
      </p>
    </div>
  );
};

export const NotificationsModule: PwaFactoryModule = {
  id: 'std.notifications',
  displayName: 'Notifications',
  getSettings: () => ({
    sections: [
      {
        id: 'std-notifications',
        title: 'Notifications',
        element: <NotificationsSettings />,
      },
    ],
  }),
  getPermissions: () => ['notifications'],
  getJobs: () => [
    {
      id: 'std-notifications-job',
      intervalMs: 60000,
      runOnStart: false,
      run: () => {
        void runNotificationJob();
      },
    },
  ],
  getI18nBundles: () => [
    {
      namespace: 'stdNotifications',
      locale: 'en',
      strings: {
        'settings.title': 'Notifications',
        'settings.description': 'Schedule simple reminders for selected days.',
        'settings.daysLabel': 'Days of the week',
        'settings.timesLabel': 'Times (HH:MM)',
        'settings.timePlaceholder': '09:00',
        'settings.addTime': 'Add time',
        'settings.removeTime': 'Remove time',
        'settings.noTimes': 'No times configured.',
        'settings.save': 'Save schedule',
        'settings.saved': 'Notification schedule saved.',
        'settings.permissionHint': 'Notifications may require permission from your browser.',
        'settings.days.mon': 'Mon',
        'settings.days.tue': 'Tue',
        'settings.days.wed': 'Wed',
        'settings.days.thu': 'Thu',
        'settings.days.fri': 'Fri',
        'settings.days.sat': 'Sat',
        'settings.days.sun': 'Sun',
      },
    },
    {
      namespace: 'stdNotifications',
      locale: 'de',
      strings: {
        'settings.title': 'Benachrichtigungen',
        'settings.description': 'Plane einfache Erinnerungen für ausgewählte Tage.',
        'settings.daysLabel': 'Wochentage',
        'settings.timesLabel': 'Zeiten (HH:MM)',
        'settings.timePlaceholder': '09:00',
        'settings.addTime': 'Zeit hinzufügen',
        'settings.removeTime': 'Zeit entfernen',
        'settings.noTimes': 'Keine Zeiten konfiguriert.',
        'settings.save': 'Zeitplan speichern',
        'settings.saved': 'Benachrichtigungsplan gespeichert.',
        'settings.permissionHint': 'Benachrichtigungen benötigen ggf. eine Berechtigung des Browsers.',
        'settings.days.mon': 'Mo',
        'settings.days.tue': 'Di',
        'settings.days.wed': 'Mi',
        'settings.days.thu': 'Do',
        'settings.days.fri': 'Fr',
        'settings.days.sat': 'Sa',
        'settings.days.sun': 'So',
      },
    },
  ],
};

