import type { TelemetryPayload } from '../telemetry';
import { trackEvent } from '../telemetry';

type Fetcher<T> = () => Promise<T>;

interface CacheEntry<T> {
  value?: T;
  error?: unknown;
  isLoading: boolean;
  lastUpdated?: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

const getOrCreateEntry = <T>(key: string): CacheEntry<T> => {
  const existing = cache.get(key) as CacheEntry<T> | undefined;
  if (existing) {
    return existing;
  }
  const entry: CacheEntry<T> = { isLoading: false };
  cache.set(key, entry);
  return entry;
};

export const getResource = async <T>(key: string, fetcher: Fetcher<T>): Promise<T> => {
  const entry = getOrCreateEntry<T>(key);

  if (entry.value !== undefined) {
    return entry.value;
  }

  if (entry.isLoading) {
    // Eenvoudige concurrentie-beperking: wacht tot een andere call klaar is.
    return new Promise<T>((resolve, reject) => {
      const check = () => {
        if (!entry.isLoading) {
          if (entry.value !== undefined) {
            resolve(entry.value);
          } else if (entry.error) {
            reject(entry.error);
          } else {
            reject(new Error('Resource loading finished without value or error'));
          }
        } else {
          setTimeout(check, 10);
        }
      };
      check();
    });
  }

  entry.isLoading = true;
  trackEvent('data_resource_requested', { key } as TelemetryPayload);

  try {
    const value = await fetcher();
    entry.value = value;
    entry.error = undefined;
    entry.isLoading = false;
    entry.lastUpdated = Date.now();
    trackEvent('data_resource_loaded', { key } as TelemetryPayload);
    return value;
  } catch (err) {
    entry.error = err;
    entry.isLoading = false;
    trackEvent('data_resource_failed', { key, error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
};

export const invalidateResource = (key: string): void => {
  cache.delete(key);
  trackEvent('data_resource_invalidated', { key });
};

