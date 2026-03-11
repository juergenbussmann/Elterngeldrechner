import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../../../shared/lib/i18n';
import { AppointmentForm } from './AppointmentForm';
import { upsertAppointment, getAppointmentById } from '../application/service';
import { incrementProgressActionCount } from '../../../core/begleitungPlus/upgradeTriggersStore';
import type { Appointment } from '../domain/types';
import './AppointmentsPage.css';
import './AppointmentFormScreen.css';
import '../../checklists/styles/softpill-buttons-in-cards.css';
import '../../checklists/styles/softpill-cards.css';

export const AppointmentFormScreen: React.FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [initialValue, setInitialValue] = React.useState<Appointment | null>(null);
  const [loading, setLoading] = React.useState(!!id);

  React.useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getAppointmentById(id).then((a) => {
      if (!cancelled) {
        setInitialValue(a ?? null);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSave = async (next: Appointment) => {
    await upsertAppointment(next);
    incrementProgressActionCount();
    navigate('/appointments', { replace: true });
  };

  const handleCancel = () => {
    navigate('/appointments', { replace: true });
  };

  if (loading) {
    return (
      <div className="screen-placeholder form-screen">
        <p className="form-screen__loading">{t('common.loading', 'Laden…')}</p>
      </div>
    );
  }

  return (
    <div className="screen-placeholder form-screen form-screen--scroll">
      <section className="form-screen__section">
        <h1 className="form-screen__title">
          {initialValue ? t('appointments.edit') : t('appointments.add')}
        </h1>
        <AppointmentForm
          initialValue={initialValue}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </section>
    </div>
  );
};
