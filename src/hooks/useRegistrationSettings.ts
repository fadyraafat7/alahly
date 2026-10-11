import { useQuery } from "@tanstack/react-query";
import { getRegistrationSettings } from "../api/auth";
import { useHydrated } from "./useHydrated";

export function useRegistrationSettings() {
  const hydrated = useHydrated();
  return useQuery({
    queryKey: ["auth", "registration-settings"],
    queryFn: ({ signal }) => getRegistrationSettings(signal),
    staleTime: 0,
    retry: false,
    enabled: hydrated,
  });
}
