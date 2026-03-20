const STORAGE_PREFIX = 'pwa-skeleton';

const getStorageKey = (key: string): string => {
  return `${STORAGE_PREFIX}:${key}`;
};

const isStorageAvailable = (): boolean => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return false;
  }

  try {
    const testKey = `${STORAGE_PREFIX}:__test__`;
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

const storageAvailable = isStorageAvailable();

export const getValue = <T = unknown>(key: string, fallback?: T): T | undefined => {
  if (!storageAvailable) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(key));
    if (raw === null || raw === undefined) {
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const setValue = <T = unknown>(key: string, value: T): void => {
  if (!storageAvailable) {
    return;
  }

  try {
    const serialized = JSON.stringify(value);
    window.localStorage.setItem(getStorageKey(key), serialized);
  } catch {
    // noop
  }
};

export const hasValue = (key: string): boolean => {
  if (!storageAvailable) {
    return false;
  }

  try {
    return window.localStorage.getItem(getStorageKey(key)) !== null;
  } catch {
    return false;
  }
};

export const getItems = <T = unknown>(key: string): T[] => {
  if (!storageAvailable) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(key));
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as T[];
  } catch {
    return [];
  }
};

export const setItems = <T = unknown>(key: string, items: T[]): void => {
  if (!storageAvailable) {
    return;
  }

  try {
    const value = JSON.stringify(items);
    window.localStorage.setItem(getStorageKey(key), value);
  } catch {
    // noop
  }
};

export const clearItems = (key: string): void => {
  if (!storageAvailable) {
    return;
  }

  try {
    window.localStorage.removeItem(getStorageKey(key));
  } catch {
    // noop
  }
};
