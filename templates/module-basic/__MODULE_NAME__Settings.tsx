import React, { useState } from 'react';
import { Card } from '../../shared/ui/Card';
import { TextInput } from '../../shared/ui/TextInput';
import { Button } from '../../shared/ui/Button';
import { useI18n } from '../../shared/lib/i18n';
import { useNotifications } from '../../shared/lib/notifications';

// TODO: vervang met de echte module-id en pas opslag-/telemetry-keys aan.
const MODULE_ID = '__MODULE_ID__';
const SETTINGS_STORAGE_KEY = `modules.__MODULE_ID__.settings`;

export const __MODULE_NAME__Settings: React.FC = () => {
  const { t } = useI18n();
  const { showToast } = useNotifications();

  const [defaultTitle, setDefaultTitle] = useState('');
  const [autoFocusEnabled, setAutoFocusEnabled] = useState(true);

  return (
    <Card>
      <form
        className="settings-section"
        onSubmit={(event) => {
          event.preventDefault();
          // TODO: sla settings op in storage of eigen backend.
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
          <span>{t('modules.__MODULE_ID__.settings.autoFocusLabel')}</span>
          <div className="settings-checkbox">
            <input
              type="checkbox"
              checked={autoFocusEnabled}
              onChange={(event) => setAutoFocusEnabled(event.target.checked)}
            />
            <span className="settings-layout__muted">
              {autoFocusEnabled
                ? t('modules.__MODULE_ID__.settings.autoFocusOn')
                : t('modules.__MODULE_ID__.settings.autoFocusOff')}
            </span>
          </div>
        </label>

        <label className="settings-field">
          <span>{t('modules.__MODULE_ID__.settings.defaultTitleLabel')}</span>
          <TextInput
            value={defaultTitle}
            onChange={(event) => setDefaultTitle(event.target.value)}
            placeholder={t('modules.__MODULE_ID__.settings.defaultTitlePlaceholder')}
          />
        </label>

        <div className="settings-actions">
          <Button type="submit">{t('settings.save')}</Button>
        </div>
      </form>
    </Card>
  );
};

