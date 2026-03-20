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
  // storage helper checks for window.localStorage at module init time
  (globalThis as unknown as { window: unknown }).window = { localStorage };
  return localStorage;
};

const importContactsStorage = async () => {
  // ensure module-level storage availability check runs fresh
  vi.resetModules();
  return await import('./storage');
};

describe('contacts/storage', () => {
  beforeEach(() => {
    setupWindow();
  });

  it('loadContacts returns [] when storage is empty', async () => {
    const mod = await importContactsStorage();
    const contacts = mod.loadContacts();
    expect(contacts.length).toBe(1);
    expect(contacts[0].id).toBe(mod.JACQUELINE_CONTACT_ID);
    expect(contacts[0].protected).toBe(true);
  });

  it('loadContacts returns [] when stored JSON is invalid', async () => {
    const localStorage = setupWindow();
    // poison the exact key format used by setItems
    localStorage.setItem('pwa-skeleton:stillberatung.contacts.v1', 'not-json');
    const mod = await importContactsStorage();
    const contacts = mod.loadContacts();
    expect(contacts.length).toBe(1);
    expect(contacts[0].id).toBe(mod.JACQUELINE_CONTACT_ID);
    expect(contacts[0].protected).toBe(true);
  });

  it('upsertContact creates a new contact and sets timestamps', async () => {
    const mod = await importContactsStorage();
    const next = mod.upsertContact({ name: 'Alice', email: 'alice@example.com' });
    expect(next.length).toBe(2);
    const created = next.find((c) => c.id !== mod.JACQUELINE_CONTACT_ID);
    const system = next.find((c) => c.id === mod.JACQUELINE_CONTACT_ID);
    expect(created?.id).toBeTruthy();
    expect(created?.createdAt).toBeTruthy();
    expect(created?.updatedAt).toBeTruthy();
    expect(created?.name).toBe('Alice');
    expect(system?.protected).toBe(true);
  });

  it('upsertContact updates an existing contact with same id', async () => {
    const mod = await importContactsStorage();
    const created = mod.upsertContact({ name: 'Alice' });
    const userContact = created.find((c) => c.id !== mod.JACQUELINE_CONTACT_ID);
    const id = userContact?.id ?? '';
    const updated = mod.upsertContact({ id, name: 'Alice B.', phone: '123' });
    expect(updated.length).toBe(2);
    const updatedContact = updated.find((c) => c.id === id);
    const system = updated.find((c) => c.id === mod.JACQUELINE_CONTACT_ID);
    expect(updatedContact?.id).toBe(id);
    expect(updatedContact?.name).toBe('Alice B.');
    expect(updatedContact?.phone).toBe('123');
    expect(system?.protected).toBe(true);
  });

  it('deleteContact removes a contact by id', async () => {
    const mod = await importContactsStorage();
    const created = mod.upsertContact({ name: 'Alice' });
    const userContact = created.find((c) => c.id !== mod.JACQUELINE_CONTACT_ID);
    const id = userContact?.id ?? '';
    const next = mod.deleteContact(id);
    expect(next.length).toBe(1);
    expect(next[0].id).toBe(mod.JACQUELINE_CONTACT_ID);
    expect(next[0].protected).toBe(true);
  });
});
