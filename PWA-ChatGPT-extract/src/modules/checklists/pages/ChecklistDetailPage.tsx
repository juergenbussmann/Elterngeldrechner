import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useI18n } from '../../../shared/lib/i18n';
import { useBegleitungPlus } from '../../../core/begleitungPlus';
import { usePanels } from '../../../shared/lib/panels';
import { openBegleitungPlusUpsell } from '../../../core/begleitungPlus/openBegleitungPlusUpsell';
import { Button } from '../../../shared/ui/Button';
import { SectionHeader } from '../../../shared/ui/SectionHeader';
import { ChecklistDetailView } from '../ui/ChecklistDetailView';
import { dbGetById } from '../../../shared/storage/checklistsDb';
import {
  toggleItem,
  updateChecklistTitle,
  addItem,
  updateItemText,
  removeItem,
  removeChecklist,
  resetAllItems,
  reorderItems,
  SYS_IDS,
} from '../checklistsService';
import '../ChecklistsScreen.css';
import '../styles/softpill-buttons-in-cards.css';
import '../styles/softpill-cards.css';

export const ChecklistDetailPage: React.FC = () => {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isPlus } = useBegleitungPlus();
  const { openBottomSheet } = usePanels();
  const [checklist, setChecklist] = useState<Awaited<ReturnType<typeof dbGetById>>>(null);
  const [editMode, setEditMode] = useState(
    () => (location.state as { edit?: boolean } | null)?.edit === true
  );
  const [newItemText, setNewItemText] = useState('');
  const [confirmAction, setConfirmAction] = useState<'delete' | 'reset' | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const c = await dbGetById(decodeURIComponent(id));
    setChecklist(c);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!confirmAction) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirmAction(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmAction]);

  const handleToggle = async (itemId: string) => {
    if (!checklist) return;
    await toggleItem(checklist.id, itemId);
    load();
  };

  const handleReset = async () => {
    if (!checklist) return;
    await resetAllItems(checklist.id);
    load();
  };

  const handleUpdateTitle = async (newTitle: string) => {
    if (!checklist) return;
    setChecklist((prev) => (prev ? { ...prev, title: newTitle } : null));
    await updateChecklistTitle(checklist.id, newTitle);
  };

  const handleAddItem = async () => {
    const text = newItemText.trim();
    if (!checklist || !text) return;
    await addItem(checklist.id, text);
    setNewItemText('');
    await load();
  };

  const handleUpdateItemText = async (itemId: string, text: string) => {
    if (!checklist) return;
    await updateItemText(checklist.id, itemId, text);
    load();
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!checklist) return;
    await removeItem(checklist.id, itemId);
    load();
  };

  const handleReorder = async (fromIndex: number, toIndex: number) => {
    if (!checklist) return;
    await reorderItems(checklist.id, fromIndex, toIndex);
    await load();
  };

  const handleDeleteChecklist = async () => {
    if (!checklist) return;
    await removeChecklist(checklist.id);
    setConfirmAction(null);
    navigate('/checklists');
  };

  const handleResetToStandard = async () => {
    if (!checklist?.baseId) return;
    await removeChecklist(checklist.id);
    setConfirmAction(null);
    const route =
      checklist.baseId === SYS_IDS.schwangerschaft
        ? '/checklists/schwangerschaft'
        : checklist.baseId === SYS_IDS.geburt
          ? '/checklists/geburt'
          : '/checklists/stillen';
    navigate(route);
  };

  const handleDeleteClick = () => setConfirmAction('delete');
  const handleResetClick = () => setConfirmAction('reset');

  const handleExportClick = () => {
    if (!isPlus) {
      openBegleitungPlusUpsell({ reason: 'export', feature: 'EXPORT' });
      return;
    }
    openBottomSheet('export', {
      scope: 'checklists',
      data: {
        custom: {
          title: checklist?.title ?? '',
          items: checklist?.items ?? [],
        },
      },
    });
  };

  if (!checklist) {
    return (
      <div className="screen-placeholder checklists-screen">
        <section className="checklists__rubric">
          <SectionHeader as="h1" title={t('checklists.title')} />
          <p>{t('common.notFound')}</p>
          <div className="next-steps__stack" style={{ marginTop: '1rem' }}>
            <Button
              type="button"
              variant="secondary"
              className="next-steps__button btn--softpill"
              onClick={() => navigate('/checklists')}
            >
              {t('common.back')}
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="screen-placeholder checklists-screen">
      <ChecklistDetailView
        title={checklist.title}
        items={checklist.items}
        baseId={checklist.baseId}
        editMode={editMode}
        newItemText={newItemText}
        onNewItemTextChange={setNewItemText}
        onToggle={handleToggle}
        onReset={handleReset}
        onBack={() => navigate('/checklists')}
        onEditToggle={() => setEditMode(!editMode)}
        onAddItem={handleAddItem}
        onUpdateItemText={handleUpdateItemText}
        onRemoveItem={handleRemoveItem}
        onReorder={handleReorder}
        onUpdateTitle={handleUpdateTitle}
        t={t}
        showDeleteChecklist={editMode}
        showResetToStandard={Boolean(checklist.baseId) && editMode}
        onDeleteChecklist={handleDeleteClick}
        onResetToStandard={handleResetClick}
        confirmAction={confirmAction}
        onConfirmDelete={handleDeleteChecklist}
        onConfirmResetToStandard={handleResetToStandard}
        onCancelConfirm={() => setConfirmAction(null)}
        actionsBelowCard={
          isPlus ? (
            <Button
              type="button"
              variant="secondary"
              fullWidth
              className="next-steps__button btn--softpill"
              onClick={handleExportClick}
            >
              {t('export.button')}
            </Button>
          ) : undefined
        }
      />
    </div>
  );
};
