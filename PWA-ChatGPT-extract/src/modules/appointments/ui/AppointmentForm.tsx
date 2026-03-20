import React from 'react';
import { Card } from '../../../shared/ui/Card';
import { TextInput } from '../../../shared/ui/TextInput';
import { TextArea } from '../../../shared/ui/TextArea';
import { Button } from '../../../shared/ui/Button';
import { useTheme } from '../../../core/theme/ThemeProvider';
import { useI18n } from '../../../shared/lib/i18n';
import { usePickerOverlay } from '../../../shared/lib/pickerOverlay/usePickerOverlay';
import type { Appointment, AppointmentCategory } from '../domain/types';
import './AppointmentForm.css';
import '../../checklists/styles/softpill-buttons-in-cards.css';
import '../../checklists/styles/softpill-cards.css';

type AppointmentFormProps = {
  initialValue?: Appointment | null;
  onSave: (appointment: Appointment) => void;
  onCancel: () => void;
};

const pad = (value: number) => String(value).padStart(2, '0');

/** Heute als YYYY-MM-DD (lokale Zeit) */
const todayLocal = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** ISO-String → { date: YYYY-MM-DD, time: HH:mm } in lokaler Zeit */
const isoToDateAndTime = (iso?: string): { date: string; time: string } => {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
};

/** date (YYYY-MM-DD) + time (HH:mm) → ISO-String, lokale Zeit */
const dateAndTimeToIso = (date: string, time: string): string => {
  if (!date) return '';
  const t = time || '00:00';
  const combined = `${date}T${t}`;
  const d = new Date(combined);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
};

/** Vergleicht (dateA, timeA) mit (dateB, timeB). true wenn B > A */
const isDateTimeAfter = (
  dateA: string,
  timeA: string,
  dateB: string,
  timeB: string
): boolean => {
  if (!dateA || !timeA || !dateB || !timeB) return true;
  const msA = new Date(`${dateA}T${timeA || '00:00'}`).getTime();
  const msB = new Date(`${dateB}T${timeB || '00:00'}`).getTime();
  return msB > msA;
};

/**
 * Addiert Minuten zu date+time. Kann über Mitternacht rollen.
 * Gibt { date, time } zurück (evtl. nächster Tag).
 */
const addMinutes = (date: string, time: string, minutes: number): { date: string; time: string } => {
  if (!date || !time) return { date, time };
  const d = new Date(`${date}T${time}`);
  d.setMinutes(d.getMinutes() + minutes);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
};

/** Picker-Fokus: Input zentriert einblenden (setTimeout für iOS-Sicherheit) + Footer ausblenden */
const usePickerHandlers = () => {
  const overlay = usePickerOverlay();
  const onFocus = React.useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      overlay?.registerFocus();
      setTimeout(() => e.currentTarget.scrollIntoView({ block: 'center', behavior: 'smooth' }), 0);
    },
    [overlay]
  );
  const onBlur = React.useCallback(() => {
    overlay?.registerBlur();
  }, [overlay]);
  return { onFocus, onBlur };
};

export const AppointmentForm: React.FC<AppointmentFormProps> = ({
  initialValue,
  onSave,
  onCancel,
}) => {
  const { t } = useI18n();
  const theme = useTheme();
  const pickerHandlers = usePickerHandlers();
  const { spacing, typography, components, colors } = theme;
  const inputTokens = components.input;

  const [title, setTitle] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [startTime, setStartTime] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [endTime, setEndTime] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [reminderMinutesBefore, setReminderMinutesBefore] = React.useState<string>('none');
  const [category, setCategory] = React.useState<AppointmentCategory>('other');

  React.useEffect(() => {
    const start = isoToDateAndTime(initialValue?.startAt);
    const end = isoToDateAndTime(initialValue?.endAt);
    const baseStartDate = start.date || todayLocal();
    const baseStartTime = start.time || '09:00';
    const computedEnd = addMinutes(baseStartDate, baseStartTime, 60);

    setTitle(initialValue?.title ?? '');
    setStartDate(baseStartDate);
    setStartTime(baseStartTime);
    setEndDate(end.date || computedEnd.date);
    setEndTime(end.time || computedEnd.time);
    setLocation(initialValue?.location ?? '');
    setNotes(initialValue?.notes ?? '');
    setReminderMinutesBefore(
      initialValue?.reminderMinutesBefore !== null && initialValue?.reminderMinutesBefore !== undefined
        ? String(initialValue.reminderMinutesBefore)
        : 'none'
    );
    setCategory(initialValue?.category ?? 'other');
  }, [initialValue]);

  const handleStartDateChange = (newStartDate: string) => {
    setStartDate(newStartDate);
    if (newStartDate && !endDate) {
      setEndDate(newStartDate);
    }
    if (newStartDate && endDate && endTime && startTime && !isDateTimeAfter(newStartDate, startTime, endDate, endTime)) {
      const { date, time } = addMinutes(newStartDate, startTime, 60);
      setEndDate(date);
      setEndTime(time);
    }
  };

  const handleStartTimeChange = (newStartTime: string) => {
    setStartTime(newStartTime);
    const d = startDate || todayLocal();
    if (newStartTime && endDate && endTime && !isDateTimeAfter(d, newStartTime, endDate, endTime)) {
      const { date, time } = addMinutes(d, newStartTime, 60);
      setEndDate(date);
      setEndTime(time);
    }
  };

  const handleEndDateChange = (newEndDate: string) => {
    setEndDate(newEndDate);
    const d = startDate || todayLocal();
    const st = startTime || '00:00';
    if (newEndDate && endTime && !isDateTimeAfter(d, st, newEndDate, endTime)) {
      const { date, time } = addMinutes(d, st, 60);
      setEndDate(date);
      setEndTime(time);
    }
  };

  const handleEndTimeChange = (newEndTime: string) => {
    const d = startDate || todayLocal();
    const ed = endDate || d;
    const st = startTime || '00:00';
    if (newEndTime && !isDateTimeAfter(d, st, ed, newEndTime)) {
      const { date, time } = addMinutes(d, st, 60);
      setEndDate(date);
      setEndTime(time);
      return;
    }
    setEndTime(newEndTime);
  };

  const isEndValid = isDateTimeAfter(
    startDate || todayLocal(),
    startTime || '00:00',
    endDate || startDate || todayLocal(),
    endTime || '00:00'
  );
  const isValid = title.trim().length > 0 && startDate.trim().length > 0 && isEndValid;

  const selectStyle: React.CSSProperties = {
    width: '100%',
    padding: `${spacing.sm} ${spacing.md}`,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(255, 255, 255, 0.55)',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    color: colors.textPrimary ?? inputTokens.text,
    fontFamily: typography.fontFamily,
    fontSize: typography.fontSizes.md,
    lineHeight: typography.lineHeights.normal,
  };

  const handleSubmit = () => {
    const baseStartDate = startDate || todayLocal();
    const baseStartTime = startTime || '00:00';
    const baseEndDate = endDate || baseStartDate;
    const baseEndTime = endTime || '00:00';

    const nextStartAt = dateAndTimeToIso(baseStartDate, baseStartTime);
    if (!nextStartAt) return;

    let nextEndAt = '';
    if (baseEndTime && isDateTimeAfter(baseStartDate, baseStartTime, baseEndDate, baseEndTime)) {
      nextEndAt = dateAndTimeToIso(baseEndDate, baseEndTime);
    } else {
      const { date, time } = addMinutes(baseStartDate, baseStartTime, 60);
      nextEndAt = dateAndTimeToIso(date, time);
    }

    const reminderValue =
      reminderMinutesBefore === 'none' ? null : Number.parseInt(reminderMinutesBefore, 10);
    onSave({
      id: initialValue?.id ?? '',
      title: title.trim(),
      startAt: nextStartAt,
      endAt: nextEndAt || undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      reminderMinutesBefore: Number.isNaN(reminderValue) ? null : reminderValue,
      reminderFiredAt: initialValue?.reminderFiredAt ?? null,
      category,
    });
  };

  return (
    <Card className="still-daily-checklist__card appointments__composer-card">
      <div className="appointments__composer-content">
        <label className="appointments__composer-label">
          <span style={{ color: colors.textPrimary }}>{t('appointments.field.title')}</span>
          <TextInput value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>

        <div className="appointment-form__datetime-stack">
          <label className="appointments__composer-label">
            <span style={{ color: colors.textPrimary }}>{t('appointments.field.start')}</span>
            <div className="appointments__datetime-row">
              <TextInput
                type="date"
                value={startDate}
                onChange={(event) => handleStartDateChange(event.target.value)}
                onFocus={pickerHandlers.onFocus}
                onBlur={pickerHandlers.onBlur}
                required
              />
              <TextInput
                type="time"
                value={startTime}
                onChange={(event) => handleStartTimeChange(event.target.value)}
                onFocus={pickerHandlers.onFocus}
                onBlur={pickerHandlers.onBlur}
              />
            </div>
          </label>

          <label className="appointments__composer-label">
            <span style={{ color: colors.textPrimary }}>{t('appointments.field.end')}</span>
            <div className="appointments__datetime-row">
              <TextInput
                type="date"
                value={endDate}
                onChange={(event) => handleEndDateChange(event.target.value)}
                onFocus={pickerHandlers.onFocus}
                onBlur={pickerHandlers.onBlur}
              />
              <TextInput
                type="time"
                value={endTime}
                onChange={(event) => handleEndTimeChange(event.target.value)}
                onFocus={pickerHandlers.onFocus}
                onBlur={pickerHandlers.onBlur}
              />
            </div>
            {!isEndValid && (
              <span className="appointments__field-hint">{t('appointments.field.endHint')}</span>
            )}
          </label>
        </div>

        <label className="appointments__composer-label">
          <span style={{ color: colors.textPrimary }}>{t('appointments.field.location')}</span>
          <TextInput value={location} onChange={(event) => setLocation(event.target.value)} />
        </label>
        <label className="appointments__composer-label">
          <span style={{ color: colors.textPrimary }}>{t('appointments.field.notes')}</span>
          <TextArea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <label className="appointments__composer-label">
          <span style={{ color: colors.textPrimary }}>{t('appointments.field.reminder')}</span>
          <select
            value={reminderMinutesBefore}
            onChange={(event) => setReminderMinutesBefore(event.target.value)}
            style={selectStyle}
          >
            <option value="none">{t('appointments.reminder.none')}</option>
            <option value="10">{t('appointments.reminder.10')}</option>
            <option value="30">{t('appointments.reminder.30')}</option>
            <option value="60">{t('appointments.reminder.60')}</option>
            <option value="1440">{t('appointments.reminder.1440')}</option>
          </select>
        </label>
        <label className="appointments__composer-label">
          <span style={{ color: colors.textPrimary }}>{t('appointments.field.category')}</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as AppointmentCategory)}
            style={selectStyle}
          >
            <option value="u-check">{t('appointments.category.ucheck')}</option>
            <option value="doctor">{t('appointments.category.doctor')}</option>
            <option value="lactation">{t('appointments.category.lactation')}</option>
            <option value="other">{t('appointments.category.other')}</option>
          </select>
        </label>
        <div className="appointments__composer-actions">
          <Button
            type="button"
            variant="secondary"
            className="next-steps__button btn--softpill"
            onClick={onCancel}
          >
            {t('contacts.form.cancel')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="next-steps__button btn--softpill"
            onClick={handleSubmit}
            disabled={!isValid}
          >
            {t('common.save')}
          </Button>
        </div>
      </div>
    </Card>
  );
};
