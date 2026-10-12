export const catalogPolicy = {
  staleTime: 60_000,
  gcTime: typeof window === 'undefined' ? Infinity : 300_000,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  // Refresh visible, continuously mounted prices/stock too; not a background poll.
  refetchInterval: 60_000,
  refetchIntervalInBackground: false,
  meta: { public: true },
}
export const categoryPolicy = { ...catalogPolicy, staleTime: 300_000, gcTime: typeof window === 'undefined' ? Infinity : 600_000, refetchInterval: false as const }
export function retryCatalog(failures: number, error: Error) {
  if (failures >= 1 || error.name === 'AbortError' || error.name === 'TimeoutError') return false
  const status = 'status' in error ? error.status : undefined
  return status === undefined || (typeof status === 'number' && (status === 429 || status >= 500))
}
