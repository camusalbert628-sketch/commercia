const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const DEFAULT_API_URL = isLocal ? 'http://localhost:3001/api' : 'https://backend-phi-three-43.vercel.app/api';
const BASE_URL = isLocal ? 'http://localhost:3001/api' : (import.meta.env.VITE_API_URL || DEFAULT_API_URL);

export class ApiError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Jetons conservés exclusivement en mémoire volatile de fermeture (JAMAIS dans localStorage ni sessionStorage)
let inMemoryAdminSessionToken: string | null = null;
let inMemoryAdminCsrfToken: string | null = null;

export function setAdminSessionCredentials(sessionToken: string | null, csrfToken?: string | null) {
  inMemoryAdminSessionToken = sessionToken;
  inMemoryAdminCsrfToken = csrfToken || null;
}

export function hasInMemoryAdminSession(): boolean {
  return Boolean(inMemoryAdminSessionToken);
}

function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined' || !document.cookie) return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('accessToken');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const activeBusinessId = localStorage.getItem('activeBusinessId') || localStorage.getItem('commercia_active_business_id');
  if (activeBusinessId) {
    headers['x-business-id'] = activeBusinessId;
  }

  if (inMemoryAdminSessionToken) {
    headers['x-admin-session-token'] = inMemoryAdminSessionToken;
  }

  const csrfToken = inMemoryAdminCsrfToken || getCookieValue('commercia_admin_csrf');
  if (csrfToken && options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method.toUpperCase())) {
    headers['x-csrf-token'] = csrfToken;
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (response.status === 401) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken && endpoint !== '/auth/refresh') {
        try {
          const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
            credentials: 'include',
          });
          if (refreshRes.ok) {
            const tokens = await refreshRes.json();
            localStorage.setItem('accessToken', tokens.accessToken);
            localStorage.setItem('refreshToken', tokens.refreshToken);
            headers['Authorization'] = `Bearer ${tokens.accessToken}`;
            const retryRes = await fetch(`${BASE_URL}${endpoint}`, {
              ...options,
              headers,
              credentials: 'include',
            });
            if (!retryRes.ok) {
              const errData = await retryRes.json().catch(() => ({}));
              throw new ApiError(errData.error || errData.message || 'Erreur requête', retryRes.status);
            }
            return retryRes.json();
          }
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setAdminSessionCredentials(null, null);
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          throw new ApiError('Session expirée. Veuillez vous reconnecter.', 401);
        }
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setAdminSessionCredentials(null, null);
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(errorData.error || errorData.message || 'Non authentifié.', 401);
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(errorData.error || errorData.message || `Erreur serveur (${response.status})`, response.status);
    }

    return response.json();
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(err?.message || 'Impossible de contacter les serveurs COMMERCIA.', 500);
  }
}

export const api = {
  get: <T>(endpoint: string, headers?: Record<string, string>) => request<T>(endpoint, { method: 'GET', headers }),
  post: <T>(endpoint: string, body?: any, headers?: Record<string, string>) =>
    request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),
  put: <T>(endpoint: string, body?: any, headers?: Record<string, string>) =>
    request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),
  patch: <T>(endpoint: string, body?: any, headers?: Record<string, string>) =>
    request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),
  delete: <T>(endpoint: string, headers?: Record<string, string>) => request<T>(endpoint, { method: 'DELETE', headers }),
};
