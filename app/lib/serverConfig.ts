type Environment = Record<string, string | undefined>
function safeUrl(value: string | undefined, name: string, base?: string) {
  if (!value || value.startsWith('//')) throw new Error(`Invalid or missing ${name} configuration.`)
  let url: URL
  try { url = new URL(value, base) } catch { throw new Error(`Invalid ${name} configuration.`) }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error(`Invalid ${name} configuration: use an HTTP(S) URL without credentials, query, or fragment.`)
  }
  return url.href.replace(/\/$/, '')
}

export function validateServerConfig(runtime: Environment, compiled: Environment) {
  const wpSite = safeUrl(compiled.VITE_WP_SITE_URL, 'VITE_WP_SITE_URL')
  const publicStore = safeUrl(compiled.VITE_WC_STORE_API_URL || '/wp-json/wc/store/v1', 'VITE_WC_STORE_API_URL', wpSite)
  const publicAuth = safeUrl(compiled.VITE_WP_AUTH_API_URL || '/wp-json/alahly-spa/v1', 'VITE_WP_AUTH_API_URL', wpSite)
  for (const [key, expected] of Object.entries({ VITE_WP_SITE_URL: wpSite, VITE_WC_STORE_API_URL: publicStore, VITE_WP_AUTH_API_URL: publicAuth })) {
    if (runtime[key] && safeUrl(runtime[key], key, wpSite) !== expected) {
      throw new Error(`${key} differs from the client build. Rebuild with the intended public configuration.`)
    }
  }
  const storeApiUrl = runtime.WC_STORE_API_URL ? safeUrl(runtime.WC_STORE_API_URL, 'WC_STORE_API_URL') : publicStore
  const canonicalOrigin = safeUrl(runtime.STOREFRONT_URL || wpSite, 'STOREFRONT_URL')
  const loaderTimeoutMs = runtime.WC_LOADER_TIMEOUT_MS === undefined ? 10_000 : Number(runtime.WC_LOADER_TIMEOUT_MS)
  if (!Number.isInteger(loaderTimeoutMs) || loaderTimeoutMs < 100 || loaderTimeoutMs > 30_000) {
    throw new Error('WC_LOADER_TIMEOUT_MS must be an integer between 100 and 30000.')
  }
  return Object.freeze({ storeApiUrl, canonicalOrigin, loaderTimeoutMs })
}
