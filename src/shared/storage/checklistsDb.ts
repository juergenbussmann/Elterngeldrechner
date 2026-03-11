/**
 * IndexedDB-Persistenz für Plus-Checklisten (Overrides + eigene Listen).
 * Systemlisten werden NICHT hier gespeichert.
 */

import { openDB, put, get, getAll, deleteItem } from '../lib/storage/indexedDb';

export type ChecklistItem = {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  updatedAt: number;
};

export type Checklist = {
  id: string;
  title: string;
  items: ChecklistItem[];
  system: boolean;
  baseId?: string;
  createdAt: number;
  updatedAt: number;
};

const DB_NAME = 'pwa-checklists';
const DB_VERSION = 1;
const STORE_NAME = 'checklists';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, (db, _oldVersion, _newVersion, _transaction) => {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    });
  }
  return dbPromise;
}

export async function dbGetAll(): Promise<Checklist[]> {
  try {
    const db = await getDb();
    return await getAll<Checklist>(db, STORE_NAME);
  } catch {
    return [];
  }
}

export async function dbGetById(id: string): Promise<Checklist | null> {
  try {
    const db = await getDb();
    const result = await get<Checklist>(db, STORE_NAME, id);
    return result ?? null;
  } catch {
    return null;
  }
}

export async function dbGetOverrideByBaseId(baseId: string): Promise<Checklist | null> {
  const all = await dbGetAll();
  return all.find((c) => c.baseId === baseId && !c.system) ?? null;
}

export async function dbUpsert(checklist: Checklist): Promise<void> {
  const db = await getDb();
  await put(db, STORE_NAME, checklist);
}

export async function dbRemove(id: string): Promise<void> {
  const db = await getDb();
  await deleteItem(db, STORE_NAME, id);
}
