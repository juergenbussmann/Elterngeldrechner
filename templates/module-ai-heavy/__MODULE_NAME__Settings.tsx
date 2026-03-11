import React, { useState } from 'react';
import { Card } from '../../shared/ui/Card';
import { TextInput } from '../../shared/ui/TextInput';
import { Button } from '../../shared/ui/Button';
import { useI18n } from '../../shared/lib/i18n';
import { useNotifications } from '../../shared/lib/notifications';

// TODO: vervang met je module-id en gewenste storage/telemetry-keys.
const MODULE_ID = '__MODULE_ID__';
const SETTINGS_STORAGE_KEY = `modules.__MODULE_ID__.settings`;

export const __MODULE_NAME__Settings: React.FC = () => {
  const { t } = useI18n();
  const { showToast } = useNotifications();

  const [autoRunPipeline, setAutoRunPipeline] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [intensity, setIntensity] = useState<'light' | 'normal' | 'aggressive'>('normal');
  const [defaultPrompt, setDefaultPrompt] = useState('');

  return (
    <Card>
      <form
        className="settings-section"
        onSubmit={(event) => {
          event.preventDefault();
          // TODO: sla settings op (storage/backend) en koppel aan pipeline/AI gedrag.
          showToast('notifications.moduleSettingsSaved', { kind: 'success' });
        }}
      >
        <div>
          <h3 className="settings-layout__section-title">
            {t('modules.__MODULE_ID__.settings.title')}
          </h3>
          <p className="settings-layout__muted">{t('modules.__MODULE_ID__.settings.description')}</p>
        </div>

        <label className="settings-field">
          <span>{t('modules.__MODULE_ID__.settings.autoRunPipelineLabel')}</span>
          <div className="settings-checkbox">
            <input
              type="checkbox"
              checked={autoRunPipeline}
              onChange={(event) => setAutoRunPipeline(event.target.checked)}
            />
            <span className="settings-layout__muted">
              {autoRunPipeline
                ? t('modules.__MODULE_ID__.settings.autoRunOn')
                : t('modules.__MODULE_ID__.settings.autoRunOff')}
            </span>
          </div>
        </label>

        <label className="settings-field">
          <span>{t('modules.__MODULE_ID__.settings.aiEnabledLabel')}</span>
          <div className="settings-checkbox">
            <input
              type="checkbox"
              checked={aiEnabled}
              onChange={(event) => setAiEnabled(event.target.checked)}
            />
            <span className="settings-layout__muted">
              {aiEnabled
                ? t('modules.__MODULE_ID__.settings.aiEnabledOn')
                : t('modules.__MODULE_ID__.settings.aiEnabledOff')}
            </span>
          </div>
        </label>

        <label className="settings-field">
          <span>{t('modules.__MODULE_ID__.settings.intensityLabel')}</span>
          <select
            value={intensity}
            onChange={(event) => setIntensity(event.target.value as typeof intensity)}
            className="settings-select"
          >
            <option value="light">{t('modules.__MODULE_ID__.settings.intensityLight')}</option>
            <option value="normal">{t('modules.__MODULE_ID__.settings.intensityNormal')}</option>
            <option value="aggressive">{t('modules.__MODULE_ID__.settings.intensityAggressive')}</option>
          </select>
        </label>

        <label className="settings-field">
          <span>{t('modules.__MODULE_ID__.settings.defaultPromptLabel')}</span>
          <TextInput
            value={defaultPrompt}
            onChange={(event) => setDefaultPrompt(event.target.value)}
            placeholder={t('modules.__MODULE_ID__.settings.defaultPromptPlaceholder')}
          />
        </label>

        <div className="settings-actions">
          <Button type="submit">{t('settings.save')}</Button>
        </div>
      </form>
    </Card>
  );
};

