import React, { useState, useCallback, useMemo } from 'react';
import { SectionHeader } from '../../../shared/ui/SectionHeader';
import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';
import { TextInput } from '../../../shared/ui/TextInput';
import { useNavigation } from '../../../shared/lib/navigation/useNavigation';
import { useI18n } from '../../../shared/lib/i18n';
import { useNotifications } from '../../../shared/lib/notifications';
import {
  INITIAL_FORM_VALUES,
  getVisibleFields,
  validateParentLeaveForm,
  REQUEST_TYPE_OPTIONS_UI,
  type ParentLeaveFormValues,
  type FormFieldConfig,
} from './formsConfig';
import { formatLeaveDuration } from './parentalLeaveHelpers';
import { buildParentLeaveDocument } from './buildParentLeaveDocument';
import { addDocument } from '../application/service';
import './ParentLeaveFormPage.css';
import '../../checklists/styles/softpill-buttons-in-cards.css';
import '../../checklists/styles/softpill-cards.css';

/** Zeigt die Dauer an, je nach Falltyp */
function getDurationDisplay(values: ParentLeaveFormValues): string {
  if (values.requestType === 'change_extend_end_early') {
    return formatLeaveDuration(values.previousStartDate, values.previousEndDate);
  }
  if (values.requestType === 'late_period') {
    return formatLeaveDuration(values.requestedLateStartDate, values.requestedLateEndDate);
  }
  return formatLeaveDuration(values.startDate, values.endDate);
}

const FormField: React.FC<{
  field: FormFieldConfig;
  value: string;
  onChange: (id: string, value: string) => void;
  error?: string;
}> = ({ field, value, onChange, error }) => {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      onChange(field.id, e.target.value);
    },
    [field.id, onChange]
  );

  const labelBlock = (
    <div className="documents-form__field">
      <span className="documents-form__label">
        {field.label}
        {field.required && <span className="documents-form__required"> *</span>}
      </span>
      {field.hint && <span className="documents-form__hint">{field.hint}</span>}
      {error && <span className="documents-form__error">{error}</span>}
    </div>
  );

  if (field.type === 'select') {
    return (
      <div className="documents-form__field-wrapper">
        {labelBlock}
        <select
          className="ui-control documents-form__select"
          value={value}
          onChange={handleChange}
          aria-invalid={!!error}
        >
          <option value="">– Bitte wählen –</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div className="documents-form__field-wrapper">
        {labelBlock}
        <textarea
          className="ui-control documents-form__textarea"
          value={value}
          onChange={handleChange}
          rows={3}
          aria-invalid={!!error}
        />
      </div>
    );
  }

  if (field.type === 'date') {
    return (
      <div className="documents-form__field-wrapper">
        {labelBlock}
        <TextInput
          type="date"
          value={value}
          onChange={handleChange}
          max={field.max}
          aria-invalid={!!error}
        />
      </div>
    );
  }

  return (
    <div className="documents-form__field-wrapper">
      {labelBlock}
      <TextInput
        type={field.type === 'number' ? 'number' : 'text'}
        value={value}
        onChange={handleChange}
        aria-invalid={!!error}
      />
    </div>
  );
};

export const ParentLeaveFormPage: React.FC = () => {
  const { goTo } = useNavigation();
  const { t } = useI18n();
  const { showToast } = useNotifications();
  const [values, setValues] = useState<ParentLeaveFormValues>(INITIAL_FORM_VALUES);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const visibleFields = useMemo(
    () => getVisibleFields(values).filter((f) => f.id !== 'requestType'),
    [values]
  );
  const durationDisplay = useMemo(() => getDurationDisplay(values), [values]);

  const handleFieldChange = useCallback((id: string, value: string) => {
    setValues((prev) => ({ ...prev, [id]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    const validationErrors = validateParentLeaveForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      if (import.meta.env.DEV) {
        console.group('[parental-leave] create document');
        console.log('requestType', values.requestType);
        console.log('values', values);
      }

      const doc = buildParentLeaveDocument(values);
      const bodyStr = doc?.body ?? '';
      const blob = new Blob([bodyStr], { type: 'text/plain;charset=utf-8' });

      if (import.meta.env.DEV) {
        console.log('document built', { title: doc.title, bodyLength: bodyStr.length });
      }

      await addDocument({
        title: doc.title || 'Elternzeit-Antrag',
        createdAt: doc.createdAtIso,
        mimeType: 'text/plain',
        blob,
      });

      if (import.meta.env.DEV) {
        console.log('document saved');
        console.groupEnd();
      }

      showToast('documents.parentalLeave.created', { kind: 'success', durationMs: 5000 });
      setShowSuccess(true);
    } catch (err) {
      console.error('[parental-leave] document creation failed', err);
      setErrors({
        submit: 'Das Dokument konnte nicht erstellt werden. Bitte prüfe deine Angaben.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [values, showToast]);

  if (showSuccess) {
    return (
      <div className="screen-placeholder documents-form-screen">
        <section className="next-steps next-steps--plain documents-form__section">
          <SectionHeader as="h1" title="Elternzeit-Antrag" />
          <Card className="still-daily-checklist__card documents-form__card documents-form__success-card">
            <p className="documents-form__success-text">{t('documents.parentalLeave.created')}</p>
            <Button
              type="button"
              variant="primary"
              fullWidth
              className="next-steps__button btn--softpill"
              onClick={() => goTo('/documents')}
            >
              {t('documents.parentalLeave.goToDocuments')}
            </Button>
          </Card>
        </section>
      </div>
    );
  }

  const showDuration = useMemo(() => {
    if (values.requestType === 'change_extend_end_early') {
      return values.previousStartDate && values.previousEndDate;
    }
    if (values.requestType === 'late_period') {
      return values.requestedLateStartDate && values.requestedLateEndDate;
    }
    return (
      (values.requestType === 'basic_leave' || values.requestType === 'leave_with_part_time') &&
      values.startDate &&
      values.endDate
    );
  }, [values]);

  return (
    <div className="screen-placeholder documents-form-screen">
      <section className="next-steps next-steps--plain documents-form__section">
        <SectionHeader as="h1" title="Elternzeit-Antrag" />
        <Card className="still-daily-checklist__card documents-form__card">
          <div className="documents-form__fields">
            <div className="request-type-group" role="radiogroup" aria-label="Art des Antrags">
              <span className="documents-form__label" style={{ marginBottom: '0.5rem' }}>
                Art des Antrags <span className="documents-form__required">*</span>
              </span>
              <span className="documents-form__hint" style={{ marginBottom: '0.5rem' }}>
                Wähle die Situation, die am besten zu deinem Anliegen passt.
              </span>
              {REQUEST_TYPE_OPTIONS_UI.map((option) => {
                const isSelected = values.requestType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-invalid={!!errors.requestType}
                    className={`request-type-option${isSelected ? ' request-type-option--selected' : ''}`}
                    onClick={() => handleFieldChange('requestType', option.value)}
                  >
                    <span className="request-type-option__title">{option.label}</span>
                    <span className="request-type-option__description">{option.description}</span>
                  </button>
                );
              })}
              {errors.requestType && (
                <span className="documents-form__error documents-form__error--block">
                  {errors.requestType}
                </span>
              )}
            </div>

            {visibleFields.map((field) => (
              <FormField
                key={field.id}
                field={field}
                value={values[field.id as keyof ParentLeaveFormValues] ?? ''}
                onChange={handleFieldChange}
                error={errors[field.id]}
              />
            ))}

            {showDuration && durationDisplay && (
              <div className="documents-form__duration">
                <span className="documents-form__label">Dauer der Elternzeit</span>
                <span className="documents-form__duration-value">{durationDisplay}</span>
              </div>
            )}
          </div>

          {errors.submit && (
            <p className="documents-form__submit-error">{errors.submit}</p>
          )}

          <Button
            type="button"
            variant="primary"
            fullWidth
            className="next-steps__button btn--softpill"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            Dokument erstellen
          </Button>
        </Card>
      </section>
    </div>
  );
};
