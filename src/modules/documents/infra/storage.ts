import { deleteItem, getAll, openDB, put } from '../../../shared/lib/storage/indexedDb';
import type { DocumentItem } from '../domain/types';

const DB_NAME = 'stillberatung';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

let dbPromise: Promise<IDBDatabase> | null = null;

const getDb = (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, (db) => {
      if (!db.objectStoreNames.contains('appointments')) {
        db.createObjectStore('appointments', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('documents')) {
        db.createObjectStore('documents', { keyPath: 'id' });
      }
    });
  }
  return dbPromise;
};

export const loadDocuments = async (): Promise<DocumentItem[]> => {
  const db = await getDb();
  return await getAll<DocumentItem>(db, STORE_NAME);
};

export const saveDocument = async (document: DocumentItem): Promise<void> => {
  const db = await getDb();
  await put(db, STORE_NAME, document);
};

export const removeDocument = async (id: string): Promise<void> => {
  const db = await getDb();
  await deleteItem(db, STORE_NAME, id);
};
