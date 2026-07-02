/** Typed fetch wrapper: JSON in/out, bearer token when present, rich errors. */

export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: FieldError[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const AUTH_STORAGE_KEY = 'ticketdash.auth';

/**
 * Base URL of the API. Empty in local dev and the Docker stack (same origin,
 * proxied); set VITE_API_URL at build time when the frontend is deployed
 * separately from the API (e.g. static host + Render service).
 */
export const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

/** Fired when a request that carried a token comes back 401: the session is stale. */
export const SESSION_EXPIRED_EVENT = 'ticketdash:session-expired';

export function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw).token ?? null) : null;
  } catch {
    return null;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (response.status === 204) return undefined as T;

  // A 401 on a request that carried a token means the token expired or was
  // revoked. Clear the session once (parallel failures skip the re-dispatch).
  if (response.status === 401 && token && getStoredToken()) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error ?? `Request failed with status ${response.status}`,
      body?.details,
    );
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data) }),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
