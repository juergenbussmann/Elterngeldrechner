import { describe, expect, it, vi, beforeEach } from 'vitest';

type LocalStorageLike = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
};

const createLocalStorageMock = (): LocalStorageLike => {
  const store = new Map<string, string>();
  return {
    getItem: (key) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
};

const setupWindow = () => {
  const localStorage = createLocalStorageMock();
  (globalThis as unknown as { window: unknown }).window = { localStorage };
  return localStorage;
};

const importNotesStorage = async () => {
  vi.resetModules();
  return await import('./storage');
};

describe('notes/storage', () => {
  beforeEach(() => {
    setupWindow();
  });

  it('loadNotes returns empty defaults when storage is empty', async () => {
    const mod = await importNotesStorage();
    expect(mod.loadNotes()).toEqual({ notesText: '', checklistItems: [] });
  });

  it('saveNotes persists and loadNotes returns stored state', async () => {
    const mod = await importNotesStorage();
    mod.saveNotes({ notesText: 'Hallo', checklistItems: [] });
    expect(mod.loadNotes()).toEqual({ notesText: 'Hallo', checklistItems: [] });
  });

  it('addChecklistItem appends a new item', async () => {
    const mod = await importNotesStorage();
    const next = mod.addChecklistItem('Milchpumpe', '', { notesText: '', checklistItems: [] });
    expect(next.checklistItems).toHaveLength(1);
    expect(next.checklistItems[0].text).toBe('Milchpumpe');
    expect(next.checklistItems[0].done).toBe(false);
  });

  it('toggleChecklistItem toggles done', async () => {
    const mod = await importNotesStorage();
    const created = mod.addChecklistItem('Test', '', { notesText: '', checklistItems: [] });
    const id = created.checklistItems[0].id;
    const toggled = mod.toggleChecklistItem(id, created);
    expect(toggled.checklistItems[0].done).toBe(true);
  });
});
