import { QueryClient } from "@tanstack/react-query";
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: 1,
        // SSR roots must not retain request caches through browser GC timers.
        gcTime: typeof window === 'undefined' ? Infinity : 300_000,
        refetchOnWindowFocus: true,
      },
    },
  });
}
