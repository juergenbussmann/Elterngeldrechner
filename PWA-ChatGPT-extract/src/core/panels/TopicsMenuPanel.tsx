import React from 'react';
import { useLocation } from 'react-router-dom';
import { useI18n } from '../../shared/lib/i18n';
import { useNavigation } from '../../shared/lib/navigation/useNavigation';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import contentIndex from '../../modules/knowledge/content/de/index.json';

type KnowledgeCategory = {
  id: string;
  title: string;
  summary: string;
};

type KnowledgeIndexItem = {
  id: string;
  categoryId: string;
  title: string;
  summary: string;
};

type KnowledgeIndex = {
  categories: KnowledgeCategory[];
  items: KnowledgeIndexItem[];
};

const { categories, items } = contentIndex as KnowledgeIndex;
const pregnancyItems = items.filter((item) => item.categoryId === 'pregnancy');
const birthItems = items.filter((item) => item.categoryId === 'birth');
const breastfeedingCategories = categories.filter(
  (category) => category.id !== 'pregnancy' && category.id !== 'birth',
);

export const TopicsMenuPanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { t } = useI18n();
  const location = useLocation();
  const { goTo, navigateToTopic } = useNavigation();

  return (
    <div className="topics-menu-panel">
      <h2 className="topics-menu-panel__title">{t('app.panels.topics.title')}</h2>
      <div className="topics-menu-panel__list">
        <Card style={{ padding: '0.75rem' }}>
          <h3 className="topics-menu-panel__section-title">{t('nav.pregnancy')}</h3>
          {pregnancyItems.length === 0 ? (
            <p className="topics-menu-panel__placeholder">{t('placeholders.inPreparation')}</p>
          ) : (
            pregnancyItems.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                fullWidth
                className="topics-menu-panel__item"
                style={{ marginTop: '0.5rem', textAlign: 'left' }}
                onClick={() => {
                  navigateToTopic(item.id, location.pathname);
                  onClose?.();
                }}
              >
                <span className="topics-menu-panel__item-title">{item.title}</span>
              </Button>
            ))
          )}
        </Card>
        <Card style={{ padding: '0.75rem' }}>
          <h3 className="topics-menu-panel__section-title">{t('nav.birth')}</h3>
          {birthItems.length === 0 ? (
            <p className="topics-menu-panel__placeholder">{t('placeholders.inPreparation')}</p>
          ) : (
            birthItems.map((item) => (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                fullWidth
                className="topics-menu-panel__item"
                style={{ marginTop: '0.5rem', textAlign: 'left' }}
                onClick={() => {
                  navigateToTopic(item.id, location.pathname);
                  onClose?.();
                }}
              >
                <span className="topics-menu-panel__item-title">{item.title}</span>
              </Button>
            ))
          )}
        </Card>
        <div className="topics-menu-panel__group">
          <Card style={{ padding: '0.75rem' }}>
            <h3 className="topics-menu-panel__section-title">{t('nav.breastfeeding')}</h3>
            <Button
              type="button"
              variant="ghost"
              fullWidth
              className="topics-menu-panel__item"
              style={{ marginTop: '0.5rem', textAlign: 'left' }}
              onClick={() => {
                goTo('/knowledge');
                onClose?.();
              }}
            >
              <span className="topics-menu-panel__item-title">{t('nav.knowledge')}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              fullWidth
              className="topics-menu-panel__item"
              style={{ marginTop: '0.5rem', textAlign: 'left' }}
              onClick={() => {
                goTo('/checklists');
                onClose?.();
              }}
            >
              <span className="topics-menu-panel__item-title">{t('nav.checklists')}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              fullWidth
              className="topics-menu-panel__item"
              style={{ marginTop: '0.5rem', textAlign: 'left' }}
              onClick={() => {
                goTo('/appointments');
                onClose?.();
              }}
            >
              <span className="topics-menu-panel__item-title">{t('nav.appointments')}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              fullWidth
              className="topics-menu-panel__item"
              style={{ marginTop: '0.5rem', textAlign: 'left' }}
              onClick={() => {
                goTo('/contacts');
                onClose?.();
              }}
            >
              <span className="topics-menu-panel__item-title">{t('nav.contacts')}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              fullWidth
              className="topics-menu-panel__item"
              style={{ marginTop: '0.5rem', textAlign: 'left' }}
              onClick={() => {
                goTo('/documents');
                onClose?.();
              }}
            >
              <span className="topics-menu-panel__item-title">{t('documents.title')}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              fullWidth
              className="topics-menu-panel__item"
              style={{ marginTop: '0.5rem', textAlign: 'left' }}
              onClick={() => {
                goTo('/begleitung-plus');
                onClose?.();
              }}
            >
              <span className="topics-menu-panel__item-title">{t('begleitungPlus.title')}</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              fullWidth
              className="topics-menu-panel__item"
              style={{ marginTop: '0.5rem', textAlign: 'left' }}
              onClick={() => {
                goTo('/checklists');
                onClose?.();
              }}
            >
              <span className="topics-menu-panel__item-title">{t('stillDaily.menuTitle')}</span>
            </Button>
          </Card>
          {breastfeedingCategories.map((category) => {
            const categoryItems = items.filter((item) => item.categoryId === category.id);
            if (categoryItems.length === 0) {
              return null;
            }

            return (
              <Card key={category.id} style={{ padding: '0.75rem' }}>
                <h3 className="topics-menu-panel__section-title">{category.title}</h3>
                {categoryItems.map((item) => (
                  <Button
                    key={item.id}
                    type="button"
                    variant="ghost"
                    fullWidth
                    className="topics-menu-panel__item"
                    style={{ marginTop: '0.5rem', textAlign: 'left' }}
                    onClick={() => {
                      navigateToTopic(item.id, location.pathname);
                      onClose?.();
                    }}
                  >
                    <span className="topics-menu-panel__item-title">{item.title}</span>
                  </Button>
                ))}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
