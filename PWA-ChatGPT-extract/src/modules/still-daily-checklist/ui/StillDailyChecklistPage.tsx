import React from 'react';
import { SectionHeader } from '../../../shared/ui/SectionHeader';
import { Card } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import { useI18n } from '../../../shared/lib/i18n';
import { useNavigation } from '../../../shared/lib/navigation/useNavigation';
import { stillDailyChecklistTemplate } from '../domain/template';
import type { ChecklistState } from '../domain/types';
import { getInitialState, mergeWithTemplate, setAll, toggle } from '../application/service';
import { loadState, saveState } from '../infra/storage';
import { ChecklistItemRow } from '../../checklists/ui/ChecklistItemRow';
import '../../checklists/ChecklistsScreen.css';
import './StillDailyChecklistPage.css';

export const StillDailyChecklistPage: React.FC<{ backTo?: string }> = ({ backTo = 'home' }) => {
  const { t } = useI18n();
  const { goTo } = useNavigation();
  const [state, setState] = React.useState<ChecklistState>(() =>
    getInitialState(stillDailyChecklistTemplate),
  );

  React.useEffect(() => {
    const loaded = loadState();
    const merged = mergeWithTemplate(loaded, stillDailyChecklistTemplate);
    setState(merged);
    saveState(merged);
  }, []);

  const handleToggle = (itemId: string) => {
    setState((prev) => {
      const next = toggle(prev, itemId);
      saveState(next);
      return next;
    });
  };

  const handleReset = () => {
    setState((prev) => {
      const next = setAll(prev, false);
      saveState(next);
      return next;
    });
  };

  return (
    <div className="still-daily-checklist">
      <SectionHeader title={t('stillDaily.title')} />
      <Card className="still-daily-checklist__card next-steps__button btn--softpill">
        <p className="still-daily-checklist__intro ui-text-muted">{t('stillDaily.subtitle')}</p>
        <div className="still-daily-checklist__list">
          {stillDailyChecklistTemplate.map((item) => (
            <ChecklistItemRow
              key={item.id}
              id={item.id}
              label={item.label}
              description={item.description}
              checked={Boolean(state.items[item.id])}
              onChange={() => handleToggle(item.id)}
              idPrefix="checklist-still"
            />
          ))}
        </div>
        <Button type="button" variant="secondary" className="next-steps__button btn--softpill" onClick={handleReset}>
          {t('stillDaily.resetButton')}
        </Button>
        <Button type="button" variant="secondary" className="next-steps__button btn--softpill" onClick={() => goTo(backTo)}>
          {t('common.back')}
        </Button>
      </Card>
    </div>
  );
};
