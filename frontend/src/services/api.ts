import { handleMockRequest } from './mockBackend';

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

  const method = options.method || 'GET';
  const parsedBody = options.body ? (typeof options.body === 'string' ? JSON.parse(options.body) : options.body) : undefined;

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Attempt token refresh or logout
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken && endpoint !== '/auth/refresh') {
        try {
          const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          if (refreshRes.ok) {
            const tokens = await refreshRes.json();
            localStorage.setItem('accessToken', tokens.accessToken);
            localStorage.setItem('refreshToken', tokens.refreshToken);
            headers['Authorization'] = `Bearer ${tokens.accessToken}`;
            const retryRes = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
            if (!retryRes.ok) {
              const errData = await retryRes.json().catch(() => ({}));
              throw new ApiError(errData.error || 'Erreur requête', retryRes.status);
            }
            return retryRes.json();
          }
        } catch (e) {
          if (endpoint.startsWith('/admin')) {
            throw new ApiError('Session Super Admin expirée. Veuillez vous reconnecter.', 401);
          }
          return await handleMockRequest(endpoint, method, parsedBody);
        }
      } else {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        throw new ApiError('Non authentifié.', 401);
      }
    }

    // Pour l'espace Super Admin, aucune donnée fictive n'est tolérée
    if (endpoint.startsWith('/admin')) {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(errorData.error || `Erreur serveur (${response.status})`, response.status);
      }
      return response.json();
    }

    // Fallback for static cloud hosting returning 404/405/502 on normal user API routes
    if (response.status === 404 || response.status === 405 || response.status === 502) {
      return await handleMockRequest(endpoint, method, parsedBody);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      return await handleMockRequest(endpoint, method, parsedBody);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(errorData.error || `Erreur serveur (${response.status})`, response.status);
    }

    return response.json();
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    if (endpoint.startsWith('/admin')) {
      throw new ApiError(err?.message || 'Impossible de joindre le serveur d’administration.', 500);
    }
    // On network failure or offline for standard user demo, serve from mock
    return await handleMockRequest(endpoint, method, parsedBody);
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

