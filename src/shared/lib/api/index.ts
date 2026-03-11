import { apiBaseUrl } from '../../../config/appConfig';
import { error } from '../logging';
import { trackEvent } from '../telemetry';

export type ApiRequestOptions = RequestInit & { signal?: AbortSignal };

type HttpMethod = 'GET' | 'POST';

const isAbsoluteUrl = (path: string): boolean => /^https?:\/\//i.test(path);

const logApiError = (method: HttpMethod, url: string, err: unknown, status?: number): void => {
  const message = err instanceof Error ? err.message : String(err);

  if (typeof status === 'number') {
    error(`[api:${method.toLowerCase()}]`, url, `status:${status}`, message);
  } else {
    error(`[api:${method.toLowerCase()}]`, url, message);
  }

  trackEvent('api_error', {
    method,
    url,
    status,
    message,
  });
};

const ensureJsonHeaders = (headers?: HeadersInit): Headers => {
  const resolvedHeaders = new Headers(headers ?? undefined);

  if (!resolvedHeaders.has('Content-Type')) {
    resolvedHeaders.set('Content-Type', 'application/json');
  }

  return resolvedHeaders;
};

export const buildUrl = (path: string): string => {
  if (isAbsoluteUrl(path)) {
    return path;
  }

  if (!apiBaseUrl) {
    return path;
  }

  const normalizedBase = apiBaseUrl.replace(/\/+$/, '');
  const normalizedPath = path.replace(/^\/+/, '');

  if (!normalizedPath) {
    return normalizedBase;
  }

  return `${normalizedBase}/${normalizedPath}`;
};

export const get = async <T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
  const url = buildUrl(path);
  let handledError = false;

  try {
    const response = await fetch(url, {
      ...options,
      method: 'GET',
    });

    if (!response.ok) {
      handledError = true;
      const message = `Request failed with status ${response.status}`;
      logApiError('GET', url, new Error(message), response.status);
      throw new Error(message);
    }

    return (await response.json()) as T;
  } catch (err) {
    if (!handledError) {
      logApiError('GET', url, err);
    }
    throw err;
  }
};

export const post = async <TResponse = unknown, TBody = unknown>(
  path: string,
  body: TBody,
  options: ApiRequestOptions = {}
): Promise<TResponse> => {
  const url = buildUrl(path);
  let handledError = false;
  const headers = ensureJsonHeaders(options.headers);

  try {
    const response = await fetch(url, {
      ...options,
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      handledError = true;
      const message = `Request failed with status ${response.status}`;
      logApiError('POST', url, new Error(message), response.status);
      throw new Error(message);
    }

    return (await response.json()) as TResponse;
  } catch (err) {
    if (!handledError) {
      logApiError('POST', url, err);
    }
    throw err;
  }
};

