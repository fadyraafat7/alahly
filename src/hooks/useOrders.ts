import { useQuery } from '@tanstack/react-query'
import { getCustomerOrders } from '../api/auth'
import { ordersKey } from '../query/privateSession'

export const useOrders = (token?: string, userId?: number, scope = 0) =>
  useQuery({
    queryKey: ordersKey(scope, userId),
    queryFn: ({ signal }) => getCustomerOrders(token!, signal),
    enabled: Boolean(token && userId),
    retry: false,
    gcTime: 0,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })
