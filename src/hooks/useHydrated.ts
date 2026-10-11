import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
// The server and the first browser render agree; true only after hydration.
export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
