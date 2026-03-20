import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import { TextInput } from '../../../shared/ui/TextInput';
import { useI18n } from '../../../shared/lib/i18n';
import { usePickerOverlay } from '../../../shared/lib/pickerOverlay/usePickerOverlay';
import { useBegleitungPlus } from '../../../core/begleitungPlus';
import { openBegleitungPlusUpsell } from '../../../core/begleitungPlus/openBegleitungPlusUpsell';
import { createIcsForAppointments, shareOrDownloadIcs } from '../../../core/calendar/ics';
import { addAppointments } from '../application/service';
import { incrementProgressActionCount } from '../../../core/begleitungPlus/upgradeTriggersStore';
import { createUCheckAppointments } from '../domain/uCheckTemplates';
import type { Appointment } from '../domain/types';
import './AppointmentsPage.css';
import './AppointmentFormScreen.css';
import '../../checklists/styles/softpill-buttons-in-cards.css';
import '../../checklists/styles/softpill-cards.css';

const toIcsArgs = (a: Appointment, index: number) => {
  const start = new Date(a.startAt);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + 60);
  return {
    id: `${a.title}-${index}`,
    title: `${a.title} Untersuchung`,
    startAt: a.startAt,
    endAt: end.toISOString(),
    description: 'U-Untersuchung (aus Vorlage)',
    alarmMinutesBefore: 1440,
  };
};

export const UCheckFormScreen: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const pickerOverlay = usePickerOverlay();
  const { isPlus } = useBegleitungPlus();
  const [birthDate, setBirthDate] = React.useState('');

  const handleSaveToCalendar = () => {
    if (!birthDate) return;
    if (!isPlus) {
      openBegleitungPlusUpsell({
        reason: 'calendar_reminder',
        feature: 'REMINDERS',
      });
      return;
    }
    const appointments = createUCheckAppointments(birthDate);
    if (appointments.length === 0) return;
    const events = appointments.map((a, i) => toIcsArgs(a, i));
    const { icsText, filename } = createIcsForAppointments(events, {
      filename: 'U-Untersuchungen.ics',
    });
    void shareOrDownloadIcs(icsText, filename);
  };

  const handleAdd = async () => {
    const templates = createUCheckAppointments(birthDate);
    if (templates.length === 0) return;
    await addAppointments(templates);
    incrementProgressActionCount();
    navigate('/appointments', { replace: true });
  };

  const handleCancel = () => {
    navigate('/appointments', { replace: true });
  };

  return (
    <div className="screen-placeholder form-screen form-screen--scroll">
      <section className="form-screen__section">
        <h1 className="form-screen__title">{t('uchecks.dialog.title')}</h1>
        <Card className="still-daily-checklist__card appointments__composer-card">
          <div className="appointments__composer-content">
            <label className="appointments__composer-label">
              <span>{t('uchecks.dialog.birthdate')}</span>
              <TextInput
                type="date"
                value={birthDate}
                onChange={(event) => setBirthDate(event.target.value)}
                onFocus={() => pickerOverlay?.registerFocus()}
                onBlur={() => pickerOverlay?.registerBlur()}
              />
            </label>
            <div className="appointments__composer-actions">
              <Button
                type="button"
                variant="secondary"
                className="next-steps__button btn--softpill"
                onClick={handleSaveToCalendar}
                disabled={!birthDate}
              >
                {t('appointments.saveToCalendar')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="next-steps__button btn--softpill"
                onClick={handleCancel}
              >
                {t('contacts.form.cancel')}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="next-steps__button btn--softpill"
                onClick={handleAdd}
                disabled={!birthDate}
              >
                {t('uchecks.dialog.add')}
              </Button>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
};
