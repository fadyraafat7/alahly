import { requestSignal } from '../utils/requestSignal'
const browserBaseUrl = (import.meta.env.VITE_WC_STORE_API_URL || '/wp-json/wc/store/v1').replace(/\/$/, '')
export class ApiError extends Error {
  status?: number
  constructor(message: string, status?: number) { super(message); this.status = status }
}

// Never expose JSON parser diagnostics or an unvalidated error message to the UI.
// Retain HTTP status (especially 401) and caller cancellation for session handling.
export async function readApiResponse(response: Response, invalidMessage: string, errorMessage: string, signal?: AbortSignal): Promise<unknown> {
  let body: unknown
  try {
    body = await response.json()
  } catch (error) {
    if (signal?.aborted) throw error
    throw new ApiError(response.ok ? invalidMessage : errorMessage, response.ok ? undefined : response.status)
  }
  if (!response.ok) {
    const message = typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string' && body.message.trim()
      ? body.message : errorMessage
    throw new ApiError(message, response.status)
  }
  return body
}
export interface ApiContext { baseUrl?: string; signal?: AbortSignal }
type ApiRequestOptions = ApiContext & {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  params?: object
  body?: object
  headers?: HeadersInit
}
export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<{ data: T; headers: Headers }> {
  const base = (options.baseUrl || browserBaseUrl).replace(/\/$/, '')
  const url = typeof window === 'undefined' ? new URL(base + path) : new URL(base + path, window.location.origin)
  Object.entries(options.params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
  })
  let response: Response
  const signal = requestSignal(options.signal)
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      signal,
      cache: path === '/cart' || path.startsWith('/cart/') ? 'no-store' : 'default',
      credentials: typeof window === 'undefined' ? 'omit' : 'include',
      headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
  } catch (error) {
    if (options.signal?.aborted) throw error
    throw new ApiError('Unable to reach the WooCommerce Store API. Please try again.')
  }
  const data = await readApiResponse(response, 'The store returned an invalid response. Please try again.', `Store request failed (${response.status}).`, signal)
  return { data: data as T, headers: response.headers }
}
export const apiGet = <T>(path: string, params?: object, context?: ApiContext) => apiRequest<T>(path, { ...context, params })
