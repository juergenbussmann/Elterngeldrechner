/**
 * Einheitliche View für Plus-Checklisten (eigene + Overrides).
 * Gleiche Struktur wie ChecklistRubricSection/StillDailyChecklistPage:
 * Card mit Checkbox-Liste, Buttons in Spalte (next-steps__stack).
 * Edit-Mode: Drag-Handle (≡) zum Sortieren wie bei Notizen.
 */

import React from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SectionHeader } from '../../../shared/ui/SectionHeader';
import { Card } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import { TextInput } from '../../../shared/ui/TextInput';
import type { ChecklistItem } from '../../../shared/storage/checklistsDb';
import { ChecklistItemRow } from './ChecklistItemRow';
import { geburtItems } from '../domain/checklistItems';
import { SYS_IDS } from '../checklistsService';

export type ChecklistDetailViewProps = {
  title: string;
  items: ChecklistItem[];
  baseId?: string;
  editMode: boolean;
  newItemText: string;
  onNewItemTextChange: (v: string) => void;
  onToggle: (itemId: string) => void;
  onReset: () => void;
  onBack: () => void;
  onEditToggle: () => void;
  onAddItem: () => void;
  onUpdateItemText: (itemId: string, text: string) => void;
  onRemoveItem: (itemId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onUpdateTitle: (title: string) => void;
  t: (key: string, namespace?: string) => string;
  showDeleteChecklist?: boolean;
  showResetToStandard?: boolean;
  onDeleteChecklist?: () => void;
  onResetToStandard?: () => void;
  confirmAction?: 'delete' | 'reset' | null;
  onConfirmDelete?: () => void;
  onConfirmResetToStandard?: () => void;
  onCancelConfirm?: () => void;
  actionsBelowCard?: React.ReactNode;
};

function SortableChecklistItem({
  item,
  index: _index,
  onToggle,
  onUpdateItemText,
  onRemoveItem,
  t,
}: {
  item: ChecklistItem;
  index: number;
  onToggle: (id: string) => void;
  onUpdateItemText: (id: string, text: string) => void;
  onRemoveItem: (id: string) => void;
  t: (key: string) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const dndStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      className="still-daily-checklist__item"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '0.5rem',
        ...dndStyle,
      }}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="checklist-item__drag"
        onClick={(e) => e.stopPropagation()}
        aria-label={t('checklists.dragHandle')}
        title={t('checklists.dragHandle')}
      >
        ≡
      </button>
      <label className="settings-checkbox" style={{ flex: 1, minWidth: 0 }}>
        <input
          type="checkbox"
          checked={item.done}
          onChange={() => onToggle(item.id)}
        />
        <TextInput
          type="text"
          value={item.text}
          onChange={(e) => onUpdateItemText(item.id, e.target.value)}
          style={{ flex: 1, minWidth: 0, padding: '0.25rem' }}
        />
      </label>
      <Button
        type="button"
        variant="ghost"
        onClick={() => onRemoveItem(item.id)}
        style={{ padding: '0.25rem 0.5rem', fontSize: '0.9rem', flexShrink: 0 }}
        aria-label={t('checklists.deleteChecklist')}
      >
        ×
      </Button>
    </div>
  );
}

/** Lookup: Label-Text → Description für Geburt-System-Checklist (decorate on read). */
function useBirthDescriptionLookup(
  baseId: string | undefined,
  t: (key: string, namespace?: string) => string
): Map<string, string | undefined> {
  return React.useMemo(() => {
    if (baseId !== SYS_IDS.geburt) return new Map();
    return new Map(
      geburtItems.map((i) => [
        t(i.labelKey, 'core'),
        i.descriptionKey ? t(i.descriptionKey, 'core') : undefined,
      ])
    );
  }, [baseId, t]);
}

export const ChecklistDetailView: React.FC<ChecklistDetailViewProps> = ({
  title,
  items,
  baseId,
  editMode,
  newItemText,
  onNewItemTextChange,
  onToggle,
  onReset,
  onBack,
  onEditToggle,
  onAddItem,
  onUpdateItemText,
  onRemoveItem,
  onReorder,
  onUpdateTitle,
  t,
  showDeleteChecklist,
  showResetToStandard,
  onDeleteChecklist,
  onResetToStandard,
  confirmAction,
  onConfirmDelete,
  onConfirmResetToStandard,
  onCancelConfirm,
  actionsBelowCard,
}) => {
  const birthDescByLabel = useBirthDescriptionLookup(baseId, t);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: { active: { id: string }; over: { id: string } | null }) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;
    const oldIndex = items.findIndex((i) => i.id === activeId);
    const newIndex = items.findIndex((i) => i.id === overId);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(oldIndex, newIndex);
  };

  return (
    <section className="checklists__rubric checklist-detail">
      <SectionHeader as="h1" title={title} />
      <Card className="still-daily-checklist__card checklist-detail__card">
        {editMode && (
          <div style={{ marginBottom: '0.5rem' }}>
            <TextInput
              type="text"
              value={title}
              onChange={(e) => onUpdateTitle(e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>
        )}
        <div className="still-daily-checklist__list">
          {editMode ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                {items.map((item, index) => (
                  <SortableChecklistItem
                    key={item.id}
                    item={item}
                    index={index}
                    onToggle={onToggle}
                    onUpdateItemText={onUpdateItemText}
                    onRemoveItem={onRemoveItem}
                    t={t}
                  />
                ))}
              </SortableContext>
            </DndContext>
          ) : (
            items.map((item) => (
              <ChecklistItemRow
                key={item.id}
                id={item.id}
                label={item.text}
                description={baseId === SYS_IDS.geburt ? birthDescByLabel.get(item.text) : undefined}
                checked={item.done}
                onChange={() => onToggle(item.id)}
                idPrefix="checklist-detail"
              />
            ))
          )}
        </div>
        {editMode && (
          <div className="next-steps__stack checklist-add-row">
            <TextInput
              type="text"
              value={newItemText}
              onChange={(e) => onNewItemTextChange(e.target.value)}
              placeholder={t('checklists.edit.addItem')}
              onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAddItem();
              }
            }}
              style={{ width: '100%', padding: '0.5rem' }}
            />
            <Button
              type="button"
              variant="secondary"
              fullWidth
              className="next-steps__button btn--softpill"
              onClick={onAddItem}
              disabled={!newItemText.trim()}
            >
              {t('checklists.edit.addButton')}
            </Button>
          </div>
        )}
        <div className="next-steps__stack checklist-detail__buttons">
          <Button
            type="button"
            variant="secondary"
            fullWidth
            className="next-steps__button btn--softpill"
            onClick={onReset}
          >
            {t('stillDaily.resetButton')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            fullWidth
            className="next-steps__button btn--softpill"
            onClick={onEditToggle}
          >
            {t(editMode ? 'checklists.editDone' : 'checklists.bearbeiten')}
          </Button>
          {editMode && showDeleteChecklist && onDeleteChecklist && (
            <Button
              type="button"
              variant="ghost"
              fullWidth
              className="next-steps__button btn--softpill"
              onClick={onDeleteChecklist}
            >
              {t('checklists.deleteChecklist')}
            </Button>
          )}
          {editMode && showResetToStandard && onResetToStandard && (
            <Button
              type="button"
              variant="ghost"
              fullWidth
              className="next-steps__button btn--softpill"
              onClick={onResetToStandard}
            >
              {t('checklists.resetToStandard')}
            </Button>
          )}
          {confirmAction && onConfirmDelete && onConfirmResetToStandard && onCancelConfirm && (
            <Card className="still-daily-checklist__card checklist-confirm" style={{ marginTop: '0.5rem' }}>
              <p style={{ margin: '0 0 0.5rem 0' }}>{t('checklists.deleteConfirm')}</p>
              <div className="next-steps__stack">
                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  className="next-steps__button btn--softpill"
                  onClick={confirmAction === 'delete' ? onConfirmDelete : onConfirmResetToStandard}
                >
                  {confirmAction === 'delete' ? t('checklists.confirmDelete') : t('checklists.confirmReset')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth
                  className="next-steps__button btn--softpill"
                  onClick={onCancelConfirm}
                >
                  {t('common.close')}
                </Button>
              </div>
            </Card>
          )}
          <Button
            type="button"
            variant="secondary"
            fullWidth
            className="next-steps__button btn--softpill"
            onClick={onBack}
          >
            {t('common.back')}
          </Button>
        </div>
      </Card>
      {actionsBelowCard && <div className="next-steps__stack checklist-actions">{actionsBelowCard}</div>}
    </section>
  );
};
