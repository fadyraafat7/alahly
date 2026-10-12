// No shared HTTP caching until catalog personalization and deployment are verified.
export function applyCachePolicy(headers: Headers): Headers {
  headers.set('Cache-Control', 'private, no-store')
  return headers
}
