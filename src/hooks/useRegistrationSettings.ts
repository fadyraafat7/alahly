import { useQuery } from '@tanstack/react-query'
import { getRegistrationSettings } from '../api/auth'

export function useRegistrationSettings() {
  return useQuery({
    queryKey: ['auth', 'registration-settings'],
    queryFn: ({ signal }) => getRegistrationSettings(signal),
    staleTime: 0,
    retry: false,
  })
}
