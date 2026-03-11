import React, { useEffect } from 'react';
import { useI18n } from '../../../shared/lib/i18n';
import { useNavigation } from '../../../shared/lib/navigation/useNavigation';
import { SectionHeader } from '../../../shared/ui/SectionHeader';
import { Card } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import { getValue, setValue } from '../../../shared/lib/storage';
import { getInitialState, mergeWithTemplate, toggle, setAll } from '../../still-daily-checklist/application/service';
import type { ChecklistState } from '../../still-daily-checklist/domain/types';
import erstausstattungContent from '../content/de/schwangerschaft/erstausstattung-neugeborenes.json';
import { ChecklistItemRow } from '../ui/ChecklistItemRow';
import '../ChecklistsScreen.css';
import '../styles/softpill-buttons-in-cards.css';
import '../styles/softpill-cards.css';

const STORAGE_KEY = 'checklistErstausstattungNeugeborenes.v1';

type Category = { id: string; heading: string; items: { id: string; label: string; description?: string }[] };
type Content = { title: string; categories: Category[] };

const content = erstausstattungContent as Content;

const flatTemplate = content.categories.flatMap((cat) =>
  cat.items.map((item) => ({ id: item.id, labelKey: item.label, description: item.description }))
);

const loadState = (): ChecklistState | null => getValue<ChecklistState>(STORAGE_KEY) ?? null;

const saveState = (state: ChecklistState): void => setValue(STORAGE_KEY, state);

export const ChecklistErstausstattungPage: React.FC = () => {
  const { t } = useI18n();
  const { goTo } = useNavigation();
  const [state, setState] = React.useState<ChecklistState>(() => {
    const template = flatTemplate.map((i) => ({ id: i.id, label: i.labelKey }));
    return getInitialState(template);
  });

  useEffect(() => {
    const template = flatTemplate.map((i) => ({ id: i.id, label: i.labelKey }));
    const loaded = loadState();
    const merged = mergeWithTemplate(loaded, template);
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
    <div className="screen-placeholder checklists-screen">
      <section className="checklists__rubric">
        <SectionHeader as="h1" title={content.title} />
        {content.categories.map((category) => (
          <Card key={category.id} className="still-daily-checklist__card">
            <h3 className="checklists__rubricTitle">{category.heading}</h3>
            <div className="still-daily-checklist__list">
              {category.items.map((item) => (
                <ChecklistItemRow
                  key={item.id}
                  id={item.id}
                  label={item.label}
                  description={item.description}
                  checked={Boolean(state.items[item.id])}
                  onChange={() => handleToggle(item.id)}
                  idPrefix="checklist-erst"
                />
              ))}
            </div>
          </Card>
        ))}
        <div className="next-steps__stack checklist-actions">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            className="next-steps__button btn--softpill"
            onClick={handleReset}
          >
            {t('stillDaily.resetButton')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            fullWidth
            className="next-steps__button btn--softpill"
            onClick={() => goTo('/checklists/schwangerschaft')}
          >
            {t('common.back')}
          </Button>
        </div>
      </section>
    </div>
  );
};
