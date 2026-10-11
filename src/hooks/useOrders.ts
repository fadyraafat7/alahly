import { useQuery } from '@tanstack/react-query'
import { getCustomerOrders } from '../api/auth'

export const useOrders = (token?: string, userId?: number) =>
  useQuery({
    queryKey: ['orders', userId],
    queryFn: ({ signal }) => getCustomerOrders(token!, signal),
    enabled: Boolean(token && userId),
    retry: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
