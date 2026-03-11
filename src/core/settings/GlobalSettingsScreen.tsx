import React, { useMemo } from 'react';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { useI18n } from '../../shared/lib/i18n';
import { useNavigation } from '../../shared/lib/navigation/useNavigation';
import { getModuleSettings } from '../modules/moduleHost';
import { assertGlobalSettingsSectionsAbsent } from '../quality/qualityGate';
import '../../modules/checklists/styles/softpill-buttons-in-cards.css';
import '../../modules/checklists/styles/softpill-cards.css';

export const GlobalSettingsScreen: React.FC = () => {
  const { t } = useI18n();
  const { openModuleSettings } = useNavigation();

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
          <a
            href="https://juergenbussmann.github.io/index.html/"
            target="_blank"
            rel="noopener noreferrer"
            className="next-steps__button btn--softpill"
          >
            {t('settings.privacy')}
          </a>
        </div>
      </Card>
    </section>
  );
};
