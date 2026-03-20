import { useEffect, useState } from 'react';

import type { TelemetryPayload } from '../telemetry';
import { trackEvent } from '../telemetry';
import { getResource } from './DataService';

type Fetcher<T> = () => Promise<T>;

export interface UseResourceState<T> {
  data?: T;
  isLoading: boolean;
  error?: string;
}

export const useResource = <T,>(key: string, fetcher: Fetcher<T>): UseResourceState<T> => {
  const [state, setState] = useState<UseResourceState<T>>({
    data: undefined,
    isLoading: true,
    error: undefined,
  });

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      setState((prev) => ({ ...prev, isLoading: true, error: undefined }));
      try {
        const data = await getResource<T>(key, fetcher);
        if (!isMounted) return;
        setState({ data, isLoading: false, error: undefined });
      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : String(err);
        setState({ data: undefined, isLoading: false, error: message });
        trackEvent('data_resource_hook_failed', { key, error: message } as TelemetryPayload);
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [key, fetcher]);

  return state;
};

