import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
  arrayMove,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

import { CSS } from '@dnd-kit/utilities';
import { SectionHeader } from '../../../shared/ui/SectionHeader';
import { Card } from '../../../shared/ui/Card';
import { Button } from '../../../shared/ui/Button';
import { useI18n } from '../../../shared/lib/i18n';
import {
  addChecklistItem,
  loadNotes,
  saveNotes,
  toggleChecklistItem,
  updateChecklistItemFull,
} from '../../../shared/lib/notes/storage';
import type { ChecklistItem, NotesState } from '../../../shared/lib/notes/types';
import './NotesPage.css';
import '../../checklists/styles/softpill-buttons-in-cards.css';
import '../../checklists/styles/softpill-cards.css';

const LEGACY_STORAGE_KEYS = ['stillberatung_noteslist_dndkit_v1', 'stillberatung_noteslist_v2'];

type NoteItemProps = {
  item: ChecklistItem;
  isExpanded: boolean;
  editTitle: string;
  editText: string;
  onContentClick: (id: string) => void;
  onToggleChecked: (id: string) => void;
  onDelete: (id: string) => void;
  onEditTitleChange: (value: string) => void;
  onEditTextChange: (value: string) => void;
  onInlineSave: () => void;
  onInlineCancel: () => void;
};

function NoteItem({
  item,
  isExpanded,
  editTitle,
  editText,
  onContentClick,
  onToggleChecked,
  onDelete,
  onEditTitleChange,
  onEditTextChange,
  onInlineSave,
  onInlineCancel,
}: NoteItemProps) {
  const { t } = useI18n();
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const dndStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const contentClass = `note-item__content ${item.done ? 'note-item__content--done' : ''}`;
  const isInlineValid = editTitle.trim().length > 0;

  return (
    <li ref={setNodeRef} className="notes__list-item" style={dndStyle}>
      <div className="note-item__wrapper">
        <Card className="note-item still-daily-checklist__card">
          <div className="note-item__row">
            <div className="note-item__check">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => onToggleChecked(item.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label="Erledigt"
              />
            </div>

            <button
              type="button"
              className={contentClass}
              onClick={(e) => {
                e.stopPropagation();
                onContentClick(item.id);
              }}
            >
              <span className="note-item__title">{item.text}</span>
              {item.note?.trim() ? (
                <span className="note-item__text">{item.note.trim()}</span>
              ) : null}
            </button>

            <div className="note-item__actions">
              <button
                type="button"
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
                className="note-item__icon-btn note-item__drag"
                onClick={(e) => e.stopPropagation()}
                aria-label="Ziehen zum Sortieren"
                title="Ziehen zum Sortieren"
              >
                ≡
              </button>
              <button
                type="button"
                className="note-item__icon-btn note-item__delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id);
                }}
                aria-label="Notiz löschen"
                title="Löschen"
              >
                🗑
              </button>
            </div>
          </div>
        </Card>

        {isExpanded && (
          <Card className="note-item__inline-edit still-daily-checklist__card">
            <div className="note-item__inline-fields">
              <input
                type="text"
                className="note-item__inline-title"
                value={editTitle}
                onChange={(e) => onEditTitleChange(e.target.value)}
                placeholder="Titel"
                aria-label="Titel bearbeiten"
              />
              <textarea
                className="note-item__inline-body"
                value={editText}
                onChange={(e) => onEditTextChange(e.target.value)}
                placeholder="Notizinhalt (optional)"
                rows={4}
                aria-label="Inhalt bearbeiten"
              />
              <div className="note-item__inline-actions">
                <Button
                  type="button"
                  variant="primary"
                  className="next-steps__button btn--softpill notes__save-btn"
                  onClick={onInlineSave}
                  disabled={!isInlineValid}
                >
                  {t('notes.save')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="next-steps__button btn--softpill"
                  onClick={onInlineCancel}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </li>
  );
}

export const NotesPage: React.FC = () => {
  const { t } = useI18n();
  const [notesState, setNotesState] = useState<NotesState>(() => loadNotes());
  const [composerTitle, setComposerTitle] = useState('');
  const [composerBody, setComposerBody] = useState('');
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [composerTitleError, setComposerTitleError] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);
  const items = notesState.checklistItems;

  const displayItems = useMemo(() => {
    const open = items.filter((i) => !i.done);
    const done = items.filter((i) => i.done);
    return [...open, ...done];
  }, [items]);

  const isComposerValid = composerTitle.trim().length > 0;

  useEffect(() => {
    if (notesState.checklistItems.length > 0) return;
    try {
      for (const key of LEGACY_STORAGE_KEYS) {
        const raw = window.localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) continue;
        const migrated = parsed
          .map((item) => {
            if (!item || typeof item !== 'object') return null;
            const record = item as Record<string, unknown>;
            const text = typeof record.text === 'string' ? record.text.trim() : '';
            if (!text) return null;
            const id = typeof record.id === 'string' && record.id ? record.id : `${Date.now()}`;
            const done = Boolean(record.done ?? record.checked);
            const note = typeof record.note === 'string' ? record.note : '';
            return { id, text, done, note };
          })
          .filter((item): item is ChecklistItem => Boolean(item));
        if (migrated.length === 0) continue;
        const next = saveNotes({ ...notesState, checklistItems: migrated });
        setNotesState(next);
        window.localStorage.removeItem(key);
        break;
      }
    } catch {
      // noop
    }
  }, [notesState]);

  const collapseInline = useCallback(() => {
    setExpandedNoteId(null);
    setEditTitle('');
    setEditText('');
  }, []);

  useEffect(() => {
    if (expandedNoteId && !items.some((i) => i.id === expandedNoteId)) {
      collapseInline();
    }
  }, [items, expandedNoteId, collapseInline]);

  // Fokus beim Öffnen der Notizen-Seite auf das erste Eingabefeld (Titel)
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      titleRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function handleContentClick(id: string) {
    if (expandedNoteId === id) {
      collapseInline();
      return;
    }
    const item = items.find((i) => i.id === id);
    if (!item) return;
    setExpandedNoteId(id);
    setEditTitle(item.text);
    setEditText(item.note ?? '');
  }

  function handleInlineSave() {
    const title = editTitle.trim();
    if (!title || !expandedNoteId) return;
    const next = updateChecklistItemFull(expandedNoteId, title, editText, notesState);
    setNotesState(next);
    collapseInline(); // Pflicht: Inline-Section nach Speichern schließen
  }

  function resetComposer() {
    setComposerTitle('');
    setComposerBody('');
    setComposerExpanded(false);
    setComposerTitleError(false);
    titleRef.current?.focus();
  }

  function handleComposerSave() {
    const title = composerTitle.trim();
    if (!title) {
      setComposerTitleError(true);
      return;
    }
    setComposerTitleError(false);
    const next = addChecklistItem(title, composerBody, notesState);
    setNotesState(next);
    resetComposer();
  }

  function handleTitleFocus() {
    setComposerExpanded(true);
    setComposerTitleError(false);
  }

  const toggleChecked = useCallback(
    (id: string) => {
      const next = toggleChecklistItem(id, notesState);
      setNotesState(next);
    },
    [notesState]
  );

  function deleteItem(id: string) {
    const next = saveNotes({
      ...notesState,
      checklistItems: notesState.checklistItems.filter((i) => i.id !== id),
    });
    setNotesState(next);
    if (expandedNoteId === id) collapseInline();
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: { active: { id: string }; over: { id: string } | null }) {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;
    const oldIndex = displayItems.findIndex((i) => i.id === activeId);
    const newIndex = displayItems.findIndex((i) => i.id === overId);
    if (oldIndex < 0 || newIndex < 0) return;
    const nextItems = arrayMove(displayItems, oldIndex, newIndex);
    const next = saveNotes({ ...notesState, checklistItems: nextItems });
    setNotesState(next);
  }

  return (
    <div className="screen-placeholder notes-screen">
      <section className="next-steps next-steps--plain notes__section">
        <SectionHeader as="h1" title={t('notes.title')} />
        <div className="next-steps__stack notes__actions">
          <Card className="still-daily-checklist__card notes__composer-card">
            <div className="notes__composer">
              <input
                ref={titleRef}
                id="notes-composer-title"
                className="notes__composer-title"
                type="text"
                placeholder="Neue Notiz"
                value={composerTitle}
                onChange={(e) => {
                  setComposerTitle(e.target.value);
                  setComposerTitleError(false);
                }}
                onFocus={handleTitleFocus}
                aria-label="Titel der Notiz"
              />

              {composerTitleError && (
                <p className="notes__composer-hint notes__composer-hint--error">
                  Bitte einen Titel eingeben.
                </p>
              )}

              {composerExpanded && (
                <div className="notes__composer-expanded">
                  <textarea
                    className="notes__composer-body"
                    placeholder="Notizinhalt (optional)"
                    value={composerBody}
                    onChange={(e) => setComposerBody(e.target.value)}
                    rows={4}
                    aria-label="Inhalt der Notiz"
                  />
                  <div className="notes__composer-actions">
                    <Button
                      type="button"
                      variant="primary"
                      className="next-steps__button btn--softpill notes__save-btn"
                      onClick={handleComposerSave}
                      disabled={!isComposerValid}
                    >
                      {t('notes.save')}
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      className="next-steps__button btn--softpill notes__save-btn"
                      onClick={resetComposer}
                    >
                      Abbrechen
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </section>

      <section className="notes__content-section">
        <Card className="still-daily-checklist__card notes__list-card">
          {displayItems.length === 0 ? (
            <div className="notes__empty">
              <p className="notes__empty-title">Noch keine Notizen</p>
              <p className="notes__empty-hint">
                Klicke oben in das Titelfeld, um deine erste Notiz zu erstellen.
              </p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={displayItems.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <ul className="notes__list">
                  {displayItems.map((item) => (
                    <NoteItem
                      key={item.id}
                      item={item}
                      isExpanded={expandedNoteId === item.id}
                      editTitle={expandedNoteId === item.id ? editTitle : ''}
                      editText={expandedNoteId === item.id ? editText : ''}
                      onContentClick={handleContentClick}
                      onToggleChecked={toggleChecked}
                      onDelete={deleteItem}
                      onEditTitleChange={setEditTitle}
                      onEditTextChange={setEditText}
                      onInlineSave={handleInlineSave}
                      onInlineCancel={collapseInline}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </Card>
      </section>
    </div>
  );
};
