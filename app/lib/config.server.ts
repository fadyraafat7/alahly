import { validateServerConfig } from './serverConfig'

// Evaluated when the server bundle loads: invalid configuration fails startup.
// VITE values describe the client build; only explicitly server-only settings vary at runtime.
export const serverConfig = validateServerConfig(process.env, {
  VITE_WP_SITE_URL: import.meta.env.VITE_WP_SITE_URL,
  VITE_WC_STORE_API_URL: import.meta.env.VITE_WC_STORE_API_URL,
  VITE_WP_AUTH_API_URL: import.meta.env.VITE_WP_AUTH_API_URL,
})
