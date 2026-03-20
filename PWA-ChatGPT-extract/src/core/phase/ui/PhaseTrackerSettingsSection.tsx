import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import { TextInput } from '../../../shared/ui/TextInput';
import { useI18n } from '../../../shared/lib/i18n';
import { usePhase } from '../usePhase';
import { incrementProgressActionCount } from '../../begleitungPlus/upgradeTriggersStore';
import { getChildDateContext } from '../../../shared/lib/childDateContext';
import type { PhaseMode } from '../types';
import '../../../modules/checklists/styles/softpill-buttons-in-cards.css';
import '../../../modules/checklists/styles/softpill-cards.css';

function toIsoDateOnly(val: string): string {
  if (!val || val.length < 10) return '';
  return val.slice(0, 10);
}

export const PhaseTrackerSettingsSection: React.FC = () => {
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
    incrementProgressActionCount();
  };

  const handleClear = () => {
    actions.clear();
    setMode('pregnancy');
    setDueDate('');
    setBirthDate('');
  };

  return (
    <Card className="still-daily-checklist__card">
      <div className="settings-section">
        <h3 className="settings-layout__section-title">{t('phaseTracker.settings.title')}</h3>
        <div className="settings-section__content">
          <div className="settings-field" role="radiogroup" aria-label={t('phaseTracker.settings.modeLabel')}>
            <label className="settings-radio">
              <input
                type="radio"
                name="phaseMode"
                value="pregnancy"
                checked={mode === 'pregnancy'}
                onChange={() => setMode('pregnancy')}
              />
              <span>{t('phaseTracker.settings.modePregnancy')}</span>
            </label>
            <label className="settings-radio">
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
            <div className="settings-field">
              <label htmlFor="phase-due-date" className="settings-section__label">
                {t('phaseTracker.settings.dueDateLabel')}
              </label>
              <TextInput
                id="phase-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                max="2100-12-31"
              />
            </div>
          )}

          {mode === 'postpartum' && (
            <div className="settings-field">
              <label htmlFor="phase-birth-date" className="settings-section__label">
                {t('phaseTracker.settings.birthDateLabel')}
              </label>
              <TextInput
                id="phase-birth-date"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
              />
            </div>
          )}

          <p className="settings-layout__muted">{t('phaseTracker.settings.hint')}</p>

          <div className="settings-section__row settings-section__row--column" style={{ gap: '0.5rem' }}>
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
                onClick={handleClear}
              >
                {t('phaseTracker.settings.reset')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
