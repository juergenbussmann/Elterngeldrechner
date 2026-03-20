import { deleteItem, getAll, openDB, put } from '../../../shared/lib/storage/indexedDb';
import type { Appointment } from '../domain/types';

const DB_NAME = 'stillberatung';
const DB_VERSION = 1;
const STORE_NAME = 'appointments';

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

export const loadAppointments = async (): Promise<Appointment[]> => {
  const db = await getDb();
  return await getAll<Appointment>(db, STORE_NAME);
};

export const saveAppointment = async (appointment: Appointment): Promise<void> => {
  const db = await getDb();
  await put(db, STORE_NAME, appointment);
};

export const removeAppointment = async (id: string): Promise<void> => {
  const db = await getDb();
  await deleteItem(db, STORE_NAME, id);
};
