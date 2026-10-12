import type { QueryClient, QueryKey } from '@tanstack/react-query'

export const profileKey = (scope: number) => ['auth', 'current-user', scope] as const
export const ordersKey = (scope: number, userId?: number) => ['orders', scope, userId] as const
export const isPrivateKey = (key: QueryKey) =>
  key[0] === 'orders' || (key[0] === 'auth' && key[1] === 'current-user')

export function clearPrivateCache(client: QueryClient) {
  const filters = { predicate: (query: { queryKey: QueryKey }) => isPrivateKey(query.queryKey) }
  // Cancellation takes effect synchronously; remove even if transport ignores abort.
  void client.cancelQueries(filters)
  client.removeQueries(filters)
}

// An in-flight login must not restore a session after logout or a newer login.
export function createSessionEpoch() {
  let revision = 0
  return { advance: () => ++revision, isCurrent: (value: number) => value === revision }
}
