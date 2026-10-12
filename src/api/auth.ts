import { ApiError } from './client'
import { customerOrdersSchema } from '../types/order'
import { registrationResultSchema, registrationSettingsSchema } from '../types/auth'
import type { RegistrationInput } from '../types/auth'
import { requestSignal } from '../utils/requestSignal'

const baseUrl = (import.meta.env.VITE_WP_AUTH_API_URL || '/wp-json/alahly-spa/v1').replace(/\/$/, '')
const siteUrl = (import.meta.env.VITE_WP_SITE_URL || 'http://alahly.test').replace(/\/$/, '')
export const passwordResetUrl = `${siteUrl}/wp-login.php?action=lostpassword`
export interface AuthUser { id: number; email: string; name: string }
interface LoginResponse { token: string; user: AuthUser }

async function authRequest<T>(path: string, options: { method?: 'GET' | 'POST'; token?: string; body?: object; signal?: AbortSignal; timeoutMs?: number } = {}): Promise<T> {
  try {
    const response = await fetch(new URL(`${baseUrl}${path}`, window.location.origin), { method: options.method ?? 'GET', signal: requestSignal(options.signal, options.timeoutMs ?? 10_000), cache: 'no-store', headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}) }, body: options.body ? JSON.stringify(options.body) : undefined })
    if (!response.ok) { const body = await response.json().catch(() => null) as { message?: string } | null; throw new ApiError(body?.message ?? 'Authentication request failed.', response.status) }
    return await response.json() as T
  } catch (error) {
    if (options.signal?.aborted || error instanceof ApiError) throw error
    throw new ApiError('Unable to reach the account service. Please try again.')
  }
}
export const loginCustomer = (username: string, password: string) => authRequest<LoginResponse>('/auth/login', { method: 'POST', body: { username, password } })
export async function getRegistrationSettings(signal?: AbortSignal) {
  const result = registrationSettingsSchema.safeParse(await authRequest<unknown>('/auth/registration', { signal }))
  if (!result.success) throw new ApiError('Account registration is unavailable. Please try again later.')
  return result.data
}
export async function registerCustomer(input: RegistrationInput) {
  const result = registrationResultSchema.safeParse(await authRequest<unknown>('/auth/register', { method: 'POST', body: input }))
  if (!result.success) throw new ApiError('We could not confirm registration. Check your email or try signing in before submitting again.')
  return result.data
}
export const getCurrentCustomer = (token: string, signal?: AbortSignal) => authRequest<AuthUser>('/auth/me', { token, signal })
export async function getCustomerOrders(token: string, signal?: AbortSignal) {
  // Identity is resolved by WordPress from the token, never from a customer ID in the URL.
  const data = await authRequest<unknown>('/orders', { token, signal })
  const result = customerOrdersSchema.safeParse(data)
  if (!result.success) throw new ApiError('We could not read your orders. Please try again later.')
  return result.data
}
export const logoutCustomer = (token: string) => authRequest<{ success: boolean }>('/auth/logout', { method: 'POST', token, timeoutMs: 3_000 })

// WordPress's redirect allowlist expects a full URL, including the frontend port.
export function getAuthReturnUrl(returnTo = '/my-account'): string {
  try {
    const url = new URL(returnTo, window.location.origin)
    if (url.origin === window.location.origin && !url.username && !url.password) return url.href
  } catch { /* Use the account page for malformed return URLs. */ }
  return new URL('/my-account', window.location.origin).href
}

export function submitWordPressPost(action: 'alahly_spa_auth_handoff' | 'alahly_spa_logout', fields: Record<string, string>) {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = `${siteUrl}/wp-admin/admin-post.php`
  const formFields = action === 'alahly_spa_auth_handoff'
    ? { ...fields, return_to: getAuthReturnUrl(fields.return_to) }
    : fields
  Object.entries({ action, ...formFields }).forEach(([name, value]) => {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = value
    form.append(input)
  })
  document.body.append(form)
  form.submit()
}
