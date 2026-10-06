import { ApiError } from './client'

const baseUrl = (import.meta.env.VITE_WP_AUTH_API_URL || '/wp-json/alahly-spa/v1').replace(/\/$/, '')
const siteUrl = (import.meta.env.VITE_WP_SITE_URL || 'http://alahly.test').replace(/\/$/, '')
export interface AuthUser { id: number; email: string; name: string }
export interface CustomerOrder { id: number; number: string; status: string; total: string; currency: string; date_created: string | null }
interface LoginResponse { token: string; user: AuthUser }

async function authRequest<T>(path: string, options: { method?: 'GET' | 'POST'; token?: string; body?: object } = {}): Promise<T> {
  const response = await fetch(new URL(`${baseUrl}${path}`, window.location.origin), { method: options.method ?? 'GET', headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}) }, body: options.body ? JSON.stringify(options.body) : undefined })
  if (!response.ok) { const body = await response.json().catch(() => null) as { message?: string } | null; throw new ApiError(body?.message ?? 'Authentication request failed.', response.status) }
  return response.json() as Promise<T>
}
export const loginCustomer = (username: string, password: string) => authRequest<LoginResponse>('/auth/login', { method: 'POST', body: { username, password } })
export const getCurrentCustomer = (token: string) => authRequest<AuthUser>('/auth/me', { token })
export const getCustomerOrders = (token: string) => authRequest<CustomerOrder[]>('/orders', { token })
export const logoutCustomer = (token: string) => authRequest<{ success: boolean }>('/auth/logout', { method: 'POST', token })
export const submitWordPressPost = (action: 'alahly_spa_auth_handoff' | 'alahly_spa_logout', fields: Record<string, string>) => { const form = document.createElement('form'); form.method = 'POST'; form.action = `${siteUrl}/wp-admin/admin-post.php`; Object.entries({ action, ...fields }).forEach(([name, value]) => { const input = document.createElement('input'); input.type = 'hidden'; input.name = name; input.value = value; form.append(input) }); document.body.append(form); form.submit() }