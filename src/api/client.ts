const baseUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

export class ApiError extends Error {
  status?: number
  constructor(message: string, status?: number) { super(message); this.status = status }
}

export async function apiGet<T>(path: string, params?: object): Promise<{ data: T; headers: Headers }> {
  const url = new URL(`${baseUrl}${path}`, window.location.origin)
  Object.entries(params ?? {}).forEach(([key, value]) => { if (value !== undefined && value !== '') url.searchParams.set(key, String(value)) })
  let response: Response
  try { response = await fetch(url, { headers: { Accept: 'application/json' } }) }
  catch { throw new ApiError('Unable to reach the store. Please check your connection and try again.') }
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null
    throw new ApiError(body?.message ?? `Store request failed (${response.status}).`, response.status)
  }
  return { data: await response.json() as T, headers: response.headers }
}
