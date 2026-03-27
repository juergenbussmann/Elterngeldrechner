import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { SectionHeader } from '../../../shared/ui/SectionHeader';
import { Button } from '../../../shared/ui/Button';
import { Card } from '../../../shared/ui/Card';
import { TextInput } from '../../../shared/ui/TextInput';
import { SelectionField } from '../../../shared/ui/SelectionModal';
import { usePhase } from '../../../core/phase/usePhase';
import { useNavigation } from '../../../shared/lib/navigation/useNavigation';
import { getInitialBirthDateValues, isBirthDateDisabled, isExpectedBirthDateDisabled, applyBirthDateChange, applyExpectedBirthDateChange } from '../../../shared/lib/birthDateFields';
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
import { getDurationDisplay, addYearsSafe } from './parentalLeaveHelpers';
import {
  getParentalLeaveTimingInfo,
  getParentalLeaveDeadlineInfo,
} from './parentalLeaveTiming';
import { getParentLeaveLetterContent } from './buildParentLeaveDocument';
import { buildParentLeavePdf } from './buildParentLeavePdf';
import { addDocument } from '../application/service';
import { useBegleitungPlus } from '../../../core/begleitungPlus';
import { ElterngeldFlowAccessBlocked } from '../elterngeld/ElterngeldFlowAccessBlocked';
import './ParentLeaveFormPage.css';
import '../../../styles/softpill-buttons-in-cards.css';
import '../../../styles/softpill-cards.css';

const QuickSelectYears: React.FC<{
  startDate: string;
  onSelectEndDate: (date: string) => void;
}> = ({ startDate, onSelectEndDate }) => {
  const hasStart = !!startDate?.trim();
  const handleClick = useCallback(
    (years: number) => {
      const end = addYearsSafe(startDate, years);
      if (end) onSelectEndDate(end);
    },
    [startDate, onSelectEndDate]
  );
  return (
    <div className="documents-form__quick-select">
      <span className="documents-form__label documents-form__quick-select-label">
        Schnellauswahl Dauer
      </span>
      {!hasStart && (
        <span className="documents-form__hint documents-form__quick-select-hint">
          Bitte zuerst ein Startdatum wählen.
        </span>
      )}
      <div className="documents-form__quick-select-buttons">
        {([1, 2, 3] as const).map((y) => (
          <button
            key={y}
            type="button"
            className="btn btn--softpill btn--secondary documents-form__quick-select-btn"
            disabled={!hasStart}
            onClick={() => handleClick(y)}
          >
            {y} {y === 1 ? 'Jahr' : 'Jahre'}
          </button>
        ))}
      </div>
    </div>
  );
};

const FormField: React.FC<{
  field: FormFieldConfig;
  value: string;
  onChange: (id: string, value: string) => void;
  error?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
}> = ({ field, value, onChange, error, min, max, disabled }) => {
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
    const options = (field.options ?? []).map((o) => ({ value: o.value, label: o.label }));
    return (
      <div className="documents-form__field-wrapper">
        <SelectionField
          label={field.label}
          placeholder="– Bitte wählen –"
          value={value}
          options={options}
          onChange={(v) => onChange(field.id, v)}
          required={field.required}
          error={error}
          hint={field.hint}
          variant="documents-form"
        />
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
      <div className={`documents-form__field-wrapper${disabled ? ' documents-form__field-wrapper--disabled' : ''}`}>
        {labelBlock}
        <TextInput
          type="date"
          value={value}
          onChange={handleChange}
          min={min}
          max={max}
          disabled={disabled}
          aria-invalid={!!error}
          aria-disabled={disabled}
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
  const { isPlus, isYearly, planType } = useBegleitungPlus();
  console.log('ENTRY CHECK', { isPlus, planType, isYearly });
  if (!isPlus || !isYearly) {
    console.log('GATING CHECK', { isPlus, planType, isYearly });
    return (
      <ElterngeldFlowAccessBlocked
        variant={isPlus ? 'monthly' : 'free'}
        screenTitleKey="documents.parentalLeave.accessGate.title"
        plusUpsellReason="parental_leave_yearly_gate"
      />
    );
  }
  return <ParentLeaveFormPageBody />;
};

const ParentLeaveFormPageBody: React.FC = () => {
  const { profile, actions } = usePhase();
  const { goTo } = useNavigation();
  const { t } = useI18n();
  const { showToast } = useNotifications();
  const [values, setValues] = useState<ParentLeaveFormValues>(() => {
    const initial = INITIAL_FORM_VALUES;
    const childDates = getInitialBirthDateValues(profile, {
      birthDate: initial.birthDate,
      expectedBirthDate: initial.expectedBirthDate,
    });
    return { ...initial, ...childDates };
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  // Profil → Formular: Wenn Profil sich ändert (z.B. in Einstellungen), Datumsfelder nachziehen
  useEffect(() => {
    const expected = getInitialBirthDateValues(profile, undefined);
    const current = valuesRef.current;
    const currentBirth = current.birthDate?.trim() || '';
    const currentExpected = current.expectedBirthDate?.trim() || '';
    const needsUpdate =
      (expected.birthDate !== currentBirth) || (expected.expectedBirthDate !== currentExpected);
    if (needsUpdate) {
      setValues((prev) => ({ ...prev, birthDate: expected.birthDate, expectedBirthDate: expected.expectedBirthDate }));
    }
  }, [profile]);

  // Formular → Profil: Bei Änderung von birthDate/expectedBirthDate sofort ins Profil syncen (wie ElterngeldWizardPage)
  useEffect(() => {
    const bd = values.birthDate?.trim();
    const ebd = values.expectedBirthDate?.trim();
    if (bd) {
      actions.setBirthDate(bd);
    } else if (ebd) {
      actions.setDueDate(ebd);
    } else {
      actions.clear();
    }
  }, [values.birthDate, values.expectedBirthDate, actions]);

  const visibleFields = useMemo(
    () => getVisibleFields(values).filter((f) => f.id !== 'requestType'),
    [values]
  );
  const durationDisplay = useMemo(
    () => getDurationDisplay(values as Parameters<typeof getDurationDisplay>[0]),
    [values]
  );
  const showDuration = useMemo(() => !!durationDisplay, [durationDisplay]);

  const timingInfo = useMemo(() => getParentalLeaveTimingInfo(values), [values]);
  const deadlineInfo = useMemo(() => getParentalLeaveDeadlineInfo(values), [values]);

  const handleFieldChange = useCallback((id: string, value: string) => {
    setValues((prev) => {
      let next = { ...prev, [id]: value };
      if (id === 'birthDate') {
        const applied = applyBirthDateChange(value, prev.expectedBirthDate);
        next = { ...next, birthDate: applied.birthDate, expectedBirthDate: applied.expectedBirthDate };
      } else if (id === 'expectedBirthDate') {
        const applied = applyExpectedBirthDateChange(prev.birthDate, value);
        next = { ...next, birthDate: applied.birthDate, expectedBirthDate: applied.expectedBirthDate };
      }
      return next;
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      if (id === 'birthDate') delete next.expectedBirthDate;
      if (id === 'expectedBirthDate') delete next.birthDate;
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
        console.time('[documents] PDF build (ParentLeave)');
      }
      const letterContent = getParentLeaveLetterContent(values);
      const blob = buildParentLeavePdf(letterContent);
      if (import.meta.env.DEV) {
        console.timeEnd('[documents] PDF build (ParentLeave)');
      }

      await addDocument({
        title: letterContent.title || 'Elternzeit-Antrag',
        createdAt: letterContent.createdAtIso,
        mimeType: 'application/pdf',
        blob,
      });

      showToast('documents.parentalLeave.pdfCreated', { kind: 'success', durationMs: 5000 });
      setShowSuccess(true);
    } catch (err) {
      console.error('[parental-leave] PDF creation failed', err);
      setErrors({
        submit: 'Das PDF konnte nicht erstellt werden. Bitte prüfe deine Angaben.',
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
            <p className="documents-form__success-text">{t('documents.parentalLeave.pdfCreated')}</p>
            <Button
              type="button"
              variant="primary"
              fullWidth
              className="next-steps__button btn--softpill"
              onClick={() => goTo('/documents')}
            >
              {t('documents.parentalLeave.goToDocuments')}
            </Button>
            <p className="documents-form__success-next">Als Nächstes wichtig: Elterngeld vorbereiten</p>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              className="next-steps__button btn--softpill"
              onClick={() => goTo('/documents/elterngeld')}
            >
              Elterngeld starten
            </Button>
          </Card>
        </section>
      </div>
    );
  }

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

            {visibleFields.map((field) => {
              const minVal = field.getMin?.(values) ?? field.min;
              const maxVal = field.getMax?.(values) ?? field.max;
              const isBirthDateField = field.id === 'birthDate';
              const isExpectedField = field.id === 'expectedBirthDate';
              const disabled =
                (isBirthDateField && isBirthDateDisabled(values.birthDate, values.expectedBirthDate)) ||
                (isExpectedField && isExpectedBirthDateDisabled(values.birthDate, values.expectedBirthDate));
              return (
                <React.Fragment key={field.id}>
                  <FormField
                    field={field}
                    value={values[field.id as keyof ParentLeaveFormValues] ?? ''}
                    onChange={handleFieldChange}
                    error={errors[field.id]}
                    min={minVal}
                    max={maxVal}
                    disabled={disabled}
                  />
                  {field.id === 'startDate' &&
                    (values.requestType === 'basic_leave' ||
                      values.requestType === 'leave_with_part_time') && (
                      <QuickSelectYears
                        startDate={values.startDate}
                        onSelectEndDate={(date) => handleFieldChange('endDate', date)}
                      />
                    )}
                  {(field.id === 'endDate' &&
                    (values.requestType === 'basic_leave' ||
                      values.requestType === 'leave_with_part_time')) ||
                  (field.id === 'requestedLateEndDate' && values.requestType === 'late_period')
                    ? (deadlineInfo.noticeDeadlineLabel ||
                        deadlineInfo.dismissalProtectionLabel ||
                        timingInfo.noticeWarning ||
                        timingInfo.dismissalProtectionHint) && (
                        <div className="documents-form__timing">
                          {(deadlineInfo.noticeDeadlineLabel ||
                            deadlineInfo.dismissalProtectionLabel) && (
                            <div className="documents-form__deadline">
                              {deadlineInfo.noticeDeadlineLabel && (
                                <p className="documents-form__deadline-line">
                                  {deadlineInfo.noticeDeadlineLabel}
                                </p>
                              )}
                              {deadlineInfo.dismissalProtectionLabel && (
                                <p className="documents-form__deadline-line">
                                  {deadlineInfo.dismissalProtectionLabel}
                                </p>
                              )}
                              {deadlineInfo.pastDeadlineHint && (
                                <p className="documents-form__deadline-line documents-form__deadline-hint">
                                  {deadlineInfo.pastDeadlineHint}
                                </p>
                              )}
                            </div>
                          )}
                          {timingInfo.noticeWarning && (
                            <div className="form-warning">
                              <span className="form-warning__icon" aria-hidden="true">
                                ⚠️
                              </span>
                              <span className="form-warning__text">
                                {timingInfo.noticeWarning}
                              </span>
                            </div>
                          )}
                          {timingInfo.dismissalProtectionHint && (
                            <div className="form-warning">
                              <span className="form-warning__icon" aria-hidden="true">
                                ⚠️
                              </span>
                              <span className="form-warning__text">
                                {timingInfo.dismissalProtectionHint}
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    : null}
                </React.Fragment>
              );
            })}

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
            Antrag als PDF erstellen
          </Button>
        </Card>
      </section>
    </div>
  );
};
