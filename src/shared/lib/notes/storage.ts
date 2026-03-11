import { getValue, setValue } from '../storage';
import type { ChecklistItem, NotesState } from './types';

const STORAGE_KEY = 'stillberatung.notes.v1';

const emptyState = (): NotesState => ({
  notesText: '',
  checklistItems: [],
});

const generateId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return (crypto as Crypto).randomUUID();
    }
  } catch {
    // noop
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizeText = (value: unknown): string => (typeof value === 'string' ? value : '');

const normalizeChecklistItem = (value: unknown): ChecklistItem | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const record = value as Record<string, unknown>;
  const rawText = normalizeText(record.text);
  const text = rawText.trim();
  if (!text) {
    return null;
  }
  const id = typeof record.id === 'string' && record.id ? record.id : generateId();
  const done = Boolean(record.done);
  const note = normalizeText(record.note);

  return { id, text, done, note };
};

const normalizeState = (state?: NotesState | null): NotesState => {
  if (!state) {
    return emptyState();
  }
  const notesText = normalizeText(state.notesText);
  const checklistItems = Array.isArray(state.checklistItems)
    ? state.checklistItems
        .map((item) => normalizeChecklistItem(item))
        .filter((item): item is ChecklistItem => Boolean(item))
    : [];

  return { notesText, checklistItems };
};

const resolveBase = (current?: NotesState): NotesState => {
  if (current) {
    return normalizeState(current);
  }
  return loadNotes();
};

export const loadNotes = (): NotesState => {
  try {
    const stored = getValue<NotesState>(STORAGE_KEY, emptyState());
    return normalizeState(stored);
  } catch {
    return emptyState();
  }
};

export const saveNotes = (state: NotesState): NotesState => {
  const normalized = normalizeState(state);
  try {
    setValue(STORAGE_KEY, normalized);
  } catch {
    // noop
  }
  return normalized;
};

export const setNotesText = (text: string, current?: NotesState): NotesState => {
  const base = resolveBase(current);
  const next = { ...base, notesText: normalizeText(text) };
  return saveNotes(next);
};

export const addChecklistItem = (
  title: string,
  body = '',
  current?: NotesState
): NotesState => {
  const base = resolveBase(current);
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return base;
  }
  const next: NotesState = {
    ...base,
    checklistItems: [
      ...base.checklistItems,
      { id: generateId(), text: trimmedTitle, done: false, note: normalizeText(body) },
    ],
  };
  return saveNotes(next);
};

export const toggleChecklistItem = (id: string, current?: NotesState): NotesState => {
  const base = resolveBase(current);
  if (!id) {
    return base;
  }
  const nextItems = base.checklistItems.map((item) =>
    item.id === id ? { ...item, done: !item.done } : item,
  );
  const next = { ...base, checklistItems: nextItems };
  return saveNotes(next);
};

export const updateChecklistItemText = (id: string, text: string, current?: NotesState): NotesState => {
  const base = resolveBase(current);
  if (!id) {
    return base;
  }
  const trimmed = text.trim();
  const nextItems = base.checklistItems.map((item) => {
    if (item.id !== id) {
      return item;
    }
    if (!trimmed) {
      return item;
    }
    return { ...item, text: trimmed };
  });
  const next = { ...base, checklistItems: nextItems };
  return saveNotes(next);
};

export const updateChecklistItemNote = (id: string, note: string, current?: NotesState): NotesState => {
  const base = resolveBase(current);
  if (!id) {
    return base;
  }
  const nextItems = base.checklistItems.map((item) =>
    item.id === id ? { ...item, note: normalizeText(note) } : item,
  );
  const next = { ...base, checklistItems: nextItems };
  return saveNotes(next);
};

export const updateChecklistItemFull = (
  id: string,
  title: string,
  body: string,
  current?: NotesState
): NotesState => {
  const base = resolveBase(current);
  if (!id) return base;
  const trimmedTitle = title.trim();
  const trimmedBody = normalizeText(body);
  if (!trimmedTitle) return base;
  const nextItems = base.checklistItems.map((item) =>
    item.id === id ? { ...item, text: trimmedTitle, note: trimmedBody } : item,
  );
  return saveNotes({ ...base, checklistItems: nextItems });
};

export const removeDoneItems = (current?: NotesState): NotesState => {
  const base = resolveBase(current);
  const next = {
    ...base,
    checklistItems: base.checklistItems.filter((item) => !item.done),
  };
  return saveNotes(next);
};
