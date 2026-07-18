import type { ApiError } from '@/types'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  params?: Record<string, string | number | undefined>
}

/**
 * Get the stored auth token from localStorage (client-side only).
 */
function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

/**
 * Build the full URL with optional query parameters.
 */
function buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(`${BASE_URL}${path}`, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000')

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value))
      }
    })
  }

  return url.toString()
}

/**
 * Centralized fetch wrapper with auth header injection and error handling.
 */
export async function api<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, params, headers: customHeaders, ...rest } = options
  const token = getToken()

  const headers = new Headers(customHeaders as Record<string, string>)

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (body !== undefined && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(buildUrl(path, params), {
    ...rest,
    headers,
    body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({
      error: 'Error de conexión',
      code: 'NETWORK_ERROR',
    })) as ApiError

    // Handle 401 — clear token and redirect to login
    if (res.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')
      window.location.href = '/login'
    }

    throw { ...errorBody, status: res.status }
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return undefined as T
  }

  return res.json() as Promise<T>
}

// ── Convenience methods ──

export const apiClient = {
  get: <T>(path: string, params?: Record<string, string | number | undefined>) =>
    api<T>(path, { method: 'GET', params }),

  post: <T>(path: string, body?: unknown) =>
    api<T>(path, { method: 'POST', body }),

  put: <T>(path: string, body?: unknown) =>
    api<T>(path, { method: 'PUT', body }),

  patch: <T>(path: string, body?: unknown) =>
    api<T>(path, { method: 'PATCH', body }),

  delete: <T>(path: string) =>
    api<T>(path, { method: 'DELETE' }),
}
