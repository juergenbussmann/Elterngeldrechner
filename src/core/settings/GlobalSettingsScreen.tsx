import React, { useMemo } from 'react';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { useI18n } from '../../shared/lib/i18n';
import { useNavigation } from '../../shared/lib/navigation/useNavigation';
import { getModuleSettings } from '../modules/moduleHost';
import { assertGlobalSettingsSectionsAbsent } from '../quality/qualityGate';
import '../../styles/softpill-buttons-in-cards.css';
import '../../styles/softpill-cards.css';

export const GlobalSettingsScreen: React.FC = () => {
  const { t } = useI18n();
  const { openModuleSettings, goTo } = useNavigation();

  const settingsEnabledModules = useMemo(() => getModuleSettings(), []);

  const renderedModuleSections = 0;
  assertGlobalSettingsSectionsAbsent(renderedModuleSections);

  return (
    <section className="next-steps settings__global-stack">
      <Card className="still-daily-checklist__card">
        <div className="next-steps__stack settings__module-stack">
          {settingsEnabledModules.map(({ module }) => (
            <Button
              key={module.id}
              type="button"
              variant="secondary"
              fullWidth
              className="next-steps__button btn--softpill"
              onClick={() => openModuleSettings(module.id)}
            >
              {module.displayName}
            </Button>
          ))}
          <Button
            type="button"
            variant="secondary"
            fullWidth
            className="next-steps__button btn--softpill"
            onClick={() => goTo('/onboarding/due-date')}
          >
            Geburtstermin
          </Button>
          <a
            href="https://juergenbussmann.github.io/Elterngeldrechner/elterngeld-datenschutz.html"
            target="_blank"
            rel="noopener noreferrer"
            className="next-steps__button btn--softpill"
          >
            {t('settings.privacy')}
          </a>
          <div
            className="settings__feedback"
            style={{
              marginTop: 16,
              padding: 12,
              fontSize: 14,
              color: 'var(--color-text-secondary, #666)',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Entwickler</div>
            <p style={{ margin: '0 0 8px 0', lineHeight: 1.4 }}>
              Verbesserungsvorschläge und Feedback dürfen gerne an mich gesendet
              werden.
            </p>
            <a
              href="mailto:juergen@j-bussmann.de"
              className="next-steps__button btn--softpill"
              style={{ display: 'inline-block', marginTop: 4 }}
            >
              juergen@j-bussmann.de
            </a>
          </div>
        </div>
      </Card>
    </section>
  );
};
