import React from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { SectionHeader } from '../../shared/ui/SectionHeader';
import { useI18n } from '../../shared/lib/i18n';
import { useNavigation } from '../../shared/lib/navigation/useNavigation';
import { getModuleSettings } from '../modules/moduleHost';
import { getModuleById } from '../../shared/lib/modules';
import '../../styles/softpill-buttons-in-cards.css';
import '../../styles/softpill-cards.css';

const ANSICHT_MODULE_ID = 'std.themePrefs';

export const ModuleSettingsScreen: React.FC = () => {
  const { moduleId } = useParams();
  const { t } = useI18n();
  const { goTo, goBack } = useNavigation();

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      goBack();
    } else {
      goTo('home');
    }
  };

  const moduleEntry = React.useMemo(
    () => (moduleId ? getModuleSettings().find((entry) => entry.module.id === moduleId) : undefined),
    [moduleId],
  );
  const moduleDefinition = moduleEntry?.module ?? (moduleId ? getModuleById(moduleId) : undefined);
  const sections = moduleEntry?.sections ?? [];

  const unavailableState = (
    <Card className="still-daily-checklist__card">
      <p className="settings-layout__muted">{t('settings.modules.unavailable')}</p>
    </Card>
  );

  if (!moduleId) {
    return unavailableState;
  }

  if (!moduleDefinition) {
    return unavailableState;
  }

  if (!moduleEntry || sections.length === 0) {
    return unavailableState;
  }

  return (
    <>
      <Card className="still-daily-checklist__card">
        <div className="settings-section">
          <SectionHeader as="h2" title={moduleDefinition?.displayName ?? moduleId} />
        </div>
      </Card>
      {sections.map((section) => (
        <Card key={section.id} className="still-daily-checklist__card">
          <div className="settings-section">
            {section.title ? <h3 className="settings-layout__section-title">{section.title}</h3> : null}
            <div className="settings-section__content">{section.element}</div>
          </div>
        </Card>
      ))}
      {moduleId === ANSICHT_MODULE_ID ? (
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
      ) : null}
    </>
  );
};

