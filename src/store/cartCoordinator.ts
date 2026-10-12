export interface CartSnapshot<T> { items: T; isSyncing: boolean; ready: boolean; error: string | null }

// Guard, rather than replay, overlapping writes. Never automatically retry a POST:
// a lost response may still mean WooCommerce applied the mutation.
export function createCartCoordinator<T>(read: (signal: AbortSignal) => Promise<T>, empty: T) {
  const initial: CartSnapshot<T> = { items: empty, isSyncing: true, ready: false, error: null }
  let state = initial
  let busy = false
  let generation = 0
  let readController: AbortController | undefined
  const listeners = new Set<() => void>()
  const publish = (next: CartSnapshot<T>) => { state = next; listeners.forEach(listener => listener()) }
  async function run(operation: () => Promise<T>, mutation: boolean) {
    if (busy || (mutation && (!state.ready || state.error))) return false
    busy = true
    const current = generation
    publish({ ...state, isSyncing: true, error: null })
    try {
      const items = await operation()
      if (current !== generation) return false
      publish({ items, isSyncing: true, ready: true, error: null })
      return true
    } catch {
      if (current === generation) publish({ ...state, ready: false, error: "We couldn't confirm your cart. Refresh your bag before continuing." })
      return false
    } finally {
      if (current === generation) {
        busy = false
        publish({ ...state, isSyncing: false })
      }
    }
  }
  return {
    getSnapshot: () => state,
    // Stable SSR snapshot even if a delayed subtree hydrates after the first read.
    getServerSnapshot: () => initial,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    refresh: () => run(() => {
      readController = new AbortController()
      return read(readController.signal)
    }, false),
    mutate: (operation: () => Promise<T>) => run(operation, true),
    canCheckout: () => state.ready && !state.isSyncing && !state.error,
    reset: (error: string | null = null) => {
      generation++
      readController?.abort()
      busy = false
      publish({ items: empty, isSyncing: !error, ready: false, error })
    },
  }
}
