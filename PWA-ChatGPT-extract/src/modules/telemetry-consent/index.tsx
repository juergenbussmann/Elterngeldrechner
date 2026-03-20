/* eslint-disable react-refresh/only-export-components */
import React, { useState } from 'react';
import type { PwaFactoryModule } from '../../core/contracts/moduleContract';
import { useI18n } from '../../shared/lib/i18n';
import { isTelemetryEnabled, setTelemetryEnabled } from '../../shared/lib/telemetry';

const TelemetryConsentSettings: React.FC = () => {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState<boolean>(isTelemetryEnabled());

  const handleToggle = (checked: boolean): void => {
    setEnabled(checked);
    setTelemetryEnabled(checked);
  };

  return (
    <div className="settings-section__content">
      <p className="settings-layout__description">
        {t('settings.description', 'stdTelemetryConsent')}
      </p>

      <div className="settings-section__row">
        <label className="settings-checkbox">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => handleToggle(event.target.checked)}
          />
          <span>{t('settings.toggle', 'stdTelemetryConsent')}</span>
        </label>
      </div>
    </div>
  );
};

export const TelemetryConsentModule: PwaFactoryModule = {
  id: 'std.telemetryConsent',
  displayName: 'Telemetry Consent',
  getSettings: () => ({
    sections: [
      {
        id: 'std-telemetry-consent',
        title: 'Telemetry',
        element: <TelemetryConsentSettings />,
      },
    ],
  }),
  getI18nBundles: () => [
    {
      namespace: 'stdTelemetryConsent',
      locale: 'en',
      strings: {
        'settings.title': 'Telemetry',
        'settings.description': 'Control whether anonymous usage data is sent.',
        'settings.toggle': 'Send anonymous usage data',
      },
    },
    {
      namespace: 'stdTelemetryConsent',
      locale: 'de',
      strings: {
        'settings.title': 'Telemetrie',
        'settings.description': 'Steuere, ob anonyme Nutzungsdaten gesendet werden.',
        'settings.toggle': 'Anonyme Nutzungsdaten senden',
      },
    },
  ],
};

