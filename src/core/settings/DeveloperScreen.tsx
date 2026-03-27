import React, { useState } from 'react';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { TextInput } from '../../shared/ui/TextInput';
import { SectionHeader } from '../../shared/ui/SectionHeader';
import { useI18n } from '../../shared/lib/i18n';
import { useNavigation } from '../../shared/lib/navigation/useNavigation';
import { useBegleitungPlus } from '../../core/begleitungPlus';
import { activatePlusDev, deactivatePlusDev, activatePlusAdmin, deactivatePlusAdmin } from '../../core/begleitungPlus';
import '../../styles/softpill-buttons-in-cards.css';
import '../../styles/softpill-cards.css';

const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN ?? '';

export const DeveloperScreen: React.FC = () => {
  const { t } = useI18n();
  const { goTo, goBack } = useNavigation();
  const { isPlus } = useBegleitungPlus();
  const [pinInput, setPinInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinError, setPinError] = useState('');

  const handleUnlock = () => {
    setPinError('');
    if (!ADMIN_PIN) return;
    if (pinInput === ADMIN_PIN) {
      setIsUnlocked(true);
      setPinInput('');
    } else {
      setPinError(t('settings.developer.admin.pinWrong'));
    }
  };

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      goBack();
    } else {
      goTo('home');
    }
  };

  return (
    <>
      {import.meta.env.DEV && (
        <Card className="still-daily-checklist__card">
          <div className="settings-section">
            <SectionHeader as="h2" title={t('settings.developer.dev.title')} />
            <div className="settings-section__content">
              <p className="settings-layout__muted">
                {t('settings.developer.dev.begleitungPlusStatus')}:{' '}
                {isPlus ? t('settings.developer.dev.active') : t('settings.developer.dev.inactive')}
              </p>
              <div className="next-steps__stack">
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  className="next-steps__button btn--softpill"
                  onClick={activatePlusDev}
                >
                  {t('settings.developer.dev.activatePlus')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  className="next-steps__button btn--softpill"
                  onClick={deactivatePlusDev}
                >
                  {t('settings.developer.dev.deactivatePlus')}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
      {!import.meta.env.PROD && (
        <Card className="still-daily-checklist__card">
          <div className="settings-section">
            <SectionHeader as="h2" title={t('settings.developer.admin.title')} />
            <div className="settings-section__content">
              <p className="settings-layout__muted">{t('settings.developer.admin.hint')}</p>
              {!isUnlocked ? (
                <>
                  {!ADMIN_PIN && (
                    <p className="settings-layout__muted">{t('settings.developer.admin.pinNotConfigured')}</p>
                  )}
                  {ADMIN_PIN && (
                    <>
                      <div className="settings-field">
                        <label htmlFor="admin-pin" className="settings-section__label">
                          {t('settings.developer.admin.pinLabel')}
                        </label>
                        <TextInput
                          id="admin-pin"
                          type="password"
                          value={pinInput}
                          onChange={(e) => setPinInput(e.target.value)}
                          placeholder="••••"
                          autoComplete="off"
                        />
                      </div>
                      {pinError && <p className="settings-section__error">{pinError}</p>}
                      <Button
                        type="button"
                        variant="secondary"
                        fullWidth
                        className="next-steps__button btn--softpill"
                        onClick={handleUnlock}
                      >
                        {t('settings.developer.admin.unlock')}
                      </Button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <p className="settings-layout__muted">
                    {t('settings.developer.dev.begleitungPlusStatus')}:{' '}
                    {isPlus ? t('settings.developer.dev.active') : t('settings.developer.dev.inactive')}
                  </p>
                  <div className="next-steps__stack">
                    <Button
                      type="button"
                      variant="secondary"
                      fullWidth
                      className="next-steps__button btn--softpill"
                      onClick={activatePlusAdmin}
                    >
                      {t('settings.developer.admin.activatePlus')}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      fullWidth
                      className="next-steps__button btn--softpill"
                      onClick={deactivatePlusAdmin}
                    >
                      {t('settings.developer.admin.deactivatePlus')}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      )}
      <Card className="still-daily-checklist__card">
        <div className="settings-section">
          <SectionHeader as="h2" title={t('settings.developer.title')} />
          <div className="settings-section__content">
            <p className="settings-layout__muted">{t('settings.developer.name')}</p>
            <p className="settings-layout__muted">
              <a href="mailto:juergen@j-bussmann.de" className="tel-link">
                {t('settings.developer.mail')}
              </a>
            </p>
            <p className="settings-layout__description">{t('settings.developer.hint')}</p>
            <p className="settings-layout__description">{t('settings.developer.hintApp')}</p>
          </div>
        </div>
      </Card>
      <div className="next-steps__stack">
        <Button
          type="button"
          variant="secondary"
          fullWidth
          className="next-steps__button btn--softpill"
          onClick={handleBack}
        >
          {t('common.back')}
        </Button>
      </div>
    </>
  );
};
