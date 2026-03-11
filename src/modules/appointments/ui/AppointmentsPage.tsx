import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SectionHeader } from '../../../shared/ui/SectionHeader';
import { Card } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import { List, ListItem } from '../../../shared/ui/List';
import { useI18n } from '../../../shared/lib/i18n';
import { useBegleitungPlus } from '../../../core/begleitungPlus';
import { openBegleitungPlusUpsell } from '../../../core/begleitungPlus/openBegleitungPlusUpsell';
import { LimitReachedBanner } from '../../../core/begleitungPlus/ui/LimitReachedBanner';
import {
  hasLimitTriggerBeenShownThisSession,
  markLimitTriggerShownThisSession,
} from '../../../core/begleitungPlus/upgradeTriggersStore';
import {
  deleteAppointment,
  listAppointments,
  upsertAppointment,
} from '../application/service';
import type { Appointment } from '../domain/types';
import {
  createIcsForAppointment,
  createIcsForAppointments,
  shareOrDownloadIcs,
} from '../../../core/calendar/ics';
import {
  getExportStatus,
  setExportStatus,
  clearExportStatus,
  getAppointmentSignature,
} from '../../../core/calendar/exportStatusStore';
import { usePanels } from '../../../shared/lib/panels';
import './AppointmentsPage.css';
import '../../checklists/styles/softpill-buttons-in-cards.css';
import '../../checklists/styles/softpill-cards.css';

const isSameDay = (left: Date, right: Date): boolean =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const toLocalDate = (iso: string): Date | null => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
};

const useDateLabel = (locale: 'de' | 'en') => {
  return React.useCallback(
    (date: Date): string => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      if (isSameDay(date, today)) {
        return locale === 'de' ? 'Heute' : 'Today';
      }
      if (isSameDay(date, tomorrow)) {
        return locale === 'de' ? 'Morgen' : 'Tomorrow';
      }

      const formatter = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      return formatter.format(date);
    },
    [locale]
  );
};

const formatDateTime = (date: Date, locale: 'de' | 'en'): string => {
  const formatter = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return formatter.format(date);
};

const toDateKey = (date: Date): string => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized.toISOString();
};

const toIcsArgs = (a: Appointment) => {
  const alarm = a.reminderMinutesBefore ?? 60;
  const start = new Date(a.startAt);
  const end = a.endAt ? new Date(a.endAt) : new Date(start);
  if (!a.endAt) {
    end.setMinutes(start.getMinutes() + 60);
  }
  const title =
    a.category === 'u-check' ? `${a.title} Untersuchung` : a.title;
  return {
    id: a.id,
    title,
    startAt: a.startAt,
    endAt: end.toISOString(),
    location: a.location,
    description: a.notes,
    alarmMinutesBefore: alarm > 0 ? alarm : 60,
  };
};

export const AppointmentsPage: React.FC = () => {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const dateLabel = useDateLabel(locale);
  const { isPlus, limits } = useBegleitungPlus();
  const { openBottomSheet } = usePanels();
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [, setExportStatusVersion] = React.useState(0);

  const max = limits.appointmentsMax;
  const locked = !isPlus && appointments.length >= max;
  const [limitBannerDismissed, setLimitBannerDismissed] = React.useState(false);
  const showLimitBanner =
    locked &&
    !hasLimitTriggerBeenShownThisSession('appointments') &&
    !limitBannerDismissed;

  const load = React.useCallback(async () => {
    const items = await listAppointments();
    setAppointments(items);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const sorted = React.useMemo(() => {
    return [...appointments].sort((a, b) => {
      const aDate = toLocalDate(a.startAt)?.getTime() ?? 0;
      const bDate = toLocalDate(b.startAt)?.getTime() ?? 0;
      return aDate - bDate;
    });
  }, [appointments]);

  const grouped = React.useMemo(() => {
    return sorted.reduce<Record<string, Appointment[]>>((acc, appointment) => {
      const date = toLocalDate(appointment.startAt);
      if (!date) {
        return acc;
      }
      const key = toDateKey(date);
      acc[key] = acc[key] ?? [];
      acc[key].push(appointment);
      return acc;
    }, {});
  }, [sorted]);

  const groupEntries = React.useMemo(() => {
    return Object.entries(grouped).sort(([left], [right]) => left.localeCompare(right));
  }, [grouped]);

  const categoryLabel = (category?: Appointment['category']): string => {
    switch (category) {
      case 'u-check':
        return t('appointments.category.ucheck');
      case 'doctor':
        return t('appointments.category.doctor');
      case 'lactation':
        return t('appointments.category.lactation');
      default:
        return t('appointments.category.other');
    }
  };

  const handleDelete = async (id: string) => {
    await deleteAppointment(id);
    clearExportStatus(id);
    setAppointments((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddAppointment = () => {
    if (locked) {
      openBegleitungPlusUpsell({
        reason: 'limit_reached',
        feature: 'APPOINTMENTS_UNLIMITED',
      });
      return;
    }
    navigate('/appointments/new');
  };

  const handleAddUCheck = () => {
    if (locked) {
      openBegleitungPlusUpsell({
        reason: 'limit_reached',
        feature: 'APPOINTMENTS_UNLIMITED',
      });
      return;
    }
    navigate('/appointments/uchecks/new');
  };

  const handleBulkExport = async () => {
    if (!isPlus) {
      openBegleitungPlusUpsell({
        reason: 'calendar_bulk_export',
        feature: 'REMINDERS',
      });
      return;
    }
    const now = new Date().toISOString();
    const future = (await listAppointments())
      .filter((a) => a.startAt >= now)
      .sort(
        (a, b) =>
          new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
      );
    if (future.length === 0) {
      openBottomSheet('calendar-bulk-export-result', { variant: 'empty' });
      return;
    }
    const events = future.map(toIcsArgs);
    const {
      icsText,
      filename,
      uidsByAppointmentId,
    } = createIcsForAppointments(events, { filename: 'termine.ics' });
    await shareOrDownloadIcs(icsText, filename);
    const nowIso = new Date().toISOString();
    future.forEach((a) => {
      const uid = uidsByAppointmentId[a.id];
      setExportStatus(a.id, {
        exportedAt: nowIso,
        icsUid: uid ?? `${a.id}@stillberatung.app`,
        signature: getAppointmentSignature(a),
      });
    });
    setExportStatusVersion((v) => v + 1);
    openBottomSheet('calendar-bulk-export-result', { variant: 'success' });
  };

  const handleSaveToCalendar = async (appointment: Appointment) => {
    if (!isPlus) {
      openBegleitungPlusUpsell({
        reason: 'calendar_reminder',
        feature: 'REMINDERS',
      });
      return;
    }
    const alarmMinutes = appointment.reminderMinutesBefore ?? 60;
    const icsUid = `${appointment.id}@stillberatung.app`;
    const { icsText, filename } = createIcsForAppointment({
      id: appointment.id,
      title: appointment.title,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      location: appointment.location,
      description: appointment.notes,
      alarmMinutesBefore: alarmMinutes > 0 ? alarmMinutes : 60,
    });
    await shareOrDownloadIcs(icsText, filename);
    setExportStatus(appointment.id, {
      exportedAt: new Date().toISOString(),
      icsUid,
      signature: getAppointmentSignature(appointment),
    });
    setExportStatusVersion((v) => v + 1);
  };

  const handleConfirmUCheck = async (appointment: Appointment) => {
    if (!isPlus) {
      openBegleitungPlusUpsell({
        reason: 'calendar_reminder',
        feature: 'REMINDERS',
      });
      return;
    }
    const calendarUid = `${appointment.id}@stillberatung.app`;
    const start = new Date(appointment.startAt);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 60);
    const { icsText, filename } = createIcsForAppointment({
      id: appointment.id,
      title: `${appointment.title} Untersuchung`,
      startAt: appointment.startAt,
      endAt: end.toISOString(),
      description: appointment.notes ?? 'U-Untersuchung (aus Vorlage)',
      alarmMinutesBefore: 1440,
    });
    await shareOrDownloadIcs(icsText, filename);
    const signature = getAppointmentSignature(appointment);
    setExportStatus(appointment.id, {
      exportedAt: new Date().toISOString(),
      icsUid: calendarUid,
      signature,
    });
    const updated = await upsertAppointment({
      ...appointment,
      status: 'confirmed',
      calendarExportedAt: new Date().toISOString(),
      calendarUid,
    });
    setAppointments((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
    setExportStatusVersion((v) => v + 1);
  };

  const handleLimitBannerDismiss = () => {
    markLimitTriggerShownThisSession('appointments');
    setLimitBannerDismissed(true);
  };

  return (
    <div className="screen-placeholder appointments-screen">
      {showLimitBanner && (
        <div className="appointments__limit-banner">
          <LimitReachedBanner
            featureKey="APPOINTMENTS_UNLIMITED"
            onDismiss={handleLimitBannerDismiss}
          />
        </div>
      )}
      <section className="next-steps next-steps--plain appointments__section">
        <SectionHeader as="h1" title={t('appointments.title')} />
        <div className="next-steps__stack appointments__actions">
          <Button
            type="button"
            variant="secondary"
            className="next-steps__button btn--softpill"
            onClick={handleBulkExport}
          >
            {t('appointments.bulkExport.label')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="next-steps__button btn--softpill"
            onClick={handleAddAppointment}
          >
            {t('appointments.add')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="next-steps__button btn--softpill"
            onClick={handleAddUCheck}
          >
            {t('appointments.addUChecks')}
          </Button>
        </div>
      </section>

      <section className="appointments__list-section">
        <SectionHeader as="h2" title={t('appointments.upcoming')} />
        {groupEntries.length === 0 ? (
          <Card className="still-daily-checklist__card">
            <p className="appointments__empty-text">{t('appointments.empty')}</p>
          </Card>
        ) : (
          <List className="appointments__list">
            {groupEntries.map(([key, items]) => {
              const date = new Date(key);
              return (
                <React.Fragment key={key}>
                  <ListItem className="appointments__date-label">
                    <strong>{dateLabel(date)}</strong>
                  </ListItem>
                  {items.map((appointment) => {
                    const appointmentDate = toLocalDate(appointment.startAt);
                    const typeLabel = appointment.category
                      ? categoryLabel(appointment.category)
                      : undefined;
                    const details = [appointment.location, appointment.notes]
                      .filter(Boolean)
                      .join(' · ')
                      .trim();
                    const exportStatus = getExportStatus(appointment.id);
                    const currentSignature = getAppointmentSignature(appointment);
                    const changedSinceExport =
                      exportStatus &&
                      exportStatus.signature != null &&
                      exportStatus.signature !== currentSignature;
                    const exportedAtDate = exportStatus?.exportedAt
                      ? toLocalDate(exportStatus.exportedAt)
                      : null;
                    const exportedAtFormatted = exportedAtDate
                      ? formatDateTime(exportedAtDate, locale)
                      : '';
                    const calendarStatusHint = exportStatus ? (
                      changedSinceExport ? (
                        <div className="appointment-item__saved-hint">
                          {t('appointments.changesNotInCalendar')}
                        </div>
                      ) : exportedAtFormatted ? (
                        <div className="appointment-item__saved-hint">
                          {t('appointments.savedToCalendarAt').replace(
                            '{{date}}',
                            exportedAtFormatted
                          )}
                        </div>
                      ) : null
                    ) : appointment.category === 'u-check' &&
                      appointment.status === 'confirmed' ? (
                      <div className="appointment-item__saved-hint">
                        {t('appointments.savedToCalendar')}
                      </div>
                    ) : null;
                    const saveButtonLabel =
                      exportStatus && appointment.category !== 'u-check'
                        ? t('appointments.resendToCalendarShort')
                        : t('appointments.saveToCalendar');
                    return (
                      <ListItem key={appointment.id} className="appointments__item">
                        <Card className="still-daily-checklist__card appointments__card">
                          <div className="appointment-item">
                            <div className="appointment-item__top">
                              <div className="appointment-item__title">{appointment.title}</div>
                              {typeLabel ? (
                                <span className="appointment-item__pill">{typeLabel}</span>
                              ) : null}
                            </div>
                            {calendarStatusHint}
                            {appointmentDate ? (
                              <div className="appointment-item__meta">
                                {formatDateTime(appointmentDate, locale)}
                              </div>
                            ) : null}
                            {details ? (
                              <div className="appointment-item__note">{details}</div>
                            ) : null}
                          </div>
                          <div className="appointments__card-actions">
                            {appointment.category === 'u-check' ? (
                              <Button
                                type="button"
                                variant="secondary"
                                className="next-steps__button btn--softpill"
                                onClick={() => handleConfirmUCheck(appointment)}
                              >
                                {appointment.status === 'confirmed'
                                  ? t('appointments.resendToCalendar')
                                  : t('appointments.confirm')}
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="secondary"
                                className="next-steps__button btn--softpill"
                                onClick={() => handleSaveToCalendar(appointment)}
                              >
                                {saveButtonLabel}
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="secondary"
                              className="next-steps__button btn--softpill"
                              onClick={() => navigate(`/appointments/edit/${appointment.id}`)}
                            >
                              {t('appointments.edit')}
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              className="next-steps__button btn--softpill"
                              onClick={() => handleDelete(appointment.id)}
                            >
                              {t('appointments.delete')}
                            </Button>
                          </div>
                        </Card>
                      </ListItem>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </List>
        )}
      </section>
    </div>
  );
};
