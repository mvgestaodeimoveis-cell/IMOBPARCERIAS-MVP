// Chamadas vão para o próprio Next (mesma origem) e são repassadas ao backend
// pelo BFF em app/api/[...path]/route.ts.
import { clearSession, getRefreshToken, getRole, saveSession } from './auth';

export interface ApiError {
  code: string;
  message: string;
  fields?: Record<string, string>;
}

export class ApiRequestError extends Error {
  readonly code: string;
  readonly fields?: Record<string, string>;

  constructor(error: ApiError) {
    super(error.message);
    this.code = error.code;
    this.fields = error.fields;
  }
}

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
}

// Evita várias renovações simultâneas: reaproveita a mesma promise.
let refreshInFlight: Promise<string | null> | null = null;

async function renovarToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refresh_token = getRefreshToken();
    const role = getRole();
    if (!refresh_token || !role) return null;
    try {
      const res = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      saveSession({ accessToken: data.access_token, refreshToken: data.refresh_token, role });
      return data.access_token as string;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export async function apiFetch<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options;

  const doFetch = (bearer?: string | null) =>
    fetch(`/api/v1${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

  let res = await doFetch(token);

  // Access token expirado → tenta renovar (refresh) e repete a chamada uma vez.
  if (res.status === 401 && token) {
    const novoToken = await renovarToken();
    if (novoToken) {
      res = await doFetch(novoToken);
    } else {
      clearSession();
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
  }

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const err: ApiError = data?.error ?? { code: 'INTERNAL_ERROR', message: 'Erro inesperado.' };
    throw new ApiRequestError(err);
  }

  return data as T;
}
