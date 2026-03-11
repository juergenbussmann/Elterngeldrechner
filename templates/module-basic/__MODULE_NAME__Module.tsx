import React, { useCallback, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Card } from '../../shared/ui/Card';
import { TextInput } from '../../shared/ui/TextInput';
import { TextArea } from '../../shared/ui/TextArea';
import { Button } from '../../shared/ui/Button';
import { List, ListItem } from '../../shared/ui/List';
import { useI18n } from '../../shared/lib/i18n';
import { validateRequired } from '../../shared/lib/forms';
import { useNavigation } from '../../shared/lib/navigation/useNavigation';
import { getItems, setItems } from '../../shared/lib/storage';
import { trackEvent } from '../../shared/lib/telemetry';

interface __ModuleName__Item {
  id: string;
  title: string;
  description: string;
}

// TODO: vervang met de echte module-id (gebruik lowercase/kebab-case).
const MODULE_ID = '__MODULE_ID__';
// TODO: pas de storage key aan als je een ander pad of namespace wilt.
const STORAGE_KEY = `modules.__MODULE_ID__.items`;

const createItem = (title: string, description: string): __ModuleName__Item => {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: title.trim(),
    description: description.trim(),
  };
};

export const __MODULE_NAME__Module: React.FC = () => {
  const { t } = useI18n();
  const { openModuleSettings } = useNavigation();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItemsState] = useState<__ModuleName__Item[]>(() =>
    getItems<__ModuleName__Item>(STORAGE_KEY),
  );

  const hasItems = items.length > 0;

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const trimmedTitle = title.trim();
      const trimmedDescription = description.trim();

      const hasTitle = validateRequired(trimmedTitle);
      const hasDescriptionValue = validateRequired(trimmedDescription);

      if (!hasTitle && !hasDescriptionValue) {
        return;
      }

      const nextItem = createItem(trimmedTitle, trimmedDescription);
      const nextItems = [nextItem, ...items];

      setItemsState(nextItems);
      setItems<__ModuleName__Item>(STORAGE_KEY, nextItems);

      // TODO: pas event-namen/payload aan voor jouw module.
      trackEvent('module_item_created', {
        moduleId: MODULE_ID,
        itemId: nextItem.id,
        titleLength: trimmedTitle.length,
        hasDescription: trimmedDescription.length > 0,
      });

      setTitle('');
      setDescription('');
    },
    [title, description, items],
  );

  const itemCountLabel = useMemo(() => {
    return `${t('modules.__MODULE_ID__.countLabel') ?? ''} ${items.length}`;
  }, [items.length, t]);

  return (
    <section aria-labelledby="module-title">
      <Card>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
          }}
        >
          <div>
            <h3 id="module-title" style={{ margin: 0 }}>
              {t('modules.__MODULE_ID__.title')}
            </h3>
            <p style={{ margin: 0 }}>{t('modules.__MODULE_ID__.description')}</p>
          </div>
          <span style={{ fontWeight: 600 }}>{itemCountLabel}</span>
        </header>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}
        >
          <label>
            <span style={{ display: 'block', marginBottom: 4 }}>
              {t('modules.__MODULE_ID__.form.titleLabel')}
            </span>
            <TextInput
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t('modules.__MODULE_ID__.form.titlePlaceholder')}
            />
          </label>
          <label>
            <span style={{ display: 'block', marginBottom: 4 }}>
              {t('modules.__MODULE_ID__.form.descriptionLabel')}
            </span>
            <TextArea
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t('modules.__MODULE_ID__.form.descriptionPlaceholder')}
            />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="submit" variant="primary" fullWidth>
              {t('modules.__MODULE_ID__.form.submitLabel')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => openModuleSettings(MODULE_ID)}
            >
              {t('modules.__MODULE_ID__.form.settingsCta')}
            </Button>
          </div>
        </form>

        {hasItems ? (
          <List aria-label={t('modules.__MODULE_ID__.list.ariaLabel')}>
            {items.map((item) => (
              <ListItem key={item.id}>
                <strong>{item.title || t('modules.__MODULE_ID__.list.untitled')}</strong>
                {item.description && (
                  <p style={{ marginTop: 4, marginBottom: 0 }}>{item.description}</p>
                )}
              </ListItem>
            ))}
          </List>
        ) : (
          <p style={{ margin: 0 }}>{t('modules.__MODULE_ID__.emptyState')}</p>
        )}
      </Card>
    </section>
  );
};

