export type DbUpgradeHandler = (
  db: IDBDatabase,
  oldVersion: number,
  newVersion: number | null,
  transaction: IDBTransaction
) => void;

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const waitForTransaction = (transaction: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });

export const openDB = (
  name: string,
  version: number,
  onUpgrade?: DbUpgradeHandler
): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }

    const request = indexedDB.open(name, version);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      const transaction = request.transaction;
      if (transaction) {
        onUpgrade?.(db, event.oldVersion, event.newVersion, transaction);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });

export const put = async <T>(db: IDBDatabase, storeName: string, value: T): Promise<void> => {
  const transaction = db.transaction(storeName, 'readwrite');
  transaction.objectStore(storeName).put(value);
  await waitForTransaction(transaction);
};

export const get = async <T>(db: IDBDatabase, storeName: string, key: IDBValidKey): Promise<T | undefined> => {
  const transaction = db.transaction(storeName, 'readonly');
  const request = transaction.objectStore(storeName).get(key);
  const result = await requestToPromise(request);
  await waitForTransaction(transaction);
  return result ?? undefined;
};

export const getAll = async <T>(db: IDBDatabase, storeName: string): Promise<T[]> => {
  const transaction = db.transaction(storeName, 'readonly');
  const request = transaction.objectStore(storeName).getAll();
  const result = await requestToPromise(request);
  await waitForTransaction(transaction);
  return Array.isArray(result) ? result : [];
};

export const deleteItem = async (db: IDBDatabase, storeName: string, key: IDBValidKey): Promise<void> => {
  const transaction = db.transaction(storeName, 'readwrite');
  transaction.objectStore(storeName).delete(key);
  await waitForTransaction(transaction);
};
