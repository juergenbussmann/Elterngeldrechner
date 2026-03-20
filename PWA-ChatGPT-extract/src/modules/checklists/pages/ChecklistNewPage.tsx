import React, { useState } from 'react';
import { useI18n } from '../../../shared/lib/i18n';
import { useNavigation } from '../../../shared/lib/navigation/useNavigation';
import { SectionHeader } from '../../../shared/ui/SectionHeader';
import { Card } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import { TextInput } from '../../../shared/ui/TextInput';
import { createCustomChecklist } from '../checklistsService';
import '../ChecklistsScreen.css';
import '../styles/softpill-buttons-in-cards.css';
import '../styles/softpill-cards.css';

export const ChecklistNewPage: React.FC = () => {
  const { t } = useI18n();
  const { goTo } = useNavigation();
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const checklist = await createCustomChecklist(title);
      goTo(`/checklists/meine/${encodeURIComponent(checklist.id)}`);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="screen-placeholder checklists-screen">
      <section className="checklists__rubric">
        <SectionHeader as="h1" title={t('checklists.new.title')} />
        <Card className="still-daily-checklist__card">
          <TextInput
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('checklists.new.title')}
            style={{ width: '100%', marginBottom: '1rem', padding: '0.75rem' }}
          />
          <div className="next-steps__stack">
            <Button
              type="button"
              variant="primary"
              className="next-steps__button btn--softpill"
              onClick={handleCreate}
              disabled={loading}
            >
              {t('checklists.new.create')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="next-steps__button btn--softpill"
              onClick={() => goTo('/checklists')}
            >
              {t('common.back')}
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
};
