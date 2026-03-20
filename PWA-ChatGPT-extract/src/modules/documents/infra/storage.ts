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

/** Stored item kann Blob oder ArrayBuffer haben – wir normalisieren zu Blob. */
type StoredDocument = Omit<DocumentItem, 'blob'> & { blob: Blob | ArrayBuffer };

function toDocumentItem(raw: StoredDocument): DocumentItem {
  const blob = raw.blob instanceof ArrayBuffer
    ? new Blob([raw.blob], { type: raw.mimeType || 'application/octet-stream' })
    : raw.blob;
  return { ...raw, blob };
}

/** Blob als ArrayBuffer speichern – robuster auf mobilen IndexedDB-Implementierungen. */
async function prepareForStorage(doc: DocumentItem): Promise<StoredDocument> {
  if (!(doc.blob instanceof Blob)) return doc as unknown as StoredDocument;
  const buffer = await doc.blob.arrayBuffer();
  return { ...doc, blob: buffer } as StoredDocument;
}

export const loadDocuments = async (): Promise<DocumentItem[]> => {
  const db = await getDb();
  if (import.meta.env.DEV) {
    console.time('[documents] loadDocuments (IndexedDB getAll)');
  }
  const rawItems = await getAll<StoredDocument>(db, STORE_NAME);
  if (import.meta.env.DEV) {
    console.timeEnd('[documents] loadDocuments (IndexedDB getAll)');
  }
  return rawItems.map(toDocumentItem);
};

export const saveDocument = async (document: DocumentItem): Promise<void> => {
  const db = await getDb();
  if (import.meta.env.DEV) {
    console.time('[documents] saveDocument (IndexedDB put)');
  }
  const toStore = await prepareForStorage(document);
  await put(db, STORE_NAME, toStore);
  if (import.meta.env.DEV) {
    console.timeEnd('[documents] saveDocument (IndexedDB put)');
  }
};

export const removeDocument = async (id: string): Promise<void> => {
  const db = await getDb();
  await deleteItem(db, STORE_NAME, id);
};
