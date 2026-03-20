import React from 'react';
import { SectionHeader } from '../../../shared/ui/SectionHeader';
import { Card } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import { useNavigation } from '../../../shared/lib/navigation/useNavigation';
import type { ChecklistState } from '../../still-daily-checklist/domain/types';
import type { ChecklistItemDef } from '../domain/checklistItems';
import { ChecklistItemRow } from './ChecklistItemRow';

export const ChecklistRubricSection: React.FC<{
  title: string;
  items: readonly ChecklistItemDef[];
  state: ChecklistState;
  onToggle: (itemId: string) => void;
  onReset: () => void;
  t: (key: string) => string;
  extraAfterItemId?: string;
  extraAfterContent?: React.ReactNode;
}> = ({ title, items, state, onToggle, onReset, t, extraAfterItemId, extraAfterContent }) => {
  const { goTo } = useNavigation();
  return (
    <section className="checklists__rubric">
      <SectionHeader as="h2" title={title} />
      <Card className="still-daily-checklist__card next-steps__button btn--softpill">
        <div className="still-daily-checklist__list">
          {items.map((item) => (
            <React.Fragment key={item.id}>
              <ChecklistItemRow
                id={item.id}
                label={t(item.labelKey, 'core')}
                description={item.descriptionKey ? t(item.descriptionKey, 'core') : undefined}
                checked={Boolean(state.items[item.id])}
                onChange={() => onToggle(item.id)}
                idPrefix="checklist"
              />
              {extraAfterItemId === item.id && extraAfterContent}
            </React.Fragment>
          ))}
        </div>
        <Button type="button" variant="secondary" className="next-steps__button btn--softpill" onClick={onReset}>
          {t('stillDaily.resetButton')}
        </Button>
        <Button type="button" variant="secondary" className="next-steps__button btn--softpill" onClick={() => goTo('/checklists')}>
          {t('common.back')}
        </Button>
      </Card>
    </section>
  );
};
