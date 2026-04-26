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
  parseParentLeaveHours,
  sumPartTimeDayHours,
  getParentLeaveFieldLabel,
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
import './ParentLeaveFormPage.css';
import '../../../styles/softpill-buttons-in-cards.css';
import '../../../styles/softpill-cards.css';

function parentLeaveFieldRootId(fieldId: string): string {
  return `parent-leave-field-${fieldId}`;
}

function focusParentLeaveField(fieldId: string): void {
  const root = document.getElementById(parentLeaveFieldRootId(fieldId));
  if (!root) return;
  const focusable = root.querySelector<HTMLElement>(
    'input:not([type="hidden"]), textarea, button.selection-field__trigger, button.request-type-option, select'
  );
  const el = focusable ?? root;
  el.focus();
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function buildParentLeaveFocusFieldOrder(
  values: ParentLeaveFormValues,
  visibleFields: FormFieldConfig[]
): string[] {
  const out: string[] = ['requestType'];
  for (const f of visibleFields) {
    if (f.id === 'optionalDesiredSchedule' && values.requestType === 'leave_with_part_time') {
      out.push('weeklyHours', 'workDistribution');
    }
    out.push(f.id);
  }
  return out;
}

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

const WEEKLY_HOUR_CHIPS = [15, 20, 25, 30] as const;

function formatHourAmountForUi(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '0';
  const rounded = Math.round(n * 100) / 100;
  if (Number.isInteger(rounded)) return String(Math.round(rounded));
  return String(rounded).replace('.', ',');
}

const PART_TIME_DAY_ROWS: { id: keyof ParentLeaveFormValues; label: string }[] = [
  { id: 'workDistributionMonday', label: 'Montag' },
  { id: 'workDistributionTuesday', label: 'Dienstag' },
  { id: 'workDistributionWednesday', label: 'Mittwoch' },
  { id: 'workDistributionThursday', label: 'Donnerstag' },
  { id: 'workDistributionFriday', label: 'Freitag' },
];

const PartTimeScheduleFields: React.FC<{
  values: ParentLeaveFormValues;
  onChange: (id: string, value: string) => void;
  errors: Record<string, string>;
}> = ({ values, onChange, errors }) => {
  const mode = values.workDistributionMode || 'even';
  const weeklyNum = parseParentLeaveHours(values.weeklyHours);
  const perDayEven =
    weeklyNum > 0 ? Math.round((weeklyNum / 5) * 100) / 100 : null;
  const perDayDisplay =
    perDayEven != null
      ? Number.isInteger(perDayEven)
        ? String(perDayEven)
        : String(perDayEven).replace('.', ',')
      : null;
  const sumDays = sumPartTimeDayHours(values);
  const weeklyTargetLabel =
    weeklyNum > 0 ? formatHourAmountForUi(weeklyNum) : '–';
  const sumMismatch =
    mode === 'individual' &&
    weeklyNum > 0 &&
    sumDays > 0 &&
    Math.abs(sumDays - weeklyNum) > 0.051;

  return (
    <div className="documents-form__part-time-block">
      <div className="documents-form__field-wrapper" id={parentLeaveFieldRootId('weeklyHours')}>
        <div className="documents-form__field">
          <span className="documents-form__label">
            Wochenstunden <span className="documents-form__required"> *</span>
          </span>
          <span className="documents-form__hint">
            Wie viele Stunden pro Woche möchtest du während der Elternzeit arbeiten?
          </span>
          {errors.weeklyHours && <span className="documents-form__error">{errors.weeklyHours}</span>}
        </div>
        <TextInput
          type="number"
          inputMode="decimal"
          min={0}
          max={60}
          step={1}
          value={values.weeklyHours}
          onChange={(e) => onChange('weeklyHours', e.target.value)}
          placeholder="z. B. 20"
          aria-invalid={!!errors.weeklyHours}
        />
        <div className="documents-form__quick-select documents-form__quick-select--tight">
          <div className="documents-form__quick-select-buttons">
            {WEEKLY_HOUR_CHIPS.map((h) => {
              const active = weeklyNum > 0 && Math.abs(weeklyNum - h) < 0.001;
              return (
                <button
                  key={h}
                  type="button"
                  className={`btn btn--softpill btn--secondary documents-form__quick-select-btn${active ? ' documents-form__quick-select-btn--active' : ''}`}
                  onClick={() => onChange('weeklyHours', String(h))}
                >
                  {h}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div
        className="documents-form__field-wrapper documents-form__part-time-distribution"
        id={parentLeaveFieldRootId('workDistribution')}
      >
        <span className="documents-form__label">Verteilung der Arbeitszeit</span>
        {errors.workDistribution && (
          <span className="documents-form__error">{errors.workDistribution}</span>
        )}
        <div className="documents-form__part-time-mode" role="radiogroup" aria-label="Verteilung der Arbeitszeit">
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'even'}
            className={`request-type-option request-type-option--compact${mode === 'even' ? ' request-type-option--selected' : ''}`}
            onClick={() => onChange('workDistributionMode', 'even')}
          >
            <span className="request-type-option__title">Gleichmäßig verteilt</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'individual'}
            className={`request-type-option request-type-option--compact${mode === 'individual' ? ' request-type-option--selected' : ''}`}
            onClick={() => onChange('workDistributionMode', 'individual')}
          >
            <span className="request-type-option__title">Individuell festlegen</span>
          </button>
        </div>

        {mode === 'even' && (
          <div className="documents-form__part-time-preview">
            <p className="documents-form__part-time-preview-line">Montag bis Freitag gleichmäßig verteilt</p>
            {perDayDisplay != null && (
              <p className="documents-form__part-time-preview-line documents-form__part-time-preview-line--emph">
                Bei {formatHourAmountForUi(weeklyNum)} Stunden: ca. {perDayDisplay} Stunden pro Tag
              </p>
            )}
          </div>
        )}

        {mode === 'individual' && (
          <div className="documents-form__part-time-days">
            {PART_TIME_DAY_ROWS.map((row) => (
              <div key={row.id} className="documents-form__part-time-day-row">
                <span className="documents-form__part-time-day-label">{row.label}</span>
                <TextInput
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={24}
                  step={0.5}
                  className="documents-form__part-time-day-input"
                  value={String(values[row.id] ?? '')}
                  onChange={(e) => onChange(row.id, e.target.value)}
                  placeholder="0"
                  aria-label={`${row.label} Stunden`}
                />
              </div>
            ))}
            <p className="documents-form__part-time-sum">
              Gesamt: {formatHourAmountForUi(sumDays)} von {weeklyTargetLabel} Wochenstunden
            </p>
            {sumMismatch && (
              <p className="documents-form__hint documents-form__hint--soft">
                Die Summe sollte zu deinen Wochenstunden passen.
              </p>
            )}
          </div>
        )}
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
  /** Erstes sichtbares Feld: Fokus/Scroll nach Antragsart-Wahl (nur UI). */
  focusRef?: React.MutableRefObject<HTMLElement | null>;
}> = ({ field, value, onChange, error, min, max, disabled, focusRef }) => {
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
      <div className="documents-form__field-wrapper" id={parentLeaveFieldRootId(field.id)}>
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
          triggerRef={
            focusRef
              ? (el) => {
                  focusRef.current = el;
                }
              : undefined
          }
        />
      </div>
    );
  }

  if (field.type === 'textarea') {
    return (
      <div className="documents-form__field-wrapper" id={parentLeaveFieldRootId(field.id)}>
        {labelBlock}
        <textarea
          ref={
            focusRef
              ? (el) => {
                  focusRef.current = el;
                }
              : undefined
          }
          className="ui-control documents-form__textarea"
          value={value}
          onChange={handleChange}
          rows={3}
          placeholder={field.placeholder ?? ''}
          aria-invalid={!!error}
        />
      </div>
    );
  }

  if (field.type === 'date') {
    return (
      <div
        className={`documents-form__field-wrapper${disabled ? ' documents-form__field-wrapper--disabled' : ''}`}
        id={parentLeaveFieldRootId(field.id)}
      >
        {labelBlock}
        <TextInput
          ref={
            focusRef
              ? (el) => {
                  focusRef.current = el;
                }
              : undefined
          }
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
    <div className="documents-form__field-wrapper" id={parentLeaveFieldRootId(field.id)}>
      {labelBlock}
      <TextInput
        ref={
          focusRef
            ? (el) => {
                focusRef.current = el;
              }
            : undefined
        }
        type={field.type === 'number' ? 'number' : 'text'}
        value={value}
        onChange={handleChange}
        placeholder={field.placeholder}
        aria-invalid={!!error}
      />
    </div>
  );
};

export const ParentLeaveFormPage: React.FC = () => {
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
  /** Hinweis bei PDF-Klick mit unvollständiger Validierung (kein alert). */
  const [validationBanner, setValidationBanner] = useState<{ missingLabels: string[] } | null>(null);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  /** Erstes sichtbares Feld nach Wahl der Antragsart (DOM nach Commit fokussieren). */
  const firstVisibleFieldRef = useRef<HTMLElement | null>(null);

  const focusFirstVisibleFieldAfterPaint = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = firstVisibleFieldRef.current;
        if (!el) return;
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }, []);

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
    setValidationBanner(null);
    setValues((prev) => {
      let next: ParentLeaveFormValues = { ...prev, [id]: value };
      if (id === 'requestType') {
        if (value === 'leave_with_part_time' && prev.requestType !== 'leave_with_part_time') {
          next = {
            ...next,
            workDistributionMode: 'even',
            weeklyHours: '',
            workDistribution: '',
            workDistributionMonday: '',
            workDistributionTuesday: '',
            workDistributionWednesday: '',
            workDistributionThursday: '',
            workDistributionFriday: '',
          };
        }
      }
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
      if (id.startsWith('workDistribution')) delete next.workDistribution;
      if (id === 'birthDate') delete next.expectedBirthDate;
      if (id === 'expectedBirthDate') delete next.birthDate;
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    const validationErrors = validateParentLeaveForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const order = buildParentLeaveFocusFieldOrder(values, visibleFields);
      const orderedErrIds = [
        ...order.filter((fid) => validationErrors[fid]),
        ...Object.keys(validationErrors).filter((k) => k !== 'submit' && !order.includes(k)),
      ];
      const missingLabels = [...new Set(orderedErrIds.map((fid) => getParentLeaveFieldLabel(fid)))];
      setValidationBanner({ missingLabels });
      const firstId =
        order.find((fid) => validationErrors[fid]) ??
        Object.keys(validationErrors).find((k) => k !== 'submit') ??
        null;
      if (firstId) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            focusParentLeaveField(firstId);
          });
        });
      }
      return;
    }

    setValidationBanner(null);
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
  }, [values, showToast, visibleFields]);

  if (showSuccess) {
    return (
      <div className="screen-placeholder parental-leave-screen documents-form-screen">
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
    <div className="screen-placeholder parental-leave-screen documents-form-screen">
      <section className="next-steps next-steps--plain documents-form__section">
        <SectionHeader as="h1" title="Elternzeit-Antrag" />
        <Card className="still-daily-checklist__card documents-form__card">
          <div className="documents-form__fields">
            <div
              className="request-type-group"
              id={parentLeaveFieldRootId('requestType')}
              role="radiogroup"
              aria-label="Art des Antrags"
            >
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
                    onClick={() => {
                      handleFieldChange('requestType', option.value);
                      focusFirstVisibleFieldAfterPaint();
                    }}
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

            {visibleFields.map((field, index) => {
              const minVal = field.getMin?.(values) ?? field.min;
              const maxVal = field.getMax?.(values) ?? field.max;
              const isBirthDateField = field.id === 'birthDate';
              const isExpectedField = field.id === 'expectedBirthDate';
              const disabled =
                (isBirthDateField && isBirthDateDisabled(values.birthDate, values.expectedBirthDate)) ||
                (isExpectedField && isExpectedBirthDateDisabled(values.birthDate, values.expectedBirthDate));
              return (
                <React.Fragment key={field.id}>
                  {field.id === 'optionalDesiredSchedule' &&
                    values.requestType === 'leave_with_part_time' && (
                      <PartTimeScheduleFields
                        values={values}
                        onChange={handleFieldChange}
                        errors={errors}
                      />
                    )}
                  <FormField
                    field={field}
                    value={values[field.id as keyof ParentLeaveFormValues] ?? ''}
                    onChange={handleFieldChange}
                    error={errors[field.id]}
                    min={minVal}
                    max={maxVal}
                    disabled={disabled}
                    focusRef={index === 0 ? firstVisibleFieldRef : undefined}
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

          {validationBanner && (
            <div className="documents-form__validation-banner" role="alert" aria-live="polite">
              <p className="documents-form__validation-banner__title">
                Bitte fülle zuerst alle Pflichtfelder aus.
              </p>
              {validationBanner.missingLabels.length > 0 && (
                <p className="documents-form__validation-banner__detail">
                  Es fehlen noch: {validationBanner.missingLabels.join(', ')}
                </p>
              )}
            </div>
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
