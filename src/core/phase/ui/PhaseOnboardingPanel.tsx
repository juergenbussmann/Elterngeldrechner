import React, { useState, useMemo, useEffect } from 'react';
import { useI18n } from '../../../shared/lib/i18n';
import { Button } from '../../../shared/ui/Button';
import { TextInput } from '../../../shared/ui/TextInput';
import { Card } from '../../../shared/ui/Card';
import { usePhase } from '../usePhase';
import type { PhaseMode } from '../types';
import { getChildDateContext } from '../../../shared/lib/childDateContext';
import './PhaseOnboardingPanel.css';

export interface PhaseOnboardingPanelProps {
  onClose: () => void;
}

function toIsoDateOnly(val: string): string {
  if (!val || val.length < 10) return '';
  return val.slice(0, 10);
}

export const PhaseOnboardingPanel: React.FC<PhaseOnboardingPanelProps> = ({ onClose }) => {
  const { t } = useI18n();
  const { profile, actions } = usePhase();
  const child = getChildDateContext(profile);

  const [mode, setMode] = useState<PhaseMode>(() =>
    child.birthDate ? 'postpartum' : 'pregnancy'
  );
  const [dueDate, setDueDate] = useState(() =>
    child.expectedBirthDate ?? ''
  );
  const [birthDate, setBirthDate] = useState(() =>
    child.birthDate ?? ''
  );

  useEffect(() => {
    const c = getChildDateContext(profile);
    setMode(c.birthDate ? 'postpartum' : 'pregnancy');
    setDueDate(c.expectedBirthDate ?? '');
    setBirthDate(c.birthDate ?? '');
  }, [profile]);

  const canSave = useMemo(() => {
    if (mode === 'pregnancy') return !!dueDate.trim();
    return !!birthDate.trim();
  }, [mode, dueDate, birthDate]);

  const handleSave = () => {
    if (!canSave) return;
    if (mode === 'pregnancy') {
      actions.setMode('pregnancy');
      actions.setDueDate(toIsoDateOnly(dueDate));
    } else {
      actions.setMode('postpartum');
      actions.setBirthDate(toIsoDateOnly(birthDate));
    }
    onClose();
  };

  const handleLater = () => {
    try {
      localStorage.setItem('app_phase_onboarding_dismissed_v1', '1');
    } catch {
      // ignore
    }
    onClose();
  };

  return (
    <Card className="phase-onboarding-panel">
      <h2 className="phase-onboarding-panel__title">{t('phaseTracker.onboarding.title')}</h2>
      <p className="phase-onboarding-panel__subtitle">{t('phaseTracker.onboarding.subtitle')}</p>

      <div className="phase-onboarding-panel__mode" role="radiogroup" aria-label={t('phaseTracker.settings.modeLabel')}>
        <label className="phase-onboarding-panel__radio">
          <input
            type="radio"
            name="phaseMode"
            value="pregnancy"
            checked={mode === 'pregnancy'}
            onChange={() => setMode('pregnancy')}
          />
          <span>{t('phaseTracker.settings.modePregnancy')}</span>
        </label>
        <label className="phase-onboarding-panel__radio">
          <input
            type="radio"
            name="phaseMode"
            value="postpartum"
            checked={mode === 'postpartum'}
            onChange={() => setMode('postpartum')}
          />
          <span>{t('phaseTracker.settings.modePostpartum')}</span>
        </label>
      </div>

      {mode === 'pregnancy' && (
        <div className="phase-onboarding-panel__field">
          <label htmlFor="onboarding-due-date" className="phase-onboarding-panel__label">
            {t('phaseTracker.settings.dueDateLabel')}
          </label>
          <TextInput
            id="onboarding-due-date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            max="2100-12-31"
          />
        </div>
      )}

      {mode === 'postpartum' && (
        <div className="phase-onboarding-panel__field">
          <label htmlFor="onboarding-birth-date" className="phase-onboarding-panel__label">
            {t('phaseTracker.settings.birthDateLabel')}
          </label>
          <TextInput
            id="onboarding-birth-date"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
        </div>
      )}

      <p className="phase-onboarding-panel__hint">{t('phaseTracker.onboarding.hint')}</p>

      <div className="phase-onboarding-panel__actions">
        <Button
          type="button"
          variant="primary"
          fullWidth
          className="btn--softpill"
          onClick={handleSave}
          disabled={!canSave}
        >
          {t('settings.save')}
        </Button>
        {profile && (
          <Button
            type="button"
            variant="secondary"
            fullWidth
            className="btn--softpill"
            onClick={() => {
              actions.clear();
              setMode('pregnancy');
              setDueDate('');
              setBirthDate('');
            }}
          >
            {t('phaseTracker.settings.reset')}
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          fullWidth
          className="btn--softpill"
          onClick={handleLater}
        >
          {t('phaseTracker.onboarding.later')}
        </Button>
      </div>
    </Card>
  );
};
