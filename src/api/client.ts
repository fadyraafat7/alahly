const browserBaseUrl = (import.meta.env.VITE_WC_STORE_API_URL || '/wp-json/wc/store/v1').replace(/\/$/, '')
export class ApiError extends Error {
  status?: number
  constructor(message: string, status?: number) { super(message); this.status = status }
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
  try {
    const timeout = AbortSignal.timeout(15_000)
    response = await fetch(url, {
      method: options.method ?? 'GET',
      signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
      credentials: typeof window === 'undefined' ? 'omit' : 'include',
      headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
      body: options.body ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new ApiError('Unable to reach the WooCommerce Store API. Please try again.')
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null
    throw new ApiError(body?.message ?? `Store request failed (${response.status}).`, response.status)
  }
  return { data: await response.json() as T, headers: response.headers }
}
export const apiGet = <T>(path: string, params?: object, context?: ApiContext) => apiRequest<T>(path, { ...context, params })
